use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use parking_lot::RwLock;
use tokio::sync::broadcast;
use tauri::{AppHandle, Emitter};

use super::types::{AppFilterRule, MediaState};

#[cfg(windows)]
use windows::{
    Media::Control::{
        GlobalSystemMediaTransportControlsSessionManager,
        GlobalSystemMediaTransportControlsSessionPlaybackStatus,
    },
    Storage::Streams::{DataReader, IRandomAccessStreamReference},
};

pub struct GsmtcManager {
    pub current_state: Arc<RwLock<MediaState>>,
    pub current_art: Arc<RwLock<Option<(Vec<u8>, String)>>>,
    pub filter_rules: Arc<RwLock<Vec<AppFilterRule>>>,
    pub tx: broadcast::Sender<MediaState>,
    pub eco_mode: Arc<AtomicBool>,
}

impl GsmtcManager {
    pub fn new(tx: broadcast::Sender<MediaState>) -> Self {
        Self {
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

        std::thread::Builder::new()
            .name("gsmtc-watcher".to_string())
            .spawn(move || {
                #[cfg(windows)]
                watcher_loop(state_lock, art_lock, rules_lock, tx, app_handle, eco_lock);
            })
            .expect("Failed to spawn GSMTC watcher thread");
    }

    pub fn handle_control(&self, action: &str) -> Result<(), String> {
        #[cfg(windows)]
        {
            let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
                .map_err(|e| e.to_string())?
                .get()
                .map_err(|e| e.to_string())?;

            let rules = self.filter_rules.read().clone();
            if let Some(session) = get_best_session(&manager, &rules) {
                match action {
                    "PlayPause" => {
                        let _ = session.TryTogglePlayPauseAsync();
                    }
                    "Next" => {
                        let _ = session.TrySkipNextAsync();
                    }
                    "Previous" => {
                        let _ = session.TrySkipPreviousAsync();
                    }
                    _ => return Err(format!("Unknown control action: {}", action)),
                }
                return Ok(());
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
fn get_best_session(
    manager: &GlobalSystemMediaTransportControlsSessionManager,
    rules: &[AppFilterRule],
) -> Option<windows::Media::Control::GlobalSystemMediaTransportControlsSession> {
    if let Ok(sessions) = manager.GetSessions() {
        // Prefer Windows' current session when it is allowed and playing, rather
        // than relying on the order in which the OS enumerates sessions.
        let current = manager.GetCurrentSession().ok().filter(|session| {
            let id = session.SourceAppUserModelId().map(|v| v.to_string()).unwrap_or_default();
            is_session_allowed(&id, rules)
        });
        if let Some(ref session) = current {
            if session.GetPlaybackInfo().ok().and_then(|info| info.PlaybackStatus().ok())
                == Some(GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing) {
                return Some(session.clone());
            }
        }
        let mut first_allowed_session = None;
        let mut fallback_any_session = None;

        for s in sessions {
            let app_id = s.SourceAppUserModelId().map(|h| h.to_string()).unwrap_or_default();
            let allowed = is_session_allowed(&app_id, rules);

            if fallback_any_session.is_none() {
                fallback_any_session = Some(s.clone());
            }

            if allowed {
                if let Ok(info) = s.GetPlaybackInfo() {
                    if let Ok(status) = info.PlaybackStatus() {
                        if status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing {
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
        if current.is_some() { return current; }
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
        let app_id = current.SourceAppUserModelId().map(|h| h.to_string()).unwrap_or_default();
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
) {
    let mut last_title = String::new();
    let mut last_artist = String::new();
    let mut last_status = String::new();
    let mut last_position = -1i64;
    let mut manager_opt: Option<GlobalSystemMediaTransportControlsSessionManager> = None;
    let mut empty_session_count = 0;
    let mut last_broadcast_time = 0i64;
    let mut is_currently_playing = false;

    loop {
        // Relaxed adaptive sleep:
        // Normal: 1000ms playing, 1500ms paused.
        // Gaming / Streaming Eco Mode: 1200ms playing, 2000ms paused.
        // Completely eliminates continuous COM WinRT lock contention without causing long freezes.
        let is_eco = eco_lock.load(Ordering::SeqCst);
        let sleep_ms = if is_eco {
            if is_currently_playing { 1200 } else { 2000 }
        } else {
            if is_currently_playing { 1000 } else { 1500 }
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
                if !last_title.is_empty() {
                    last_title.clear();
                    last_artist.clear();
                    last_status.clear();
                    last_position = -1;
                    let default_state = MediaState::default();
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
            .map(|h| {
                let name = h.to_string();
                clean_app_name(&name)
            })
            .unwrap_or_else(|_| "Media Player".to_string());

        // 2. Playback status
        let status = session
            .GetPlaybackInfo()
            .ok()
            .and_then(|info| info.PlaybackStatus().ok())
            .map(|s| match s {
                GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing => "Playing",
                GlobalSystemMediaTransportControlsSessionPlaybackStatus::Paused => "Paused",
                GlobalSystemMediaTransportControlsSessionPlaybackStatus::Stopped => "Stopped",
                GlobalSystemMediaTransportControlsSessionPlaybackStatus::Closed => "Closed",
                _ => "Paused",
            })
            .unwrap_or("Paused")
            .to_string();

        is_currently_playing = status == "Playing";

        // 3. Timeline properties
        let (raw_position_ms, duration_ms, last_updated_time) = session
            .GetTimelineProperties()
            .ok()
            .map(|t| {
                let pos = t.Position().map(|p| p.Duration / 10_000).unwrap_or(0);
                let end = t.EndTime().map(|e| e.Duration / 10_000).unwrap_or(0);
                let lut = t.LastUpdatedTime().ok();
                (pos, end, lut)
            })
            .unwrap_or((0, 0, None));

        // 4. Media properties (title, artist, album, thumbnail)
        let (title, artist, album, thumbnail_ref) = session
            .TryGetMediaPropertiesAsync()
            .ok()
            .and_then(|op| op.get().ok())
            .map(|props| {
                let t = props.Title().map(|s| s.to_string()).unwrap_or_default();
                let a = props.Artist().map(|s| s.to_string()).unwrap_or_default();
                let alb = props.AlbumTitle().map(|s| s.to_string()).unwrap_or_default();
                let thumb = props.Thumbnail().ok();
                (t, a, alb, thumb)
            })
            .unwrap_or_default();

        let track_changed = title != last_title || artist != last_artist;
        let status_changed = status != last_status;
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis() as i64)
            .unwrap_or(0);

        // Compute true live playback position by adding elapsed time since LastUpdatedTime
        let position_ms = calculate_live_position(
            raw_position_ms,
            duration_ms,
            last_updated_time.map(|lut| lut.UniversalTime),
            now,
            status == "Playing",
        );

        let timeline_jumped = (position_ms - last_position).abs() > 1500;
        let periodic_sync = status == "Playing" && (now - last_broadcast_time > 1000);
        let delayed_art_ready = !title.is_empty() && art_lock.read().is_none() && thumbnail_ref.is_some();
        let metadata_updated = {
            let st = state_lock.read();
            st.album_title != album || (st.duration_ms != duration_ms && duration_ms > 0)
        };

        if track_changed || status_changed || timeline_jumped || periodic_sync || delayed_art_ready || metadata_updated {
            last_title = title.clone();
            last_artist = artist.clone();
            last_status = status.clone();
            last_position = position_ms;
            last_broadcast_time = now;

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
            };

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

/// Calculates the true live playback position in milliseconds from GSMTC timeline properties.
///
/// Windows GSMTC reports `Position` as of `LastUpdatedTime`, NOT the continuous real-time position.
/// For media players like Spotify, `Position` and `LastUpdatedTime` only update once every ~5 seconds.
/// Without adding the elapsed time since `LastUpdatedTime`, the position appears frozen for 5 seconds,
/// causing the client scrubber to suffer from backward time glitches and forward jumps.
pub fn calculate_live_position(
    raw_pos_ms: i64,
    duration_ms: i64,
    last_updated_ticks: Option<i64>,
    now_unix_ms: i64,
    is_playing: bool,
) -> i64 {
    if !is_playing {
        return raw_pos_ms;
    }

    if let Some(ticks_since_1601) = last_updated_ticks {
        // 116_444_736_000_000_000 is 100-ns ticks between 1601-01-01 and 1970-01-01 (Windows FILETIME epoch offset)
        let lut_unix_ms = (ticks_since_1601 - 116_444_736_000_000_000) / 10_000;
        let elapsed = if now_unix_ms >= lut_unix_ms {
            (now_unix_ms - lut_unix_ms).min(30_000)
        } else {
            0
        };
        let live_pos = raw_pos_ms + elapsed;
        if duration_ms > 0 {
            live_pos.min(duration_ms)
        } else {
            live_pos
        }
    } else {
        raw_pos_ms
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_live_position_playing() {
        // Unix ms: 1788815206892
        // Windows ticks for that instant: (1788815206892 * 10_000) + 116_444_736_000_000_000
        let now = 1_788_815_206_892i64;
        let lut_unix = now - 3_500; // Updated 3.5 seconds ago
        let lut_ticks = (lut_unix * 10_000) + 116_444_736_000_000_000;

        let raw_pos = 20_000; // 20s
        let duration = 180_000; // 3m

        let live_pos = calculate_live_position(raw_pos, duration, Some(lut_ticks), now, true);
        assert_eq!(live_pos, 23_500); // 20s + 3.5s elapsed = 23.5s
    }

    #[test]
    fn test_calculate_live_position_paused() {
        let now = 1_788_815_206_892i64;
        let lut_unix = now - 5_000;
        let lut_ticks = (lut_unix * 10_000) + 116_444_736_000_000_000;

        let raw_pos = 20_000;
        let duration = 180_000;

        let live_pos = calculate_live_position(raw_pos, duration, Some(lut_ticks), now, false);
        assert_eq!(live_pos, 20_000); // Does NOT advance when paused
    }

    #[test]
    fn test_calculate_live_position_clamped_to_duration() {
        let now = 1_788_815_206_892i64;
        let lut_unix = now - 10_000;
        let lut_ticks = (lut_unix * 10_000) + 116_444_736_000_000_000;

        let raw_pos = 175_000;
        let duration = 180_000;

        let live_pos = calculate_live_position(raw_pos, duration, Some(lut_ticks), now, true);
        assert_eq!(live_pos, 180_000); // Clamped to duration (175s + 10s > 180s)
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

