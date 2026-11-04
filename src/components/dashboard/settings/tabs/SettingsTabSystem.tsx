import React, { useState } from "react";
import { 
  Power, 
  Layers, 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Eye, 
  AppWindow,
  MousePointer2
} from "lucide-react";
import { Toggle } from "../../../common/Toggle";

interface SettingsTabSystemProps {
  nativeAvailable: boolean;
  systemError: string | null;
  serviceStatus: { state: "checking" | "online" | "offline"; version?: string };
  autostart: boolean;
  onToggleAutostart: (enabled: boolean) => void;
  hudActive: boolean;
  onToggleHud: () => void;
  autoStartHud: boolean;
  onToggleAutoStartHud: (enabled: boolean) => void;
  autoLockHud: boolean;
  onToggleAutoLockHud: (enabled: boolean) => void;
  fadeOnHoverLocked: boolean;
  onToggleFadeOnHover: (enabled: boolean) => void;
  hostsMapped: boolean;
  onTriggerUac: () => void;
  onDeactivateHosts: () => void;
  uacMsg: string | null;
  overlayHotkey: string;
  lockHotkey: string;

}

export const SettingsTabSystem: React.FC<SettingsTabSystemProps> = ({
  nativeAvailable,
  systemError,
  serviceStatus,
  autostart,
  onToggleAutostart,
  hudActive,
  onToggleHud,
  autoStartHud,
  onToggleAutoStartHud,
  autoLockHud,
  onToggleAutoLockHud,
  fadeOnHoverLocked,
  onToggleFadeOnHover,
  hostsMapped,
  onTriggerUac,
  onDeactivateHosts,
  uacMsg,
  overlayHotkey,
  lockHotkey,
}) => {
  const [alwaysArrange, setAlwaysArrange] = useState(() => { try { return localStorage.getItem("mpo_always_arrange") === "true"; } catch { return false; } });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {!nativeAvailable && <div className="system-notice" role="status">Windows controls are available in the desktop app. Open the app to change these settings.</div>}
      {systemError && <div className="system-notice system-error" role="alert">{systemError}</div>}
      <div className="settings-section-card">
        <div className="settings-card-title">Local media service</div>
        <div className="settings-card-desc" role="status">{serviceStatus.state === "online" ? `Online · v${serviceStatus.version || "unknown"} · 127.0.0.1:4849` : serviceStatus.state === "checking" ? "Checking service…" : "Service unavailable or running an older version. Start or restart the desktop app."}</div>
        <div className="settings-card-desc">The health check confirms the server responds; it does not confirm player or streaming app detection.</div>
      </div>
      <div className="system-card-row"><div className="system-card-info"><div className="settings-card-icon-wrap arrange-setting-icon"><MousePointer2 size={20} aria-hidden="true" /></div><div className="system-card-texts"><div className="system-card-title">Always start in Arrange mode</div><div className="system-card-desc">Open studios ready to select elements, keeping your sidebar choices. When off, entering Arrange closes both sidebars; you can reopen them at any time.</div></div></div><div className="system-card-action"><Toggle title="Always start in Arrange mode" checked={alwaysArrange} onChange={value => { setAlwaysArrange(value); try { localStorage.setItem("mpo_always_arrange", String(value)); } catch {} }} size="md" /></div></div>
      {/* 2. Windows Startup Autostart */}
      <div className="system-card-row">
        <div className="system-card-info">
          <div className="settings-card-icon-wrap" style={{ background: "rgba(99, 102, 241, 0.15)" }}>
            <Power size={20} color="#6366f1" />
          </div>
          <div className="system-card-texts">
            <div className="system-card-title">Run on Windows Startup</div>
            <div className="system-card-desc">
              Automatically launch MPO-pro silently in the background when Windows boots up and logs in.
            </div>
          </div>
        </div>
        <div className="system-card-action">
          <Toggle
            checked={autostart}
            disabled={!nativeAvailable}
            title="Run on Windows startup"
            onChange={onToggleAutostart}
            size="md"
          />
        </div>
      </div>

      {/* 2. Desktop Floating Overlay Window Controls */}
      <div className="settings-section-card">
        <div className="settings-card-header">
          <div className="settings-card-icon-wrap" style={{ background: "rgba(16, 185, 129, 0.15)" }}>
            <Layers size={20} color="#10b981" />
          </div>
          <div className="settings-card-title-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <div className="settings-card-title">Desktop Floating HUD Integration</div>
                <div className="settings-card-desc">
                  Configures the transparent on-screen overlay window. Press <strong>{overlayHotkey}</strong> to toggle visibility, and <strong>{lockHotkey}</strong> to unlock/lock move mode.
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleHud}
                disabled={!nativeAvailable}
                className={`settings-btn-pill ${hudActive ? "success" : "primary"}`}
              >
                <AppWindow size={13} />
                <span>{hudActive ? "HUD Active" : "Launch HUD"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sub-options for Floating HUD */}
        <div className="hud-sub-options-box">
          {/* Sub-option 1: Run HUD on App Launch */}
          <div className="hud-sub-option-row">
            <div className="hud-sub-option-info">
              <span className="hud-sub-option-title">Run Desktop Overlay on App Launch</span>
              <span className="hud-sub-option-desc">
                Automatically open and display the floating Desktop Overlay as soon as MPO-pro starts.
              </span>
            </div>
            <Toggle
              checked={autoStartHud}
              disabled={!nativeAvailable}
              title="Open overlay on app launch"
              onChange={onToggleAutoStartHud}
              size="sm"
            />
          </div>

          {/* Sub-option 2: Launch HUD Locked In-Place (Auto-Lock) */}
          <div className="hud-sub-option-row">
            <div className="hud-sub-option-info">
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Lock size={13} color="#10b981" />
                <span className="hud-sub-option-title">Launch Desktop Overlay Locked In-Place (Auto-Lock)</span>
                <span className="settings-version-tag" style={{ fontSize: "9px" }}>v4.7.1</span>
              </div>
              <span className="hud-sub-option-desc">
                Automatically start the Desktop Overlay in locked click-through mode upon launch so it never intercepts cursor or gaming clicks until unlocked with {lockHotkey}.
              </span>
            </div>
            <Toggle
              checked={autoLockHud}
              disabled={!nativeAvailable}
              title="Lock overlay on launch"
              onChange={onToggleAutoLockHud}
              size="sm"
            />
          </div>

          {/* Sub-option 3: Ghost Peek Mode */}
          <div className="hud-sub-option-row">
            <div className="hud-sub-option-info">
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Eye size={13} color="#38bdf8" />
                <span className="hud-sub-option-title">Ghost Peek Mode (Fade on Hover when Locked)</span>
              </div>
              <span className="hud-sub-option-desc">
                Smoothly fade overlay opacity down to 18% when the cursor hovers over it while locked, revealing games or desktop behind it.
              </span>
            </div>
            <Toggle
              checked={fadeOnHoverLocked}
              onChange={onToggleFadeOnHover}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* 3. Domain Mapping (mpobeta.local) Card */}
      <div className="system-card-row">
        <div className="system-card-info">
          <div className="settings-card-icon-wrap" style={{ background: hostsMapped ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)" }}>
            {hostsMapped ? (
              <ShieldCheck size={20} color="#10b981" />
            ) : (
              <ShieldAlert size={20} color="#f59e0b" />
            )}
          </div>
          <div className="system-card-texts">
            <div className="system-card-title">
              Domain Mapping (<code>mpobeta.local</code>)
            </div>
            <div className="system-card-desc">
              {hostsMapped
                ? "mpobeta.local is active in Windows hosts (127.0.0.1). Use it in applications that support local browser sources."
                : "mpobeta.local is currently inactive. MPO-pro uses pure numeric IP (127.0.0.1) for all feeds."}
              {uacMsg && <div className="uac-feedback-banner">{uacMsg}</div>}
            </div>
          </div>
        </div>
        <div className="system-card-action" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {hostsMapped ? (
            <>
              <button
                type="button"
                onClick={onDeactivateHosts}
                disabled={!nativeAvailable}
                className="settings-btn-pill danger"
                title="Remove mpobeta.local from Windows hosts"
              >
                De-activate .local
              </button>
              <button
                type="button"
                onClick={onTriggerUac}
                disabled={!nativeAvailable}
                className="settings-btn-pill"
                title="Re-apply mapping"
              >
                Re-apply (UAC)
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onTriggerUac}
              disabled={!nativeAvailable}
              className="settings-btn-pill primary"
              title="Add 127.0.0.1 mpobeta.local to Windows hosts via UAC"
            >
              Activate .local (UAC)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
