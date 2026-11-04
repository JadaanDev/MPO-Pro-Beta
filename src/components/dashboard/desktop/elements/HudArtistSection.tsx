import React from "react";
import { Music2, ChevronDown } from "lucide-react";
import { ThemeConfig } from "../../../../types/themes";
import { EditableValueBadge } from "../../EditableValueBadge";
import { Toggle } from "../../../common/Toggle";

interface HudArtistSectionProps {
  config: ThemeConfig;
  onConfigChange: (updater: (prev: ThemeConfig) => ThemeConfig) => void;
  isOpen: boolean;
  onToggle: () => void;
  onCommitHistory?: (desc?: string) => void;
}

export const HudArtistSection: React.FC<HudArtistSectionProps> = ({
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
          <Music2 size={14} className="hud-accordion-icon" />
          <span>Artist Typography</span>
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
          {/* Show Artist */}
          <div className="hud-control-row">
            <Toggle
              checked={Boolean(config.showArtist ?? true)}
              onChange={(checked: boolean) => {
                onConfigChange((c) => ({ ...c, showArtist: checked }));
                onCommitHistory?.(`Artist Name ${checked ? "Shown" : "Hidden"}`);
              }}
              label="Display Artist Name"
              sublabel="Show performer or creator information"
              size="md"
            />
          </div>

          {/* Artist Font Size */}
          <div className="hud-control-col">
            <div className="hud-control-row">
              <span className="hud-control-label">Artist Font Size</span>
              <EditableValueBadge
                value={config.artistSize || 13}
                min={10}
                max={32}
                step={1}
                unit="px"
                onChange={(newVal: number) => {
                  onConfigChange((c) => ({ ...c, artistSize: Math.round(newVal) }));
                }}
              />
            </div>
            <div className="hud-slider-wrap">
              <input
                type="range"
                min="10"
                max="32"
                step="1"
                className="hud-slider"
                value={config.artistSize || 13}
                onChange={(e) =>
                  onConfigChange((c) => ({ ...c, artistSize: parseInt(e.target.value) }))
                }
              />
            </div>
          </div>

          {/* Artist Weight */}
          <div className="hud-control-col">
            <span className="hud-control-label">Artist Weight</span>
            <div className="hud-pill-group">
              {[
                { label: "Normal", val: 400 },
                { label: "Medium", val: 500 },
                { label: "Semibold", val: 600 },
                { label: "Bold", val: 700 },
              ].map((w) => (
                <button
                  key={w.val}
                  type="button"
                  className={`hud-pill-btn ${(config.artistWeight || 500) === w.val ? "active" : ""}`}
                  onClick={() => onConfigChange((c) => ({ ...c, artistWeight: w.val }))}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* Artist Text Transform */}
          <div className="hud-control-col">
            <span className="hud-control-label">Text Transform</span>
            <div className="hud-pill-group">
              {[
                { label: "Normal", val: "none" },
                { label: "UPPER", val: "uppercase" },
                { label: "lower", val: "lowercase" },
                { label: "Title", val: "capitalize" },
              ].map((t) => (
                <button
                  key={t.val}
                  type="button"
                  className={`hud-pill-btn ${(config.artistTransform || "none") === t.val ? "active" : ""}`}
                  onClick={() => onConfigChange((c) => ({ ...c, artistTransform: t.val as any }))}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
