import React from "react";
import { Image as ImageIcon, ChevronDown } from "lucide-react";
import { ThemeConfig } from "../../../../types/themes";
import { EditableValueBadge } from "../../EditableValueBadge";
import { Toggle } from "../../../common/Toggle";

interface HudArtworkSectionProps {
  config: ThemeConfig;
  onConfigChange: (updater: (prev: ThemeConfig) => ThemeConfig) => void;
  isOpen: boolean;
  onToggle: () => void;
  onCommitHistory?: (desc?: string) => void;
}

export const HudArtworkSection: React.FC<HudArtworkSectionProps> = ({
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
          <div className="hud-accordion-icon">
            <ImageIcon size={14} />
          </div>
          <span>Artwork, Vinyl & Visual Media</span>
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
          {/* Display Album Artwork Toggle */}
          <div className="hud-control-row">
            <Toggle
              checked={Boolean(config.showArt ?? true)}
              onChange={(checked: boolean) => {
                onConfigChange((c) => ({ ...c, showArt: checked }));
                onCommitHistory?.(`Album Artwork ${checked ? "Shown" : "Hidden"}`);
              }}
              label="Display Album Artwork"
              sublabel="Render the album cover art jacket"
              size="md"
            />
          </div>

          {config.showArt !== false && (
            <>
              {/* Art Size Slider */}
              <div className="hud-control-col">
                <div className="hud-control-row">
                  <span className="hud-control-label">Artwork Size</span>
                  <EditableValueBadge
                    value={config.artSize || 72}
                    min={40}
                    max={200}
                    step={2}
                    unit="px"
                    onChange={(newVal: number) => {
                      onConfigChange((c) => ({ ...c, artSize: Math.round(newVal) }));
                      onCommitHistory?.(`Art size set to ${Math.round(newVal)}px`);
                    }}
                  />
                </div>
                <div className="hud-slider-wrap">
                  <input
                    type="range"
                    min="40"
                    max="200"
                    step="2"
                    className="hud-slider"
                    value={config.artSize || 72}
                    onChange={(e) =>
                      onConfigChange((c) => ({ ...c, artSize: parseInt(e.target.value) }))
                    }
                  />
                </div>
              </div>

              {/* Artwork Corner Radius */}
              <div className="hud-control-col">
                <div className="hud-control-row">
                  <span className="hud-control-label">Artwork Corner Radius</span>
                  <EditableValueBadge
                    value={config.artRadius ?? 8}
                    min={0}
                    max={40}
                    step={2}
                    unit="px"
                    onChange={(newVal: number) => {
                      onConfigChange((c) => ({ ...c, artRadius: Math.round(newVal) }));
                      onCommitHistory?.(`Art radius set to ${Math.round(newVal)}px`);
                    }}
                  />
                </div>
                <div className="hud-slider-wrap">
                  <input
                    type="range"
                    min="0"
                    max="40"
                    step="2"
                    className="hud-slider"
                    value={config.artRadius ?? 8}
                    onChange={(e) =>
                      onConfigChange((c) => ({ ...c, artRadius: parseInt(e.target.value) }))
                    }
                  />
                </div>
              </div>

              {/* Artwork Glow Toggle */}
              <div className="hud-control-row">
                <Toggle
                  checked={Boolean(config.artGlow ?? true)}
                  onChange={(checked: boolean) => {
                    onConfigChange((c) => ({ ...c, artGlow: checked }));
                    onCommitHistory?.(`Artwork Glow ${checked ? "Enabled" : "Disabled"}`);
                  }}
                  label="Artwork Ambient Glow"
                  sublabel="Subtle ambient bloom under album jacket"
                  size="md"
                />
              </div>
            </>
          )}

          <div className="hud-subsection-divider">
            <span className="hud-subsection-title">Vinyl Record Effects</span>
          </div>

          {/* Show Vinyl Disc Toggle */}
          <div className="hud-control-row">
            <Toggle
              checked={Boolean(config.spinningVinyl ?? false)}
              onChange={(checked: boolean) => {
                onConfigChange((c) => ({ ...c, spinningVinyl: checked }));
                onCommitHistory?.(`Vinyl Disc Effect ${checked ? "Enabled" : "Disabled"}`);
              }}
              label="Vinyl Record RPM Disc"
              sublabel="Emerge 12-inch rotating vinyl disc from sleeve"
              size="md"
            />
          </div>

          <div className="hud-subsection-divider">
            <span className="hud-subsection-title">Player Badge & Status</span>
          </div>

          {/* Source Badge Toggle */}
          <div className="hud-control-row">
            <Toggle
              checked={Boolean(config.showBadge ?? true)}
              onChange={(checked: boolean) => {
                onConfigChange((c) => ({ ...c, showBadge: checked }));
                onCommitHistory?.(`Source Badge ${checked ? "Shown" : "Hidden"}`);
              }}
              label="Display Audio App Badge"
              sublabel="Show player source badge (e.g. Spotify, Apple Music)"
              size="md"
            />
          </div>

          <div className="hud-subsection-divider">
            <span className="hud-subsection-title">Progress Bar & Scrubber</span>
          </div>

          {/* Progress Bar Toggle */}
          <div className="hud-control-row">
            <Toggle
              checked={Boolean(config.showProgress ?? true)}
              onChange={(checked: boolean) => {
                onConfigChange((c) => ({ ...c, showProgress: checked }));
                onCommitHistory?.(`Progress Bar ${checked ? "Shown" : "Hidden"}`);
              }}
              label="Display Playback Progress Bar"
              sublabel="Real-time track timeline scrubber and timestamps"
              size="md"
            />
          </div>

          <div className="hud-subsection-divider">
            <span className="hud-subsection-title">Audio Visualizer</span>
          </div>

          {/* Visualizer Toggle */}
          <div className="hud-control-row">
            <Toggle
              checked={Boolean(config.showVisualizer ?? true)}
              onChange={(checked: boolean) => {
                onConfigChange((c) => ({ ...c, showVisualizer: checked }));
                onCommitHistory?.(`Audio Visualizer ${checked ? "Enabled" : "Disabled"}`);
              }}
              label="Real-time Audio Visualizer"
              sublabel="Animated reactive waves & frequency bars"
              size="md"
            />
          </div>

          {config.showVisualizer !== false && (
            <div className="hud-control-col">
              <span className="hud-control-label">Visualizer Engine Style</span>
              <div className="hud-pill-group">
                {(["bars", "wave", "pulse", "dots"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      onConfigChange((c) => ({ ...c, visualizerType: mode }));
                      onCommitHistory?.(`Visualizer style set to ${mode}`);
                    }}
                    className={`hud-pill-btn ${(config.visualizerType || "bars") === mode ? "active" : ""}`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
