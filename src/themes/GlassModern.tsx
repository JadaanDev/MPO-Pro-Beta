import { ThemeSupplement } from "./ThemeSupplement";
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Disc3 } from "lucide-react";
import { ThemeProps } from "../types/themes";
import { useScrubber } from "../hooks/useScrubber";

export const GlassModern: React.FC<ThemeProps> = ({
  media,
  artUrl,
  config,
  customCss,
}) => {
  const isPlaying = media.status === "Playing";
  const { formattedCurrent, formattedDuration, progress } = useScrubber(media);

  return (
    <div
      className="mpo-theme-container glass-modern-root"
      style={{
        transform: `scale(${config.scale})`,
        transformOrigin: "center center",
      }}
    >
      {customCss && <style>{customCss}</style>}

      {/* Reactive ambient glow */}
      <div
        className="glass-ambient-glow"
        style={{
          background: `radial-gradient(circle, ${config.accentColor}55 0%, transparent 70%)`,
          opacity: isPlaying ? 0.65 : 0.25,
        }}
      />

      <div
        className="glass-card mpo-card"
        style={{
          backgroundColor: config.highContrast
            ? `rgba(10, 12, 18, ${config.opacity})`
            : `rgba(18, 22, 34, ${config.opacity})`,
          backdropFilter: "var(--hud-backdrop-filter, none)",
          WebkitBackdropFilter: "var(--hud-backdrop-filter, none)",
          borderRadius: `${config.borderRadius}px`,
          borderColor: isPlaying ? `${config.accentColor}55` : "rgba(255, 255, 255, 0.12)",
        }}
      >
        <ThemeSupplement media={media} config={config} album={true} badge={false} currentTime={formattedCurrent} durationTime={formattedDuration} />
        {/* Album Artwork */}
        <div
          className="glass-art-box mpo-art"
          style={{
            borderRadius: `${Math.max(config.borderRadius - 4, 6)}px`,
            borderColor: `${config.accentColor}33`,
          }}
        >
          <AnimatePresence mode="wait">
            {artUrl ? (
              <motion.img
                key={artUrl}
                src={artUrl}
                alt={media.title}
                className="glass-art-img mpo-art-img"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              />
            ) : (
              <motion.div
                key="glass-no-art"
                className="glass-no-art"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Disc3
                  size={30}
                  color={config.accentColor}
                  className={isPlaying ? "spin-slow" : ""}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Track Content */}
        <div className="glass-content">
          <div className="glass-header">
            {config.showBadge && (
              <span
                className="glass-badge mpo-badge"
                style={{
                  color: config.accentColor,
                  borderColor: `${config.accentColor}55`,
                  backgroundColor: `${config.accentColor}18`,
                }}
              >
                {media.app_name || "Windows Media"}
              </span>
            )}

            {/* EQ Equalizer Bar Animation */}
            <div className={`glass-eq mpo-visualizer ${isPlaying ? "playing" : "paused"}`}>
              <span className="mpo-vis-bar" style={{ backgroundColor: config.accentColor }} />
              <span className="mpo-vis-bar" style={{ backgroundColor: config.accentColor }} />
              <span className="mpo-vis-bar" style={{ backgroundColor: config.accentColor }} />
              <span className="mpo-vis-bar" style={{ backgroundColor: config.accentColor }} />
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={media.title}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.2 }}
              className="glass-title mpo-title"
              title={media.title}
            >
              {media.title || "No Media Playing"}
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${media.artist}-${media.album_title}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="glass-artist mpo-artist"
            >
              {media.artist || "Awaiting Windows media audio source"}
            </motion.div>
          </AnimatePresence>

          {/* Scrubber Progress Bar */}
          {config.showProgress && media.duration_ms > 0 && (
            <div className="glass-progress-wrap mpo-progress">
              <div className="glass-progress-track">
                <div
                  className="glass-progress-fill mpo-progress-fill"
                  style={{
                    transform: `scaleX(${progress})`,
                    background: `linear-gradient(90deg, ${config.accentColor}, #ec4899)`,
                  }}
                />
              </div>
              <div className="glass-timestamps">
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
