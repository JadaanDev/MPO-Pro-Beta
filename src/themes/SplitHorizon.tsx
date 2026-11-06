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
          <div className="split-art-side mpo-art">
            {artUrl ? (
              <img src={artUrl} alt="" className="split-img mpo-art-img" />
            ) : (
              <div className="split-art-fallback" style={{ background: accent }} />
            )}
            <div className="split-art-shadow" />
          </div>
        )}

        {/* Right Info Half */}
        <div className="split-info-side">
          <div className="split-top">
            {config.showBadge && (
              <span className="split-badge mpo-badge" style={{ color: accent }}>
                {media.app_name || "STEREO"}
              </span>
            )}
            {config.showVisualizer && (
              <div className={`split-eq mpo-visualizer ${isPlaying ? "live" : "idle"}`}>
                <span className="mpo-vis-bar" style={{ background: accent }} />
                <span className="mpo-vis-bar" style={{ background: accent }} />
                <span className="mpo-vis-bar" style={{ background: accent }} />
              </div>
            )}
          </div>

          {config.showTitle && (
            <div className="split-title mpo-title" title={media.title}>
              {media.title || "Split Horizon"}
            </div>
          )}

          {config.showArtist && (
            <div className="split-artist mpo-artist">
              {media.artist || "Awaiting Stream"}
            </div>
          )}

          {config.showProgress && positionKnown && durationKnown && (
            <div className="split-progress mpo-progress">
              <div className="split-track">
                <div
                  className="split-fill mpo-progress-fill"
                  style={{
                    transform: `scaleX(${progress})`,
                    background: accent,
                  }}
                />
              </div>
              <div className="split-times">
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
