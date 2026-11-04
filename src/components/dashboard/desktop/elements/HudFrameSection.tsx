import React from "react";
import { Maximize2, ChevronDown } from "lucide-react";
import { ThemeConfig } from "../../../../types/themes";
import { EditableValueBadge } from "../../EditableValueBadge";
import { Toggle } from "../../../common/Toggle";

export interface HudSizePreset {
  label: string;
  w: number;
  h: number;
  scale: number;
}

export const HUD_SIZE_PRESETS: HudSizePreset[] = [
  { label: "Compact", w: 380, h: 140, scale: 0.85 },
  { label: "Mini Card", w: 420, h: 160, scale: 0.9 },
  { label: "Wide Bar", w: 560, h: 130, scale: 0.9 },
  { label: "Standard", w: 490, h: 180, scale: 1.0 },
  { label: "Expanded", w: 600, h: 220, scale: 1.05 },
  { label: "Default", w: 0, h: 0, scale: 1.0 },
];

interface HudFrameSectionProps {
  config: ThemeConfig;
  onConfigChange: (updater: (prev: ThemeConfig) => ThemeConfig) => void;
  isOpen: boolean;
  onToggle: () => void;
  onCommitHistory?: (desc?: string) => void;
}

export const HudFrameSection: React.FC<HudFrameSectionProps> = ({
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
            <Maximize2 size={14} />
          </div>
          <span>Frame & Canvas Dimensions</span>
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
          {/* Quick HUD Size Presets */}
          <div className="hud-control-col">
            <div className="hud-control-row">
              <span className="hud-control-label">Quick HUD Size Presets</span>
              <span className="hud-control-sublabel">Pre-configured dimensions</span>
            </div>
            <div className="hud-preset-grid">
              {HUD_SIZE_PRESETS.map((p) => {
                const isActive =
                  (config.customWidth || 0) === p.w &&
                  (config.customHeight || 0) === p.h &&
                  Math.abs((config.scale || 1.0) - p.scale) < 0.01;

                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      onConfigChange((c) => ({
                        ...c,
                        customWidth: p.w,
                        customHeight: p.h,
                        scale: p.scale,
                      }));
                      onCommitHistory?.(`Applied ${p.label} HUD size preset`);
                    }}
                    className={`hud-preset-chip ${isActive ? "active" : ""}`}
                    title={
                      p.w > 0
                        ? `${p.w}×${p.h}px @ ${Math.round(p.scale * 100)}%`
                        : "Automatic size @ 100%"
                    }
                  >
                    <span>{p.label}</span>
                    <span className="hud-preset-chip-sub">
                      {p.w > 0 ? `${p.w}×${p.h}` : "Auto"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="hud-subsection-divider">
            <span className="hud-subsection-title">Fine-Tuning & Geometry</span>
          </div>

          {/* Card Scale */}
          <div className="hud-control-col">
            <div className="hud-control-row">
              <span className="hud-control-label">Scale Factor</span>
              <EditableValueBadge
                value={config.scale}
                min={0.4}
                max={2.5}
                step={0.05}
                unit="%"
                displayMultiplier={100}
                onChange={(newVal: number) => {
                  onConfigChange((c) => ({ ...c, scale: newVal }));
                  onCommitHistory?.(`Scale set to ${Math.round(newVal * 100)}%`);
                }}
              />
            </div>
            <div className="hud-slider-wrap">
              <input
                type="range"
                min="0.4"
                max="2.5"
                step="0.05"
                className="hud-slider"
                value={config.scale}
                onChange={(e) =>
                  onConfigChange((c) => ({ ...c, scale: parseFloat(e.target.value) }))
                }
              />
            </div>
          </div>

          {/* Custom Width (px) */}
          <div className="hud-control-col">
            <div className="hud-control-row">
              <span className="hud-control-label">Custom Width</span>
              <EditableValueBadge
                value={config.customWidth || 0}
                min={0}
                max={1200}
                step={10}
                unit={config.customWidth > 0 ? "px" : " (Auto)"}
                onChange={(newVal: number) => {
                  onConfigChange((c) => ({ ...c, customWidth: Math.round(newVal) }));
                  onCommitHistory?.(`Width set to ${Math.round(newVal)}px`);
                }}
              />
            </div>
            <div className="hud-slider-wrap">
              <input
                type="range"
                min="0"
                max="1000"
                step="10"
                className="hud-slider"
                value={config.customWidth || 0}
                onChange={(e) =>
                  onConfigChange((c) => ({ ...c, customWidth: parseInt(e.target.value) }))
                }
              />
            </div>
          </div>

          {/* Custom Height (px) */}
          <div className="hud-control-col">
            <div className="hud-control-row">
              <span className="hud-control-label">Custom Height</span>
              <EditableValueBadge
                value={config.customHeight || 0}
                min={0}
                max={700}
                step={10}
                unit={config.customHeight > 0 ? "px" : " (Auto)"}
                onChange={(newVal: number) => {
                  onConfigChange((c) => ({ ...c, customHeight: Math.round(newVal) }));
                  onCommitHistory?.(`Height set to ${Math.round(newVal)}px`);
                }}
              />
            </div>
            <div className="hud-slider-wrap">
              <input
                type="range"
                min="0"
                max="700"
                step="10"
                className="hud-slider"
                value={config.customHeight || 0}
                onChange={(e) =>
                  onConfigChange((c) => ({ ...c, customHeight: parseInt(e.target.value) }))
                }
              />
            </div>
          </div>

          {/* Inner Frame Padding */}
          <div className="hud-control-col">
            <div className="hud-control-row">
              <span className="hud-control-label">Inner Frame Padding</span>
              <EditableValueBadge
                value={config.framePadding ?? 14}
                min={0}
                max={50}
                step={2}
                unit="px"
                onChange={(newVal: number) => {
                  onConfigChange((c) => ({ ...c, framePadding: Math.round(newVal) }));
                  onCommitHistory?.(`Padding set to ${Math.round(newVal)}px`);
                }}
              />
            </div>
            <div className="hud-slider-wrap">
              <input
                type="range"
                min="0"
                max="50"
                step="2"
                className="hud-slider"
                value={config.framePadding ?? 14}
                onChange={(e) =>
                  onConfigChange((c) => ({ ...c, framePadding: parseInt(e.target.value) }))
                }
              />
            </div>
          </div>

          <div className="hud-subsection-divider">
            <span className="hud-subsection-title">Glassmorphism & Surface</span>
          </div>

          {/* Background Opacity */}
          <div className="hud-control-col">
            <div className="hud-control-row">
              <span className="hud-control-label">Background Opacity</span>
              <EditableValueBadge
                value={config.opacity}
                min={0.05}
                max={1.0}
                step={0.02}
                unit="%"
                displayMultiplier={100}
                onChange={(newVal: number) => {
                  onConfigChange((c) => ({ ...c, opacity: newVal }));
                  onCommitHistory?.(`Opacity set to ${Math.round(newVal * 100)}%`);
                }}
              />
            </div>
            <div className="hud-slider-wrap">
              <input
                type="range"
                min="0.05"
                max="1.0"
                step="0.02"
                className="hud-slider"
                value={config.opacity}
                onChange={(e) =>
                  onConfigChange((c) => ({ ...c, opacity: parseFloat(e.target.value) }))
                }
              />
            </div>
          </div>

          {/* Backdrop Blur */}
          <div className="hud-control-col">
            <div className="hud-control-row">
              <span className="hud-control-label">Backdrop Glass Blur</span>
              <EditableValueBadge
                value={config.blur}
                min={0}
                max={50}
                step={2}
                unit="px"
                onChange={(newVal: number) => {
                  onConfigChange((c) => ({ ...c, blur: Math.round(newVal) }));
                  onCommitHistory?.(`Blur set to ${Math.round(newVal)}px`);
                }}
              />
            </div>
            <div className="hud-slider-wrap">
              <input
                type="range"
                min="0"
                max="50"
                step="2"
                className="hud-slider"
                value={config.blur}
                onChange={(e) =>
                  onConfigChange((c) => ({ ...c, blur: parseInt(e.target.value) }))
                }
              />
            </div>
          </div>

          {/* Border Radius */}
          <div className="hud-control-col">
            <div className="hud-control-row">
              <span className="hud-control-label">Corner Border Radius</span>
              <EditableValueBadge
                value={config.borderRadius}
                min={0}
                max={48}
                step={2}
                unit="px"
                onChange={(newVal: number) => {
                  onConfigChange((c) => ({ ...c, borderRadius: Math.round(newVal) }));
                  onCommitHistory?.(`Radius set to ${Math.round(newVal)}px`);
                }}
              />
            </div>
            <div className="hud-slider-wrap">
              <input
                type="range"
                min="0"
                max="48"
                step="2"
                className="hud-slider"
                value={config.borderRadius}
                onChange={(e) =>
                  onConfigChange((c) => ({ ...c, borderRadius: parseInt(e.target.value) }))
                }
              />
            </div>
          </div>

          <div className="hud-control-col">
            <div className="hud-control-row"><label htmlFor="hud-frame-shadow" className="hud-control-label">Frame shadow</label><span className="hud-control-sublabel">{config.frameShadow ?? 55}%</span></div>
            <div className="hud-slider-wrap"><input id="hud-frame-shadow" type="range" min="0" max="100" step="5" className="hud-slider" value={config.frameShadow ?? 55} onChange={(e) => onConfigChange((c) => ({ ...c, frameShadow: Number(e.target.value) }))} onPointerUp={() => onCommitHistory?.("Changed frame shadow")} /></div>
            <div className="hud-control-sublabel">Set to 0 to remove the frame shadow.</div>
            <button type="button" className="hud-bulk-btn" onClick={() => { onConfigChange((c) => ({ ...c, frameShadow: undefined })); onCommitHistory?.("Reset frame shadow"); }}>Reset shadow</button>
          </div>

          {/* High Contrast Mode Toggle */}
          <div className="hud-control-row" style={{ paddingTop: "6px" }}>
            <Toggle
              checked={Boolean(config.highContrast)}
              onChange={(checked: boolean) => {
                onConfigChange((c) => ({ ...c, highContrast: checked }));
                onCommitHistory?.(`High Contrast Mode ${checked ? "Enabled" : "Disabled"}`);
              }}
              label="High Contrast Surface"
              sublabel="Solid dark background for legibility over games & videos"
              size="md"
            />
          </div>
        </div>
      )}
    </div>
  );
};
