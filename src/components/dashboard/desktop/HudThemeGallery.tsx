import React, { useState, useMemo } from "react";
import { Search, Check, Layers, Palette, X, PanelLeftClose } from "lucide-react";
import { ThemeId } from "../../../types/themes";
import { Layer } from "../../../types/layers";
import { THEME_REGISTRY } from "../../../themes/ThemeRegistry";
import { HudLayersPanel } from "./HudLayersPanel";

interface HudThemeGalleryProps {
  currentTheme: ThemeId;
  onSelectTheme: (id: ThemeId) => void;
  layers: Layer[];
  activeLayerId: string;
  onSelectLayer: (id: string) => void;
  onCreateLayer: (name: string, themeId?: ThemeId) => void;
  onDuplicateLayer: (id: string) => void;
  onRenameLayer: (id: string, name: string) => void;
  onDeleteLayer: (id: string) => void;
  leftPanelTab?: "themes" | "layers";
  onSetLeftPanelTab?: (tab: "themes" | "layers") => void;
  onCloseSidebar?: () => void;
}

const CATEGORIES = ["All", "Minimal", "Broadcast", "Glass", "Retro"] as const;

export const HudThemeGallery: React.FC<HudThemeGalleryProps> = ({
  currentTheme,
  onSelectTheme,
  layers,
  activeLayerId,
  onSelectLayer,
  onCreateLayer,
  onDuplicateLayer,
  onRenameLayer,
  onDeleteLayer,
  leftPanelTab,
  onSetLeftPanelTab,
  onCloseSidebar,
}) => {
  const [internalTab, setInternalTab] = useState<"themes" | "layers">("themes");
  const activeTab = leftPanelTab !== undefined ? leftPanelTab : internalTab;

  const setActiveTab = (tab: "themes" | "layers") => {
    if (onSetLeftPanelTab) {
      onSetLeftPanelTab(tab);
    } else {
      setInternalTab(tab);
    }
  };

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("All");

  const filteredThemes = useMemo(() => {
    const list = Object.entries(THEME_REGISTRY);
    return list.filter(([id, theme]) => {
      const matchesSearch =
        theme.name.toLowerCase().includes(search.toLowerCase()) ||
        theme.description.toLowerCase().includes(search.toLowerCase()) ||
        theme.tagline.toLowerCase().includes(search.toLowerCase()) ||
        id.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;
      if (category === "All") return true;

      const catLower = category.toLowerCase();
      if (catLower === "glass") {
        return theme.category === "minimal" || theme.description.toLowerCase().includes("glass") || theme.name.toLowerCase().includes("glass");
      }
      return theme.category.toLowerCase() === catLower;
    });
  }, [search, category]);

  return (
    <aside className="hud-studio-left-themes">
      {/* Top Tab Switcher: Themes vs Presets */}
      <div className="hud-left-tab-switcher">
        <button
          type="button"
          className={`hud-left-tab-btn ${activeTab === "themes" ? "active" : ""}`}
          onClick={() => setActiveTab("themes")}
        >
          <Palette size={13} />
          <span>Themes ({Object.keys(THEME_REGISTRY).length})</span>
        </button>
        <button
          type="button"
          className={`hud-left-tab-btn ${activeTab === "layers" ? "active" : ""}`}
          onClick={() => setActiveTab("layers")}
        >
          <Layers size={13} />
          <span>HUD Presets ({layers.length})</span>
        </button>
        {onCloseSidebar && (
          <button
            type="button"
            className="hud-left-collapse-btn"
            onClick={onCloseSidebar}
            title="Hide themes & presets sidebar"
          >
            <PanelLeftClose size={13} />
          </button>
        )}
      </div>

      {activeTab === "layers" ? (
        <HudLayersPanel
          layers={layers}
          activeLayerId={activeLayerId}
          onSelectLayer={onSelectLayer}
          onCreateLayer={onCreateLayer}
          onDuplicateLayer={onDuplicateLayer}
          onRenameLayer={onRenameLayer}
          onDeleteLayer={onDeleteLayer}
        />
      ) : (
        <>
          <div className="hud-themes-header">
            {/* Search Box */}
            <div style={{ position: "relative" }}>
              <Search
                size={13}
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "rgba(255, 255, 255, 0.4)",
                  pointerEvents: "none",
                }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${Object.keys(THEME_REGISTRY).length} themes...`}
                className="hud-themes-search-input"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  style={{
                    position: "absolute",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    color: "rgba(255, 255, 255, 0.5)",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="hud-cat-pills-row">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`hud-cat-pill ${category === cat ? "active" : ""}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Themes List Scrollable */}
          <div className="hud-themes-scrollable">
            {filteredThemes.map(([id, theme]) => {
              const isSelected = currentTheme === id;
              const badgeColor = theme.badgeColor || "#38bdf8";

              return (
                <div
                  key={id}
                  onClick={() => onSelectTheme(id as ThemeId)}
                  className={`hud-theme-card-rich ${isSelected ? "selected" : ""}`}
                >
                  <div className="hud-theme-lead">
                    <div className="hud-theme-badge-wrap">
                      <span
                        className="hud-theme-dot"
                        style={{ backgroundColor: badgeColor, color: badgeColor }}
                      />
                      <span
                        className="hud-theme-cat-pill"
                        style={{
                          backgroundColor: `${badgeColor}22`,
                          color: badgeColor,
                          border: `1px solid ${badgeColor}40`,
                        }}
                      >
                        {theme.category}
                      </span>
                    </div>

                    {isSelected && (
                      <span className="hud-theme-active-tag">
                        <Check size={12} /> Active
                      </span>
                    )}
                  </div>

                  <span className="hud-theme-title">{theme.name}</span>
                  <span className="hud-theme-tagline">
                    {theme.tagline || theme.description}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </aside>
  );
};
