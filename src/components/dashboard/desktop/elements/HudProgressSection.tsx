import React from "react";
import { Sliders, ChevronDown } from "lucide-react";
import { ThemeConfig } from "../../../../types/themes";
import { EditableValueBadge } from "../../EditableValueBadge";
import { Toggle } from "../../../common/Toggle";

interface HudProgressSectionProps {
  config: ThemeConfig;
  onConfigChange: (updater: (prev: ThemeConfig) => ThemeConfig) => void;
  isOpen: boolean;
  onToggle: () => void;
  onCommitHistory?: (desc?: string) => void;
}

export const HudProgressSection: React.FC<HudProgressSectionProps> = ({
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
          <Sliders size={14} className="hud-accordion-icon" />
          <span>Track Progress Bar</span>
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
          {/* Show Progress */}
          <div className="hud-control-row">
            <Toggle
              checked={Boolean(config.showProgress ?? true)}
              onChange={(checked: boolean) => {
                onConfigChange((c) => ({ ...c, showProgress: checked }));
                onCommitHistory?.(`Progress Bar ${checked ? "Shown" : "Hidden"}`);
              }}
              label="Display Progress Bar"
              sublabel="Show playback position timeline and progress indicators"
              size="md"
            />
          </div>

          {/* Progress Height */}
          <div className="hud-control-col">
            <div className="hud-control-row">
              <span className="hud-control-label">Progress Bar Height</span>
              <EditableValueBadge
                value={config.progressHeight || 4}
                min={2}
                max={16}
                step={1}
                unit="px"
                onChange={(newVal: number) => {
                  onConfigChange((c) => ({ ...c, progressHeight: Math.round(newVal) }));
                }}
              />
            </div>
            <div className="hud-slider-wrap">
              <input
                type="range"
                min="2"
                max="16"
                step="1"
                className="hud-slider"
                value={config.progressHeight || 4}
                onChange={(e) =>
                  onConfigChange((c) => ({ ...c, progressHeight: parseInt(e.target.value) }))
                }
              />
            </div>
          </div>

          {/* Show Timestamps */}
          <div className="hud-control-row">
            <Toggle
              checked={Boolean(config.showTimestamps ?? true)}
              onChange={(checked: boolean) => {
                onConfigChange((c) => ({ ...c, showTimestamps: checked }));
              }}
              label="Display Time Remaining / Elapsed"
              sublabel="Shows formatted minutes & seconds (e.g. 02:45 / 03:50)"
              size="md"
            />
          </div>
        </div>
      )}
    </div>
  );
};
