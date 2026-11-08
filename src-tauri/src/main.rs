#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod autostart;
mod hosts;
mod media;
mod performance;
mod server;
mod themes;
mod window;

use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Listener, Manager, State, WindowEvent};
use tokio::sync::broadcast;

use media::gsmtc::GsmtcManager;
use media::types::MediaState;
use performance::{PerformanceManager, PerformanceState};

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
pub struct HotkeyConfig {
    pub overlay: String,
    pub lock: String,
}

type HotkeyRequest = (HotkeyConfig, std::sync::mpsc::Sender<Result<(), String>>);

fn hotkey_config_path() -> PathBuf {
    std::env::var_os("APPDATA").map(PathBuf::from).unwrap_or_else(|| PathBuf::from(".")).join("MPO-pro-beta").join("hotkeys.json")
}

#[tauri::command]
fn get_saved_global_hotkeys() -> Option<HotkeyConfig> {
    std::fs::read(hotkey_config_path()).ok().and_then(|data| serde_json::from_slice(&data).ok())
}

pub struct AppState {
    pub gsmtc: Arc<GsmtcManager>,
    pub performance: Arc<PerformanceManager>,
    pub is_overlay_visible: Arc<AtomicBool>,
    pub is_click_through: Arc<AtomicBool>,
    pub hotkey_tx: std::sync::Mutex<Option<std::sync::mpsc::Sender<HotkeyRequest>>>,
    pub theme_watcher: parking_lot::Mutex<Option<notify::RecommendedWatcher>>,
}

#[tauri::command]
fn get_performance_state(state: State<'_, AppState>) -> PerformanceState {
    state.performance.get_state()
}

#[tauri::command]
fn set_performance_optimization(app: AppHandle, state: State<'_, AppState>, enabled: bool) -> Result<(), String> {
    state.performance.set_optimization_enabled(enabled, &app)?;
    state.gsmtc.set_eco_mode(state.performance.is_eco_mode_active());
    Ok(())
}

#[tauri::command]
fn set_game_hud_behavior(app: AppHandle, state: State<'_, AppState>, behavior: String) -> Result<(), String> {
    state.performance.set_hud_behavior(behavior, Some(&app))
}

#[tauri::command]
fn update_global_hotkeys(state: State<'_, AppState>, overlay: String, lock: String) -> Result<(), String> {
    let (reply_tx, reply_rx) = std::sync::mpsc::channel();
    let guard = state.hotkey_tx.lock().map_err(|e| e.to_string())?;
    guard.as_ref().ok_or("Hotkey service is unavailable")?.send((HotkeyConfig { overlay, lock }, reply_tx)).map_err(|e| e.to_string())?;
    reply_rx.recv_timeout(std::time::Duration::from_secs(3)).map_err(|e| format!("Hotkey service did not respond: {e}"))?
}

#[tauri::command]
fn get_media_state(state: State<'_, AppState>) -> MediaState {
    state.gsmtc.get_state()
}

#[tauri::command]
fn media_control(state: State<'_, AppState>, action: String) -> Result<(), String> {
    state.gsmtc.handle_control(&action)
}

#[tauri::command]
fn set_app_filter_rules(rules: Vec<media::types::AppFilterRule>, state: State<'_, AppState>) -> Result<(), String> {
    state.gsmtc.set_filter_rules(rules.clone());
    let config_dir = std::env::var("APPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("MPO-pro-beta");
    let _ = std::fs::create_dir_all(&config_dir);
    let path = config_dir.join("app_sources.json");
    if let Ok(s) = serde_json::to_string_pretty(&rules) {
        let _ = std::fs::write(path, s);
    }
    Ok(())
}

#[tauri::command]
fn get_app_filter_rules(state: State<'_, AppState>) -> Vec<media::types::AppFilterRule> {
    state.gsmtc.get_filter_rules()
}

#[tauri::command]
fn check_hosts_mapping() -> bool {
    hosts::is_mpopro_local_mapped()
}

#[tauri::command]
fn trigger_hosts_elevation() -> Result<String, String> {
    hosts::trigger_elevation()
}

#[tauri::command]
fn remove_hosts_mapping() -> Result<String, String> {
    hosts::trigger_deactivation()
}

fn app_settings_file(name: &str) -> PathBuf {
    let dir = std::env::var_os("APPDATA").map(PathBuf::from).unwrap_or_else(std::env::temp_dir).join("MPO-pro-beta");
    let _ = std::fs::create_dir_all(&dir);
    let target = dir.join(name);
    // Preserve settings created by earlier production versions, without deleting the original.
    if !target.exists() {
        if let Ok(exe) = std::env::current_exe() {
            if let Some(parent) = exe.parent() { let _ = std::fs::copy(parent.join(name), &target); }
        }
    }
    target
}

fn get_overlay_pos_file() -> PathBuf { app_settings_file("overlay_pos.json") }

fn load_saved_overlay_pos() -> Option<(f64, f64)> {
    let p = get_overlay_pos_file();
    if let Ok(s) = std::fs::read_to_string(p) {
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&s) {
            if let (Some(x), Some(y)) = (val.get("x").and_then(|v| v.as_f64()), val.get("y").and_then(|v| v.as_f64())) {
                return Some((x, y));
            }
        }
    }
    None
}

fn get_auto_start_hud_file() -> PathBuf { app_settings_file("auto_start_hud.json") }

#[tauri::command]
fn get_auto_start_hud() -> bool {
    let p = get_auto_start_hud_file();
    if let Ok(s) = std::fs::read_to_string(p) {
        return s.trim() == "true";
    }
    false
}

#[tauri::command]
fn set_auto_start_hud(enabled: bool) -> Result<(), String> {
    let p = get_auto_start_hud_file();
    std::fs::write(p, if enabled { "true" } else { "false" })
        .map_err(|e| e.to_string())
}

fn get_auto_lock_hud_file() -> PathBuf { app_settings_file("auto_lock_hud.json") }

#[tauri::command]
fn get_auto_lock_hud() -> bool {
    let p = get_auto_lock_hud_file();
    if let Ok(s) = std::fs::read_to_string(p) {
        return s.trim() == "true";
    }
    false
}

#[tauri::command]
fn set_auto_lock_hud(enabled: bool) -> Result<(), String> {
    let p = get_auto_lock_hud_file();
    std::fs::write(p, if enabled { "true" } else { "false" })
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn save_overlay_position(x: f64, y: f64) -> Result<(), String> {
    let p = get_overlay_pos_file();
    std::fs::write(p, format!("{{\"x\":{},\"y\":{}}}", x, y))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_autostart() -> bool {
    autostart::is_autostart_enabled()
}

#[tauri::command]
fn set_autostart(enabled: bool) -> Result<(), String> {
    autostart::set_autostart(enabled)
}

#[tauri::command]
fn is_desktop_overlay_visible(app: AppHandle, state: State<'_, AppState>) -> bool {
    if let Some(win) = app.get_webview_window("overlay") {
        if let Ok(vis) = win.is_visible() {
            state.is_overlay_visible.store(vis, Ordering::SeqCst);
            return vis;
        }
    }
    state.is_overlay_visible.store(false, Ordering::SeqCst);
    false
}

#[tauri::command]
fn get_overlay_click_through(state: State<'_, AppState>) -> bool {
    state.is_click_through.load(Ordering::SeqCst)
}

#[tauri::command]
fn resize_desktop_overlay(window: tauri::WebviewWindow, width: f64, height: f64) -> Result<(), String> {
    if window.label() != "overlay" {
        return Err("Only the desktop overlay window can resize its content surface".into());
    }
    if !width.is_finite() || !height.is_finite() || width <= 0.0 || height <= 0.0 {
        return Err("Overlay dimensions must be finite positive numbers".into());
    }
    // Include the theme's transparent effect gutter in these logical dimensions.
    // Bound imported theme sizes before sending them to the native window manager.
    let size = tauri::LogicalSize::new(width.round().clamp(120.0, 8192.0), height.round().clamp(120.0, 8192.0));
    window.set_size(size).map_err(|e| e.to_string())
}

#[tauri::command]
fn toggle_desktop_overlay(app: AppHandle, state: State<'_, AppState>) -> Result<bool, String> {
    let win = match app.get_webview_window("overlay") {
        Some(w) => w,
        None => {
            let (init_x, init_y) = load_saved_overlay_pos().unwrap_or((60.0, 60.0));
            tauri::WebviewWindowBuilder::new(
                &app,
                "overlay",
                tauri::WebviewUrl::App("/index.html?mode=hud".into()),
            )
            .title("MPO-pro Beta Floating Overlay")
            .inner_size(640.0, 220.0)
            .position(init_x, init_y)
            .transparent(true)
            .decorations(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .shadow(false)
            .visible(false)
            .build()
            .map_err(|e| format!("Failed to create overlay window: {}", e))?
        }
    };

    let is_currently_visible = win.is_visible().unwrap_or(false);
    let new_state = !is_currently_visible;
    state.is_overlay_visible.store(new_state, Ordering::SeqCst);

    if new_state {
        if let Some((x, y)) = load_saved_overlay_pos() {
            let _ = win.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x: x as i32, y: y as i32 }));
        }
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();

        let should_lock = get_auto_lock_hud();
        state.is_click_through.store(should_lock, Ordering::SeqCst);
        let _ = window::win32::set_click_through(&win, should_lock);
        let _ = app.emit("overlay-clickthrough-changed", should_lock);
    } else {
        let _ = win.hide();
        let _ = app.emit("overlay-hover-changed", false);
        let _ = app.emit("overlay-clickthrough-changed", false);
    }

    let _ = app.emit("overlay-visibility-changed", new_state);
    Ok(new_state)
}

#[tauri::command]
async fn open_big_studio(app: AppHandle) -> Result<(), String> {
    let win = match app.get_webview_window("big-studio") {
        Some(win) => win,
        None => tauri::WebviewWindowBuilder::new(&app, "big-studio", tauri::WebviewUrl::App("/index.html?mode=big".into()))
            .title("MPO-pro Beta — Big Studio")
            .inner_size(1280.0, 720.0)
            .min_inner_size(640.0, 360.0)
            .center()
            .build().map_err(|e| format!("Could not open Big Studio: {e}"))?,
    };
    win.show().map_err(|e| e.to_string())?;
    win.unminimize().map_err(|e| e.to_string())?;
    win.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn big_studio_is_fullscreen(window: tauri::WebviewWindow) -> Result<bool, String> {
    if window.label() != "big-studio" { return Err("Only the Big Studio window can use this control".into()); }
    window.is_fullscreen().map_err(|e| e.to_string())
}

#[tauri::command]
fn toggle_big_studio_fullscreen(window: tauri::WebviewWindow) -> Result<bool, String> {
    if window.label() != "big-studio" { return Err("Only the Big Studio window can use this control".into()); }
    let next = !window.is_fullscreen().map_err(|e| e.to_string())?;
    window.set_fullscreen(next).map_err(|e| e.to_string())?;
    Ok(next)
}

#[tauri::command]
fn close_big_studio(window: tauri::WebviewWindow) -> Result<(), String> {
    if window.label() != "big-studio" { return Err("Only the Big Studio window can use this control".into()); }
    window.close().map_err(|e| e.to_string())
}

#[tauri::command]
fn toggle_overlay_click_through(app: AppHandle, state: State<'_, AppState>) -> Result<bool, String> {
    let current = state.is_click_through.load(Ordering::SeqCst);
    let new_state = !current;
    state.is_click_through.store(new_state, Ordering::SeqCst);

    if let Some(win) = app.get_webview_window("overlay") {
        window::win32::set_click_through(&win, new_state)?;
    }

    let _ = app.emit("overlay-clickthrough-changed", new_state);
    Ok(new_state)
}

#[tauri::command]
fn set_overlay_click_through(app: AppHandle, state: State<'_, AppState>, passthrough: bool) -> Result<(), String> {
    state.is_click_through.store(passthrough, Ordering::SeqCst);
    if let Some(win) = app.get_webview_window("overlay") {
        window::win32::set_click_through(&win, passthrough)?;
    }
    let _ = app.emit("overlay-clickthrough-changed", passthrough);
    Ok(())
}

#[tauri::command]
fn show_main_window(app: AppHandle) {
    if let Some(main_win) = app.get_webview_window("main") {
        let _ = main_win.show();
        let _ = main_win.unminimize();
        let _ = main_win.set_focus();
    }
}

#[tauri::command]
fn start_dragging_overlay(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("overlay") {
        #[cfg(windows)]
        {
            use windows::Win32::Foundation::{HWND, LPARAM, WPARAM};
            use windows::Win32::UI::Input::KeyboardAndMouse::ReleaseCapture;
            use windows::Win32::UI::WindowsAndMessaging::{SendMessageW, WM_NCLBUTTONDOWN};
            const HTCAPTION: usize = 2;

            if let Ok(hwnd_raw) = win.hwnd() {
                unsafe {
                    let _ = ReleaseCapture();
                    let _ = SendMessageW(
                        HWND(hwnd_raw.0),
                        WM_NCLBUTTONDOWN,
                        WPARAM(HTCAPTION),
                        LPARAM(0),
                    );
                    return Ok(());
                }
            }
        }
        let _ = win.start_dragging();
    }
    Ok(())
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let is_autostart = args
        .iter()
        .any(|a| a == "--autostart" || a == "--silent" || a == "--minimized");

    #[cfg(windows)]
    let _single_instance_mutex = {
        use windows::core::w;
        use windows::Win32::Foundation::{GetLastError, ERROR_ALREADY_EXISTS};
        use windows::Win32::System::Threading::CreateMutexW;
        use windows::Win32::UI::WindowsAndMessaging::{
            FindWindowW, SetForegroundWindow, ShowWindow, SW_RESTORE, SW_SHOW,
        };

        unsafe {
            let mutex_name = w!("Local\\MPOpro_Beta_SingleInstance_Mutex");
            let handle = CreateMutexW(None, true, mutex_name);
            if GetLastError() == ERROR_ALREADY_EXISTS {
                if is_autostart {
                    return;
                }
                let window_title = w!("MPO-pro Beta — Media Player Studio & Dashboard");
                if let Ok(hwnd) = FindWindowW(None, window_title) {
                    if !hwnd.is_invalid() {
                        let _ = ShowWindow(hwnd, SW_RESTORE);
                        let _ = ShowWindow(hwnd, SW_SHOW);
                        let _ = SetForegroundWindow(hwnd);
                    }
                }
                return;
            }
            handle.ok()
        }
    };

    let (tx, _rx) = broadcast::channel::<MediaState>(32);
    let gsmtc = Arc::new(GsmtcManager::new(tx));
    let performance = Arc::new(PerformanceManager::new());
    let overlay_visible_flag = Arc::new(AtomicBool::new(false));
    let overlay_click_through_flag = Arc::new(AtomicBool::new(false));
    let overlay_visible_for_hover = overlay_visible_flag.clone();
    let overlay_click_through_for_hover = overlay_click_through_flag.clone();
    let (hotkey_tx, hotkey_rx) = std::sync::mpsc::channel::<HotkeyRequest>();

    let gsmtc_for_server = gsmtc.clone();
    let gsmtc_for_watcher = gsmtc.clone();
    let gsmtc_for_perf = gsmtc.clone();
    let performance_for_setup = performance.clone();
    let performance_for_hover = performance.clone();

    tauri::Builder::default()
        .manage(AppState {
            gsmtc,
            performance,
            is_overlay_visible: overlay_visible_flag,
            is_click_through: overlay_click_through_flag,
            hotkey_tx: std::sync::Mutex::new(Some(hotkey_tx)),
            theme_watcher: parking_lot::Mutex::new(None),
        })
        .on_window_event(|window, event| {
            if window.label() == "overlay" {
                if let WindowEvent::Moved(pos) = event {
                    let _ = save_overlay_position(pos.x as f64, pos.y as f64);
                }
            }
            if let WindowEvent::CloseRequested { api, .. } = event {
                // If main window close button is clicked, hide to system tray instead of exiting
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                } else if window.label() == "overlay" {
                    // Prevent overlay destruction: hide and notify frontend
                    api.prevent_close();
                    let _ = window.hide();
                    let app = window.app_handle();
                    let state = app.state::<AppState>();
                    state.is_overlay_visible.store(false, Ordering::SeqCst);
                    let _ = app.emit("overlay-visibility-changed", false);
                    let _ = app.emit("overlay-hover-changed", false);
                }
            }
        })
        .setup(move |app| {
            // Locate static distribution folder for Axum server
            let dist_path = {
                let exe_dir_dist = std::env::current_exe()
                    .ok()
                    .and_then(|p| p.parent().map(|dir| dir.join("dist")))
                    .unwrap_or_default();
                let candidates = [
                    PathBuf::from("dist"),
                    PathBuf::from("../dist"),
                    exe_dir_dist,
                    app.path().resource_dir().unwrap_or_default().join("dist"),
                ];
                candidates
                    .into_iter()
                    .find(|p| p.exists() && p.join("index.html").exists())
                    .unwrap_or_else(|| PathBuf::from("dist"))
            };

            // 1. Spawn Axum HTTP and WebSocket server on port 4849
            let server_dist = dist_path.clone();
            let server_gsmtc = gsmtc_for_server.clone();
            tauri::async_runtime::spawn(async move {
                server::router::start_server(server_gsmtc, server_dist, 4849).await;
            });

            // 2. Start GSMTC watcher thread with Tauri event emission
            let config_dir = std::env::var("APPDATA")
                .map(PathBuf::from)
                .unwrap_or_else(|_| PathBuf::from("."))
                .join("MPO-pro-beta");
            let app_sources_path = config_dir.join("app_sources.json");
            if app_sources_path.exists() {
                if let Ok(content) = std::fs::read_to_string(&app_sources_path) {
                    if let Ok(rules) = serde_json::from_str::<Vec<media::types::AppFilterRule>>(&content) {
                        gsmtc_for_watcher.set_filter_rules(rules);
                    }
                }
            }

            let app_handle = app.handle().clone();
            gsmtc_for_watcher.start_watcher(Some(app_handle.clone()));

            // 3. Setup System Tray
            setup_tray(app)?;

            // 4. Setup Win32 Global Hotkey with dynamic configuration
            setup_global_hotkey(app_handle.clone(), hotkey_rx);

            // 5. Start Windows Game & Live Streaming Performance Engine
            performance_for_setup.start_monitor(app_handle.clone(), Some(gsmtc_for_watcher.eco_mode.clone()));
            if performance_for_setup.is_eco_mode_active() {
                gsmtc_for_perf.set_eco_mode(true);
            }

            // 6. Flyout Mode (FluentFlyout style): briefly reveals overlay for 4s on song change when gaming
            let app_for_flyout = app_handle.clone();
            let perf_for_flyout = performance_for_setup.clone();
            let flyout_token = Arc::new(std::sync::atomic::AtomicU64::new(0));
            let flyout_token_clone = flyout_token.clone();

            app_handle.listen("track-changed", move |_event| {
                let state = perf_for_flyout.get_state();
                if state.optimization_enabled && state.is_game_active && state.hud_behavior == "flyout" && perf_for_flyout.is_overlay_hidden_by_game() {
                    let app = app_for_flyout.clone();
                    let perf = perf_for_flyout.clone();
                    let token = flyout_token_clone.fetch_add(1, Ordering::SeqCst) + 1;
                    let token_check = flyout_token_clone.clone();

                    tauri::async_runtime::spawn(async move {
                        if let Some(win) = app.get_webview_window("overlay") {
                            let _ = win.show();
                            let _ = app.emit("overlay-visibility-changed", true);
                            tokio::time::sleep(std::time::Duration::from_millis(4000)).await;
                            if token_check.load(Ordering::SeqCst) == token {
                                let cur = perf.get_state();
                                if cur.optimization_enabled && cur.is_game_active && cur.hud_behavior == "flyout" {
                                    let _ = win.hide();
                                    let _ = app.emit("overlay-visibility-changed", false);
                                }
                            }
                        }
                    });
                }
            });

            // 7. Spawn optimized background cursor tracker for overlay Ghost Peek Mode
            let app_for_hover = app_handle.clone();
            let perf_for_hover = performance_for_hover.clone();
            tauri::async_runtime::spawn(async move {
                let mut last_hover = false;
                loop {
                    // Check if ghost peek is even enabled in localStorage settings
                    let is_visible = overlay_visible_for_hover.load(Ordering::SeqCst);
                    let is_locked = overlay_click_through_for_hover.load(Ordering::SeqCst);
                    let is_game = perf_for_hover.is_game_active();

                    // CRITICAL: When game is active, bypass cursor polling completely to eliminate React re-renders and DWM composition locks
                    if is_visible && is_locked && !is_game {
                        tokio::time::sleep(std::time::Duration::from_millis(250)).await;
                        if let Some(win) = app_for_hover.get_webview_window("overlay") {
                            let is_hovered = window::win32::is_cursor_inside_window(&win);
                            if is_hovered != last_hover {
                                last_hover = is_hovered;
                                let _ = app_for_hover.emit("overlay-hover-changed", is_hovered);
                            }
                        }
                    } else {
                        if last_hover {
                            last_hover = false;
                            let _ = app_for_hover.emit("overlay-hover-changed", false);
                        }
                        // Sleep much longer when in game or not needed to save 100% of background polling
                        tokio::time::sleep(std::time::Duration::from_millis(1000)).await;
                    }
                }
            });

            // 6. Show main window only if not launched via autostart
            if !is_autostart {
                if let Some(main_win) = app.get_webview_window("main") {
                    let _ = main_win.show();
                    let _ = main_win.set_focus();
                }
            }

            // 7. Auto-start Floating HUD if enabled in settings
            if get_auto_start_hud() {
                let app_handle_auto = app_handle.clone();
                let state_auto = app.state::<AppState>();
                let _ = toggle_desktop_overlay(app_handle_auto, state_auto);
            }

            // 8. Initialize on-disk theme workspace watcher
            if let Some(watcher) = themes::init_theme_watcher(app_handle.clone()) {
                *app.state::<AppState>().theme_watcher.lock() = Some(watcher);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_media_state,
            media_control,
            set_app_filter_rules,
            get_app_filter_rules,
            check_hosts_mapping,
            trigger_hosts_elevation,
            remove_hosts_mapping,
            get_autostart,
            set_autostart,
            get_auto_start_hud,
            set_auto_start_hud,
            get_auto_lock_hud,
            set_auto_lock_hud,
            save_overlay_position,
            is_desktop_overlay_visible,
            toggle_desktop_overlay,
            resize_desktop_overlay,
            open_big_studio,
            big_studio_is_fullscreen,
            toggle_big_studio_fullscreen,
            close_big_studio,
            toggle_overlay_click_through,
            get_overlay_click_through,
            set_overlay_click_through,
            show_main_window,
            update_global_hotkeys,
            get_saved_global_hotkeys,
            start_dragging_overlay,
            get_performance_state,
            set_performance_optimization,
            set_game_hud_behavior,
            themes::get_themes_workspace_path,
            themes::set_themes_workspace_path,
            themes::list_disk_themes,
            themes::read_disk_theme,
            themes::save_disk_theme,
            themes::delete_disk_theme,
            themes::open_theme_in_explorer,
            themes::open_theme_in_ide,
            themes::discover_ide_installations,
            themes::validate_custom_ide,
            themes::choose_ide_executable,
            themes::migrate_localstorage_themes
        ])
        .run(tauri::generate_context!())
        .expect("Error while running MPO-pro Tauri application");
}

fn setup_tray(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    use tauri::menu::{Menu, MenuItem};
    use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

    let open_item = MenuItem::with_id(
        app,
        "open_dashboard",
        "Open MPO-pro Studio & Dashboard",
        true,
        None::<&str>,
    )?;
    let toggle_overlay_item = MenuItem::with_id(
        app,
        "toggle_overlay",
        "Toggle Floating HUD",
        true,
        None::<&str>,
    )?;
    let toggle_lock_item = MenuItem::with_id(
        app,
        "toggle_lock",
        "Lock / Move Mode",
        true,
        None::<&str>,
    )?;
    let hosts_item = MenuItem::with_id(
        app,
        "setup_hosts",
        "Setup mpobeta.local (UAC)",
        true,
        None::<&str>,
    )?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit MPO-pro", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[&open_item, &toggle_overlay_item, &toggle_lock_item, &hosts_item, &quit_item],
    )?;

    let tray_builder = TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("MPO-pro — Media Player Overlay Studio")
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                show_main_window(app.clone());
            }
        })
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open_dashboard" => {
                show_main_window(app.clone());
            }
            "toggle_overlay" => {
                let state = app.state::<AppState>();
                let _ = toggle_desktop_overlay(app.clone(), state);
            }
            "toggle_lock" => {
                let state = app.state::<AppState>();
                let _ = toggle_overlay_click_through(app.clone(), state);
            }
            "setup_hosts" => {
                let _ = hosts::trigger_elevation();
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        });

    if let Some(icon) = app.default_window_icon() {
        let _ = tray_builder.icon(icon.clone()).build(app)?;
    } else {
        let _ = tray_builder.build(app)?;
    }

    Ok(())
}

fn setup_global_hotkey(app_handle: AppHandle, rx: std::sync::mpsc::Receiver<HotkeyRequest>) {
    #[cfg(windows)]
    {
        std::thread::Builder::new()
            .name("global-hotkey-listener".to_string())
            .spawn(move || {
                use windows::Win32::UI::Input::KeyboardAndMouse::{
                    RegisterHotKey, UnregisterHotKey, MOD_ALT, MOD_CONTROL, MOD_NOREPEAT, MOD_SHIFT, MOD_WIN, HOT_KEY_MODIFIERS,
                };
                use windows::Win32::UI::WindowsAndMessaging::{PeekMessageW, PM_REMOVE, MSG, WM_HOTKEY};

                const HOTKEY_ID_OVERLAY: i32 = 0x4D50;
                const HOTKEY_ID_LOCK: i32 = 0x4D51;
                const HOTKEY_ID_LOCK_FALLBACK: i32 = 0x4D52;

                let parse_and_register = |id: i32, key_str: &str| -> Result<(), String> {
                    let s = key_str.to_lowercase();
                    let parts: Vec<&str> = key_str.split('+').map(str::trim).collect();
                    if parts.is_empty() || parts[..parts.len() - 1].iter().any(|part| !matches!(part.to_ascii_lowercase().as_str(), "ctrl" | "control" | "shift" | "alt" | "win" | "meta" | "super")) {
                        return Err(format!("Unsupported shortcut: {key_str}"));
                    }
                    let mut mods = HOT_KEY_MODIFIERS(0);
                    if s.contains("ctrl") || s.contains("control") {
                        mods |= MOD_CONTROL;
                    }
                    if s.contains("shift") {
                        mods |= MOD_SHIFT;
                    }
                    if s.contains("alt") {
                        mods |= MOD_ALT;
                    }
                    if s.contains("win") || s.contains("meta") || s.contains("super") {
                        mods |= MOD_WIN;
                    }
                    mods |= MOD_NOREPEAT;

                    let key_part = parts.last().map(|p| p.trim()).unwrap_or("");

                    let vk: u32 = match key_part.to_uppercase().as_str() {
                        "F1" => 0x70, "F2" => 0x71, "F3" => 0x72, "F4" => 0x73,
                        "F5" => 0x74, "F6" => 0x75, "F7" => 0x76, "F8" => 0x77,
                        "F9" => 0x78, "F10" => 0x79, "F11" => 0x7A, "F12" => 0x7B,
                        "SPACE" => 0x20, "TAB" => 0x09,
                        k if k.len() == 1 => {
                            let ch = k.chars().next().unwrap();
                            if ch.is_ascii_alphabetic() {
                                0x41 + (ch.to_ascii_uppercase() as u32 - 'A' as u32)
                            } else if ch.is_ascii_digit() {
                                0x30 + (ch as u32 - '0' as u32)
                            } else {
                                return Err(format!("Unsupported shortcut: {key_str}"));
                            }
                        }
                        _ => return Err(format!("Unsupported shortcut: {key_str}")),
                    };

                    unsafe {
                        RegisterHotKey(None, id, mods, vk)
                            .or_else(|_| RegisterHotKey(None, id, mods & !MOD_NOREPEAT, vk))
                            .map_err(|_| format!("Shortcut {key_str} is unavailable or already in use"))?;
                    }
                    Ok(())
                };

                unsafe {
                    let mut current = get_saved_global_hotkeys().unwrap_or(HotkeyConfig { overlay: "Ctrl+Shift+O".into(), lock: "Ctrl+Shift+L".into() });
                    if let Err(e) = parse_and_register(HOTKEY_ID_OVERLAY, &current.overlay) { eprintln!("[Hotkey] {e}"); }
                    if let Err(e) = parse_and_register(HOTKEY_ID_LOCK, &current.lock) { eprintln!("[Hotkey] {e}"); }

                    println!("[Hotkey] Global hotkey thread initialized");

                    let mut msg = MSG::default();
                    loop {
                        while let Ok((cfg, reply)) = rx.try_recv() {
                            println!("[Hotkey] Hotkeys updated: overlay='{}', lock='{}'", cfg.overlay, cfg.lock);
                            if cfg.overlay.eq_ignore_ascii_case(&cfg.lock) {
                                let _ = reply.send(Err("Choose different shortcuts for the two actions".into()));
                                continue;
                            }
                            let _ = UnregisterHotKey(None, HOTKEY_ID_OVERLAY);
                            let _ = UnregisterHotKey(None, HOTKEY_ID_LOCK);
                            let _ = UnregisterHotKey(None, HOTKEY_ID_LOCK_FALLBACK);
                            let result = parse_and_register(HOTKEY_ID_OVERLAY, &cfg.overlay).and_then(|_| parse_and_register(HOTKEY_ID_LOCK, &cfg.lock)).and_then(|_| {
                                let path = hotkey_config_path();
                                std::fs::create_dir_all(path.parent().ok_or("Invalid settings path")?).map_err(|e| e.to_string())?;
                                std::fs::write(path, serde_json::to_vec(&cfg).map_err(|e| e.to_string())?).map_err(|e| e.to_string())
                            });
                            if result.is_ok() { current = cfg; } else {
                                let _ = UnregisterHotKey(None, HOTKEY_ID_OVERLAY);
                                let _ = UnregisterHotKey(None, HOTKEY_ID_LOCK);
                                let _ = parse_and_register(HOTKEY_ID_OVERLAY, &current.overlay);
                                let _ = parse_and_register(HOTKEY_ID_LOCK, &current.lock);
                            }
                            let _ = reply.send(result);
                        }

                        if PeekMessageW(&mut msg, None, 0, 0, PM_REMOVE).as_bool() {
                            if msg.message == WM_HOTKEY {
                                let state = app_handle.state::<AppState>();
                                let id = msg.wParam.0 as i32;
                                if id == HOTKEY_ID_OVERLAY {
                                    let _ = toggle_desktop_overlay(app_handle.clone(), state);
                                } else if id == HOTKEY_ID_LOCK || id == HOTKEY_ID_LOCK_FALLBACK {
                                    let _ = toggle_overlay_click_through(app_handle.clone(), state);
                                }
                            }
                        } else {
                            std::thread::sleep(std::time::Duration::from_millis(60));
                        }
                    }
                }
            })
            .expect("Failed to spawn global hotkey thread");
    }
}
