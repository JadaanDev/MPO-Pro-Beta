import { ThemeSupplement } from "./ThemeSupplement";
import React from "react";
import { Zap } from "lucide-react";
import { ThemeProps } from "../types/themes";
import { useScrubber } from "../hooks/useScrubber";

export const NeonBlade: React.FC<ThemeProps> = ({
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
      className="mpo-theme-container neon-blade-root"
      style={{
        transform: `scale(${config.scale})`,
        transformOrigin: "center center",
        width: config.customWidth > 0 ? `${config.customWidth}px` : undefined,
        height: config.customHeight > 0 ? `${config.customHeight}px` : undefined,
      }}
    >
      {customCss && <style>{customCss}</style>}

      <div
        className="blade-bar mpo-card"
        data-theme-role="frame"
        style={{
          backgroundColor: config.highContrast
            ? `rgba(6, 8, 14, ${config.opacity})`
            : `rgba(10, 14, 24, ${config.opacity})`,
          backdropFilter: "var(--hud-backdrop-filter, none)",
          WebkitBackdropFilter: "var(--hud-backdrop-filter, none)",
          borderTop: `2px solid ${accent}`,
          borderBottom: `2px solid ${accent}`,
          boxShadow: isPlaying ? `0 0 20px ${accent}40` : "0 8px 24px rgba(0,0,0,0.7)",
        }}
      >
        <ThemeSupplement media={media} config={config} album={true} badge={true} currentTime={formattedCurrent} durationTime={formattedDuration} />
        {/* Left Glowing Art / Icon */}
        {config.showArt && (
          <div className="blade-art mpo-art" data-theme-role="artwork">
            {artUrl ? (
              <img src={artUrl} alt="" className="blade-img mpo-art-img" data-theme-role="artwork-image" />
            ) : (
              <div className="blade-icon" style={{ background: accent }}>
                <Zap size={15} color="#fff" />
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="blade-info">
          {config.themeLabel && (
            <div className="blade-theme-label mpo-theme-label" data-theme-role="themeLabel">
              {config.themeLabel}
            </div>
          )}
          <div className="blade-titles">
            {config.showTitle && (
              <span className="blade-title mpo-title" data-theme-role="title" title={media.title}>
                {media.title || "BLADE_STANDBY"}
              </span>
            )}
            {config.showArtist && (
              <span className="blade-artist mpo-artist" data-theme-role="artist">
                // {media.artist || "Awaiting Stream"}
              </span>
            )}
          </div>

          {config.showProgress && positionKnown && durationKnown && (
            <div className="blade-progress-line mpo-progress" data-theme-role="progress" data-theme-part="progress-track">
              <div
                className="blade-fill mpo-progress-fill"
                data-theme-role="progress-fill"
                style={{
                  transform: `scaleX(${progress})`,
                  background: `linear-gradient(90deg, ${accent}, #ec4899)`,
                }}
              />
            </div>
          )}
        </div>

        {/* Timestamps */}
        <div className="blade-time mpo-times" data-theme-role="timestamps">
          {durationKnown ? `${formattedCurrent} / ${formattedDuration}` : formattedCurrent}
        </div>
      </div>
    </div>
  );
};
