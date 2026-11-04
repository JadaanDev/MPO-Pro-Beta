import React, { useState, useEffect } from "react";
import { Keyboard } from "lucide-react";

interface SettingsTabHotkeysProps {
  overlayHotkey: string;
  lockHotkey: string;
  onSaveHotkeys: (overlay: string, lock: string) => void;
}

export const SettingsTabHotkeys: React.FC<SettingsTabHotkeysProps> = ({
  overlayHotkey,
  lockHotkey,
  onSaveHotkeys,
}) => {
  const [recordingTarget, setRecordingTarget] = useState<"overlay" | "lock" | null>(null);

  useEffect(() => {
    if (!recordingTarget) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Ignore single modifier presses while user is holding them
      if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
        return;
      }

      const parts: string[] = [];
      if (e.ctrlKey) parts.push("Ctrl");
      if (e.altKey) parts.push("Alt");
      if (e.shiftKey) parts.push("Shift");
      if (e.metaKey) parts.push("Win");

      let keyStr = e.key.toUpperCase();
      if (e.code.startsWith("Key")) {
        keyStr = e.code.replace("Key", "");
      } else if (e.code.startsWith("Digit")) {
        keyStr = e.code.replace("Digit", "");
      }

      parts.push(keyStr);
      const combo = parts.join("+");

      if (recordingTarget === "overlay") {
        onSaveHotkeys(combo, lockHotkey);
      } else {
        onSaveHotkeys(overlayHotkey, combo);
      }

      setRecordingTarget(null);
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [recordingTarget, overlayHotkey, lockHotkey, onSaveHotkeys]);

  return (
    <div className="settings-section-card">
      <div className="settings-card-header">
        <div className="settings-card-icon-wrap" style={{ background: "rgba(168, 85, 247, 0.15)" }}>
          <Keyboard size={20} color="#a855f7" />
        </div>
        <div className="settings-card-title-group">
          <div className="settings-card-title">Customizable Global Hotkeys</div>
          <div className="settings-card-desc">
            Assign custom system-wide keyboard shortcuts to toggle the desktop HUD and switch between interactive/transparent click-through mode.
          </div>
        </div>
      </div>

      <div className="hotkey-settings-grid">
        {/* Overlay Visibility Shortcut */}
        <div className="hotkey-config-row">
          <div className="hotkey-label-group">
            <span className="hotkey-title">Toggle Floating HUD Overlay</span>
            <span className="hotkey-subtitle">Show or hide the on-screen transparent HUD across all apps</span>
          </div>
          <div className="hotkey-actions-group">
            <button
              type="button"
              onClick={() => setRecordingTarget(recordingTarget === "overlay" ? null : "overlay")}
              className={`hotkey-record-btn ${recordingTarget === "overlay" ? "recording" : ""}`}
              title="Click to record combination"
            >
              {recordingTarget === "overlay" ? (
                <span style={{ fontSize: "11px", fontWeight: 700 }}>Press key combination...</span>
              ) : (
                <kbd className="hotkey-kbd">{overlayHotkey}</kbd>
              )}
            </button>
            <div className="hotkey-preset-chips">
              {["Ctrl+Shift+O", "Ctrl+Alt+O", "F9"].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onSaveHotkeys(preset, lockHotkey)}
                  className={`preset-chip ${overlayHotkey === preset ? "active" : ""}`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Lock / Move Mode Shortcut */}
        <div className="hotkey-config-row">
          <div className="hotkey-label-group">
            <span className="hotkey-title">Lock / Move HUD Mode</span>
            <span className="hotkey-subtitle">Switch between drag-to-reposition and click-through gaming mode</span>
          </div>
          <div className="hotkey-actions-group">
            <button
              type="button"
              onClick={() => setRecordingTarget(recordingTarget === "lock" ? null : "lock")}
              className={`hotkey-record-btn ${recordingTarget === "lock" ? "recording" : ""}`}
              title="Click to record combination"
            >
              {recordingTarget === "lock" ? (
                <span style={{ fontSize: "11px", fontWeight: 700 }}>Press key combination...</span>
              ) : (
                <kbd className="hotkey-kbd">{lockHotkey}</kbd>
              )}
            </button>
            <div className="hotkey-preset-chips">
              {["Ctrl+Shift+L", "Ctrl+Alt+L", "F10"].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onSaveHotkeys(overlayHotkey, preset)}
                  className={`preset-chip ${lockHotkey === preset ? "active" : ""}`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
