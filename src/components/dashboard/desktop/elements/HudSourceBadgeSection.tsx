import React from "react";
import { Radio, ChevronDown } from "lucide-react";
import { ThemeConfig } from "../../../../types/themes";
import { Toggle } from "../../../common/Toggle";

interface HudSourceBadgeSectionProps {
  config: ThemeConfig;
  onConfigChange: (updater: (prev: ThemeConfig) => ThemeConfig) => void;
  isOpen: boolean;
  onToggle: () => void;
  onCommitHistory?: (desc?: string) => void;
}

export const HudSourceBadgeSection: React.FC<HudSourceBadgeSectionProps> = ({
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
          <Radio size={14} className="hud-accordion-icon" />
          <span>Player & Source Badge</span>
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
          <div className="hud-control-row">
            <Toggle
              checked={Boolean(config.showBadge)}
              onChange={(checked: boolean) => {
                onConfigChange((c) => ({ ...c, showBadge: checked }));
                onCommitHistory?.(`Player Badge ${checked ? "Shown" : "Hidden"}`);
              }}
              label="Display Source Pill"
              sublabel="Shows Spotify, Apple Music, YouTube, or browser icon on the HUD"
              size="md"
            />
          </div>

          <p style={{ fontSize: "11px", color: "#64748b", margin: 0, lineHeight: 1.4 }}>
            The player badge automatically identifies the currently active audio provider and displays its official icon badge and live streaming state.
          </p>
        </div>
      )}
    </div>
  );
};
