import { ThemeSupplement } from "./ThemeSupplement";
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Music2 } from "lucide-react";
import { ThemeProps } from "../types/themes";
import { useScrubber } from "../hooks/useScrubber";

export const MinimalPill: React.FC<ThemeProps> = ({
  media,
  artUrl,
  config,
  customCss,
}) => {
  const isPlaying = media.status === "Playing";
  const { formattedCurrent, formattedDuration, progress, positionKnown, durationKnown } = useScrubber(media);

  return (
    <div
      className="mpo-theme-container minimal-pill-root"
      style={{
        transform: `scale(${config.scale})`,
        transformOrigin: "center center",
      }}
    >
      {customCss && <style>{customCss}</style>}

      <div
        className="pill-card mpo-card"
        style={{
          backgroundColor: config.highContrast
            ? `rgba(8, 8, 12, ${config.opacity})`
            : `rgba(15, 15, 24, ${config.opacity})`,
          backdropFilter: "var(--hud-backdrop-filter, none)",
          WebkitBackdropFilter: "var(--hud-backdrop-filter, none)",
          borderColor: isPlaying ? config.accentColor : "rgba(255, 255, 255, 0.16)",
          boxShadow: isPlaying
            ? `0 8px 24px -4px ${config.accentColor}40, 0 0 0 1px ${config.accentColor}60`
            : "0 8px 24px rgba(0, 0, 0, 0.6)",
        }}
      >
        <ThemeSupplement media={media} config={config} album={true} badge={true} currentTime={formattedCurrent} durationTime={formattedDuration} />
        {/* Mini Round Art */}
        <div className="pill-art-circle mpo-art">
          <AnimatePresence mode="wait">
            {artUrl ? (
              <motion.img
                key={artUrl}
                src={artUrl}
                alt={media.title}
                className="pill-img mpo-art-img"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            ) : (
              <div className="pill-no-art" style={{ background: config.accentColor }}>
                <Music2 size={16} color="#fff" />
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Text Details */}
        <div className="pill-details">
          <div className="pill-text-row">
            <span className="pill-title mpo-title" title={media.title}>
              {media.title || "No Track Active"}
            </span>
            <span className="pill-dot">•</span>
            <span className="pill-artist mpo-artist">
              {media.artist || "Awaiting Stream"}
            </span>
          </div>

          {/* Micro Progress Bar */}
          {config.showProgress && positionKnown && durationKnown && (
            <div className="pill-progress-row mpo-progress">
              <div className="pill-track">
                <div
                  className="pill-fill mpo-progress-fill"
                  style={{
                    transform: `scaleX(${progress})`,
                    backgroundColor: config.accentColor,
                  }}
                />
              </div>
              <span className="pill-time">{formattedCurrent} / {formattedDuration}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
