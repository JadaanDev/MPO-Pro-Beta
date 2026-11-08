import { ThemeSupplement } from "./ThemeSupplement";
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Radio } from "lucide-react";
import { ThemeProps } from "../types/themes";
import { useScrubber } from "../hooks/useScrubber";

export const StreamerBanner: React.FC<ThemeProps> = ({
  media,
  artUrl,
  config,
  customCss,
}) => {
  const isPlaying = media.status === "Playing";
  const { formattedCurrent, formattedDuration, progress, positionKnown, durationKnown } = useScrubber(media);

  return (
    <div
      className="mpo-theme-container streamer-banner-root"
      style={{
        transform: `scale(${config.scale})`,
        transformOrigin: "center center",
      }}
    >
      {customCss && <style>{customCss}</style>}

      <div
        className="streamer-card mpo-card"
        data-theme-role="frame"
        style={{
          backgroundColor: config.highContrast
            ? `rgba(6, 8, 14, ${config.opacity})`
            : `rgba(14, 18, 30, ${config.opacity})`,
          backdropFilter: "var(--hud-backdrop-filter, none)",
          WebkitBackdropFilter: "var(--hud-backdrop-filter, none)",
          borderRadius: `${config.borderRadius}px`,
          borderColor: isPlaying ? config.accentColor : "rgba(255, 255, 255, 0.14)",
          boxShadow: isPlaying
            ? `0 10px 30px rgba(0, 0, 0, 0.75), 0 0 0 1px ${config.accentColor}50`
            : "0 8px 24px rgba(0, 0, 0, 0.6)",
        }}
      >
        <ThemeSupplement label={false} media={media} config={config} album={true} badge={false} currentTime={formattedCurrent} durationTime={formattedDuration} />
        {/* Left Side Album Art with Live Badge */}
        <div className="streamer-art-wrapper mpo-art" data-theme-role="artwork">
          <AnimatePresence mode="wait">
            {artUrl ? (
              <motion.img
                key={artUrl}
                src={artUrl}
                alt={media.title}
                className="streamer-art mpo-art-img"
                data-theme-role="artwork-image"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            ) : (
              <div className="streamer-no-art" style={{ background: config.accentColor }}>
                <Radio size={24} color="#fff" />
              </div>
            )}
          </AnimatePresence>

          {/* Live EQ Badge */}
          <div className="streamer-live-tag">
            <span className={`live-dot ${isPlaying ? "active" : "paused"}`} />
            <span className="mpo-playback-status" data-theme-role="status">{isPlaying ? (config.themePlayingLabel || "LIVE") : (config.themePausedLabel || "PAUSED")}</span>
          </div>
        </div>

        {/* Center Stream Information */}
        <div className="streamer-body">
          <div className="streamer-top-row">
            <span
              className="streamer-source mpo-badge"
              data-theme-role="badge"
              style={{
                color: config.accentColor,
                borderColor: `${config.accentColor}55`,
                backgroundColor: `${config.accentColor}18`,
              }}
            >
              <span className="mpo-theme-label" data-theme-role="themeLabel">{config.themeLabel || "NOW PLAYING"}</span> • {media.app_name || "WINDOWS MEDIA"}
            </span>
            <span className="streamer-time" data-theme-role="timestamps">
              {durationKnown ? `${formattedCurrent} / ${formattedDuration}` : formattedCurrent}
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={media.title}
              className="streamer-title mpo-title"
              data-theme-role="title"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              title={media.title}
            >
              {media.title || "No Media Playing"}
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={media.artist}
              className="streamer-artist mpo-artist"
              data-theme-role="artist"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {media.artist || "Awaiting audio stream"}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Laser Bottom Scrubber */}
        {config.showProgress && positionKnown && durationKnown && (
          <div className="streamer-progress-line mpo-progress" data-theme-role="progress" data-theme-part="progress-track">
            <div
              className="streamer-progress-bar mpo-progress-fill"
              data-theme-role="progress-fill"
              style={{
                transform: `scaleX(${progress})`,
                backgroundColor: config.accentColor,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
