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
  const { formattedCurrent, formattedDuration, progress, positionKnown, durationKnown } = useScrubber(media);
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
        data-theme-role="frame"
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
          <div className="zen-art-wrap mpo-art" data-theme-role="artwork">
            <AnimatePresence mode="wait">
              {artUrl ? (
                <motion.img
                  key={artUrl}
                  src={artUrl}
                  alt={media.title}
                  className="zen-art-img mpo-art-img"
                  data-theme-role="artwork-image"
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
            {config.themeLabel && (
              <span className="zen-theme-label mpo-theme-label" data-theme-role="themeLabel">
                {config.themeLabel}
              </span>
            )}
            {config.showBadge && (
              <span className="zen-badge mpo-badge" data-theme-role="badge">
                [{media.app_name || "AUDIO"}]
              </span>
            )}
            {config.showVisualizer && (
              <div className="zen-dot-matrix mpo-visualizer" data-theme-role="indicator">
                <span className={`mpo-vis-bar ${isPlaying ? "active" : ""}`} data-theme-role="indicator-bar" style={{ backgroundColor: accent }} />
                <span className={`mpo-vis-bar ${isPlaying ? "active" : ""}`} data-theme-role="indicator-bar" style={{ backgroundColor: accent }} />
                <span className={`mpo-vis-bar ${isPlaying ? "active" : ""}`} data-theme-role="indicator-bar" style={{ backgroundColor: accent }} />
                <span className={`mpo-vis-bar ${isPlaying ? "active" : ""}`} data-theme-role="indicator-bar" style={{ backgroundColor: accent }} />
              </div>
            )}
          </div>

          {config.showTitle && (
            <div className="zen-title mpo-title" data-theme-role="title" title={media.title}>
              {media.title || "ZEN_STANDBY"}
            </div>
          )}

          {config.showArtist && (
            <div className="zen-artist mpo-artist" data-theme-role="artist">
              {media.artist || "Silent Channel"}
            </div>
          )}

          {config.showProgress && positionKnown && durationKnown && (
            <div className="zen-progress mpo-progress" data-theme-role="progress">
              <div className="zen-track" data-theme-role="progress-track" data-theme-part="progress-track">
                <div
                  className="zen-fill mpo-progress-fill"
                  data-theme-role="progress-fill"
                  style={{
                    transform: `scaleX(${progress})`,
                    backgroundColor: accent,
                  }}
                />
              </div>
              <div className="zen-time" data-theme-role="timestamps">
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
