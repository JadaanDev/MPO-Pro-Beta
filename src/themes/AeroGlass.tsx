import { ThemeSupplement } from "./ThemeSupplement";
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles } from "lucide-react";
import { ThemeProps } from "../types/themes";
import { useScrubber } from "../hooks/useScrubber";

export const AeroGlass: React.FC<ThemeProps> = ({
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
      className="mpo-theme-container aero-glass-root"
      style={{
        transform: `scale(${config.scale})`,
        transformOrigin: "center center",
        width: config.customWidth > 0 ? `${config.customWidth}px` : undefined,
        height: config.customHeight > 0 ? `${config.customHeight}px` : undefined,
      }}
    >
      {customCss && <style>{customCss}</style>}

      <div
        className="aero-card mpo-card"
        style={{
          backgroundColor: config.highContrast
            ? `rgba(8, 11, 18, ${config.opacity})`
            : `rgba(16, 20, 32, ${config.opacity})`,
          backdropFilter: "var(--hud-backdrop-filter, none)",
          WebkitBackdropFilter: "var(--hud-backdrop-filter, none)",
          borderRadius: `${config.borderRadius}px`,
          borderColor: isPlaying ? `${accent}60` : "rgba(255, 255, 255, 0.12)",
          boxShadow: isPlaying
            ? `0 16px 40px -10px rgba(0, 0, 0, 0.8), 0 0 30px ${accent}25`
            : "0 12px 32px rgba(0, 0, 0, 0.6)",
        }}
      >
        <ThemeSupplement media={media} config={config} album={true} badge={false} currentTime={formattedCurrent} durationTime={formattedDuration} />
        {/* Album Artwork */}
        {config.showArt && (
          <div
            className="aero-art mpo-art"
            style={{ borderRadius: `${Math.max(config.borderRadius - 6, 6)}px` }}
          >
            <AnimatePresence mode="wait">
              {artUrl ? (
                <motion.img
                  key={artUrl}
                  src={artUrl}
                  alt={media.title}
                  className="aero-art-img mpo-art-img"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                />
              ) : (
                <div className="aero-no-art" style={{ background: `${accent}20` }}>
                  <Sparkles size={24} color={accent} />
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Content */}
        <div className="aero-content">
          <div className="aero-top-row">
            {config.showBadge && (
              <span
                className="aero-badge mpo-badge"
                style={{
                  color: accent,
                  borderColor: `${accent}40`,
                  background: `${accent}15`,
                }}
              >
                {media.app_name || "Aero Player"}
              </span>
            )}

            {config.showVisualizer && (
              <div className={`aero-wave mpo-visualizer ${isPlaying ? "playing" : "paused"}`}>
                <span className="mpo-vis-bar" style={{ background: accent }} />
                <span className="mpo-vis-bar" style={{ background: accent }} />
                <span className="mpo-vis-bar" style={{ background: accent }} />
              </div>
            )}
          </div>

          {config.showTitle && (
            <AnimatePresence mode="wait">
              <motion.div
                key={media.title}
                className="aero-title mpo-title"
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                title={media.title}
              >
                {media.title || "No Audio Playing"}
              </motion.div>
            </AnimatePresence>
          )}

          {(config.showArtist || config.showAlbum) && (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${media.artist}-${media.album_title}`}
                className="aero-artist mpo-artist"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {config.showArtist && (media.artist || "Awaiting source stream")}
              </motion.div>
            </AnimatePresence>
          )}

          {config.showProgress && positionKnown && durationKnown && (
            <div className="aero-progress mpo-progress">
              <div className="aero-track">
                <div
                  className="aero-fill mpo-progress-fill"
                  style={{
                    transform: `scaleX(${progress})`,
                    background: accent,
                  }}
                />
              </div>
              <div className="aero-times">
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
