import React from "react";
import { Code2, ChevronDown } from "lucide-react";

interface HudCustomCssSectionProps {
  customCss: string;
  onCustomCssChange: (css: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const HudCustomCssSection: React.FC<HudCustomCssSectionProps> = ({
  customCss,
  onCustomCssChange,
  isOpen,
  onToggle,
}) => {
  return (
    <div className={`hud-accordion-item ${isOpen ? "expanded" : ""}`}>
      <button
        type="button"
        className="hud-accordion-header"
        onClick={onToggle}
      >
        <div className="hud-accordion-header-left">
          <Code2 size={14} className="hud-accordion-icon" />
          <span>Custom HUD CSS Override</span>
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
            <span className="hud-control-label">Live CSS Editor</span>
            {customCss && (
              <button
                type="button"
                className="hud-section-reset-btn"
                onClick={() => onCustomCssChange("")}
              >
                Clear CSS
              </button>
            )}
          </div>

          <textarea
            className="hud-css-textarea"
            placeholder={`/* Target HUD elements directly: */\n.mpo-desktop-hud-window {\n  box-shadow: 0 0 30px rgba(0, 240, 255, 0.4);\n}\n.mpo-title {\n  letter-spacing: 0.1em;\n}`}
            value={customCss}
            onChange={(e) => onCustomCssChange(e.target.value)}
          />

          <div style={{ fontSize: "10.5px", color: "#64748b", lineHeight: 1.4 }}>
            💡 <strong style={{ color: "#94a3b8" }}>Supported Selectors:</strong>{" "}
            <code>.mpo-desktop-hud-window</code>, <code>.mpo-art-container</code>, <code>.mpo-title</code>, <code>.mpo-artist</code>, <code>.mpo-album</code>, <code>.mpo-progress-fill</code>.
          </div>
        </div>
      )}
    </div>
  );
};
