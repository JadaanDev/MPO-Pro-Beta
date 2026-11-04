use tauri::WebviewWindow;

#[cfg(windows)]
use windows::Win32::Foundation::HWND;
#[cfg(windows)]
use windows::Win32::UI::WindowsAndMessaging::{
    GetWindowLongPtrW, SetWindowLongPtrW, GWL_EXSTYLE, WS_EX_NOACTIVATE, WS_EX_TOOLWINDOW, WS_EX_TRANSPARENT,
};

pub fn set_click_through(window: &WebviewWindow, transparent: bool) -> Result<(), String> {
    // 1. Direct hardware-compatible Tauri clickthrough (applies WS_EX_TRANSPARENT natively)
    let _ = window.set_ignore_cursor_events(transparent);

    #[cfg(windows)]
    {
        use windows::Win32::UI::WindowsAndMessaging::{
            SetWindowPos, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, SWP_NOZORDER,
        };

        if let Ok(hwnd_raw) = window.hwnd() {
            let hwnd = HWND(hwnd_raw.0);

            unsafe {
                let current_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
                if current_style != 0 {
                    // CRITICAL FOR ZERO STUTTER IN 3D GAMES & ROCKET LEAGUE:
                    // NEVER set WS_EX_LAYERED! In Tauri 2, transparent windows use DirectComposition.
                    // Setting WS_EX_LAYERED switches DWM to legacy GDI software copy redirection,
                    // which destroys Direct Flip and Multiplane Overlay (MPO) on Rocket League.
                    //
                    // We enforce WS_EX_NOACTIVATE (prevents focus stealing from games)
                    // and WS_EX_TOOLWINDOW (prevents Alt+Tab intrusion and activation hooks).
                    let non_transparent_mask = !(WS_EX_TRANSPARENT.0 as isize);
                    let mut new_style = (current_style & non_transparent_mask)
                        | (WS_EX_NOACTIVATE.0 as isize)
                        | (WS_EX_TOOLWINDOW.0 as isize);

                    if transparent {
                        new_style |= WS_EX_TRANSPARENT.0 as isize;
                    }

                    if new_style != current_style {
                        SetWindowLongPtrW(hwnd, GWL_EXSTYLE, new_style);
                        let _ = SetWindowPos(
                            hwnd,
                            None,
                            0,
                            0,
                            0,
                            0,
                            SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE,
                        );
                    }
                }
            }
        }
    }
    Ok(())
}

#[cfg(windows)]
pub fn is_cursor_inside_window(window: &WebviewWindow) -> bool {
    use windows::Win32::Foundation::{HWND, POINT, RECT};
    use windows::Win32::UI::WindowsAndMessaging::{GetCursorPos, GetWindowRect, IsWindowVisible};

    if !window.is_visible().unwrap_or(false) {
        return false;
    }

    if let Ok(hwnd_raw) = window.hwnd() {
        let hwnd = HWND(hwnd_raw.0);
        unsafe {
            if !IsWindowVisible(hwnd).as_bool() {
                return false;
            }
            let mut pt = POINT { x: 0, y: 0 };
            let mut rect = RECT {
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
            };
            if GetCursorPos(&mut pt).is_ok() && GetWindowRect(hwnd, &mut rect).is_ok() {
                if rect.right > rect.left && rect.bottom > rect.top {
                    return pt.x >= rect.left
                        && pt.x <= rect.right
                        && pt.y >= rect.top
                        && pt.y <= rect.bottom;
                }
            }
        }
    }
    false
}

#[cfg(not(windows))]
pub fn is_cursor_inside_window(_window: &WebviewWindow) -> bool {
    false
}

