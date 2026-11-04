import React from "react";
import { BarChart3, ChevronDown } from "lucide-react";
import { ThemeConfig } from "../../../../types/themes";
import { EditableValueBadge } from "../../EditableValueBadge";
import { Toggle } from "../../../common/Toggle";

interface HudVisualizerSectionProps {
  config: ThemeConfig;
  onConfigChange: (updater: (prev: ThemeConfig) => ThemeConfig) => void;
  isOpen: boolean;
  onToggle: () => void;
  onCommitHistory?: (desc?: string) => void;
}

export const HudVisualizerSection: React.FC<HudVisualizerSectionProps> = ({
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
          <BarChart3 size={14} className="hud-accordion-icon" />
          <span>Real-time Audio Visualizer</span>
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
          {/* Show Visualizer */}
          <div className="hud-control-row">
            <Toggle
              checked={Boolean(config.showVisualizer)}
              onChange={(checked: boolean) => {
                onConfigChange((c) => ({ ...c, showVisualizer: checked }));
                onCommitHistory?.(`Audio Visualizer ${checked ? "Enabled" : "Disabled"}`);
              }}
              label="Enable Audio Visualizer"
              sublabel="Renders real-time audio spectrum frequencies on the HUD"
              size="md"
            />
          </div>

          {/* Visualizer Type */}
          <div className="hud-control-col">
            <span className="hud-control-label">Visualizer Style</span>
            <div className="hud-pill-group">
              {[
                { label: "Bars", val: "bars" },
                { label: "Wave", val: "wave" },
                { label: "Pulse", val: "pulse" },
                { label: "Dots", val: "dots" },
              ].map((v) => (
                <button
                  key={v.val}
                  type="button"
                  className={`hud-pill-btn ${(config.visualizerType || "bars") === v.val ? "active" : ""}`}
                  onClick={() => onConfigChange((c) => ({ ...c, visualizerType: v.val as any }))}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bar Count */}
          <div className="hud-control-col">
            <div className="hud-control-row">
              <span className="hud-control-label">Frequency Bands (Bars)</span>
              <EditableValueBadge
                value={config.visualizerBars || 24}
                min={8}
                max={64}
                step={4}
                unit=" bars"
                onChange={(newVal: number) => {
                  onConfigChange((c) => ({ ...c, visualizerBars: Math.round(newVal) }));
                }}
              />
            </div>
            <div className="hud-slider-wrap">
              <input
                type="range"
                min="8"
                max="64"
                step="4"
                className="hud-slider"
                value={config.visualizerBars || 24}
                onChange={(e) =>
                  onConfigChange((c) => ({ ...c, visualizerBars: parseInt(e.target.value) }))
                }
              />
            </div>
          </div>

          {/* Max Height */}
          <div className="hud-control-col">
            <div className="hud-control-row">
              <span className="hud-control-label">Max Peak Height</span>
              <EditableValueBadge
                value={config.visualizerHeight || 32}
                min={12}
                max={80}
                step={2}
                unit="px"
                onChange={(newVal: number) => {
                  onConfigChange((c) => ({ ...c, visualizerHeight: Math.round(newVal) }));
                }}
              />
            </div>
            <div className="hud-slider-wrap">
              <input
                type="range"
                min="12"
                max="80"
                step="2"
                className="hud-slider"
                value={config.visualizerHeight || 32}
                onChange={(e) =>
                  onConfigChange((c) => ({ ...c, visualizerHeight: parseInt(e.target.value) }))
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
