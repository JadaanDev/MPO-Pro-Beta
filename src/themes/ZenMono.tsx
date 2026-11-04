import { ThemeSupplement } from "./ThemeSupplement";
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ThemeProps } from "../types/themes";
import { useScrubber } from "../hooks/useScrubber";

export const ZenMono: React.FC<ThemeProps> = ({
  media,
  artUrl,
  config,
  customCss,
  extractedColor,
}) => {
  const isPlaying = media.status === "Playing";
  const { formattedCurrent, formattedDuration, progress } = useScrubber(media);
  const accent = (config.autoAlbumColor && extractedColor) ? extractedColor : config.accentColor;

  return (
    <div
      className="mpo-theme-container zen-mono-root"
      style={{
        transform: `scale(${config.scale})`,
        transformOrigin: "center center",
        width: config.customWidth > 0 ? `${config.customWidth}px` : undefined,
        height: config.customHeight > 0 ? `${config.customHeight}px` : undefined,
      }}
    >
      {customCss && <style>{customCss}</style>}

      <div
        className="zen-card mpo-card"
        style={{
          backgroundColor: config.highContrast
            ? `rgba(5, 5, 7, ${config.opacity})`
            : `rgba(12, 12, 16, ${config.opacity})`,
          backdropFilter: "var(--hud-backdrop-filter, none)",
          WebkitBackdropFilter: "var(--hud-backdrop-filter, none)",
          borderRadius: `${Math.min(config.borderRadius, 8)}px`,
        }}
      >
        <ThemeSupplement media={media} config={config} album={true} badge={false} currentTime={formattedCurrent} durationTime={formattedDuration} />
        {/* Artwork */}
        {config.showArt && (
          <div className="zen-art-wrap mpo-art">
            <AnimatePresence mode="wait">
              {artUrl ? (
                <motion.img
                  key={artUrl}
                  src={artUrl}
                  alt={media.title}
                  className="zen-art-img mpo-art-img"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              ) : (
                <div className="zen-art-placeholder" />
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Content */}
        <div className="zen-content">
          <div className="zen-meta-row">
            {config.showBadge && (
              <span className="zen-badge mpo-badge">
                [{media.app_name || "AUDIO"}]
              </span>
            )}
            {config.showVisualizer && (
              <div className="zen-dot-matrix mpo-visualizer">
                <span className={`mpo-vis-bar ${isPlaying ? "active" : ""}`} style={{ backgroundColor: accent }} />
                <span className={`mpo-vis-bar ${isPlaying ? "active" : ""}`} style={{ backgroundColor: accent }} />
                <span className={`mpo-vis-bar ${isPlaying ? "active" : ""}`} style={{ backgroundColor: accent }} />
                <span className={`mpo-vis-bar ${isPlaying ? "active" : ""}`} style={{ backgroundColor: accent }} />
              </div>
            )}
          </div>

          {config.showTitle && (
            <div className="zen-title mpo-title" title={media.title}>
              {media.title || "ZEN_STANDBY"}
            </div>
          )}

          {config.showArtist && (
            <div className="zen-artist mpo-artist">
              {media.artist || "Silent Channel"}
            </div>
          )}

          {config.showProgress && media.duration_ms > 0 && (
            <div className="zen-progress mpo-progress">
              <div className="zen-track">
                <div
                  className="zen-fill mpo-progress-fill"
                  style={{
                    transform: `scaleX(${progress})`,
                    backgroundColor: accent,
                  }}
                />
              </div>
              <div className="zen-time">
                <span>{formattedCurrent}</span>
                <span>{formattedDuration}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
