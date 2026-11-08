import { ThemeSupplement } from "./ThemeSupplement";
import React from "react";
import { ThemeProps } from "../types/themes";
import { useScrubber } from "../hooks/useScrubber";
import { Music, Radio } from "lucide-react";

export const AppleMusicLive: React.FC<ThemeProps> = ({
  media,
  artUrl,
  config,
  customCss,
  format = "horizontal",
  extractedColor,
}) => {
  const { formattedCurrent, formattedDuration, progress, positionKnown, durationKnown } = useScrubber(media);
  const accent = (config.autoAlbumColor && extractedColor) ? extractedColor : (config.accentColor || "#fa2d48"); // Signature Apple Music Red

  const isPlaying = media.status === "Playing";
  const isVertical = format === "vertical";

  const defaultArtDimension = isVertical ? 148 : 76;
  const artDimension = config.artSize && config.artSize > 0 ? config.artSize : defaultArtDimension;
  const artRadius = config.artRadius !== undefined ? config.artRadius : (isVertical ? 20 : 14);

  // Card dimensions & scale
  const cardScale = config.scale || 1.0;
  const cardWidth = config.customWidth > 0 ? `${config.customWidth}px` : isVertical ? "340px" : "490px";
  const cardHeight = config.customHeight > 0 ? `${config.customHeight}px` : "auto";

  return (
    <div
      className={`mpo-theme-container apple-music-live-root ${format}`}
      style={{
        transform: `scale(${cardScale})`,
        transformOrigin: "center center",
      }}
    >
      {/* Scoped CSS Injection */}
      {customCss && <style>{customCss}</style>}

      <div
        className="mpo-card apple-music-card"
        data-theme-role="frame"
        style={{
          width: cardWidth,
          height: cardHeight,
          borderRadius: `${config.borderRadius || 24}px`,
          background: config.highContrast
            ? `rgba(10, 10, 14, ${config.opacity})`
            : `rgba(18, 18, 24, ${config.opacity ?? 0.86})`,
          backdropFilter: "var(--hud-backdrop-filter, none)",
          WebkitBackdropFilter: "var(--hud-backdrop-filter, none)",
          border: "1px solid rgba(255, 255, 255, 0.14)",
          boxShadow: `0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px ${accent}22, inset 0 1px 0 rgba(255, 255, 255, 0.15)`,
          padding: `${config.framePadding ? config.framePadding + 14 : 16}px`,
          boxSizing: "border-box",
        }}
      >
        <ThemeSupplement label={false} media={media} config={config} album={false} badge={false} currentTime={formattedCurrent} durationTime={formattedDuration} />
        {/* iOS Dynamic Island Top Header */}
        {config.showBadge !== false && (
          <div className="apple-music-header">
            <div className="apple-music-badge">
              <div className="apple-music-icon-bubble" style={{ background: accent }}>
                <Music size={11} color="#fff" />
              </div>
              <span className="mpo-theme-label apple-music-badge-text" data-theme-role="themeLabel">{config.themeLabel || "Apple Music"}</span>
              {media.app_name && media.app_name !== "Apple Music" && (
                <span className="apple-music-source-tag mpo-badge" data-theme-role="badge">• {media.app_name}</span>
              )}
            </div>

            {/* Animated Equalizer Sound Bars */}
            {config.showVisualizer !== false && (
              <div className="apple-eq-container" data-theme-role="indicator" title={isPlaying ? "Playing" : "Paused"}>
                <span className={`apple-eq-bar eq-1 ${isPlaying ? "animating" : ""}`} data-theme-role="indicator-bar" style={{ background: accent }} />
                <span className={`apple-eq-bar eq-2 ${isPlaying ? "animating" : ""}`} data-theme-role="indicator-bar" style={{ background: accent }} />
                <span className={`apple-eq-bar eq-3 ${isPlaying ? "animating" : ""}`} data-theme-role="indicator-bar" style={{ background: accent }} />
                <span className={`apple-eq-bar eq-4 ${isPlaying ? "animating" : ""}`} data-theme-role="indicator-bar" style={{ background: accent }} />
              </div>
            )}
          </div>
        )}

        {/* Main Media Body */}
        <div className={`apple-music-content ${isVertical ? "vertical-layout" : "horizontal-layout"}`}>
          {/* Squircle Album Artwork */}
          {config.showArt !== false && (
            <div
              className="apple-art-box mpo-art"
              data-theme-role="artwork"
              style={{
                width: `${artDimension}px`,
                height: `${artDimension}px`,
                minWidth: `${artDimension}px`,
                minHeight: `${artDimension}px`,
                borderRadius: `${artRadius}px`,
                border: config.artBorder ? `${config.artBorder}px solid rgba(255, 255, 255, 0.25)` : "1px solid rgba(255, 255, 255, 0.12)",
                boxShadow: `0 10px 26px rgba(0, 0, 0, 0.5), 0 0 24px ${accent}30`,
              }}
            >
              {artUrl ? (
                <img
                  src={artUrl}
                  alt={media.album_title || media.title}
                  className="apple-art-img mpo-art-img"
                  data-theme-role="artwork-image"
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: `${artRadius}px`,
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  className="apple-art-placeholder"
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: `${artRadius}px`,
                    background: `linear-gradient(135deg, ${accent}55, #12121c)`,
                  }}
                >
                  <Radio size={isVertical ? 42 : 28} color="rgba(255, 255, 255, 0.7)" />
                </div>
              )}
            </div>
          )}

          {/* Track Info (Title, Artist, Album) */}
          <div className="apple-track-info">
            {config.showTitle !== false && (
              <div
                className="mpo-title apple-title"
                data-theme-role="title"
                style={{
                  fontFamily: config.titleFont
                    ? `"${config.titleFont}", -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif`
                    : '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Segoe UI", sans-serif',
                  fontSize: config.titleSize ? `${config.titleSize}px` : isVertical ? "20px" : "16px",
                  fontWeight: config.titleWeight || 700,
                  color: config.titleColor || "#ffffff",
                }}
              >
                {media.title || "No Media Playing"}
              </div>
            )}

            {config.showArtist !== false && (
              <div
                className="mpo-artist apple-artist"
                data-theme-role="artist"
                style={{
                  fontSize: config.artistSize ? `${config.artistSize}px` : "13.5px",
                  color: config.artistColor || "rgba(255, 255, 255, 0.75)",
                }}
              >
                {media.artist || "Waiting for audio session..."}
              </div>
            )}

            {config.showAlbum !== false && media.album_title && (
              <div
                className="mpo-album apple-album"
                data-theme-role="album"
                style={{
                  fontSize: config.albumSize ? `${config.albumSize}px` : "12px",
                  color: "rgba(255, 255, 255, 0.45)",
                }}
              >
                {media.album_title}
              </div>
            )}

            {/* In Horizontal mode, place scrubber right below text */}
            {!isVertical && config.showProgress !== false && positionKnown && durationKnown && (
              <div className="apple-scrubber-section horizontal-scrubber" data-theme-role="progress">
                <div className="apple-progress-bar-track" data-theme-role="progress-track" data-theme-part="progress-track">
                  <div
                    className="mpo-progress-fill apple-progress-bar-fill"
                    data-theme-role="progress-fill"
                    style={{
                      width: `${Math.min(Math.max(Math.round(progress * 100), 0), 100)}%`,
                      background: `linear-gradient(90deg, ${accent}, #ffffff)`,
                    }}
                  >
                    <span className="apple-scrubber-thumb" />
                  </div>
                </div>

                <div className="apple-timestamps-row" data-theme-role="timestamps">
                  <span className="mpo-time-current apple-time">{formattedCurrent}</span>
                  <span className="mpo-time-duration apple-time">
                    {formattedDuration}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* In Vertical mode, scrubber sits below artwork and text with balanced margin */}
        {isVertical && config.showProgress !== false && positionKnown && durationKnown && (
          <div className="apple-scrubber-section vertical-scrubber" data-theme-role="progress">
            <div className="apple-progress-bar-track" data-theme-role="progress-track" data-theme-part="progress-track">
              <div
                className="mpo-progress-fill apple-progress-bar-fill"
                data-theme-role="progress-fill"
                style={{
                  width: `${Math.min(Math.max(Math.round(progress * 100), 0), 100)}%`,
                  background: `linear-gradient(90deg, ${accent}, #ffffff)`,
                }}
              >
                <span className="apple-scrubber-thumb" />
              </div>
            </div>

            <div className="apple-timestamps-row" data-theme-role="timestamps">
              <span className="mpo-time-current apple-time">{formattedCurrent}</span>
              <span className="mpo-time-duration apple-time">
                {formattedDuration}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppleMusicLive;
