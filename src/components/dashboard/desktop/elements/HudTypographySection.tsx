import React, { useState } from "react";
import { Type, ChevronDown, Check } from "lucide-react";
import { ThemeConfig } from "../../../../types/themes";
import { EditableValueBadge } from "../../EditableValueBadge";
import { Toggle } from "../../../common/Toggle";
import { HexColorPicker } from "../../../common/HexColorPicker";
import { POPULAR_GOOGLE_FONTS, loadGoogleFont } from "../../../../utils/fontLoader";

const PRESET_TEXT_COLORS = [
  "#ffffff", // Crisp White
  "#f1f5f9", // Off-white
  "#cbd5e1", // Silver
  "#94a3b8", // Slate Muted
  "#38bdf8", // Sky Blue
  "#818cf8", // Indigo Glow
  "#34d399", // Mint Green
  "#fbbf24", // Amber Gold
];

interface HudTypographySectionProps {
  config: ThemeConfig;
  onConfigChange: (updater: (prev: ThemeConfig) => ThemeConfig) => void;
  isOpen: boolean;
  onToggle: () => void;
  onCommitHistory?: (desc?: string) => void;
}

export const HudTypographySection: React.FC<HudTypographySectionProps> = ({
  config,
  onConfigChange,
  isOpen,
  onToggle,
  onCommitHistory,
}) => {
  const [customFontInput, setCustomFontInput] = useState("");
  const [fontLoadedNotice, setFontLoadedNotice] = useState<string | null>(null);

  const handleApplyCustomFont = () => {
    if (!customFontInput.trim()) return;
    const font = customFontInput.trim();
    loadGoogleFont(font);
    onConfigChange((c) => ({ ...c, titleFont: font, fontFamily: font }));
    setFontLoadedNotice(font);
    setTimeout(() => setFontLoadedNotice(null), 3000);
  };

  return (
    <div className={`hud-accordion-item ${isOpen ? "expanded" : ""}`}>
      <button
        type="button"
        className="hud-accordion-header"
        onClick={onToggle}
      >
        <div className="hud-accordion-header-left">
          <div className="hud-accordion-icon">
            <Type size={14} />
          </div>
          <span>Typography & Text Layout</span>
        </div>
        <div className="hud-accordion-header-right">
          <ChevronDown
            size={14}
            className={`hud-accordion-chevron ${isOpen ? "open" : ""}`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="hud-accordion-body">
          {/* Font Family Selector */}
          <div className="hud-control-col">
            <div className="hud-control-row">
              <span className="hud-control-label">Typography Font (Google Fonts)</span>
              <span className="hud-slider-val" style={{ color: "#38bdf8" }}>
                {config.titleFont || config.fontFamily || "Inter"}
              </span>
            </div>
            <select
              className="hud-select"
              value={config.titleFont || config.fontFamily || "Inter"}
              onChange={(e) => {
                const font = e.target.value;
                loadGoogleFont(font);
                onConfigChange((c) => ({ ...c, titleFont: font, fontFamily: font }));
                onCommitHistory?.(`Changed font to ${font}`);
              }}
            >
              {POPULAR_GOOGLE_FONTS.map((font: string) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>

            {/* Custom Google Font Search Input */}
            <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
              <input
                type="text"
                placeholder="Or type any Google Font name..."
                value={customFontInput}
                onChange={(e) => setCustomFontInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApplyCustomFont()}
                className="hud-themes-search-input"
                style={{ padding: "5px 10px", flex: 1, fontSize: "11px" }}
              />
              <button
                type="button"
                onClick={handleApplyCustomFont}
                className="hud-canvas-tool-btn"
                style={{ padding: "4px 10px", fontSize: "11px" }}
              >
                Load
              </button>
            </div>

            {fontLoadedNotice && (
              <span style={{ fontSize: "10px", color: "#34d399", display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                <Check size={11} /> Loaded Google Font "{fontLoadedNotice}"
              </span>
            )}
          </div>

          <div className="hud-subsection-divider">
            <span className="hud-subsection-title">Track Title Styling</span>
          </div>

          {/* Display Track Title Toggle */}
          <div className="hud-control-row">
            <Toggle
              checked={Boolean(config.showTitle ?? true)}
              onChange={(checked: boolean) => {
                onConfigChange((c) => ({ ...c, showTitle: checked }));
                onCommitHistory?.(`Track Title ${checked ? "Shown" : "Hidden"}`);
              }}
              label="Display Song Title"
              sublabel="Display the main song or track name"
              size="md"
            />
          </div>

          {config.showTitle !== false && (
            <>
              {/* Title Size */}
              <div className="hud-control-col">
                <div className="hud-control-row">
                  <span className="hud-control-label">Title Font Size</span>
                  <EditableValueBadge
                    value={config.titleSize || 17}
                    min={11}
                    max={36}
                    step={1}
                    unit="px"
                    onChange={(newVal: number) => {
                      onConfigChange((c) => ({ ...c, titleSize: Math.round(newVal) }));
                      onCommitHistory?.(`Title font size set to ${Math.round(newVal)}px`);
                    }}
                  />
                </div>
                <div className="hud-slider-wrap">
                  <input
                    type="range"
                    min="11"
                    max="36"
                    step="1"
                    className="hud-slider"
                    value={config.titleSize || 17}
                    onChange={(e) =>
                      onConfigChange((c) => ({ ...c, titleSize: parseInt(e.target.value) }))
                    }
                  />
                </div>
              </div>

              {/* Title Color Swatches */}
              <div className="hud-control-col">
                <span className="hud-control-label">Title Color</span>
                <div className="hud-swatch-list">
                  {PRESET_TEXT_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => onConfigChange((c) => ({ ...c, titleColor: col }))}
                      className={`hud-color-swatch ${(config.titleColor || "#ffffff") === col ? "active" : ""}`}
                      style={{ backgroundColor: col }}
                      title={col}
                    />
                  ))}
                  <div className="hud-color-input-wrap">
                    <HexColorPicker
                      value={config.titleColor || "#FFFFFF"}
                      onChange={(color) => onConfigChange((c) => ({ ...c, titleColor: color }))}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="hud-subsection-divider">
            <span className="hud-subsection-title">Artist & Performer</span>
          </div>

          {/* Display Artist Toggle */}
          <div className="hud-control-row">
            <Toggle
              checked={Boolean(config.showArtist ?? true)}
              onChange={(checked: boolean) => {
                onConfigChange((c) => ({ ...c, showArtist: checked }));
                onCommitHistory?.(`Artist info ${checked ? "Shown" : "Hidden"}`);
              }}
              label="Display Artist Name"
              sublabel="Show performer or musician attribution"
              size="md"
            />
          </div>

          {config.showArtist !== false && (
            <>
              {/* Artist Size */}
              <div className="hud-control-col">
                <div className="hud-control-row">
                  <span className="hud-control-label">Artist Font Size</span>
                  <EditableValueBadge
                    value={config.artistSize || 13}
                    min={9}
                    max={26}
                    step={1}
                    unit="px"
                    onChange={(newVal: number) => {
                      onConfigChange((c) => ({ ...c, artistSize: Math.round(newVal) }));
                      onCommitHistory?.(`Artist font size set to ${Math.round(newVal)}px`);
                    }}
                  />
                </div>
                <div className="hud-slider-wrap">
                  <input
                    type="range"
                    min="9"
                    max="26"
                    step="1"
                    className="hud-slider"
                    value={config.artistSize || 13}
                    onChange={(e) =>
                      onConfigChange((c) => ({ ...c, artistSize: parseInt(e.target.value) }))
                    }
                  />
                </div>
              </div>

              {/* Artist Color Swatches */}
              <div className="hud-control-col">
                <span className="hud-control-label">Artist Color</span>
                <div className="hud-swatch-list">
                  {PRESET_TEXT_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => onConfigChange((c) => ({ ...c, artistColor: col }))}
                      className={`hud-color-swatch ${(config.artistColor || "#94a3b8") === col ? "active" : ""}`}
                      style={{ backgroundColor: col }}
                      title={col}
                    />
                  ))}
                  <div className="hud-color-input-wrap">
                    <HexColorPicker
                      value={config.artistColor || "#94A3B8"}
                      onChange={(color) => onConfigChange((c) => ({ ...c, artistColor: color }))}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="hud-subsection-divider">
            <span className="hud-subsection-title">Album & Secondary Meta</span>
          </div>

          {/* Display Album Toggle */}
          <div className="hud-control-row">
            <Toggle
              checked={Boolean(config.showAlbum ?? true)}
              onChange={(checked: boolean) => {
                onConfigChange((c) => ({ ...c, showAlbum: checked }));
                onCommitHistory?.(`Album title ${checked ? "Shown" : "Hidden"}`);
              }}
              label="Display Album Title"
              sublabel="Show album name alongside track info"
              size="md"
            />
          </div>
        </div>
      )}
    </div>
  );
};
