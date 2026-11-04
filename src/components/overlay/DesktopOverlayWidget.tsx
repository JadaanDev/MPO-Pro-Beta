import React, { useState, useEffect, useRef } from "react";
import { 
  GripHorizontal, 
  Unlock, 
  Settings2, 
  X,
  Sparkles,
  Eye,
  EyeOff
} from "lucide-react";

interface DesktopOverlayWidgetProps {
  children: React.ReactNode;
  format?: "horizontal" | "vertical";
}

export const DesktopOverlayWidget: React.FC<DesktopOverlayWidgetProps> = ({
  children,
  format = "horizontal",
}) => {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!(window as any).__TAURI_INTERNALS__) return;
    const boundary = container.current?.querySelector<HTMLElement>(".mpo-theme-effect-boundary");
    if (!boundary) return;
    let disposed = false;
    let lastSize = "";
    let frame = 0;
    const resize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = boundary.offsetWidth, height = boundary.offsetHeight;
        const key = `${width}x${height}`;
        if (!width || !height || lastSize === key) return;
        lastSize = key;
        import("@tauri-apps/api/core").then(({ invoke }) => {
          if (!disposed) return invoke("resize_desktop_overlay", { width, height });
        }).catch(error => { lastSize = ""; console.error("Could not fit overlay paint bounds:", error); });
      });
    };
    const observer = new ResizeObserver(resize);
    observer.observe(boundary);
    resize();
    return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem("mpo_auto_lock_hud") === "true";
    } catch {
      return false;
    }
  });
  const [showToast, setShowToast] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);
  const [toastMessage, setToastMessage] = useState("");
  const [lockKeyLabel, setLockKeyLabel] = useState<string>("Ctrl+Shift+L");
  const [fadeOnHoverLocked, setFadeOnHoverLocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem("mpo_hud_fade_on_hover") === "true";
    } catch {
      return false;
    }
  });
  const [isHoveredWhileLocked, setIsHoveredWhileLocked] = useState(false);

  useEffect(() => {
    // Read configured hotkey
    try {
      const saved = localStorage.getItem("mpo_hotkeys");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lock) setLockKeyLabel(parsed.lock);
      }
    } catch {}

    const handleHotkeysUpdated = () => {
      try {
        const saved = localStorage.getItem("mpo_hotkeys");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.lock) setLockKeyLabel(parsed.lock);
        }
      } catch {}
    };
    window.addEventListener("mpo_hotkeys_updated", handleHotkeysUpdated);

    const handleGhostSettingUpdated = () => {
      try {
        setFadeOnHoverLocked(localStorage.getItem("mpo_hud_fade_on_hover") === "true");
      } catch {}
    };
    window.addEventListener("mpo_hud_fade_on_hover_changed", handleGhostSettingUpdated);

    let unlistenLockFn: (() => void) | null = null;
    let unlistenHoverFn: (() => void) | null = null;
    let unlistenPerfFn: (() => void) | null = null;

    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      // Check initial click-through lock state
      import("@tauri-apps/api/core").then(({ invoke }) => {
        invoke<boolean>("get_overlay_click_through")
          .then((locked) => {
            const isL = Boolean(locked);
            setIsLocked(isL);
            if (!isL) setIsHoveredWhileLocked(false);
          })
          .catch(() => {});

        invoke<{ is_game_active: boolean; is_streaming_active: boolean; game_title: string | null; optimization_enabled: boolean; hud_behavior: string }>("get_performance_state")
          .then((state) => {
            if (state && typeof window !== "undefined") {
              (window as any).__mpoEcoMode = false;
              (window as any).__mpoGameActive = false;
              window.dispatchEvent(new CustomEvent("mpo_perf_changed", { detail: state }));
            }
          })
          .catch(() => {});
      });

      // Listen to clickthrough changes from global hotkey
      import("@tauri-apps/api/event").then(({ listen }) => {
        listen<boolean>("overlay-clickthrough-changed", (event) => {
          setIsLocked(event.payload);
          if (!event.payload) {
            setIsHoveredWhileLocked(false);
          }
          if (event.payload) {
            triggerToast(`Locked click-through • ${lockKeyLabel} to unlock`);
          } else {
            triggerToast("Unlocked move mode • Drag handle to move");
          }
        }).then((fn) => { unlistenLockFn = fn; });

        // Listen to Win32 cursor tracking for ghost peek mode when locked
        listen<boolean>("overlay-hover-changed", (event) => {
          setIsHoveredWhileLocked(Boolean(event.payload));
        }).then((fn) => { unlistenHoverFn = fn; });

        // Listen to Game & Streamer performance engine events (Eco HUD feature deprecated)
        listen<any>("game-performance-changed", (event) => {
          const data = event.payload;
          if (data && typeof window !== "undefined") {
            (window as any).__mpoEcoMode = false;
            (window as any).__mpoGameActive = false;
            window.dispatchEvent(new CustomEvent("mpo_perf_changed", { detail: data }));
          }
        }).then((fn) => { unlistenPerfFn = fn; });
      });
    }

    // In-window keyboard shortcut listener
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLocked) {
        try {
          const { invoke } = await import("@tauri-apps/api/core");
          await invoke("toggle_desktop_overlay");
        } catch {}
        return;
      }

      const isL = e.key === "L" || e.key === "l" || e.code === "KeyL";
      if ((e.ctrlKey && e.shiftKey && isL) || (e.ctrlKey && e.altKey && isL)) {
        e.preventDefault();
        e.stopPropagation();
        try {
          const { invoke } = await import("@tauri-apps/api/core");
          const newState = await invoke<boolean>("toggle_overlay_click_through");
          setIsLocked(newState);
          if (newState) {
            triggerToast(`Locked click-through • ${lockKeyLabel} to unlock`);
          } else {
            triggerToast("Unlocked move mode • Drag handle to move");
          }
        } catch {}
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mpo_hotkeys_updated", handleHotkeysUpdated);
      window.removeEventListener("mpo_hud_fade_on_hover_changed", handleGhostSettingUpdated);
      if (unlistenLockFn) unlistenLockFn();
      if (unlistenHoverFn) unlistenHoverFn();
      if (unlistenPerfFn) unlistenPerfFn();
    };
  }, [lockKeyLabel]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setShowToast(false), 2500);
  };

  const handleStartDrag = async (e: React.MouseEvent) => {
    // Only drag with left mouse button when not locked
    if (e.button === 0 && !isLocked) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("start_dragging_overlay");
      } catch {
        try {
          const { getCurrentWindow } = await import("@tauri-apps/api/window");
          await getCurrentWindow().startDragging();
        } catch (err) {
          console.error("Failed to start dragging overlay:", err);
        }
      }
    }
  };

  const handleToggleLock = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const newState = await invoke<boolean>("toggle_overlay_click_through");
      setIsLocked(newState);
      if (newState) {
        triggerToast(`Locked click-through • ${lockKeyLabel} to unlock`);
      } else {
        triggerToast("Unlocked move mode • Drag handle to move");
      }
    } catch (err) {
      console.error("Failed to toggle click through:", err);
      triggerToast("Could not change the overlay lock");
    }
  };

  const handleToggleGhostPeek = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !fadeOnHoverLocked;
    setFadeOnHoverLocked(next);
    try {
      localStorage.setItem("mpo_hud_fade_on_hover", String(next));
      window.dispatchEvent(new Event("mpo_hud_fade_on_hover_changed"));
    } catch {}
    triggerToast(next ? "Ghost Peek Mode ON (Fades on hover)" : "Ghost Peek Mode OFF (Solid)");
  };

  const handleOpenStudio = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("show_main_window");
      } else {
        window.open("/?tab=desktop-hud", "_blank");
      }
    } catch (err) {
      console.error("Failed to show main window:", err);
      window.open("/?tab=desktop-hud", "_blank");
    }
  };

  const handleClose = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("toggle_desktop_overlay");
      } else {
        window.close();
      }
    } catch (err) {
      console.error("Failed to close desktop overlay:", err);
      triggerToast("Could not hide the overlay");
    }
  };

  const isGhostPeekActive = isLocked && fadeOnHoverLocked && isHoveredWhileLocked;

  return (
    <div
      ref={container}
      className={`desktop-overlay-container ${format} ${isLocked ? "locked" : "unlocked"} ${isGhostPeekActive ? "ghost-peek" : ""}`}
      style={isGhostPeekActive ? { opacity: 0.18, pointerEvents: "none" } : undefined}
      onMouseEnter={() => {
        if (isLocked && fadeOnHoverLocked) {
          setIsHoveredWhileLocked(true);
        }
      }}
      onMouseLeave={() => {
        setIsHoveredWhileLocked(false);
      }}
    >
      {/* On-Hover Glassmorphism Control Bar with Native Drag Handle */}
      {!isLocked && (
        <div className="desktop-hud-hover-bar" role="toolbar" aria-label="Desktop overlay controls">
          <div
            className="hud-drag-grip"
            onMouseDown={handleStartDrag}
            title="Click and drag to move overlay anywhere on screen"
          >
            <GripHorizontal size={14} className="grip-icon" />
            <span className="drag-label">Move</span>
          </div>

          <div
            className="hud-actions-right"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleToggleLock}
              onMouseDown={(e) => e.stopPropagation()}
              className="hud-action-btn lock"
              title={`Lock and enable click-through · ${lockKeyLabel} to unlock`}
              aria-label={`Lock overlay; unlock with ${lockKeyLabel}`}
            >
              <Unlock size={12} color="#10b981" />
              <span>Lock</span>
            </button>

            <button
              type="button"
              onClick={handleToggleGhostPeek}
              onMouseDown={(e) => e.stopPropagation()}
              className="hud-action-btn"
              title={fadeOnHoverLocked ? "Turn off fade on hover when locked" : "Fade on hover when locked"}
              aria-label="Fade on hover when locked"
              aria-pressed={fadeOnHoverLocked}
            >
              {fadeOnHoverLocked ? <EyeOff size={12} color="#38bdf8" /> : <Eye size={12} color="#94a3b8" />}
              <span>{fadeOnHoverLocked ? "Peek on" : "Peek off"}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenStudio}
              onMouseDown={(e) => e.stopPropagation()}
              className="hud-action-btn"
              title="Open MPO-pro dashboard"
              aria-label="Open MPO-pro dashboard"
            >
              <Settings2 size={12} />
            </button>

            <button
              type="button"
              onClick={handleClose}
              onMouseDown={(e) => e.stopPropagation()}
              className="hud-action-btn close"
              title="Hide desktop overlay"
              aria-label="Hide desktop overlay"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Ephemeral Notification Toast */}
      {showToast && (
        <div className="hud-toast-banner" role="status" aria-live="polite">
          <Sparkles size={12} color="#00f0ff" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Overlay Theme Component with Native Drag Support When Unlocked */}
      <div
        className="desktop-overlay-content"
        onMouseDown={(e) => {
          if (isLocked) return;
          const target = e.target as HTMLElement;
          if (target.closest("button, input, a, [data-interactive], .hud-action-btn")) return;
          handleStartDrag(e);
        }}
      >
        {children}
      </div>
    </div>
  );
};

