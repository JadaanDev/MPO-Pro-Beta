#[cfg(windows)]
use winreg::enums::{HKEY_CURRENT_USER, KEY_READ, KEY_WRITE};
#[cfg(windows)]
use winreg::RegKey;

#[cfg(windows)]
const REG_KEY_RUN: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
#[cfg(windows)]
const REG_KEY_STARTUP_APPROVED: &str =
    r"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run";
#[cfg(windows)]
const APP_NAME: &str = "MPO-pro-beta";

#[cfg(windows)]
fn get_target_executable_path() -> Result<std::path::PathBuf, String> {
    let current_exe = std::env::current_exe()
        .map_err(|e| format!("Failed to get current executable path: {}", e))?;

    let s = current_exe.to_string_lossy();
    // If running in development target directory, prioritize the installed production executable
    if s.contains(r"\target\debug\") || s.contains(r"\target\release\") {
        if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
            let installed_exe = std::path::PathBuf::from(local_app_data)
                .join("MPO-pro-beta")
                .join("mpo-pro-beta.exe");
            if installed_exe.exists() {
                return Ok(installed_exe);
            }
        }
    }
    Ok(current_exe)
}

pub fn is_autostart_enabled() -> bool {
    #[cfg(windows)]
    {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);

        // 1. Verify entry exists in Run key
        let run_key = match hkcu.open_subkey_with_flags(REG_KEY_RUN, KEY_READ) {
            Ok(k) => k,
            Err(_) => return false,
        };
        let run_val: String = match run_key.get_value(APP_NAME) { Ok(value) => value, Err(_) => return false };
        let exe = run_val.trim().strip_prefix('"').and_then(|s| s.split('"').next()).unwrap_or("");
        if exe.is_empty() || !std::path::Path::new(exe).is_file() { return false; }

        // 2. Check StartupApproved\Run if present (Windows 10/11 task manager state)
        if let Ok(approved_key) = hkcu.open_subkey_with_flags(REG_KEY_STARTUP_APPROVED, KEY_READ) {
            if let Ok(raw_val) = approved_key.get_raw_value(APP_NAME) {
                if !raw_val.bytes.is_empty() {
                    let first_byte = raw_val.bytes[0];
                    // Bit 0 set (e.g. 0x03) means disabled in Task Manager / Windows Settings
                    if (first_byte & 0x01) != 0 {
                        return false;
                    }
                }
            }
        }

        true
    }
    #[cfg(not(windows))]
    {
        false
    }
}

pub fn set_autostart(enabled: bool) -> Result<(), String> {
    #[cfg(windows)]
    {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);

        if enabled {
            let target_exe = get_target_executable_path()?;
            let exe_path_str = target_exe.to_string_lossy().to_string();

            // Format with quotes and --autostart argument for silent background startup
            let command_line = format!("\"{}\" --autostart", exe_path_str);

            // 1. Write to HKCU\Software\Microsoft\Windows\CurrentVersion\Run
            let (run_key, _) = hkcu
                .create_subkey(REG_KEY_RUN)
                .map_err(|e| format!("Failed to open/create registry Run key: {}", e))?;
            run_key
                .set_value(APP_NAME, &command_line)
                .map_err(|e| format!("Failed to set Run registry value: {}", e))?;

            if !is_autostart_enabled() {
                return Err("Windows has disabled MPO-pro in Startup apps. Enable it in Windows Settings > Apps > Startup.".into());
            }
        } else {
            // 1. Remove from Run key
            if let Ok(run_key) = hkcu.open_subkey_with_flags(REG_KEY_RUN, KEY_WRITE) {
                let _ = run_key.delete_value(APP_NAME);
            }

        }

        Ok(())
    }
    #[cfg(not(windows))]
    {
        let _ = enabled;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[cfg(windows)]
    fn test_autostart_toggle_cycle() {
        let initial = is_autostart_enabled();
        // Enable autostart
        let res = set_autostart(true);
        assert!(res.is_ok(), "set_autostart(true) failed: {:?}", res);
        assert!(is_autostart_enabled(), "Expected autostart to be enabled");

        // Verify registry content
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let run_key = hkcu.open_subkey_with_flags(REG_KEY_RUN, KEY_READ).unwrap();
        let val: String = run_key.get_value(APP_NAME).unwrap();
        assert!(val.starts_with('"'), "Executable path must start with a quote: {}", val);
        assert!(
            val.contains("\" --autostart"),
            "Command line must contain quoted exe and --autostart: {}",
            val
        );

        let approved_key = hkcu.open_subkey_with_flags(REG_KEY_STARTUP_APPROVED, KEY_READ).unwrap();
        let raw = approved_key.get_raw_value(APP_NAME).unwrap();
        assert_eq!(raw.bytes[0], 0x02, "Expected 0x02 enabled byte");

        // Restore initial state if it was false
        if !initial {
            let _ = set_autostart(false);
            assert!(!is_autostart_enabled(), "Expected autostart to be disabled");
        }
    }
}

