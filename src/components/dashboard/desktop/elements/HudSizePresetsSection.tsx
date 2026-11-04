import React from "react";
import { Sliders, ChevronDown } from "lucide-react";
import { ThemeConfig } from "../../../../types/themes";

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

interface HudSizePresetsSectionProps {
  config: ThemeConfig;
  onConfigChange: (updater: (prev: ThemeConfig) => ThemeConfig) => void;
  isOpen: boolean;
  onToggle: () => void;
  onCommitHistory?: (desc?: string) => void;
}

export const HudSizePresetsSection: React.FC<HudSizePresetsSectionProps> = ({
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
          <Sliders size={14} className="hud-accordion-icon" color="#38bdf8" />
          <span>HUD Size Presets</span>
        </div>
        <div className="hud-accordion-header-right">
          <ChevronDown
            size={14}
            className={`hud-accordion-chevron ${isOpen ? "open" : ""}`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="hud-accordion-body" style={{ padding: "10px 14px 14px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "6px",
            }}
          >
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
                  style={{
                    padding: "8px 6px",
                    borderRadius: "7px",
                    border: isActive
                      ? "1.5px solid #38bdf8"
                      : "1px solid rgba(255, 255, 255, 0.08)",
                    background: isActive
                      ? "rgba(56, 189, 248, 0.22)"
                      : "rgba(255, 255, 255, 0.04)",
                    color: isActive ? "#38bdf8" : "rgba(255, 255, 255, 0.8)",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "2px",
                  }}
                  title={
                    p.w > 0
                      ? `${p.w}×${p.h}px @ ${Math.round(p.scale * 100)}%`
                      : "Automatic size @ 100%"
                  }
                >
                  <span>{p.label}</span>
                  <span
                    style={{
                      fontSize: "9px",
                      color: isActive
                        ? "rgba(56, 189, 248, 0.8)"
                        : "rgba(255, 255, 255, 0.4)",
                      fontWeight: 500,
                    }}
                  >
                    {p.w > 0 ? `${p.w}×${p.h}` : "Auto"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
