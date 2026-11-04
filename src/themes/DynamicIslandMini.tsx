import { ThemeSupplement } from "./ThemeSupplement";
import React from "react";
import { motion } from "motion/react";
import { ThemeProps } from "../types/themes";
import { useScrubber } from "../hooks/useScrubber";

export const DynamicIslandMini: React.FC<ThemeProps> = ({
  media,
  artUrl,
  config,
  customCss,
  extractedColor,
}) => {
  const isPlaying = media.status === "Playing";
  const { progress, formattedCurrent, formattedDuration } = useScrubber(media);
  const accent = (config.autoAlbumColor && extractedColor) ? extractedColor : config.accentColor;

  return (
    <div
      className="mpo-theme-container dynamic-island-root"
      style={{
        transform: `scale(${config.scale})`,
        transformOrigin: "center center",
        width: config.customWidth > 0 ? `${config.customWidth}px` : undefined,
        height: config.customHeight > 0 ? `${config.customHeight}px` : undefined,
      }}
    >
      {customCss && <style>{customCss}</style>}

      <motion.div
        layout
        className="island-card mpo-card"
        style={{
          backgroundColor: config.highContrast
            ? `rgba(0, 0, 0, ${config.opacity})`
            : `rgba(10, 10, 14, ${config.opacity})`,
          backdropFilter: "var(--hud-backdrop-filter, none)",
          WebkitBackdropFilter: "var(--hud-backdrop-filter, none)",
          border: isPlaying ? `1px solid ${accent}50` : "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: isPlaying ? `0 10px 30px rgba(0,0,0,0.8), 0 0 20px ${accent}30` : "0 8px 24px rgba(0,0,0,0.7)",
        }}
      >
        <ThemeSupplement media={media} config={config} album={true} badge={true} currentTime={formattedCurrent} durationTime={formattedDuration} />
        {/* Left Mini Art */}
        {config.showArt && (
          <div className="island-art mpo-art">
            {artUrl ? (
              <img src={artUrl} alt="" className="island-img mpo-art-img" />
            ) : (
              <div className="island-dot" style={{ background: accent }} />
            )}
          </div>
        )}

        {/* Center Text Info */}
        <div className="island-content">
          <div className="island-text-line">
            {config.showTitle && (
              <span className="island-title mpo-title" title={media.title}>
                {media.title || "Dynamic Island"}
              </span>
            )}
            {config.showArtist && (
              <span className="island-artist mpo-artist">
                • {media.artist || "Idle"}
              </span>
            )}
          </div>

          {config.showProgress && media.duration_ms > 0 && (
            <div className="island-scrub mpo-progress">
              <div className="island-track">
                <div
                  className="island-fill mpo-progress-fill"
                  style={{
                    transform: `scaleX(${progress})`,
                    background: accent,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right EQ Soundwave Pills */}
        {config.showVisualizer && (
          <div className={`island-wave mpo-visualizer ${isPlaying ? "playing" : "paused"}`}>
            <span className="mpo-vis-bar" style={{ background: accent }} />
            <span className="mpo-vis-bar" style={{ background: accent }} />
            <span className="mpo-vis-bar" style={{ background: accent }} />
            <span className="mpo-vis-bar" style={{ background: accent }} />
          </div>
        )}
      </motion.div>
    </div>
  );
};
