use parking_lot::RwLock;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Instant, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};
use tokio::sync::broadcast;

use super::timeline::{PublicationOrder, TimelineClock, TimelineObservation};
use super::types::{AppFilterRule, MediaState};

#[cfg(windows)]
use windows::{
    core::Interface,
    Media::Control::{
        GlobalSystemMediaTransportControlsSessionManager,
        GlobalSystemMediaTransportControlsSessionPlaybackStatus,
    },
    Storage::Streams::{DataReader, IRandomAccessStreamReference},
};

pub struct GsmtcManager {
    #[cfg(windows)]
    selected_session: Arc<
        RwLock<
            Option<(
                String,
                windows::Media::Control::GlobalSystemMediaTransportControlsSession,
            )>,
        >,
    >,
    pub current_state: Arc<RwLock<MediaState>>,
    pub current_art: Arc<RwLock<Option<(Vec<u8>, String)>>>,
    pub filter_rules: Arc<RwLock<Vec<AppFilterRule>>>,
    pub tx: broadcast::Sender<MediaState>,
    pub eco_mode: Arc<AtomicBool>,
}

impl GsmtcManager {
    pub fn new(tx: broadcast::Sender<MediaState>) -> Self {
        Self {
            #[cfg(windows)]
            selected_session: Arc::new(RwLock::new(None)),
            current_state: Arc::new(RwLock::new(MediaState::default())),
            current_art: Arc::new(RwLock::new(None)),
            filter_rules: Arc::new(RwLock::new(Vec::new())),
            tx,
            eco_mode: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn set_eco_mode(&self, enabled: bool) {
        self.eco_mode.store(enabled, Ordering::SeqCst);
    }

    pub fn is_eco_mode(&self) -> bool {
        self.eco_mode.load(Ordering::SeqCst)
    }

    pub fn get_state(&self) -> MediaState {
        self.current_state.read().clone()
    }

    pub fn get_art(&self) -> Option<(Vec<u8>, String)> {
        self.current_art.read().clone()
    }

    pub fn set_filter_rules(&self, rules: Vec<AppFilterRule>) {
        *self.filter_rules.write() = rules;
    }

    pub fn get_filter_rules(&self) -> Vec<AppFilterRule> {
        self.filter_rules.read().clone()
    }

    pub fn start_watcher(&self, app_handle: Option<AppHandle>) {
        let state_lock = self.current_state.clone();
        let art_lock = self.current_art.clone();
        let rules_lock = self.filter_rules.clone();
        let tx = self.tx.clone();
        let eco_lock = self.eco_mode.clone();
        #[cfg(windows)]
        let selected_lock = self.selected_session.clone();

        std::thread::Builder::new()
            .name("gsmtc-watcher".to_string())
            .spawn(move || {
                #[cfg(windows)]
                watcher_loop(
                    state_lock,
                    art_lock,
                    rules_lock,
                    tx,
                    app_handle,
                    eco_lock,
                    selected_lock,
                );
            })
            .expect("Failed to spawn GSMTC watcher thread");
    }

    pub fn handle_control(&self, action: &str) -> Result<(), String> {
        #[cfg(windows)]
        {
            let rules = self.filter_rules.read().clone();
            let selected = self.current_state.read().source_id.clone();
            let session = self
                .selected_session
                .read()
                .as_ref()
                .filter(|(id, session)| {
                    let raw = session
                        .SourceAppUserModelId()
                        .map(|id| id.to_string())
                        .unwrap_or_default();
                    *id == selected && is_session_allowed(&raw, &rules)
                })
                .map(|(_, session)| session.clone());
            if let Some(session) = session {
                let operation = match action {
                    "PlayPause" => session.TryTogglePlayPauseAsync(),
                    "Next" => session.TrySkipNextAsync(),
                    "Previous" => session.TrySkipPreviousAsync(),
                    _ => return Err(format!("Unknown control action: {}", action)),
                }
                .map_err(|error| error.to_string())?;
                return if operation.get().map_err(|error| error.to_string())? {
                    Ok(())
                } else {
                    Err("Selected source declined the media control".into())
                };
            }
            Err("No active media session to control".to_string())
        }
        #[cfg(not(windows))]
        {
            Err("GSMTC only supported on Windows".to_string())
        }
    }
}

pub fn is_session_allowed(app_id: &str, rules: &[AppFilterRule]) -> bool {
    if rules.is_empty() {
        return true;
    }
    let lower_app = app_id.to_lowercase();
    for rule in rules {
        let pat = rule.match_rule.to_lowercase();
        if !pat.is_empty() && lower_app.contains(&pat) {
            return rule.enabled;
        }
    }
    // If not specifically denied, default to enabled
    true
}

#[cfg(windows)]
fn session_identity(
    session: &windows::Media::Control::GlobalSystemMediaTransportControlsSession,
) -> String {
    let app = session
        .SourceAppUserModelId()
        .map(|id| id.to_string())
        .unwrap_or_default();
    let identity = session
        .cast::<windows::core::IUnknown>()
        .map(|id| id.as_raw() as usize)
        .unwrap_or(0);
    format!("{}:{:x}", app, identity)
}

#[cfg(windows)]
fn get_best_session(
    manager: &GlobalSystemMediaTransportControlsSessionManager,
    rules: &[AppFilterRule],
) -> Option<windows::Media::Control::GlobalSystemMediaTransportControlsSession> {
    if let Ok(sessions) = manager.GetSessions() {
        // Prefer Windows' current session when it is allowed and playing, rather
        // than relying on the order in which the OS enumerates sessions.
        let current = manager.GetCurrentSession().ok().filter(|session| {
            let id = session
                .SourceAppUserModelId()
                .map(|v| v.to_string())
                .unwrap_or_default();
            is_session_allowed(&id, rules)
        });
        if let Some(ref session) = current {
            if session
                .GetPlaybackInfo()
                .ok()
                .and_then(|info| info.PlaybackStatus().ok())
                == Some(GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing)
            {
                return Some(session.clone());
            }
        }
        let mut first_allowed_session = None;
        let mut fallback_any_session = None;

        for s in sessions {
            let app_id = s
                .SourceAppUserModelId()
                .map(|h| h.to_string())
                .unwrap_or_default();
            let allowed = is_session_allowed(&app_id, rules);

            if fallback_any_session.is_none() {
                fallback_any_session = Some(s.clone());
            }

            if allowed {
                if let Ok(info) = s.GetPlaybackInfo() {
                    if let Ok(status) = info.PlaybackStatus() {
                        if status
                            == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing
                        {
                            // Found the top allowed playing session!
                            return Some(s);
                        }
                    }
                }
                if first_allowed_session.is_none() {
                    first_allowed_session = Some(s);
                }
            }
        }

        // 2. If no playing session in allowed apps, return first allowed session (e.g. paused)
        if current.is_some() {
            return current;
        }
        if first_allowed_session.is_some() {
            return first_allowed_session;
        }

        // 3. Fallback to GetCurrentSession if rules are completely empty
        if rules.is_empty() {
            if let Ok(current) = manager.GetCurrentSession() {
                return Some(current);
            }
            if fallback_any_session.is_some() {
                return fallback_any_session;
            }
        }
    } else if let Ok(current) = manager.GetCurrentSession() {
        let app_id = current
            .SourceAppUserModelId()
            .map(|h| h.to_string())
            .unwrap_or_default();
        if is_session_allowed(&app_id, rules) {
            return Some(current);
        }
    }
    None
}

#[cfg(windows)]
fn watcher_loop(
    state_lock: Arc<RwLock<MediaState>>,
    art_lock: Arc<RwLock<Option<(Vec<u8>, String)>>>,
    rules_lock: Arc<RwLock<Vec<AppFilterRule>>>,
    tx: broadcast::Sender<MediaState>,
    app_handle: Option<AppHandle>,
    eco_lock: Arc<AtomicBool>,
    selected_lock: Arc<
        RwLock<
            Option<(
                String,
                windows::Media::Control::GlobalSystemMediaTransportControlsSession,
            )>,
        >,
    >,
) {
    let mut last_title = String::new();
    let mut last_artist = String::new();
    let mut last_status = String::new();
    let mut last_position = -1i64;
    let mut manager_opt: Option<GlobalSystemMediaTransportControlsSessionManager> = None;
    let mut empty_session_count = 0;
    let mut last_broadcast_mono = 0u64;
    let mut is_currently_playing = false;
    let started = Instant::now();
    let stream_id = format!(
        "{}-{}",
        std::process::id(),
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos()
    );
    let mut order = PublicationOrder::default();
    let mut clock = TimelineClock::default();
    // Even an empty startup snapshot belongs to this process stream. Browser
    // reconnects can then retire a previous process without waiting for playback.
    {
        let initial = MediaState {
            stream_id: stream_id.clone(),
            sequence: order.publish(),
            updated_at: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as i64,
            ..MediaState::default()
        };
        *state_lock.write() = initial.clone();
        let _ = tx.send(initial.clone());
        if let Some(ref handle) = app_handle {
            let _ = handle.emit("media-update", &initial);
        }
    }

    loop {
        // Relaxed adaptive sleep:
        // Normal: 1000ms playing, 1500ms paused.
        // Gaming / Streaming Eco Mode: 1200ms playing, 2000ms paused.
        // Completely eliminates continuous COM WinRT lock contention without causing long freezes.
        let is_eco = eco_lock.load(Ordering::SeqCst);
        let sleep_ms = if is_eco {
            if is_currently_playing {
                1200
            } else {
                2000
            }
        } else {
            if is_currently_playing {
                1000
            } else {
                1500
            }
        };
        std::thread::sleep(std::time::Duration::from_millis(sleep_ms));

        if manager_opt.is_none() {
            manager_opt = match GlobalSystemMediaTransportControlsSessionManager::RequestAsync() {
                Ok(op) => op.get().ok(),
                Err(_) => None,
            };
        }

        let manager = match manager_opt.as_ref() {
            Some(m) => m,
            None => continue,
        };

        let current_rules = rules_lock.read().clone();
        let session = match get_best_session(manager, &current_rules) {
            Some(s) => {
                empty_session_count = 0;
                s
            }
            None => {
                is_currently_playing = false;
                empty_session_count += 1;
                // Refresh manager reference if no session found for multiple ticks
                if empty_session_count > 4 {
                    manager_opt = None;
                }

                // No active session: if we previously had one, reset to default
                if order.select("", "") {
                    last_title.clear();
                    last_artist.clear();
                    last_status.clear();
                    last_position = -1;
                    clock = TimelineClock::default();
                    *selected_lock.write() = None;
                    let default_state = MediaState {
                        source_generation: order.generation,
                        sequence: order.publish(),
                        stream_id: stream_id.clone(),
                        updated_at: SystemTime::now()
                            .duration_since(UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_millis() as i64,
                        ..MediaState::default()
                    };
                    *state_lock.write() = default_state.clone();
                    *art_lock.write() = None;
                    let _ = tx.send(default_state.clone());
                    if let Some(ref handle) = app_handle {
                        let _ = handle.emit("media-update", &default_state);
                    }
                }
                continue;
            }
        };

        // 1. App name
        let app_name = session
            .SourceAppUserModelId()
            .map(|h| clean_app_name(&h.to_string()))
            .unwrap_or_else(|_| "Media Player".into());
        let source_id = session_identity(&session);

        // 2. Playback status
        let playback = session.GetPlaybackInfo().ok();
        let supplied_rate = playback
            .as_ref()
            .and_then(|info| info.PlaybackRate().ok())
            .and_then(|rate| rate.Value().ok());
        let status = playback
            .as_ref()
            .and_then(|info| info.PlaybackStatus().ok())
            .map(|s| match s {
                GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing => "Playing",
                GlobalSystemMediaTransportControlsSessionPlaybackStatus::Paused => "Paused",
                GlobalSystemMediaTransportControlsSessionPlaybackStatus::Stopped => "Stopped",
                GlobalSystemMediaTransportControlsSessionPlaybackStatus::Closed => "Closed",
                GlobalSystemMediaTransportControlsSessionPlaybackStatus::Changing => "Buffering",
                _ => "Paused",
            })
            .unwrap_or("Paused")
            .to_string();

        is_currently_playing = status == "Playing";

        // 3. Timeline properties
        let observation = session
            .GetTimelineProperties()
            .ok()
            .map(|t| TimelineObservation {
                position_ms: t.Position().ok().map(|v| v.Duration / 10_000),
                start_ms: t.StartTime().ok().map(|v| v.Duration / 10_000),
                end_ms: t.EndTime().ok().map(|v| v.Duration / 10_000),
                min_seek_ms: t.MinSeekTime().ok().map(|v| v.Duration / 10_000),
                max_seek_ms: t.MaxSeekTime().ok().map(|v| v.Duration / 10_000),
                updated_ticks: t.LastUpdatedTime().ok().map(|v| v.UniversalTime),
            });

        // 4. Media properties (title, artist, album, thumbnail)
        let (title, artist, album, thumbnail_ref) = session
            .TryGetMediaPropertiesAsync()
            .ok()
            .and_then(|op| op.get().ok())
            .map(|props| {
                let t = props.Title().map(|s| s.to_string()).unwrap_or_default();
                let a = props.Artist().map(|s| s.to_string()).unwrap_or_default();
                let alb = props
                    .AlbumTitle()
                    .map(|s| s.to_string())
                    .unwrap_or_default();
                let thumb = props.Thumbnail().ok();
                (t, a, alb, thumb)
            })
            .unwrap_or_default();

        let track_key = serde_json::to_string(&(&title, &artist, &album)).unwrap_or_default();
        let track_changed = order.select(&source_id, &track_key);
        if track_changed {
            clock = TimelineClock::default();
        }
        let status_changed = status != last_status;
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis() as i64)
            .unwrap_or(0);

        let now_mono = started.elapsed().as_millis() as u64;
        let snapshot = clock.update(observation, now_mono, now, &status, supplied_rate);
        let position_ms = snapshot.position_ms;
        let duration_ms = snapshot.duration_ms;

        let timeline_jumped = (position_ms - last_position).abs() > 1500;
        let periodic_sync = now_mono.saturating_sub(last_broadcast_mono) >= 1000;
        let delayed_art_ready =
            !title.is_empty() && art_lock.read().is_none() && thumbnail_ref.is_some();
        let metadata_updated = {
            let st = state_lock.read();
            st.album_title != album
                || st.duration_ms != duration_ms
                || st.playback_rate != snapshot.playback_rate
                || st.playback_rate_known != snapshot.playback_rate_known
                || st.timeline.raw_observation != snapshot.timeline.raw_observation
                || st.timeline.advancing != snapshot.timeline.advancing
        };

        if track_changed
            || status_changed
            || timeline_jumped
            || periodic_sync
            || delayed_art_ready
            || metadata_updated
        {
            last_title = title.clone();
            last_artist = artist.clone();
            last_status = status.clone();
            last_position = position_ms;
            last_broadcast_mono = now_mono;

            // If track changed or delayed art arrived, fetch album art thumbnail with deduplication
            let mut has_art = false;
            let mut art_ts = 0i64;

            if track_changed || delayed_art_ready {
                if let Some(ref thumb) = thumbnail_ref {
                    if let Some((bytes, content_type)) = extract_thumbnail(thumb) {
                        let is_dup = art_lock
                            .read()
                            .as_ref()
                            .map(|(b, _)| b == &bytes)
                            .unwrap_or(false);
                        if !is_dup {
                            *art_lock.write() = Some((bytes, content_type));
                            art_ts = now;
                        } else {
                            art_ts = state_lock.read().art_timestamp;
                        }
                        has_art = true;
                    } else if track_changed {
                        *art_lock.write() = None;
                    } else {
                        has_art = art_lock.read().is_some();
                        art_ts = state_lock.read().art_timestamp;
                    }
                } else if track_changed {
                    *art_lock.write() = None;
                }
            } else {
                has_art = art_lock.read().is_some();
                art_ts = state_lock.read().art_timestamp;
            }

            let new_state = MediaState {
                title,
                artist,
                album_title: album,
                status,
                position_ms,
                duration_ms,
                app_name,
                art_timestamp: art_ts,
                has_art,
                updated_at: now,
                source_id,
                source_generation: order.generation,
                sequence: order.publish(),
                stream_id: stream_id.clone(),
                playback_rate: snapshot.playback_rate,
                playback_rate_known: snapshot.playback_rate_known,
                timeline: snapshot.timeline,
            };

            // Retain the exact selected COM object for identity and controls.
            *selected_lock.write() = Some((new_state.source_id.clone(), session.clone()));
            *state_lock.write() = new_state.clone();

            // Broadcast to WebSocket clients (OBS/TikTok)
            let _ = tx.send(new_state.clone());

            // Emit to native Tauri window
            if let Some(ref handle) = app_handle {
                if track_changed {
                    let _ = handle.emit("track-changed", &new_state);
                }
                let _ = handle.emit("media-update", &new_state);
            }
        }
    }
}

#[cfg(windows)]
fn extract_thumbnail(thumb_ref: &IRandomAccessStreamReference) -> Option<(Vec<u8>, String)> {
    let stream = thumb_ref.OpenReadAsync().ok()?.get().ok()?;
    let content_type = stream
        .ContentType()
        .map(|s| s.to_string())
        .unwrap_or_else(|_| "image/jpeg".to_string());
    let size = stream.Size().ok()? as u32;
    if size == 0 {
        return None;
    }

    let reader = DataReader::CreateDataReader(&stream).ok()?;
    reader.LoadAsync(size).ok()?.get().ok()?;
    let mut buffer = vec![0u8; size as usize];
    reader.ReadBytes(&mut buffer).ok()?;
    Some((buffer, content_type))
}

fn clean_app_name(raw: &str) -> String {
    let lower = raw.to_lowercase();
    if lower.contains("spotify") {
        "Spotify".to_string()
    } else if lower.contains("brave") {
        "Brave".to_string()
    } else if lower.contains("opera") {
        "Opera".to_string()
    } else if lower.contains("vivaldi") {
        "Vivaldi".to_string()
    } else if lower
        .rsplit(['\\', '/'])
        .next()
        .is_some_and(|name| name == "zen" || name == "zen.exe")
        || lower.starts_with("org.zen_browser.")
    {
        "Zen".to_string()
    } else if lower.contains("chrome") {
        "Google Chrome".to_string()
    } else if lower.contains("msedge") || lower.contains("edge") {
        "Microsoft Edge".to_string()
    } else if lower.contains("firefox") {
        "Mozilla Firefox".to_string()
    } else if lower.contains("apple") || lower.contains("music") {
        "Apple Music".to_string()
    } else if lower.contains("wmplayer") || lower.contains("mediaplayer") {
        "Windows Media".to_string()
    } else if lower.contains("vlc") {
        "VLC".to_string()
    } else {
        // Strip path or extension if present
        let trimmed = raw.split('\\').last().unwrap_or(raw);
        trimmed.replace(".exe", "")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn browser_labels_are_conservative() {
        for (raw, label) in [
            ("Brave.exe", "Brave"),
            ("OperaGX.exe", "Opera"),
            ("Vivaldi.exe", "Vivaldi"),
            ("zen.exe", "Zen"),
            ("org.zen_browser.zen", "Zen"),
        ] {
            assert_eq!(clean_app_name(raw), label);
        }
        assert_eq!(clean_app_name("zenith.exe"), "zenith");
        assert_eq!(clean_app_name("citizen-player.exe"), "citizen-player");
    }

    #[test]
    fn test_is_session_allowed() {
        use crate::media::types::AppFilterRule;

        let empty_rules: Vec<AppFilterRule> = Vec::new();
        assert!(is_session_allowed("Spotify.exe", &empty_rules));
        assert!(is_session_allowed("chrome.exe", &empty_rules));

        let rules = vec![
            AppFilterRule {
                id: "spotify".to_string(),
                match_rule: "spotify".to_string(),
                display_name: "Spotify".to_string(),
                enabled: true,
                category: "music".to_string(),
            },
            AppFilterRule {
                id: "chrome".to_string(),
                match_rule: "chrome".to_string(),
                display_name: "Google Chrome".to_string(),
                enabled: false,
                category: "browser".to_string(),
            },
            AppFilterRule {
                id: "firefox".to_string(),
                match_rule: "firefox".to_string(),
                display_name: "Mozilla Firefox".to_string(),
                enabled: false,
                category: "browser".to_string(),
            },
        ];

        // Allowed app
        assert!(is_session_allowed("Spotify.exe", &rules));
        assert!(is_session_allowed("Spotify Music", &rules));

        // Denied browser apps
        assert!(!is_session_allowed("chrome.exe", &rules));
        assert!(!is_session_allowed("Google Chrome", &rules));
        assert!(!is_session_allowed("Firefox.exe", &rules));

        // Unknown app not in list defaults to allowed
        assert!(is_session_allowed("foobar2000.exe", &rules));
    }
}
