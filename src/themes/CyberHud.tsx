import { ThemeSupplement } from "./ThemeSupplement";
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Radio, Activity } from "lucide-react";
import { ThemeProps } from "../types/themes";
import { useScrubber } from "../hooks/useScrubber";

export const CyberHud: React.FC<ThemeProps> = ({
  media,
  artUrl,
  config,
  customCss,
}) => {
  const isPlaying = media.status === "Playing";
  const { formattedCurrent, formattedDuration, progress, positionKnown, durationKnown } = useScrubber(media);

  return (
    <div
      className="mpo-theme-container cyber-hud-root"
      style={{
        transform: `scale(${config.scale})`,
        transformOrigin: "center center",
      }}
    >
      {customCss && <style>{customCss}</style>}

      <div
        className="cyber-card mpo-card"
        style={{
          backgroundColor: config.highContrast
            ? `rgba(4, 7, 14, ${config.opacity})`
            : `rgba(8, 12, 22, ${config.opacity})`,
          backdropFilter: "var(--hud-backdrop-filter, none)",
          WebkitBackdropFilter: "var(--hud-backdrop-filter, none)",
          borderRadius: `${Math.min(config.borderRadius, 8)}px`,
          borderColor: isPlaying ? "#00f0ff" : "rgba(0, 240, 255, 0.25)",
          boxShadow: isPlaying
            ? "0 0 25px rgba(0, 240, 255, 0.3), inset 0 0 15px rgba(0, 240, 255, 0.1)"
            : "0 8px 32px rgba(0, 0, 0, 0.7)",
        }}
      >
        <ThemeSupplement label={false} media={media} config={config} album={true} badge={false} currentTime={formattedCurrent} durationTime={formattedDuration} />
        {/* Corner Decors */}
        <div className="cyber-corner top-left" />
        <div className="cyber-corner top-right" />
        <div className="cyber-corner bottom-left" />
        <div className="cyber-corner bottom-right" />

        {/* High-Tech Art Frame */}
        <div className="cyber-art-box mpo-art">
          <AnimatePresence mode="wait">
            {artUrl ? (
              <motion.img
                key={artUrl}
                src={artUrl}
                alt={media.title}
                className="cyber-art-img mpo-art-img"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            ) : (
              <div className="cyber-art-fallback">
                <Radio size={28} color="#00f0ff" />
              </div>
            )}
          </AnimatePresence>
          <div className="cyber-scanline" />
        </div>

        {/* Content */}
        <div className="cyber-content">
          <div className="cyber-header">
            <div className="cyber-tag mpo-badge">
              <Activity size={12} color="#00f0ff" />
              <span><span className="mpo-theme-label">{config.themeLabel || "SYS_AUDIO"}</span> // {media.app_name || "GSMTC"}</span>
            </div>
            <div className={`cyber-status-pill ${isPlaying ? "online" : "idle"}`}>
              <span className="blink-dot" />
              <span className="mpo-playback-status">{media.status.toUpperCase()}</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={media.title}
              className="cyber-title mpo-title"
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 4 }}
              title={media.title}
            >
              {media.title || "TELEMETRY_IDLE"}
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={media.artist}
              className="cyber-artist mpo-artist"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              &gt; {media.artist || "AWAITING_SIGNAL"}
            </motion.div>
          </AnimatePresence>

          {/* Segmented HUD Progress */}
          {config.showProgress && positionKnown && durationKnown && (
            <div className="cyber-progress-section mpo-progress">
              <div className="cyber-track">
                <div
                  className="cyber-fill mpo-progress-fill"
                  style={{
                    transform: `scaleX(${progress})`,
                  }}
                />
              </div>
              <div className="cyber-timestamps">
                <span>POS: {formattedCurrent}</span>
                <span>DUR: {formattedDuration}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
