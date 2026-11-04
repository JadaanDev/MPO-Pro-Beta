import React from "react";
import { Sparkles, ChevronDown, Play } from "lucide-react";
import { ThemeConfig } from "../../../../types/themes";
import {
  TRACK_TRANSITION_OPTIONS,
  TRACK_TRANSITION_DIRECTIONS,
  TRACK_TRANSITION_INTENSITIES,
  normalizeTransitionConfig,
} from "../../../common/TrackTransitionWrapper";
import { TransitionTimingFields } from "../../TransitionTimingFields";

interface HudTransitionsSectionProps {
  config: ThemeConfig;
  onConfigChange: (updater: (prev: ThemeConfig) => ThemeConfig) => void;
  isOpen: boolean;
  onToggle: () => void;
  onTriggerReplay?: () => void;
}

export const HudTransitionsSection: React.FC<HudTransitionsSectionProps> = ({
  config,
  onConfigChange,
  isOpen,
  onToggle,
  onTriggerReplay,
}) => {
  return (
    <div className={`hud-accordion-item ${isOpen ? "expanded" : ""}`}>
      <button
        type="button"
        className="hud-accordion-header"
        onClick={onToggle}
      >
        <div className="hud-accordion-header-left">
          <Sparkles size={14} className="hud-accordion-icon" />
          <span>Track Change Transitions</span>
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
              className="hud-select"
            >
              {TRACK_TRANSITION_OPTIONS.map((opt: any) => (
                <option key={opt.id} value={opt.id}>
                  [{opt.badge}] {opt.label} — {opt.description}
                </option>
              ))}
            </select>
          </div>

          {/* Direction */}
          <div className="hud-control-col">
            <span className="hud-control-label">Direction</span>
            <div className="hud-pill-group">
              {TRACK_TRANSITION_DIRECTIONS.map((dir: any) => (
                <button
                  key={dir.id}
                  type="button"
                  className={`hud-pill-btn ${(config.transitionDirection || "right") === dir.id ? "active" : ""}`}
                  onClick={() =>
                    onConfigChange((c) => ({ ...c, transitionDirection: dir.id }))
                  }
                >
                  {dir.label}
                </button>
              ))}
            </div>
          </div>

          {/* Intensity (4 levels) */}
          <div className="hud-control-col">
            <span className="hud-control-label">Intensity / FX Level</span>
            <div className="hud-pill-group">
              {TRACK_TRANSITION_INTENSITIES.map((lvl: any) => (
                <button
                  key={lvl.id}
                  type="button"
                  className={`hud-pill-btn ${(config.transitionIntensity || "standard") === lvl.id ? "active" : ""}`}
                  onClick={() =>
                    onConfigChange((c) => ({ ...c, transitionIntensity: lvl.id }))
                  }
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          <TransitionTimingFields config={config} onConfigChange={onConfigChange} />
        </div>
      )}
    </div>
  );
};
