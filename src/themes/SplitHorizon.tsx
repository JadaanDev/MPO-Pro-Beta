import { ThemeSupplement } from "./ThemeSupplement";
import React from "react";
import { ThemeProps } from "../types/themes";
import { useScrubber } from "../hooks/useScrubber";

export const SplitHorizon: React.FC<ThemeProps> = ({
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
      className="mpo-theme-container split-horizon-root"
      style={{
        transform: `scale(${config.scale})`,
        transformOrigin: "center center",
        width: config.customWidth > 0 ? `${config.customWidth}px` : undefined,
        height: config.customHeight > 0 ? `${config.customHeight}px` : undefined,
      }}
    >
      {customCss && <style>{customCss}</style>}

      <div
        className="split-card mpo-card"
        data-theme-role="frame"
        style={{
          backgroundColor: config.highContrast
            ? `rgba(6, 8, 14, ${config.opacity})`
            : `rgba(14, 18, 30, ${config.opacity})`,
          backdropFilter: "var(--hud-backdrop-filter, none)",
          WebkitBackdropFilter: "var(--hud-backdrop-filter, none)",
          borderRadius: `${config.borderRadius}px`,
        }}
      >
        <ThemeSupplement media={media} config={config} album={true} badge={false} currentTime={formattedCurrent} durationTime={formattedDuration} />
        {/* Left Art Half */}
        {config.showArt && (
          <div className="split-art-side mpo-art" data-theme-role="artwork">
            {artUrl ? (
              <img src={artUrl} alt="" className="split-img mpo-art-img" data-theme-role="artwork-image" />
            ) : (
              <div className="split-art-fallback" style={{ background: accent }} />
            )}
            <div className="split-art-shadow" />
          </div>
        )}

        {/* Right Info Half */}
        <div className="split-info-side">
          <div className="split-top">
            {config.themeLabel && (
              <span className="mpo-theme-label split-theme-label" data-theme-role="themeLabel">
                {config.themeLabel}
              </span>
            )}
            {config.showBadge && (
              <span className="split-badge mpo-badge" data-theme-role="badge" style={{ color: accent }}>
                {media.app_name || "STEREO"}
              </span>
            )}
            {config.showVisualizer && (
              <div className={`split-eq mpo-visualizer ${isPlaying ? "live" : "idle"}`} data-theme-role="indicator">
                <span className="mpo-vis-bar" data-theme-role="indicator-bar" style={{ background: accent }} />
                <span className="mpo-vis-bar" data-theme-role="indicator-bar" style={{ background: accent }} />
                <span className="mpo-vis-bar" data-theme-role="indicator-bar" style={{ background: accent }} />
              </div>
            )}
          </div>

          {config.showTitle && (
            <div className="split-title mpo-title" data-theme-role="title" title={media.title}>
              {media.title || "Split Horizon"}
            </div>
          )}

          {config.showArtist && (
            <div className="split-artist mpo-artist" data-theme-role="artist">
              {media.artist || "Awaiting Stream"}
            </div>
          )}

          {config.showProgress && positionKnown && durationKnown && (
            <div className="split-progress mpo-progress" data-theme-role="progress">
              <div className="split-track" data-theme-role="progress-track" data-theme-part="progress-track">
                <div
                  className="split-fill mpo-progress-fill"
                  data-theme-role="progress-fill"
                  style={{
                    transform: `scaleX(${progress})`,
                    background: accent,
                  }}
                />
              </div>
              <div className="split-times" data-theme-role="timestamps">
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
