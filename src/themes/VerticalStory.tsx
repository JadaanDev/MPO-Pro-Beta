import { ThemeSupplement } from "./ThemeSupplement";
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Music, Radio } from "lucide-react";
import { ThemeProps } from "../types/themes";
import { useScrubber } from "../hooks/useScrubber";

export const VerticalStory: React.FC<ThemeProps> = ({
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
      className="mpo-theme-container vertical-story-root"
      style={{
        transform: `scale(${config.scale})`,
        transformOrigin: "center center",
        width: config.customWidth > 0 ? `${config.customWidth}px` : "360px",
        height: config.customHeight > 0 ? `${config.customHeight}px` : undefined,
      }}
    >
      {customCss && <style>{customCss}</style>}

      <div
        className="story-card mpo-card"
        style={{
          backgroundColor: config.highContrast
            ? `rgba(7, 9, 15, ${config.opacity})`
            : `rgba(15, 19, 32, ${config.opacity})`,
          backdropFilter: "var(--hud-backdrop-filter, none)",
          WebkitBackdropFilter: "var(--hud-backdrop-filter, none)",
          borderRadius: `${config.borderRadius}px`,
          borderColor: isPlaying ? `${accent}60` : "rgba(255, 255, 255, 0.12)",
          boxShadow: isPlaying ? `0 20px 50px rgba(0,0,0,0.8), 0 0 35px ${accent}30` : "0 14px 40px rgba(0,0,0,0.7)",
        }}
      >
        <ThemeSupplement media={media} config={config} album={true} badge={false} currentTime={formattedCurrent} durationTime={formattedDuration} />
        {/* Top Source Header */}
        <div className="story-header">
          {config.showBadge && (
            <span
              className="story-badge mpo-badge"
              style={{
                color: accent,
                borderColor: `${accent}40`,
                background: `${accent}15`,
              }}
            >
              <Radio size={12} />
              <span>{media.app_name || "TIKTOK LIVE"}</span>
            </span>
          )}

          {config.showVisualizer && (
            <div className={`story-live-badge mpo-visualizer ${isPlaying ? "live" : "paused"}`}>
              <span className="live-dot mpo-vis-bar" />
              <span className="mpo-playback-status">{isPlaying ? (config.themePlayingLabel || "PLAYING") : (config.themePausedLabel || "PAUSED")}</span>
            </div>
          )}
        </div>

        {/* Large Prominent Album Artwork */}
        {config.showArt && (
          <div className="story-art-box mpo-art">
            <AnimatePresence mode="wait">
              {artUrl ? (
                <motion.img
                  key={artUrl}
                  src={artUrl}
                  alt={media.title}
                  className="story-art-img mpo-art-img"
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                />
              ) : (
                <div className="story-no-art" style={{ background: `${accent}25` }}>
                  <Music size={48} color={accent} />
                </div>
              )}
            </AnimatePresence>
            <div className="story-art-reflection" />
          </div>
        )}

        {/* Big Mobile-Readable Text */}
        <div className="story-info">
          {config.showTitle && (
            <AnimatePresence mode="wait">
              <motion.div
                key={media.title}
                className="story-title mpo-title"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                title={media.title}
              >
                {media.title || "No Media Active"}
              </motion.div>
            </AnimatePresence>
          )}

          {(config.showArtist || config.showAlbum) && (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${media.artist}-${media.album_title}`}
                className="story-artist mpo-artist"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {config.showArtist && (media.artist || "Start music on Spotify / Chrome")}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Scrubber Timeline */}
        {config.showProgress && media.duration_ms > 0 && (
          <div className="story-progress-section mpo-progress">
            <div className="story-track">
              <div
                className="story-fill mpo-progress-fill"
                style={{
                  transform: `scaleX(${progress})`,
                  background: `linear-gradient(90deg, ${accent}, #ec4899)`,
                }}
              />
            </div>
            <div className="story-times">
              <span>{formattedCurrent}</span>
              <span>{formattedDuration}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
