import React, { useState } from "react";
import { 
  Monitor, 
  Smartphone, 
  AppWindow, 
  Copy, 
  Check, 
  ExternalLink, 
  Globe, 
  Radio, 
  HelpCircle,
  Code2
} from "lucide-react";
import { Layer } from "../../../../types/layers";

interface SettingsTabFeedsProps {
  layers: Layer[];
  activeLayerId?: string;
  urlHostMode: "ip" | "domain";
  onToggleHostMode: (mode: "ip" | "domain") => void;
  hostsMapped: boolean;
}

export const SettingsTabFeeds: React.FC<SettingsTabFeedsProps> = ({
  layers,
  activeLayerId,
  urlHostMode,
  onToggleHostMode,
  hostsMapped,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>("");

  const hostBase = urlHostMode === "domain" && hostsMapped
    ? "http://mpobeta.local:4849"
    : "http://127.0.0.1:4849";

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const primaryFeeds = [
    {
      key: "obs",
      title: "OBS Studio / Twitch Stream",
      format: "16:9 Landscape",
      icon: <Monitor size={15} color="#38bdf8" />,
      url: `${hostBase}/?mode=overlay`,
      desc: "Live broadcast overlay for active layer with 60 FPS transparency.",
    },
    {
      key: "tiktok",
      title: "TikTok Live Studio",
      format: "9:16 Portrait",
      icon: <Smartphone size={15} color="#c084fc" />,
      url: `${hostBase}/?mode=vertical`,
      desc: "Vertical card overlay formatted for mobile portrait streaming.",
    },
    {
      key: "hud",
      title: "Desktop Floating Overlay",
      format: "Standalone Window",
      icon: <AppWindow size={15} color="#34d399" />,
      url: `${hostBase}/?mode=hud`,
      desc: "Independent transparent HUD feed for secondary monitors or webviews.",
    },
  ];

  const filteredLayers = layers.filter((l) => {
    const q = searchFilter.toLowerCase();
    return l.name.toLowerCase().includes(q) || l.themeId.toLowerCase().includes(q);
  });

  return (
    <div className="feeds-explorer-container">
      {/* 1. Host Mode Switcher */}
      <div className="feeds-host-switcher-bar">
        <div className="feeds-host-label">
          <Globe size={16} color="#38bdf8" />
          <span>Select Feed Host Mode:</span>
          {!hostsMapped && urlHostMode === "domain" && (
            <span style={{ fontSize: "11px", color: "#f59e0b", fontWeight: 600 }}>
              (Note: mpobeta.local requires Windows hosts activation in the Windows tab)
            </span>
          )}
        </div>

        <div className="feeds-host-pills">
          <button
            type="button"
            onClick={() => onToggleHostMode("ip")}
            className={`feeds-host-pill-btn ${urlHostMode === "ip" ? "active" : ""}`}
            title="Standard local numeric loopback IP"
          >
            127.0.0.1:4849 (Numeric IP)
          </button>
          <button
            type="button"
            onClick={() => onToggleHostMode("domain")}
            className={`feeds-host-pill-btn ${urlHostMode === "domain" ? "active" : ""}`}
            title="Local domain name mapping"
          >
            mpobeta.local:4849 (Domain)
          </button>
        </div>
      </div>

      {/* 2. Primary Broadcast Feeds Cards */}
      <div className="settings-section-card highlight-cyan">
        <div className="settings-card-header">
          <div className="settings-card-icon-wrap" style={{ background: "rgba(56, 189, 248, 0.15)" }}>
            <Monitor size={20} color="#38bdf8" />
          </div>
          <div className="settings-card-title-group">
            <div className="settings-card-title">Primary Streaming & Broadcast Feeds</div>
            <div className="settings-card-desc">
              Global dynamic endpoints that automatically broadcast whichever layer is currently active in the studio.
            </div>
          </div>
        </div>

        <div className="primary-feeds-grid">
          {primaryFeeds.map((feed) => (
            <div key={feed.key} className="primary-feed-card">
              <div className="primary-feed-header">
                <div className="primary-feed-title">
                  {feed.icon}
                  <span>{feed.title}</span>
                </div>
                <span className="primary-feed-badge">{feed.format}</span>
              </div>

              <span style={{ fontSize: "11px", color: "#94a3b8" }}>{feed.desc}</span>

              <div className="primary-feed-url-box">
                <code className="primary-feed-code" title={feed.url}>
                  {feed.url}
                </code>
                <div className="primary-feed-actions">
                  <button
                    type="button"
                    onClick={() => handleCopy(feed.url, feed.key)}
                    className={`feed-icon-action-btn ${copiedKey === feed.key ? "copied" : ""}`}
                    title="Copy Browser Source URL"
                  >
                    {copiedKey === feed.key ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedKey === feed.key ? "Copied" : "Copy"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.open(feed.url, "_blank")}
                    className="feed-icon-action-btn"
                    title="Open in new browser window"
                  >
                    <ExternalLink size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Individual Dedicated Layer Links */}
      <div className="settings-section-card">
        <div className="settings-card-header">
          <div className="settings-card-icon-wrap" style={{ background: "rgba(16, 185, 129, 0.15)" }}>
            <Radio size={20} color="#10b981" />
          </div>
          <div className="settings-card-title-group">
            <div className="layer-feeds-section-header">
              <div className="layer-feeds-title">
                <span>Dedicated Individual Layer Links</span>
                <span className="settings-version-tag">{layers.length} Total</span>
              </div>
            </div>
            <div className="settings-card-desc">
              Permanent layer-locked URLs. These URLs stay locked to their specific profile even if you switch the active studio layer.
            </div>
          </div>
        </div>

        {/* Filter Input */}
        {layers.length > 3 && (
          <div style={{ marginBottom: "12px" }}>
            <input
              type="text"
              placeholder="Filter layers by name or theme..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="hud-themes-search-input"
              style={{ width: "100%", padding: "8px 12px", fontSize: "11.5px" }}
            />
          </div>
        )}

        <div className="layer-feeds-grid">
          {filteredLayers.map((layer) => {
            const mode = layer.format === "vertical" ? "vertical" : "overlay";
            const layerUrl = `${hostBase}/?mode=${mode}&layer=${layer.id}`;
            const targetKey = `layer-${layer.id}`;
            const isStudioActive = layer.id === activeLayerId;

            return (
              <div
                key={layer.id}
                className={`layer-feed-card ${isStudioActive ? "active-studio" : ""}`}
              >
                <div className="layer-feed-left">
                  <Radio size={14} color={isStudioActive ? "#10b981" : "#64748b"} />
                  <div className="layer-feed-info">
                    <div className="layer-feed-meta">
                      <span className="layer-feed-name">{layer.name}</span>
                      <span className="layer-tag theme">{layer.themeId}</span>
                      <span className="layer-tag">{layer.format === "vertical" ? "9:16 Portrait" : "16:9 Landscape"}</span>
                      {isStudioActive && <span className="layer-tag active">Studio Active</span>}
                      {layer.isDesktop && <span className="layer-tag" style={{ color: "#38bdf8" }}>Desktop HUD</span>}
                    </div>
                    <code className="layer-url-code" title={layerUrl}>
                      {hostBase}/?mode={mode}&amp;<mark>layer={layer.id}</mark>
                    </code>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => handleCopy(layerUrl, targetKey)}
                    className={`feed-icon-action-btn ${copiedKey === targetKey ? "copied" : ""}`}
                    style={{ padding: "6px 12px" }}
                  >
                    {copiedKey === targetKey ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                    <span>{copiedKey === targetKey ? "Copied" : "Copy URL"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.open(layerUrl, "_blank")}
                    className="feed-icon-action-btn"
                    style={{ padding: "6px 10px" }}
                    title="Open feed in browser"
                  >
                    <ExternalLink size={13} />
                    <span>Test</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. OBS Studio Setup Guide & Query Parameter Cheat Sheet */}
      <div className="query-cheat-sheet-card">
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
          <HelpCircle size={14} color="#38bdf8" />
          <span className="cheat-sheet-title" style={{ margin: 0 }}>OBS Studio Browser Source Setup & Query Parameters</span>
        </div>

        <table className="cheat-sheet-table">
          <thead>
            <tr>
              <th style={{ width: "22%" }}>Parameter</th>
              <th style={{ width: "28%" }}>Example</th>
              <th>Description & OBS Usage</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>mode=overlay</code></td>
              <td><code>/?mode=overlay</code></td>
              <td>Standard 16:9 landscape OBS browser source (Recommended: 1920×1080 @ 60 FPS).</td>
            </tr>
            <tr>
              <td><code>mode=vertical</code></td>
              <td><code>/?mode=vertical</code></td>
              <td>Portrait 9:16 browser source for TikTok Live Studio (Recommended: 1080×1920 @ 60 FPS).</td>
            </tr>
            <tr>
              <td><code>mode=hud</code></td>
              <td><code>/?mode=hud</code></td>
              <td>Transparent standalone Desktop Floating HUD endpoint.</td>
            </tr>
            <tr>
              <td><code>layer=&lt;id&gt;</code></td>
              <td><code>/?layer=banner-clean</code></td>
              <td>Directly binds the browser source to a specific layer ID, preventing it from changing when studio edits another layer.</td>
            </tr>
            <tr>
              <td><code>test=1</code></td>
              <td><code>/?test=1</code></td>
              <td>Forces realistic mock track playback for setting up scenes while offline or without music playing.</td>
            </tr>
          </tbody>
        </table>

        {/* OBS Custom CSS snippet */}
        <div style={{ marginTop: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.4)", padding: "8px 12px", borderRadius: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Code2 size={13} color="#a855f7" />
            <span style={{ fontSize: "11px", color: "#cbd5e1", fontWeight: 600 }}>OBS Recommended Custom CSS:</span>
            <code style={{ fontSize: "10.5px", color: "#94a3b8" }}>body &#123; background-color: rgba(0, 0, 0, 0); margin: 0px auto; overflow: hidden; &#125;</code>
          </div>
          <button
            type="button"
            onClick={() => handleCopy("body { background-color: rgba(0, 0, 0, 0); margin: 0px auto; overflow: hidden; }", "obs-css")}
            className={`feed-icon-action-btn ${copiedKey === "obs-css" ? "copied" : ""}`}
            style={{ fontSize: "10px" }}
          >
            {copiedKey === "obs-css" ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
            <span>{copiedKey === "obs-css" ? "Copied" : "Copy CSS"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
