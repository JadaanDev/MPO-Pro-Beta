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
        data-theme-role="frame"
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
          <div className="tag-art mpo-art" data-theme-role="artwork">
            {artUrl ? (
              <img src={artUrl} alt="" className="tag-img mpo-art-img" data-theme-role="artwork-image" />
            ) : (
              <div className="tag-fallback" style={{ background: accent }}>
                <Tag size={16} color="#fff" />
              </div>
            )}
          </div>
        )}

        <div className="tag-body">
          <div className="tag-header">
            {config.themeLabel && (
              <span className="mpo-theme-label tag-theme-label" data-theme-role="themeLabel">
                {config.themeLabel}
              </span>
            )}
            {config.showBadge && (
              <span className="tag-badge mpo-badge" data-theme-role="badge" style={{ color: accent }}>
                {media.app_name || "MEDIA"}
              </span>
            )}
            <span className="mpo-playback-status tag-status-text" data-theme-role="status">{isPlaying ? (config.themePlayingLabel || "NOW PLAYING") : (config.themePausedLabel || "PAUSED")}</span>
          </div>

          {config.showTitle && (
            <div className="tag-title mpo-title" data-theme-role="title" title={media.title}>
              {media.title || "No Track Active"}
            </div>
          )}

          {config.showArtist && (
            <div className="tag-artist mpo-artist" data-theme-role="artist">
              {media.artist || "Awaiting source"}
            </div>
          )}

          {config.showProgress && positionKnown && durationKnown && (
            <div className="tag-progress mpo-progress" data-theme-role="progress">
              <div className="tag-track" data-theme-role="progress-track" data-theme-part="progress-track">
                <div
                  className="tag-fill mpo-progress-fill"
                  data-theme-role="progress-fill"
                  style={{
                    transform: `scaleX(${progress})`,
                    background: accent,
                  }}
                />
              </div>
              <div className="tag-time" data-theme-role="timestamps">{formattedCurrent} / {formattedDuration}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
