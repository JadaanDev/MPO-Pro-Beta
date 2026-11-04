use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};

#[cfg(windows)]
use windows::Win32::Foundation::{CloseHandle, HWND};
#[cfg(windows)]
use windows::Win32::System::Threading::{
    GetCurrentProcess, OpenProcess, SetPriorityClass, NORMAL_PRIORITY_CLASS,
    PROCESS_QUERY_LIMITED_INFORMATION,
};
#[cfg(windows)]
use windows::Win32::System::ProcessStatus::K32GetProcessImageFileNameW;
#[cfg(windows)]
use windows::Win32::UI::Shell::{
    SHQueryUserNotificationState,
    QUNS_RUNNING_D3D_FULL_SCREEN,
};
#[cfg(windows)]
use windows::Win32::UI::WindowsAndMessaging::{
    FindWindowW, GetClassNameW, GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId, IsWindowVisible,
};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PerformanceState {
    pub is_game_active: bool,
    pub is_streaming_active: bool,
    pub game_title: Option<String>,
    pub streaming_apps: Vec<String>,
    pub optimization_enabled: bool,
    pub hud_behavior: String, // "eco" | "hide" | "normal"
    pub priority_lowered: bool,
}

impl Default for PerformanceState {
    fn default() -> Self {
        Self {
            is_game_active: false,
            is_streaming_active: false,
            game_title: None,
            streaming_apps: Vec::new(),
            optimization_enabled: false,
            hud_behavior: "normal".to_string(),
            priority_lowered: false,
        }
    }
}

pub struct PerformanceManager {
    state: Arc<RwLock<PerformanceState>>,
    is_hud_hidden_by_game: Arc<AtomicBool>,
}

fn get_config_path() -> PathBuf {
    let config_dir = std::env::var("APPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("MPO-pro-beta");
    let _ = std::fs::create_dir_all(&config_dir);
    config_dir.join("performance_config.json")
}

fn load_saved_settings() -> (bool, String) {
    let p = get_config_path();
    if let Ok(s) = std::fs::read_to_string(p) {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&s) {
            let opt = v.get("optimization_enabled").and_then(|b| b.as_bool()).unwrap_or(false);
            let behavior = v.get("hud_behavior").and_then(|s| s.as_str()).filter(|v| valid_hud_behavior(v)).unwrap_or("normal").to_string();
            return (opt, behavior);
        }
    }
    (false, "normal".to_string())
}

fn save_settings(opt: bool, behavior: &str) -> Result<(), String> {
    let p = get_config_path();
    let json = serde_json::json!({
        "optimization_enabled": opt,
        "hud_behavior": behavior,
    });
    let s = serde_json::to_string_pretty(&json).map_err(|e| e.to_string())?;
    std::fs::write(p, s).map_err(|e| format!("Could not save performance settings: {e}"))
}

fn valid_hud_behavior(value: &str) -> bool { matches!(value, "eco" | "hide" | "flyout" | "normal") }

impl PerformanceManager {
    pub fn new() -> Self {
        let (opt, behavior) = load_saved_settings();
        let mut initial = PerformanceState::default();
        initial.optimization_enabled = opt;
        initial.hud_behavior = behavior;

        Self {
            state: Arc::new(RwLock::new(initial)),
            is_hud_hidden_by_game: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn get_state(&self) -> PerformanceState {
        self.state.read().clone()
    }

    pub fn is_eco_mode_active(&self) -> bool {
        let s = self.state.read();
        s.optimization_enabled && (s.is_game_active || s.is_streaming_active)
    }

    pub fn is_game_active(&self) -> bool {
        let s = self.state.read();
        s.optimization_enabled && s.is_game_active && s.hud_behavior != "normal"
    }

    pub fn is_overlay_hidden_by_game(&self) -> bool {
        self.is_hud_hidden_by_game.load(Ordering::SeqCst)
    }

    pub fn set_optimization_enabled(&self, enabled: bool, app: &AppHandle) -> Result<(), String> {
        let mut s = self.state.write();
        save_settings(enabled, &s.hud_behavior)?;
        s.optimization_enabled = enabled;
        self.apply_process_priority(enabled && (s.is_game_active || s.is_streaming_active));
        if !enabled && self.is_hud_hidden_by_game.swap(false, Ordering::SeqCst) {
            if let Some(win) = app.get_webview_window("overlay") {
                let _ = win.show();
                let _ = app.emit("overlay-visibility-changed", true);
            }
        } else if enabled && s.is_game_active && matches!(s.hud_behavior.as_str(), "hide" | "flyout") {
            if let Some(win) = app.get_webview_window("overlay") {
                if win.is_visible().unwrap_or(false) {
                    self.is_hud_hidden_by_game.store(true, Ordering::SeqCst);
                    let _ = win.hide();
                    let _ = app.emit("overlay-visibility-changed", false);
                }
            }
        }
        let _ = app.emit("game-performance-changed", &*s);
        Ok(())
    }

    pub fn set_hud_behavior(&self, behavior: String, app_handle: Option<&AppHandle>) -> Result<(), String> {
        if !valid_hud_behavior(&behavior) { return Err("Invalid game overlay behavior".to_string()); }
        let mut s = self.state.write();
        save_settings(s.optimization_enabled, &behavior)?;
        s.hud_behavior = behavior.clone();
        if let Some(handle) = app_handle {
            if let Some(win) = handle.get_webview_window("overlay") {
                if s.optimization_enabled && s.is_game_active && matches!(behavior.as_str(), "hide" | "flyout") {
                    if win.is_visible().unwrap_or(false) {
                        self.is_hud_hidden_by_game.store(true, Ordering::SeqCst);
                        let _ = win.hide();
                        let _ = handle.emit("overlay-visibility-changed", false);
                    }
                } else if self.is_hud_hidden_by_game.swap(false, Ordering::SeqCst) {
                    let _ = win.show();
                    let _ = handle.emit("overlay-visibility-changed", true);
                }
            }
            let _ = handle.emit("game-performance-changed", &*s);
        }
        Ok(())
    }

    fn apply_process_priority(&self, _lower_priority: bool) {
        #[cfg(windows)]
        unsafe {
            let proc = GetCurrentProcess();
            // Maintain NORMAL_PRIORITY_CLASS (matching rl-boost-designer)
            // Never lower to BELOW_NORMAL_PRIORITY_CLASS (EcoQoS) to avoid starving WebView2 timers & IPC.
            let _ = SetPriorityClass(proc, NORMAL_PRIORITY_CLASS);
        }
    }

    pub fn start_monitor(&self, app_handle: AppHandle, gsmtc_eco: Option<Arc<AtomicBool>>) {
        let state_lock = self.state.clone();
        let hidden_by_game = self.is_hud_hidden_by_game.clone();

        std::thread::Builder::new()
            .name("mpo-performance-monitor".to_string())
            .spawn(move || {
                let mut last_game = false;
                let mut last_stream = false;
                let mut last_game_name = None;
                let mut last_stream_apps = Vec::new();
                let mut last_fg_hwnd: isize = 0;
                let mut cached_game_res: (bool, Option<String>) = (false, None);

                loop {
                    std::thread::sleep(std::time::Duration::from_millis(1500));

                    let opt_enabled = state_lock.read().optimization_enabled;
                    let hud_behavior = state_lock.read().hud_behavior.clone();

                    let (game_active, game_name) = detect_active_game(&mut last_fg_hwnd, &mut cached_game_res);
                    let (stream_active, stream_apps) = detect_active_streaming_software();

                    let state_changed = game_active != last_game
                        || stream_active != last_stream
                        || game_name != last_game_name
                        || stream_apps != last_stream_apps;

                    if state_changed {
                        last_game = game_active;
                        last_stream = stream_active;
                        last_game_name = game_name.clone();
                        last_stream_apps = stream_apps.clone();

                        let should_eco = opt_enabled && (game_active || stream_active);

                        #[cfg(windows)]
                        unsafe {
                            let proc = GetCurrentProcess();
                            let _ = SetPriorityClass(proc, NORMAL_PRIORITY_CLASS);
                        }

                        // Synchronize GSMTC media polling rate
                        if let Some(ref flag) = gsmtc_eco {
                            flag.store(should_eco, Ordering::SeqCst);
                        }

                        {
                            let mut s = state_lock.write();
                            s.is_game_active = game_active;
                            s.is_streaming_active = stream_active;
                            s.game_title = game_name;
                            s.streaming_apps = stream_apps;
                            s.priority_lowered = false;
                        }

                        let current_state = state_lock.read().clone();
                        let _ = app_handle.emit("game-performance-changed", &current_state);

                        // Handle HUD auto-hide or flyout behavior during games
                        if opt_enabled && (hud_behavior == "hide" || hud_behavior == "flyout") {
                            if let Some(win) = app_handle.get_webview_window("overlay") {
                                if game_active {
                                    if win.is_visible().unwrap_or(false) {
                                        hidden_by_game.store(true, Ordering::SeqCst);
                                        let _ = win.hide();
                                        let _ = app_handle.emit("overlay-visibility-changed", false);
                                    }
                                } else if hidden_by_game.swap(false, Ordering::SeqCst) {
                                    // Game finished/alt-tabbed: restore overlay
                                    let _ = win.show();
                                    let _ = app_handle.emit("overlay-visibility-changed", true);
                                }
                            }
                        }
                    }
                }
            })
            .expect("Failed to spawn performance monitor thread");
    }
}

#[cfg(windows)]
unsafe fn get_foreground_process_info(hwnd: HWND) -> Option<(String, String)> {
    if hwnd.is_invalid() || !IsWindowVisible(hwnd).as_bool() {
        return None;
    }

    let mut pid: u32 = 0;
    GetWindowThreadProcessId(hwnd, Some(&mut pid));
    if pid == 0 {
        return None;
    }

    // Open process handle with limited query rights (works across security boundaries & anti-cheats)
    if let Ok(handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
        let mut buf = [0u16; 1024];
        let len = K32GetProcessImageFileNameW(handle, &mut buf);
        let _ = CloseHandle(handle);

        if len > 0 {
            let full_path = String::from_utf16_lossy(&buf[..len as usize]);
            let exe_name = full_path
                .rsplit('\\')
                .next()
                .unwrap_or("")
                .to_lowercase();
            return Some((exe_name, full_path.to_lowercase()));
        }
    }
    None
}

/// Detects whether a Direct3D or borderless fullscreen game is active on Windows
fn detect_active_game(
    last_fg_hwnd: &mut isize,
    cached_game: &mut (bool, Option<String>),
) -> (bool, Option<String>) {
    #[cfg(windows)]
    unsafe {
        let fg_hwnd = GetForegroundWindow();
        let fg_raw = fg_hwnd.0 as isize;

        // CRITICAL PERFORMANCE & ZERO-STUTTER OPTIMIZATION:
        // If the foreground HWND has not changed, reuse the cached detection.
        // This avoids calling OpenProcess and K32GetProcessImageFileNameW on RocketLeague.exe
        // every 1.5 seconds, eliminating kernel context switches and anti-cheat hooks completely.
        if fg_raw != 0 && fg_raw == *last_fg_hwnd {
            return cached_game.clone();
        }
        *last_fg_hwnd = fg_raw;

        if !fg_hwnd.is_invalid() && IsWindowVisible(fg_hwnd).as_bool() {
            let class_name = get_window_class(fg_hwnd);
            let title = get_window_title(fg_hwnd);

            // 1. Direct Executable & Process Name Inspection
            if let Some((exe_name, full_path)) = get_foreground_process_info(fg_hwnd) {
                // Rocket League check (Direct executable match)
                if exe_name == "rocketleague.exe" {
                    *cached_game = (true, Some("Rocket League".to_string()));
                    return cached_game.clone();
                }

                // Competitive & Popular 3D Game Executables
                let known_game = match exe_name.as_str() {
                    "cs2.exe" | "csgo.exe" => Some("Counter-Strike 2"),
                    "valorant-win64-shipping.exe" | "valorant.exe" => Some("VALORANT"),
                    "fortniteclient-win64-shipping.exe" | "fortnite.exe" => Some("Fortnite"),
                    "overwatch.exe" => Some("Overwatch 2"),
                    "r5apex.exe" | "apexlegends.exe" => Some("Apex Legends"),
                    "league of legends.exe" => Some("League of Legends"),
                    "dota2.exe" => Some("Dota 2"),
                    "tslgame.exe" => Some("PUBG: BATTLEGROUNDS"),
                    "rainbowsix.exe" => Some("Rainbow Six Siege"),
                    "cod.exe" | "modernwarfare.exe" | "warzone.exe" => Some("Call of Duty"),
                    "gta5.exe" => Some("Grand Theft Auto V"),
                    "cyberpunk2077.exe" => Some("Cyberpunk 2077"),
                    "destiny2.exe" => Some("Destiny 2"),
                    "eldenring.exe" => Some("ELDEN RING"),
                    "helldivers2.exe" => Some("HELLDIVERS 2"),
                    "fifa.exe" | "fc24.exe" | "fc25.exe" => Some("EA Sports FC"),
                    "baldursgate3.exe" | "bg3.exe" | "bg3_dx11.exe" => Some("Baldur's Gate 3"),
                    "genshinimpact.exe" => Some("Genshin Impact"),
                    "starrail.exe" => Some("Honkai: Star Rail"),
                    "robloxplayerbeta.exe" => Some("Roblox"),
                    _ => None,
                };

                if let Some(name) = known_game {
                    *cached_game = (true, Some(name.to_string()));
                    return cached_game.clone();
                }

                // Heuristic for games installed in Steam, Epic Games, Riot, Ubisoft, Xbox, etc.
                let is_in_game_dir = full_path.contains("\\steamapps\\common\\")
                    || full_path.contains("\\epic games\\")
                    || full_path.contains("\\riot games\\")
                    || full_path.contains("\\ubisoft games\\")
                    || full_path.contains("\\ubisoft game launcher\\games\\")
                    || full_path.contains("\\gog games\\")
                    || full_path.contains("\\xboxgames\\")
                    || full_path.contains("\\ea games\\")
                    || full_path.contains("\\games\\");

                let is_excluded_tool = exe_name.contains("steam")
                    || exe_name.contains("epicgames")
                    || exe_name.contains("riotclient")
                    || exe_name.contains("discord")
                    || exe_name.contains("chrome")
                    || exe_name.contains("msedge")
                    || exe_name.contains("firefox")
                    || exe_name.contains("spotify")
                    || exe_name.contains("code")
                    || exe_name.contains("devenv")
                    || exe_name.contains("taskmgr")
                    || exe_name.contains("explorer")
                    || exe_name.contains("mpo-pro");

                if is_in_game_dir && !is_excluded_tool {
                    let clean_title = title.filter(|t| !t.is_empty()).unwrap_or_else(|| {
                        exe_name.strip_suffix(".exe").unwrap_or(&exe_name).to_string()
                    });
                    *cached_game = (true, Some(clean_title));
                    return cached_game.clone();
                }
            }

            // 2. Unreal Engine Class or Title Check (Rocket League runs on Unreal Engine)
            if let Some(ref c) = class_name {
                if c == "LaunchUnrealUWindowsClient" {
                    *cached_game = (true, Some("Rocket League".to_string()));
                    return cached_game.clone();
                }
            }

            if let Some(ref t) = title {
                let lower_title = t.to_lowercase();
                if lower_title.contains("rocket league") {
                    *cached_game = (true, Some("Rocket League".to_string()));
                    return cached_game.clone();
                }
            }

        }

        // 4. Fallback Direct3D Fullscreen detection via Shell Notification State
        // (Only true D3D Full Screen, ignoring presentation mode)
        if let Ok(state) = SHQueryUserNotificationState() {
            if state == QUNS_RUNNING_D3D_FULL_SCREEN {
                let fg_hwnd = GetForegroundWindow();
                let title = get_window_title(fg_hwnd);
                *cached_game = (true, Some(title.unwrap_or_else(|| "Direct3D Fullscreen Game".to_string())));
                return cached_game.clone();
            }
        }

        // 5. Check if Rocket League window exists anywhere on the system (even if momentarily unfocused)
        // (Exact signatures matching rl-boost-designer)
        let rl_title_cooked: Vec<u16> = "Rocket League (64-bit, DX11, Cooked)\0".encode_utf16().collect();
        let mut rl_hwnd = FindWindowW(None, windows::core::PCWSTR(rl_title_cooked.as_ptr())).unwrap_or_default();
        if rl_hwnd.is_invalid() {
            let rl_title_simple: Vec<u16> = "Rocket League\0".encode_utf16().collect();
            rl_hwnd = FindWindowW(None, windows::core::PCWSTR(rl_title_simple.as_ptr())).unwrap_or_default();
        }
        if rl_hwnd.is_invalid() {
            let rl_class: Vec<u16> = "LaunchUnrealUWindowsClient\0".encode_utf16().collect();
            rl_hwnd = FindWindowW(windows::core::PCWSTR(rl_class.as_ptr()), None).unwrap_or_default();
        }
        if !rl_hwnd.is_invalid() && IsWindowVisible(rl_hwnd).as_bool() {
            *cached_game = (true, Some("Rocket League".to_string()));
            return cached_game.clone();
        }
    }

    *cached_game = (false, None);
    cached_game.clone()
}

/// Detects running live streaming software (OBS Studio, TikTok Live Studio, etc.)
fn detect_active_streaming_software() -> (bool, Vec<String>) {
    let mut detected = Vec::new();

    #[cfg(windows)]
    unsafe {
        // 1. Check OBS Studio
        let obs_title: Vec<u16> = "OBS ".encode_utf16().chain(std::iter::once(0)).collect();
        let obs_hwnd = FindWindowW(None, windows::core::PCWSTR(obs_title.as_ptr()));
        let mut obs_found = obs_hwnd.map(|h| !h.is_invalid()).unwrap_or(false);

        // 2. Check TikTok Live Studio
        let tiktok_title: Vec<u16> = "TikTok LIVE Studio".encode_utf16().chain(std::iter::once(0)).collect();
        let tiktok_hwnd = FindWindowW(None, windows::core::PCWSTR(tiktok_title.as_ptr()));
        let mut tiktok_found = tiktok_hwnd.map(|h| !h.is_invalid()).unwrap_or(false);

        // Also check foreground window title or common streaming software
        let fg = GetForegroundWindow();
        if !fg.is_invalid() {
            if let Some(t) = get_window_title(fg) {
                let lower = t.to_lowercase();
                if lower.contains("obs") && !obs_found {
                    obs_found = true;
                }
                if (lower.contains("tiktok live") || lower.contains("tiktok studio")) && !tiktok_found {
                    tiktok_found = true;
                }
                if lower.contains("streamlabs") {
                    detected.push("Streamlabs Desktop".to_string());
                }
                if lower.contains("twitch studio") {
                    detected.push("Twitch Studio".to_string());
                }
            }
        }

        if obs_found {
            detected.push("OBS Studio".to_string());
        }
        if tiktok_found {
            detected.push("TikTok Live Studio".to_string());
        }
    }

    let is_streaming = !detected.is_empty();
    (is_streaming, detected)
}

#[cfg(windows)]
unsafe fn get_window_title(hwnd: HWND) -> Option<String> {
    let mut buf = [0u16; 256];
    let len = GetWindowTextW(hwnd, &mut buf);
    if len > 0 {
        Some(String::from_utf16_lossy(&buf[..len as usize]))
    } else {
        None
    }
}

#[cfg(windows)]
unsafe fn get_window_class(hwnd: HWND) -> Option<String> {
    let mut buf = [0u16; 256];
    let len = GetClassNameW(hwnd, &mut buf);
    if len > 0 {
        Some(String::from_utf16_lossy(&buf[..len as usize]))
    } else {
        None
    }
}

#[cfg(test)]
mod settings_tests {
    use super::valid_hud_behavior;
    #[test]
    fn accepts_only_supported_hud_behaviors() {
        for value in ["eco", "hide", "flyout", "normal"] { assert!(valid_hud_behavior(value)); }
        assert!(!valid_hud_behavior("invalid"));
        assert!(!valid_hud_behavior(""));
    }
}
