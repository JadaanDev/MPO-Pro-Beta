import React from "react";
import { Play } from "lucide-react";
import { ThemeConfig } from "../../../types/themes";
import {
  TRACK_TRANSITION_OPTIONS,
  TRACK_TRANSITION_DIRECTIONS,
  TRACK_TRANSITION_INTENSITIES,
  normalizeTransitionConfig,
} from "../../common/TrackTransitionWrapper";
import { TransitionTimingFields } from "../TransitionTimingFields";

interface HudTransitionSectionProps {
  config: ThemeConfig;
  onConfigChange: (updater: (prev: ThemeConfig) => ThemeConfig) => void;
  onTriggerReplay?: () => void;
}

export const HudTransitionSection: React.FC<HudTransitionSectionProps> = ({
  config,
  onConfigChange,
  onTriggerReplay,
}) => {
  return (
    <div className="hud-transition-section">
      {/* Test / Replay Button */}
      <button
        type="button"
        onClick={onTriggerReplay}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          padding: "8px 12px",
          background: "linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(99, 102, 241, 0.2))",
          border: "1px solid rgba(56, 189, 248, 0.4)",
          borderRadius: "8px",
          color: "#fff",
          fontSize: "11px",
          fontWeight: 700,
          cursor: "pointer",
          marginBottom: "12px",
          transition: "all 0.15s ease",
        }}
      >
        <Play size={12} fill="currentColor" />
        <span>Test / Replay Transition</span>
      </button>

      {/* 16 Transition Families */}
      <div className="hud-control-col">
        <span className="hud-control-label">Transition style (8 designs)</span>
        <select
          value={normalizeTransitionConfig(config).style}
          onChange={(e) =>
            onConfigChange((c) => ({ ...c, transitionStyle: e.target.value as any }))
          }
          className="hud-themes-search-input"
          style={{ padding: "8px 10px", width: "100%", fontSize: "11px" }}
        >
          {TRACK_TRANSITION_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              [{opt.badge}] {opt.label} — {opt.description}
            </option>
          ))}
        </select>
      </div>

      {/* 5-Way Direction Compass */}
      <div className="hud-control-col" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="hud-control-label">Motion Direction</span>
          <span style={{ fontSize: "10px", color: "#38bdf8", fontWeight: 600, textTransform: "capitalize" }}>
            {config.transitionDirection || "left"}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "4px", marginTop: 4 }}>
          {TRACK_TRANSITION_DIRECTIONS.map((dir) => {
            const isDirSelected = (config.transitionDirection || "left") === dir.id;
            return (
              <button
                key={dir.id}
                type="button"
                onClick={() => {
                  onConfigChange((c) => ({ ...c, transitionDirection: dir.id }));
                  onTriggerReplay?.();
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "6px 2px",
                  borderRadius: "6px",
                  background: isDirSelected ? "rgba(56, 189, 248, 0.25)" : "rgba(255, 255, 255, 0.04)",
                  border: isDirSelected ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.08)",
                  color: isDirSelected ? "#fff" : "rgba(255, 255, 255, 0.7)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ fontSize: "13px", fontWeight: 800 }}>{dir.symbol}</span>
                <span style={{ fontSize: "8.5px", marginTop: 2 }}>{dir.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4-Tier Intensity Matrix */}
      <div className="hud-control-col" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="hud-control-label">Intensity & Physics Matrix</span>
          <span style={{ fontSize: "10px", color: "#a78bfa", fontWeight: 600, textTransform: "capitalize" }}>
            {config.transitionIntensity || "standard"}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "4px", marginTop: 4 }}>
          {TRACK_TRANSITION_INTENSITIES.map((tier) => {
            const isTierSelected = (config.transitionIntensity || "standard") === tier.id;
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => {
                  onConfigChange((c) => ({ ...c, transitionIntensity: tier.id }));
                  onTriggerReplay?.();
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "6px 2px",
                  borderRadius: "6px",
                  background: isTierSelected ? `${tier.color}28` : "rgba(255, 255, 255, 0.04)",
                  border: isTierSelected ? `1px solid ${tier.color}` : "1px solid rgba(255, 255, 255, 0.08)",
                  color: isTierSelected ? "#fff" : "rgba(255, 255, 255, 0.7)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ fontSize: "9.5px", fontWeight: 700 }}>{tier.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <TransitionTimingFields config={config} onConfigChange={onConfigChange} />
    </div>
  );
};
