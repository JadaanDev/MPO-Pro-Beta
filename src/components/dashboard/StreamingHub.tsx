import React, { useState } from "react";
import { Radio, Copy, Check, Tv, Smartphone, Layers } from "lucide-react";
import { Layer } from "../../types/layers";

interface StreamingHubProps {
  apiBaseUrl: string;
  layers: Layer[];
  activeLayerId: string;
}

export const StreamingHub: React.FC<StreamingHubProps> = ({
  layers,
}) => {
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});
  const [isHostsMapped, setIsHostsMapped] = useState(false);
  const [uacStatus, setUacStatus] = useState<string | null>(null);
  const [hostMode, setHostMode] = useState<"ip" | "domain">(() => {
    try {
      return (localStorage.getItem("mpo_preferred_url_host") as "ip" | "domain") || "ip";
    } catch {
      return "ip";
    }
  });

  React.useEffect(() => {
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      import("@tauri-apps/api/core").then(({ invoke }) => {
        invoke<boolean>("check_hosts_mapping")
          .then((mapped) => {
            setIsHostsMapped(Boolean(mapped));
            if (!mapped) setHostMode("ip");
          })
          .catch(() => {});
      });
    }
  }, []);

  const handleTriggerUac = async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const res = await invoke<string>("trigger_hosts_elevation");
      setUacStatus(res);
      setTimeout(() => {
        invoke<boolean>("check_hosts_mapping").then((m) => {
          setIsHostsMapped(Boolean(m));
          if (m) setHost("domain");
        });
      }, 2500);
    } catch (err) {
      setUacStatus(String(err));
    }
  };

  const handleDeactivateHosts = async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const res = await invoke<string>("remove_hosts_mapping");
      setUacStatus(res);
      setHost("ip");
      setTimeout(() => {
        invoke<boolean>("check_hosts_mapping").then((m) => {
          setIsHostsMapped(Boolean(m));
        });
      }, 2500);
    } catch (err) {
      setUacStatus(String(err));
    }
  };

  const setHost = (mode: "ip" | "domain") => {
    setHostMode(mode);
    try {
      localStorage.setItem("mpo_preferred_url_host", mode);
      window.dispatchEvent(new Event("mpo_url_host_changed"));
    } catch {}
  };

  const effectiveHostMode = isHostsMapped ? hostMode : "ip";
  const currentHost = effectiveHostMode === "domain" ? "http://mpobeta.local:4849" : "http://127.0.0.1:4849";

  const copyUrl = (key: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedMap((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedMap((prev) => ({ ...prev, [key]: false }));
    }, 2000);
  };

  return (
    <div className="streaming-hub-container">
      <div className="hub-intro-card">
        <Radio size={24} color="var(--accent-primary)" />
        <div style={{ flex: 1 }}>
          <div className="hub-title">Bring your overlay live</div>
          <div className="hub-subtitle">
            Choose a feed below, copy its URL, and add it as a browser source in your streaming app.
          </div>
        </div>

        {/* Global Host Switcher / Status Pill */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
          <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Base URL Mode
          </span>
          {isHostsMapped ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ display: "flex", background: "rgba(0, 0, 0, 0.3)", padding: "3px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
                <button
                  type="button"
                  onClick={() => setHost("ip")}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    border: "none",
                    fontSize: "11px",
                    fontFamily: "var(--font-mono, monospace)",
                    fontWeight: 700,
                    cursor: "pointer",
                    background: hostMode === "ip" ? "#6366f1" : "transparent",
                    color: hostMode === "ip" ? "#fff" : "#94a3b8",
                  }}
                >
                  127.0.0.1 (IP)
                </button>
                <button
                  type="button"
                  onClick={() => setHost("domain")}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    border: "none",
                    fontSize: "11px",
                    fontFamily: "var(--font-mono, monospace)",
                    fontWeight: 700,
                    cursor: "pointer",
                    background: hostMode === "domain" ? "#00f0ff" : "transparent",
                    color: hostMode === "domain" ? "#0a0e1a" : "#94a3b8",
                  }}
                >
                  mpobeta.local
                </button>
              </div>
              <button
                type="button"
                onClick={handleDeactivateHosts}
                title="Remove mpobeta.local from Windows hosts file"
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "#fca5a5",
                  fontSize: "10px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                De-activate .local
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "11px", padding: "4px 8px", borderRadius: "6px", background: "rgba(99, 102, 241, 0.2)", color: "#a5b4fc", fontWeight: 700 }}>
                127.0.0.1 (Numeric Only)
              </span>
              <button
                type="button"
                onClick={handleTriggerUac}
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: "1px solid rgba(56, 189, 248, 0.4)",
                  background: "rgba(56, 189, 248, 0.18)",
                  color: "#38bdf8",
                  fontSize: "10.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Activate .local (UAC)
              </button>
            </div>
          )}
          {uacStatus && <span style={{ fontSize: "10px", color: "#38bdf8" }}>{uacStatus}</span>}
        </div>
      </div>

      {/* Quick Access Standard Feeds */}
      <div className="section-title" style={{ marginTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Browser source URLs ({effectiveHostMode === "domain" ? "mpobeta.local" : "127.0.0.1"})</span>
        <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 500 }}>
          Use the format that fits your stream
        </span>
      </div>

      <div className="urls-grid">
        {/* Horizontal Standard 16:9 */}
        <div className="url-card">
          <div className="url-header">
            <div className="url-type">
              <Tv size={16} color="var(--accent-primary)" />
              <span>OBS Studio Landscape (Standard Format)</span>
            </div>
            <span className="url-badge">1920 × 1080 Landscape</span>
          </div>

          <div className="url-input-wrap">
            <input
              type="text"
              readOnly
              value={`${currentHost}/?mode=horizontal`}
              className="url-input"
            />
            <button
              onClick={() => copyUrl("obs_horiz", `${currentHost}/?mode=horizontal`)}
              className="copy-url-btn"
            >
              {copiedMap["obs_horiz"] ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              <span>{copiedMap["obs_horiz"] ? "Copied" : "Copy"}</span>
            </button>
          </div>
          <p className="url-desc">
            Direct feed formatted for 16:9 widescreen broadcasts. Insert into OBS / Streamlabs Browser Source.
          </p>
        </div>

        {/* Vertical TikTok 9:16 */}
        <div className="url-card">
          <div className="url-header">
            <div className="url-type">
              <Smartphone size={16} color="#00f0ff" />
              <span>TikTok Live Studio (Vertical Portrait Format)</span>
            </div>
            <span className="url-badge" style={{ borderColor: "rgba(0, 240, 255, 0.4)", color: "#00f0ff" }}>1080 × 1920 Portrait</span>
          </div>

          <div className="url-input-wrap">
            <input
              type="text"
              readOnly
              value={`${currentHost}/?mode=vertical`}
              className="url-input"
            />
            <button
              onClick={() => copyUrl("tiktok_vert", `${currentHost}/?mode=vertical`)}
              className="copy-url-btn"
            >
              {copiedMap["tiktok_vert"] ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              <span>{copiedMap["tiktok_vert"] ? "Copied" : "Copy"}</span>
            </button>
          </div>
          <p className="url-desc">
            Vertical slug optimized for TikTok Live Studio and mobile viewers.
          </p>
        </div>
      </div>

      {/* Layer-Specific Dedicated Feeds */}
      <div className="section-title" style={{ marginTop: "16px" }}>
        <Layers size={16} color="var(--accent-primary)" />
        <span>Dedicated Layer URLs ({layers.length} Active Presets)</span>
      </div>

      <div className="layers-url-list">
        {layers.map((l) => {
          const mode = l.format === "vertical" ? "vertical" : "overlay";
          const layerUrl = `${currentHost}/?mode=${mode}&layer=${l.id}`;
          const isCopied = copiedMap[l.id];
          return (
            <div key={l.id} className="layer-url-row">
              <div className="layer-url-meta">
                <span className="layer-url-name">{l.name}</span>
                <span className="layer-url-pill">
                  {l.format === "vertical" ? "9:16 Vertical" : "16:9 Horizontal"}
                </span>
                <span className="layer-url-theme">Theme: {l.themeId}</span>
              </div>

              <div className="layer-url-action">
                <code className="layer-url-code">{hostMode === "domain" ? "mpobeta.local" : "127.0.0.1"}/?mode={mode}&layer={l.id}</code>
                <button
                  onClick={() => copyUrl(l.id, layerUrl)}
                  className="copy-url-btn"
                >
                  {isCopied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                  <span>{isCopied ? "Copied" : "Copy Full URL"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recommended Configuration Table */}
      <div className="config-guide-card">
        <div className="config-title">OBS &amp; Streaming Setup Guide</div>
        <table className="config-table">
          <thead>
            <tr>
              <th>Stream Format</th>
              <th>Tight Window (Snug bounding box)</th>
              <th>Full Canvas Mode (Zero alignment needed)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Horizontal (16:9 OBS / Twitch)</strong></td>
              <td>Width: <code>640 px</code>, Height: <code>180 px</code> (or 2×: <code>1280×360</code>)</td>
              <td>Width: <code>1920 px</code>, Height: <code>1080 px</code> with <code>&amp;align=bottom</code></td>
            </tr>
            <tr>
              <td><strong>Vertical (9:16 TikTok / Reels)</strong></td>
              <td>Width: <code>360 px</code>, Height: <code>640 px</code> (or 2×: <code>720×1280</code>)</td>
              <td>Width: <code>1080 px</code>, Height: <code>1920 px</code> with <code>&amp;align=bottom</code></td>
            </tr>
            <tr>
              <td><strong>Minimal Zen Capsule</strong></td>
              <td>Width: <code>460 px</code>, Height: <code>100 px</code></td>
              <td>Width: <code>1920 px</code>, Height: <code>1080 px</code> with <code>&amp;align=bottom-left</code></td>
            </tr>
          </tbody>
        </table>
        <p style={{ marginTop: 10, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
          <strong>Tip:</strong> If OBS shows transparent empty padding (e.g. 291px gap), your OBS Browser Source is larger than the overlay. Set the OBS source width and height to match the Tight Window values above to hug the player perfectly.
        </p>
      </div>
    </div>
  );
};
