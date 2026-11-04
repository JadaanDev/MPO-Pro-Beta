import React from "react";
import { Palette, ChevronDown } from "lucide-react";
import { ThemeConfig } from "../../../../types/themes";
import { Toggle } from "../../../common/Toggle";
import { HexColorPicker } from "../../../common/HexColorPicker";

const PRESET_COLORS = [
  { name: "Neon Cyber", color: "#00f0ff" },
  { name: "Apple Red", color: "#fa2d48" },
  { name: "Emerald", color: "#10b981" },
  { name: "Royal Indigo", color: "#6366f1" },
  { name: "Amber Gold", color: "#f59e0b" },
  { name: "Rose Pink", color: "#ec4899" },
  { name: "Pure Light", color: "#ffffff" },
  { name: "Deep Violet", color: "#8b5cf6" },
];

interface HudPresetsSectionProps {
  config: ThemeConfig;
  onConfigChange: (updater: (prev: ThemeConfig) => ThemeConfig) => void;
  isOpen: boolean;
  onToggle: () => void;
  onCommitHistory?: (desc?: string) => void;
}

export const HudPresetsSection: React.FC<HudPresetsSectionProps> = ({
  config,
  onConfigChange,
  isOpen,
  onToggle,
  onCommitHistory,
}) => {
  return (
    <div className={`hud-accordion-item ${isOpen ? "expanded" : ""}`}>
      <button
        type="button"
        className="hud-accordion-header"
        onClick={onToggle}
      >
        <div className="hud-accordion-header-left">
          <Palette size={14} className="hud-accordion-icon" />
          <span>Accent Colors & Palette</span>
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
          {/* Auto Album Art Extracted Color */}
          <div className="hud-control-row">
            <Toggle
              checked={Boolean(config.autoAlbumColor)}
              onChange={(checked: boolean) => {
                onConfigChange((c) => ({ ...c, autoAlbumColor: checked }));
                onCommitHistory?.(checked ? "Enabled dynamic album art color" : "Disabled dynamic album art color");
              }}
              label="Auto Color from Album Art"
              sublabel="Dynamically extracts vibrant colors from the current playing track"
              size="md"
            />
          </div>

          {/* Preset Swatches */}
          <div className="hud-control-col">
            <span className="hud-control-label">Quick Accent Swatches</span>
            <div className="hud-swatch-list">
              {PRESET_COLORS.map(({ name, color }) => {
                const isActive = (config.accentColor || "#fa2d48").toLowerCase() === color.toLowerCase();
                return (
                  <button
                    key={color}
                    type="button"
                    title={name}
                    className={`hud-color-swatch ${isActive ? "active" : ""}`}
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      onConfigChange((c) => ({
                        ...c,
                        accentColor: color,
                        autoAlbumColor: false,
                      }));
                      onCommitHistory?.(`Selected ${name} accent color`);
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Custom Hex Color Picker */}
          <div className="hud-control-row">
            <div className="hud-control-col">
              <span className="hud-control-label">Custom Accent Color</span>
              <span className="hud-control-sublabel">Specify an exact HEX color</span>
            </div>
            <div className="hud-color-input-wrap">
              <HexColorPicker
                value={config.accentColor || "#FA2D48"}
                onChange={(val) => {
                  onConfigChange((c) => ({ ...c, accentColor: val, autoAlbumColor: false }));
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
