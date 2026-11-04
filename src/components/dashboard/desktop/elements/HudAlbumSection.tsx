import React from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import { ThemeConfig } from "../../../../types/themes";
import { EditableValueBadge } from "../../EditableValueBadge";
import { Toggle } from "../../../common/Toggle";

interface HudAlbumSectionProps {
  config: ThemeConfig;
  onConfigChange: (updater: (prev: ThemeConfig) => ThemeConfig) => void;
  isOpen: boolean;
  onToggle: () => void;
  onCommitHistory?: (desc?: string) => void;
}

export const HudAlbumSection: React.FC<HudAlbumSectionProps> = ({
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
          <BookOpen size={14} className="hud-accordion-icon" />
          <span>Album Info & Subtitle</span>
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
          {/* Show Album */}
          <div className="hud-control-row">
            <Toggle
              checked={Boolean(config.showAlbum ?? true)}
              onChange={(checked: boolean) => {
                onConfigChange((c) => ({ ...c, showAlbum: checked }));
                onCommitHistory?.(`Album Name ${checked ? "Shown" : "Hidden"}`);
              }}
              label="Display Album Title"
              sublabel="Show album name underneath the artist line"
              size="md"
            />
          </div>

          {/* Album Font Size */}
          <div className="hud-control-col">
            <div className="hud-control-row">
              <span className="hud-control-label">Album Font Size</span>
              <EditableValueBadge
                value={config.albumSize || 12}
                min={10}
                max={28}
                step={1}
                unit="px"
                onChange={(newVal: number) => {
                  onConfigChange((c) => ({ ...c, albumSize: Math.round(newVal) }));
                }}
              />
            </div>
            <div className="hud-slider-wrap">
              <input
                type="range"
                min="10"
                max="28"
                step="1"
                className="hud-slider"
                value={config.albumSize || 12}
                onChange={(e) =>
                  onConfigChange((c) => ({ ...c, albumSize: parseInt(e.target.value) }))
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
