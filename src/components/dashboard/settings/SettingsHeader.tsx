import React from "react";
import { Globe, Music, Keyboard, Monitor, Info } from "lucide-react";
import { MpoLogo } from "../../common/MpoLogo";

export type SettingsTabId = "feeds" | "players" | "hotkeys" | "system" | "about";

interface SettingsHeaderProps {
  activeTab: SettingsTabId;
  onSelectTab: (tab: SettingsTabId) => void;
  layersCount: number;
  urlHostMode: "ip" | "domain";
  hostsMapped: boolean;
}

export const SettingsHeader: React.FC<SettingsHeaderProps> = ({
  activeTab,
  onSelectTab,
  layersCount,
  urlHostMode,
  hostsMapped,
}) => {
  const tabs = [
    {
      id: "feeds" as SettingsTabId,
      label: "Layer URLs & Feeds",
      icon: <Globe size={14} />,
      badge: `${layersCount} Layers`,
    },
    {
      id: "players" as SettingsTabId,
      label: "Audio & Players",
      icon: <Music size={14} />,
    },
    {
      id: "hotkeys" as SettingsTabId,
      label: "Global Hotkeys",
      icon: <Keyboard size={14} />,
    },
    {
      id: "system" as SettingsTabId,
      label: "Windows & System",
      icon: <Monitor size={14} />,
    },
    {
      id: "about" as SettingsTabId,
      label: "Diagnostics & About",
      icon: <Info size={14} />,
    },
  ];

  return (
    <div className="settings-header-card">
      <div className="settings-header-top">
        <div className="settings-header-branding">
          <MpoLogo size={28} />
          <div className="settings-header-title-wrap">
            <div className="settings-header-title">
              <span>Settings & Configuration</span>
              <span className="settings-version-tag">v7.0.0-beta.11</span>
            </div>
            <span className="settings-header-subtitle">
              Manage streaming feed URLs, audio sources, global shortcuts, and system integration
            </span>
          </div>
        </div>

        {/* Global Host Mode Indicator */}
        <div className="settings-header-statuses">
          <div className="settings-status-pill" title={hostsMapped ? "mpobeta.local is active in Windows hosts" : "Using pure numeric 127.0.0.1 IP feeds"}>
            <span className={`settings-status-dot ${hostsMapped || urlHostMode === "ip" ? "active" : ""}`} />
            <span>Feed Host: {urlHostMode === "domain" ? "mpobeta.local" : "127.0.0.1"}</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation Bar */}
      <nav className="settings-tabs-bar" aria-label="Settings Categories">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`settings-tab-btn ${isActive ? "active" : ""}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && <span className="settings-tab-badge">{tab.badge}</span>}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
