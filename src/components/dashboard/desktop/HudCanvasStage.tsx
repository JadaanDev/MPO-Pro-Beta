import React from "react";
import { Monitor, Play } from "lucide-react";
import { ThemeConfig } from "../../../types/themes";
import { MediaState } from "../../../types/media";
import { AutoFitPreview } from "../AutoFitPreview";
import { TrackTransitionWrapper } from "../../common/TrackTransitionWrapper";

interface HudCanvasStageProps {
  media: MediaState;
  artUrl: string;
  config: ThemeConfig;
  customCss: string;
  extractedColor: string | null;
  activeComponent: React.ComponentType<any>;
  transitionTestCounter: number;
  onTriggerReplay: () => void;
  isOverlayOpen: boolean;
  onToggleOverlay: () => void;
}

export const HudCanvasStage: React.FC<HudCanvasStageProps> = ({
  media,
  artUrl,
  config,
  customCss,
  extractedColor,
  activeComponent: ActiveComponent,
  transitionTestCounter,
  onTriggerReplay,
  isOverlayOpen,
  onToggleOverlay,
}) => {
  const effectiveWidth = config.customWidth || 490;
  const effectiveHeight = config.customHeight || 180;
  const effectiveScale = config.scale || 1.0;

  return (
    <div className="hud-stage-area">
      {/* Framed Canvas Container */}
      <div className="hud-preview-canvas-card">
        {/* Canvas Header Bar */}
        <div className="hud-canvas-header">
          <div className="hud-canvas-header-left">
            <div className="hud-canvas-title">
              <Monitor size={14} color="#38bdf8" />
              <span>Desktop Canvas Preview</span>
            </div>

            <button
              type="button"
              onClick={onToggleOverlay}
              className={`hud-canvas-live-pill ${isOverlayOpen ? "active" : "inactive"}`}
              title={isOverlayOpen ? "Desktop Overlay is currently active on screen" : "Desktop Overlay is hidden"}
            >
              <span className={`hud-live-dot ${isOverlayOpen ? "pulse" : ""}`} />
              <span>{isOverlayOpen ? "Overlay Active" : "Overlay Hidden"}</span>
            </button>
          </div>

          <div className="hud-canvas-header-right">
            {/* Test Replay Animation */}
            <button
              type="button"
              onClick={onTriggerReplay}
              className="hud-canvas-tool-btn"
              title="Re-run track change animation"
            >
              <Play size={11} fill="currentColor" />
              <span>Replay</span>
            </button>
          </div>
        </div>

        {/* Viewport Area with Centered Mount */}
        <div className="hud-stage-viewport">
          {/* Simulated Desktop Work Area */}
          <AutoFitPreview configScale={config.scale} contentKey={JSON.stringify(config)}>
          <div className="hud-simulated-desktop-frame">
            <div className="hud-stage-preview-mount preview-canvas-scope">
              <TrackTransitionWrapper
                transitionKey={`${media.title}-${media.artist}-${transitionTestCounter}`}
                style={config.transitionStyle || "focus"}
                direction={config.transitionDirection || "left"}
                intensity={config.transitionIntensity || "standard"}
                durationMs={config.transitionDurationMs ?? (config.transitionDuration ? Math.round(config.transitionDuration * 1000) : 350)}
                delayMs={config.transitionDelayMs ?? (config.transitionDelay ? Math.round(config.transitionDelay * 1000) : 0)}
              >
                <ActiveComponent
                  media={media}
                  artUrl={artUrl}
                  config={config}
                  customCss={customCss}
                  extractedColor={extractedColor}
                />
              </TrackTransitionWrapper>
            </div>
          </div>

          </AutoFitPreview>

          {/* HUD Info Helper Tag */}
          <div className="hud-stage-helper-badge">
            <Monitor size={12} color="#38bdf8" />
            <span>
              Desktop Floating HUD • Canvas Size: {effectiveWidth}×{effectiveHeight}px @ {Math.round(effectiveScale * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
