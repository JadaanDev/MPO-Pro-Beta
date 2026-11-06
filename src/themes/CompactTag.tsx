import { ThemeSupplement } from "./ThemeSupplement";
import React from "react";
import { Tag } from "lucide-react";
import { ThemeProps } from "../types/themes";
import { useScrubber } from "../hooks/useScrubber";

export const CompactTag: React.FC<ThemeProps> = ({
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
      className="mpo-theme-container compact-tag-root"
      style={{
        transform: `scale(${config.scale})`,
        transformOrigin: "center center",
        width: config.customWidth > 0 ? `${config.customWidth}px` : undefined,
        height: config.customHeight > 0 ? `${config.customHeight}px` : undefined,
      }}
    >
      {customCss && <style>{customCss}</style>}

      <div
        className="tag-card mpo-card"
        style={{
          backgroundColor: config.highContrast
            ? `rgba(7, 9, 15, ${config.opacity})`
            : `rgba(14, 18, 28, ${config.opacity})`,
          backdropFilter: "var(--hud-backdrop-filter, none)",
          WebkitBackdropFilter: "var(--hud-backdrop-filter, none)",
          borderRadius: `${Math.min(config.borderRadius, 10)}px`,
          borderLeft: `4px solid ${accent}`,
        }}
      >
        <ThemeSupplement media={media} config={config} album={true} badge={false} currentTime={formattedCurrent} durationTime={formattedDuration} />
        {config.showArt && (
          <div className="tag-art mpo-art">
            {artUrl ? (
              <img src={artUrl} alt="" className="tag-img mpo-art-img" />
            ) : (
              <div className="tag-fallback" style={{ background: accent }}>
                <Tag size={16} color="#fff" />
              </div>
            )}
          </div>
        )}

        <div className="tag-body">
          <div className="tag-header">
            {config.showBadge && (
              <span className="tag-badge mpo-badge" style={{ color: accent }}>
                {media.app_name || "MEDIA"}
              </span>
            )}
            <span className="mpo-playback-status tag-status-text">{isPlaying ? (config.themePlayingLabel || "NOW PLAYING") : (config.themePausedLabel || "PAUSED")}</span>
          </div>

          {config.showTitle && (
            <div className="tag-title mpo-title" title={media.title}>
              {media.title || "No Track Active"}
            </div>
          )}

          {config.showArtist && (
            <div className="tag-artist mpo-artist">
              {media.artist || "Awaiting source"}
            </div>
          )}

          {config.showProgress && positionKnown && durationKnown && (
            <div className="tag-progress mpo-progress">
              <div className="tag-track">
                <div
                  className="tag-fill mpo-progress-fill"
                  style={{
                    transform: `scaleX(${progress})`,
                    background: accent,
                  }}
                />
              </div>
              <div className="tag-time">{formattedCurrent} / {formattedDuration}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
