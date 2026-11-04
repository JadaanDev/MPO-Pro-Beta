import React, { useState } from "react";
import { 
  Move, 
  Lock, 
  Copy, 
  Check, 
  Sparkles, 
  Palette, 
  ShieldAlert, 
  Radio
} from "lucide-react";
import { ThemeType } from "../types/media";

interface EditControlsProps {
  theme: ThemeType;
  onThemeChange: (theme: ThemeType) => void;
  onLockHud: () => void;
  onToggleMock: () => void;
  isTauri: boolean;
  apiBaseUrl: string;
}

const THEMES: { id: ThemeType; label: string }[] = [
  { id: "glass-obsidian", label: "Obsidian" },
  { id: "cyber-neon", label: "Neon" },
  { id: "streamer-capsule", label: "Capsule" },
  { id: "vinyl-grooves", label: "Vinyl" },
];

export const EditControls: React.FC<EditControlsProps> = ({
  theme,
  onThemeChange,
  onLockHud,
  onToggleMock,
  isTauri,
  apiBaseUrl,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [uacStatus, setUacStatus] = useState<string | null>(null);

  const copyObsUrl = (useDomain: boolean = false) => {
    const url = useDomain ? "http://mpobeta.local:4849" : `${apiBaseUrl}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunUacHosts = async () => {
    if (isTauri) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        setUacStatus("Requesting UAC...");
        const res = await invoke<string>("trigger_hosts_elevation");
        setUacStatus(res);
        setTimeout(() => setUacStatus(null), 4000);
      } catch (err: unknown) {
        setUacStatus(`Error: ${String(err)}`);
        setTimeout(() => setUacStatus(null), 4000);
      }
    } else {
      setUacStatus("Run setup-hosts.ps1 as Administrator");
      setTimeout(() => setUacStatus(null), 4000);
    }
  };

  return (
    <div className="edit-toolbar">
      <div className="toolbar-group">
        {isTauri && (
          <div
            data-tauri-drag-region
            className="toolbar-btn drag-handle"
            title="Drag to reposition the overlay on screen"
          >
            <Move size={13} />
            <span>Drag HUD</span>
          </div>
        )}

        <button
          onClick={onLockHud}
          className="toolbar-btn"
          title="Lock HUD & enable mouse click-through (Ctrl + Shift + O)"
        >
          <Lock size={13} />
          <span>Lock (HUD)</span>
        </button>
      </div>

      <div className="toolbar-group">
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => onThemeChange(t.id)}
            className={`toolbar-btn ${theme === t.id ? "active" : ""}`}
            title={`Switch to ${t.label} theme`}
          >
            <Palette size={11} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="toolbar-group">
        <button
          onClick={() => copyObsUrl(false)}
          className="toolbar-btn"
          title="Copy Browser Source URL for OBS Studio"
        >
          {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
          <span>{copied ? "Copied!" : "OBS URL"}</span>
        </button>

        <button
          onClick={onToggleMock}
          className="toolbar-btn"
          title="Preview mock track animation"
        >
          <Sparkles size={12} />
          <span>Preview</span>
        </button>

        {/* UAC Setting for mpobeta.local mapping */}
        <button
          onClick={handleRunUacHosts}
          className="toolbar-btn"
          title="Register mpobeta.local in Windows hosts file (elevated UAC)"
        >
          {uacStatus ? <Radio size={12} className="spin" /> : <ShieldAlert size={12} />}
          <span>{uacStatus || "UAC: .local"}</span>
        </button>
      </div>
    </div>
  );
};
