import { ThemeSupplement } from "./ThemeSupplement";
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Disc } from "lucide-react";
import { ThemeProps } from "../types/themes";
import { useScrubber } from "../hooks/useScrubber";

export const VinylRetro: React.FC<ThemeProps> = ({
  media,
  artUrl,
  config,
  customCss,
}) => {
  const isPlaying = media.status === "Playing";
  const { formattedCurrent, formattedDuration, progress } = useScrubber(media);

  return (
    <div
      className="mpo-theme-container vinyl-retro-root"
      style={{
        transform: `scale(${config.scale})`,
        transformOrigin: "center center",
      }}
    >
      {customCss && <style>{customCss}</style>}

      <div
        className="vinyl-card mpo-card"
        style={{
          backgroundColor: config.highContrast
            ? `rgba(18, 14, 12, ${config.opacity})`
            : `rgba(28, 20, 16, ${config.opacity})`,
          backdropFilter: "var(--hud-backdrop-filter, none)",
          WebkitBackdropFilter: "var(--hud-backdrop-filter, none)",
          borderRadius: `${config.borderRadius}px`,
          borderColor: isPlaying ? "#f59e0b" : "rgba(245, 158, 11, 0.25)",
          boxShadow: isPlaying
            ? "0 12px 36px rgba(0, 0, 0, 0.7), 0 0 20px rgba(245, 158, 11, 0.25)"
            : "0 8px 30px rgba(0, 0, 0, 0.6)",
        }}
      >
        <ThemeSupplement label={false} media={media} config={config} album={true} badge={false} currentTime={formattedCurrent} durationTime={formattedDuration} />
        {/* Jacket Sleeve & Vinyl Disc */}
        <div className="vinyl-sleeve-box mpo-art">
          {/* Vinyl Disc that spins out */}
          <div className={`vinyl-spinning-disc ${isPlaying ? "spinning" : "paused"}`}>
            <div className="vinyl-center-hole" />
          </div>

          <div className="vinyl-jacket">
            <AnimatePresence mode="wait">
              {artUrl ? (
                <motion.img
                  key={artUrl}
                  src={artUrl}
                  alt={media.title}
                  className="vinyl-cover-img mpo-art-img"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              ) : (
                <div className="vinyl-jacket-fallback">
                  <Disc size={28} color="#f59e0b" />
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Content */}
        <div className="vinyl-content">
          <div className="vinyl-header">
            <span className="vinyl-badge mpo-badge"><span className="mpo-theme-label">{config.themeLabel || "ANALOG"}</span> // {media.app_name || "STEREO"}</span>
            <span className={`mpo-playback-status vinyl-needle ${isPlaying ? "engaged" : "lifted"}`}>
              {isPlaying ? (config.themePlayingLabel || "PLAYING") : (config.themePausedLabel || "STOPPED")}
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={media.title}
              className="vinyl-title mpo-title"
              initial={{ opacity: 0, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              title={media.title}
            >
              {media.title || "Turn Table Idle"}
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={media.artist}
              className="vinyl-artist mpo-artist"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {media.artist || "No record placed on player"}
            </motion.div>
          </AnimatePresence>

          {/* Golden Grooves Progress */}
          {config.showProgress && media.duration_ms > 0 && (
            <div className="vinyl-progress mpo-progress">
              <div className="vinyl-track">
                <div
                  className="vinyl-fill mpo-progress-fill"
                  style={{
                    transform: `scaleX(${progress})`,
                  }}
                />
              </div>
              <div className="vinyl-times">
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
