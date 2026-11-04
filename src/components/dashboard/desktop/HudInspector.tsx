import React, { useState, useEffect } from "react";
import { Sliders, PanelRightClose } from "lucide-react";
import { ThemeConfig } from "../../../types/themes";
import { HudFrameSection } from "./elements/HudFrameSection";
import { HudTypographySection } from "./elements/HudTypographySection";
import { HudArtworkSection } from "./elements/HudArtworkSection";
import { HudTransitionsSection } from "./elements/HudTransitionsSection";
import { HudPresetsSection } from "./elements/HudPresetsSection";
import { HudCustomCssSection } from "./elements/HudCustomCssSection";

const ACCORDION_STORAGE_KEY = "mpo_desktop_hud_accordions_v471";

interface HudInspectorProps {
  config: ThemeConfig;
  customCss: string;
  onConfigChange: (updater: (prev: ThemeConfig) => ThemeConfig) => void;
  onCustomCssChange: (css: string) => void;
  onTriggerReplay?: () => void;
  onCommitHistory?: (desc?: string) => void;
  onCloseInspector?: () => void;
}

export const HudInspector: React.FC<HudInspectorProps> = ({
  config,
  customCss,
  onConfigChange,
  onCustomCssChange,
  onTriggerReplay,
  onCommitHistory,
  onCloseInspector,
}) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(ACCORDION_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      frame: true,
      typography: false,
      artwork: false,
      transitions: true,
      palette: false,
      css: false,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(ACCORDION_STORAGE_KEY, JSON.stringify(openSections));
    } catch {}
  }, [openSections]);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    setOpenSections({
      frame: true,
      typography: true,
      artwork: true,
      transitions: true,
      palette: true,
      css: true,
    });
  };

  const collapseAll = () => {
    setOpenSections({
      frame: false,
      typography: false,
      artwork: false,
      transitions: false,
      palette: false,
      css: false,
    });
  };

  return (
    <aside className="hud-studio-right-inspector">
      {/* Inspector Header with Format Pill and Bulk Actions */}
      <div className="hud-inspector-header">
        <div className="hud-inspector-title-group">
          <div className="hud-inspector-title">
            <Sliders size={14} color="#38bdf8" />
            <span>HUD Styling</span>
          </div>
          <span className="hud-inspector-badge">Desktop Floating HUD</span>
        </div>

        <div className="hud-inspector-actions">
          <button
            type="button"
            onClick={expandAll}
            className="hud-bulk-btn"
            title="Expand all styling panels"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="hud-bulk-btn"
            title="Collapse all styling panels"
          >
            Collapse
          </button>
          {onCloseInspector && (
            <button
              type="button"
              onClick={onCloseInspector}
              className="hud-bulk-btn"
              title="Hide HUD Styling Panel"
              style={{ display: "inline-flex", alignItems: "center", gap: 3 }}
            >
              <PanelRightClose size={11} />
              <span>Hide</span>
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Container with Custom Glowing Scrollbar */}
      <div className="hud-inspector-scroll">
        {/* 1. Frame & Canvas Dimensions (with HUD Size Presets, Scale, Width, Height, Blur, Radius) */}
        <HudFrameSection
          config={config}
          onConfigChange={onConfigChange}
          isOpen={Boolean(openSections.frame)}
          onToggle={() => toggleSection("frame")}
          onCommitHistory={onCommitHistory}
        />

        {/* 2. Typography & Google Fonts (Title, Artist, Album, Google Fonts loader) */}
        <HudTypographySection
          config={config}
          onConfigChange={onConfigChange}
          isOpen={Boolean(openSections.typography)}
          onToggle={() => toggleSection("typography")}
          onCommitHistory={onCommitHistory}
        />

        {/* 3. Artwork, Vinyl & Visual Media (Art, Vinyl RPM, Source Badge, Progress, Visualizer) */}
        <HudArtworkSection
          config={config}
          onConfigChange={onConfigChange}
          isOpen={Boolean(openSections.artwork)}
          onToggle={() => toggleSection("artwork")}
          onCommitHistory={onCommitHistory}
        />

        {/* 4. Track Change Transitions (16 transition engines, directions, intensities, duration, delay) */}
        <HudTransitionsSection
          config={config}
          onConfigChange={onConfigChange}
          isOpen={Boolean(openSections.transitions)}
          onToggle={() => toggleSection("transitions")}
          onTriggerReplay={onTriggerReplay}
        />

        {/* 5. Accent Colors & Theme Palette (Auto-album color, accent picker, 8 swatches) */}
        <HudPresetsSection
          config={config}
          onConfigChange={onConfigChange}
          isOpen={Boolean(openSections.palette)}
          onToggle={() => toggleSection("palette")}
          onCommitHistory={onCommitHistory}
        />

        {/* 6. Custom Scoped HUD CSS */}
        <HudCustomCssSection
          customCss={customCss}
          onCustomCssChange={onCustomCssChange}
          isOpen={Boolean(openSections.css)}
          onToggle={() => toggleSection("css")}
        />
      </div>
    </aside>
  );
};
