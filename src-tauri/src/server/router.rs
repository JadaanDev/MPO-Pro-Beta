use std::net::SocketAddr;
use std::sync::Arc;
use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    http::{header, HeaderMap, Method, StatusCode},
    middleware::{self, Next},
    extract::Request,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use futures_util::{sink::SinkExt, stream::StreamExt};
use rust_embed::RustEmbed;
use tower_http::cors::{AllowOrigin, CorsLayer};
use tower_http::services::{ServeDir, ServeFile};

use crate::media::gsmtc::GsmtcManager;
use crate::media::types::{AppFilterRule, MediaControlPayload, MediaState};

#[derive(RustEmbed)]
#[folder = "../dist"]
struct EmbeddedAssets;

async fn static_handler(uri: axum::http::Uri) -> Response {
    let raw_path = uri.path().trim_start_matches('/');
    let path = if raw_path.is_empty() { "index.html" } else { raw_path };

    if let Some(file) = EmbeddedAssets::get(path) {
        let mime = mime_guess::from_path(path).first_or_octet_stream();
        let cache = if path.starts_with("assets/") {
            "public, max-age=31536000, immutable"
        } else {
            "no-cache"
        };
        return (
            StatusCode::OK,
            [
                (header::CONTENT_TYPE, mime.as_ref().to_string()),
                (header::CACHE_CONTROL, cache.to_string()),
            ],
            file.data.into_owned(),
        )
            .into_response();
    }

    // SPA fallback to embedded index.html
    if let Some(index) = EmbeddedAssets::get("index.html") {
        return (
            StatusCode::OK,
            [
                (header::CONTENT_TYPE, "text/html; charset=utf-8".to_string()),
                (header::CACHE_CONTROL, "no-cache".to_string()),
            ],
            index.data.into_owned(),
        )
            .into_response();
    }

    (StatusCode::NOT_FOUND, "Not Found").into_response()
}

pub struct ServerState {
    pub gsmtc: Arc<GsmtcManager>,
    pub layers: Arc<tokio::sync::RwLock<serde_json::Value>>,
    pub layers_tx: tokio::sync::broadcast::Sender<serde_json::Value>,
    pub config_file_path: std::path::PathBuf,
    pub app_sources_file_path: std::path::PathBuf,
    pub write_lock: tokio::sync::Mutex<()>,
}

pub async fn start_server(
    gsmtc: Arc<GsmtcManager>,
    dist_path: std::path::PathBuf,
    port: u16,
) {
    let config_dir = std::env::var("APPDATA")
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|_| std::path::PathBuf::from("."))
        .join("MPO-pro-beta");
    let _ = std::fs::create_dir_all(&config_dir);
    let config_file_path = config_dir.join("layers_config.json");
    let app_sources_file_path = config_dir.join("app_sources.json");

    // Load saved app sources rules if available
    if app_sources_file_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&app_sources_file_path) {
            if let Ok(rules) = serde_json::from_str::<Vec<AppFilterRule>>(&content) {
                gsmtc.set_filter_rules(rules);
            }
        }
    }

    let initial_layers = if config_file_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&config_file_path) {
            serde_json::from_str::<serde_json::Value>(&content)
                .unwrap_or_else(|_| serde_json::json!({ "layers": [], "activeLayerId": "" }))
        } else {
            serde_json::json!({ "layers": [], "activeLayerId": "" })
        }
    } else {
        serde_json::json!({ "layers": [], "activeLayerId": "" })
    };

    let layers = Arc::new(tokio::sync::RwLock::new(initial_layers));
    let (layers_tx, _) = tokio::sync::broadcast::channel::<serde_json::Value>(32);

    let state = Arc::new(ServerState {
        gsmtc,
        layers,
        layers_tx,
        config_file_path,
        app_sources_file_path,
        write_lock: tokio::sync::Mutex::new(()),
    });

    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::predicate(|origin, _| trusted_origin(origin.to_str().ok())))
        .allow_methods([Method::GET, Method::POST])
        .allow_headers([header::CONTENT_TYPE]);

    let mut router = Router::new()
        .route("/api/v1/health", get(get_health))
        .route("/api/state", get(get_state))
        .route("/api/art", get(get_art))
        .route("/api/control", post(handle_control))
        .route("/api/layers", get(get_layers).post(set_layers))
        .route("/api/app-sources", get(get_app_sources).post(set_app_sources))
        .route("/api/themes", get(get_themes))
        .route("/api/themes/:id/bundle", get(get_theme_bundle))
        .route("/ws", get(ws_handler))
        .layer(middleware::from_fn(check_origin))
        .layer(cors)
        .with_state(state);

    if dist_path.exists() && dist_path.join("index.html").exists() {
        let index_file = dist_path.join("index.html");
        let serve_dir = ServeDir::new(&dist_path).fallback(ServeFile::new(index_file));
        router = router.fallback_service(serve_dir);
    } else {
        router = router.fallback(static_handler);
    }

    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    let listener = match tokio::net::TcpListener::bind(addr).await {
        Ok(l) => l,
        Err(e) => {
            eprintln!("[Server] Failed to bind to {}: {}", addr, e);
            return;
        }
    };

    println!("[Server] MPO-pro Axum Server running on http://{}", addr);
    println!("[Server] Available at http://localhost:{}", port);
    println!("[Server] Available at http://mpobeta.local:{}", port);

    let _ = axum::serve(listener, router).await;
}

// Browsers supply Origin on WebSocket handshakes and cross-origin mutations.
// Native read-only clients may omit it; writes require a trusted app origin.
fn trusted_origin(origin: Option<&str>) -> bool {
    matches!(origin, Some("http://localhost:4849" | "http://127.0.0.1:4849" | "http://mpobeta.local:4849" | "http://localhost:15421" | "http://127.0.0.1:15421" | "http://tauri.localhost" | "https://tauri.localhost" | "tauri://localhost"))
}

fn request_origin_allowed(method: &Method, path: &str, headers: &HeaderMap) -> bool {
    if !path.starts_with("/api/") && path != "/ws" { return true; }
    let origin = headers.get(header::ORIGIN).and_then(|v| v.to_str().ok());
    match origin {
        Some(_) => trusted_origin(origin),
        None => *method == Method::GET || *method == Method::HEAD,
    }
}

async fn check_origin(request: Request, next: Next) -> Response {
    if !request_origin_allowed(request.method(), request.uri().path(), request.headers()) {
        return (StatusCode::FORBIDDEN, "Origin not allowed").into_response();
    }
    next.run(request).await
}

async fn get_health() -> Json<serde_json::Value> {
    Json(serde_json::json!({ "service": "mpo-pro-beta", "version": env!("CARGO_PKG_VERSION"), "status": "ok" }))
}

async fn get_state(State(state): State<Arc<ServerState>>) -> Json<MediaState> {
    Json(state.gsmtc.get_state())
}

async fn get_layers(State(state): State<Arc<ServerState>>) -> Json<serde_json::Value> {
    let current = state.layers.read().await;
    Json(current.clone())
}

async fn set_layers(
    State(state): State<Arc<ServerState>>,
    Json(payload): Json<serde_json::Value>,
) -> Response {
    let _guard = state.write_lock.lock().await;
    let json = match serde_json::to_vec_pretty(&payload) {
        Ok(json) => json,
        Err(_) => return (StatusCode::BAD_REQUEST, "Invalid layers").into_response(),
    };
    if tokio::fs::write(&state.config_file_path, json).await.is_err() {
        return (StatusCode::INTERNAL_SERVER_ERROR, "Could not save layers").into_response();
    }
    *state.layers.write().await = payload.clone();
    let _ = state.layers_tx.send(payload);
    (StatusCode::OK, "OK").into_response()
}

async fn get_app_sources(State(state): State<Arc<ServerState>>) -> Json<Vec<AppFilterRule>> {
    Json(state.gsmtc.get_filter_rules())
}

async fn set_app_sources(
    State(state): State<Arc<ServerState>>,
    Json(payload): Json<Vec<AppFilterRule>>,
) -> Response {
    let _guard = state.write_lock.lock().await;
    let json = match serde_json::to_vec_pretty(&payload) {
        Ok(json) => json,
        Err(_) => return (StatusCode::BAD_REQUEST, "Invalid source rules").into_response(),
    };
    if tokio::fs::write(&state.app_sources_file_path, json).await.is_err() {
        return (StatusCode::INTERNAL_SERVER_ERROR, "Could not save source rules").into_response();
    }
    state.gsmtc.set_filter_rules(payload);
    (StatusCode::OK, "OK").into_response()
}

async fn get_art(State(state): State<Arc<ServerState>>) -> Response {
    if let Some((bytes, content_type)) = state.gsmtc.get_art() {
        (
            StatusCode::OK,
            [
                (header::CONTENT_TYPE, content_type),
                (header::CACHE_CONTROL, "public, max-age=60".to_string()),
            ],
            bytes,
        )
            .into_response()
    } else {
        (
            StatusCode::NOT_FOUND,
            [(header::CONTENT_TYPE, "text/plain".to_string())],
            "No artwork available",
        )
            .into_response()
    }
}

async fn handle_control(
    State(state): State<Arc<ServerState>>,
    Json(payload): Json<MediaControlPayload>,
) -> Response {
    match state.gsmtc.handle_control(&payload.action) {
        Ok(_) => (StatusCode::OK, "OK").into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, e).into_response(),
    }
}

async fn get_themes() -> Json<Vec<crate::themes::ThemeSummaryDto>> {
    Json(crate::themes::list_disk_themes().unwrap_or_default())
}

async fn get_theme_bundle(axum::extract::Path(id): axum::extract::Path<String>) -> Response {
    match crate::themes::read_disk_theme(id) {
        Ok(bundle) => Json(bundle).into_response(),
        Err(err) => (StatusCode::NOT_FOUND, err).into_response(),
    }
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<ServerState>>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: Arc<ServerState>) {
    let (mut sender, mut receiver) = socket.split();
    let mut rx = state.gsmtc.tx.subscribe();
    let mut layers_rx = state.layers_tx.subscribe();

    // Send initial snapshot immediately upon connecting
    let initial_state = state.gsmtc.get_state();
    if let Ok(json_str) = serde_json::to_string(&initial_state) {
        let _ = sender.send(Message::Text(json_str)).await;
    }

    // Send initial layers if present
    let initial_layers = state.layers.read().await.clone();
    if initial_layers.is_object() && !initial_layers["layers"].is_null() {
        let envelope = serde_json::json!({
            "type": "layers_updated",
            "payload": initial_layers
        });
        if let Ok(json_str) = serde_json::to_string(&envelope) {
            let _ = sender.send(Message::Text(json_str)).await;
        }
    }

    // Spawn task to forward media and layers broadcast updates to client
    let mut send_task = tokio::spawn(async move {
        loop {
            tokio::select! {
                res = rx.recv() => {
                    match res {
                        Ok(msg) => {
                            if let Ok(json_str) = serde_json::to_string(&msg) {
                                if sender.send(Message::Text(json_str)).await.is_err() {
                                    break;
                                }
                            }
                        }
                        Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => continue,
                        Err(_) => break,
                    }
                }
                res = layers_rx.recv() => {
                    match res {
                        Ok(layers_val) => {
                            let envelope = serde_json::json!({
                                "type": "layers_updated",
                                "payload": layers_val
                            });
                            if let Ok(json_str) = serde_json::to_string(&envelope) {
                                if sender.send(Message::Text(json_str)).await.is_err() {
                                    break;
                                }
                            }
                        }
                        Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => continue,
                        Err(_) => break,
                    }
                }
            }
        }
    });

    // Spawn task to handle client incoming messages (ping/close)
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            if let Message::Close(_) = msg {
                break;
            }
        }
    });

    // If either task completes, abort the other
    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    };
}

#[cfg(test)]
mod security_tests {
    use super::*;
    #[test]
    fn rejects_untrusted_browser_origins_and_originless_writes() {
        let mut h = HeaderMap::new();
        h.insert(header::ORIGIN, "https://evil.example".parse().unwrap());
        assert!(!request_origin_allowed(&Method::POST, "/api/layers", &h));
        assert!(!request_origin_allowed(&Method::GET, "/ws", &h));
        for origin in ["http://localhost:4849", "http://127.0.0.1:4849", "http://mpobeta.local:4849"] {
            h.insert(header::ORIGIN, origin.parse().unwrap());
            assert!(request_origin_allowed(&Method::POST, "/api/layers", &h));
        }
        h.insert(header::ORIGIN, "http://localhost:4849".parse().unwrap());
        assert!(!request_origin_allowed(&Method::POST, "/api/layers", &h));
        h.insert(header::ORIGIN, "http://localhost:15421".parse().unwrap());
        assert!(request_origin_allowed(&Method::POST, "/api/layers", &h));
        h.insert(header::ORIGIN, "https://tauri.localhost".parse().unwrap());
        assert!(request_origin_allowed(&Method::POST, "/api/control", &h));
        h.remove(header::ORIGIN);
        assert!(!request_origin_allowed(&Method::POST, "/api/layers", &h));
        assert!(request_origin_allowed(&Method::GET, "/api/state", &h));
        assert!(request_origin_allowed(&Method::GET, "/ws", &h));
    }
}
