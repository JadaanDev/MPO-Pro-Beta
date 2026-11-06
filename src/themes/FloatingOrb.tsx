import { ThemeSupplement } from "./ThemeSupplement";
import React from "react";
import { Disc } from "lucide-react";
import { ThemeProps } from "../types/themes";
import { useScrubber } from "../hooks/useScrubber";

export const FloatingOrb: React.FC<ThemeProps> = ({
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
      className="mpo-theme-container floating-orb-root"
      style={{
        transform: `scale(${config.scale})`,
        transformOrigin: "center center",
        width: config.customWidth > 0 ? `${config.customWidth}px` : undefined,
        height: config.customHeight > 0 ? `${config.customHeight}px` : undefined,
      }}
    >
      {customCss && <style>{customCss}</style>}

      <div
        className="orb-card mpo-card"
        style={{
          backgroundColor: config.highContrast
            ? `rgba(8, 10, 16, ${config.opacity})`
            : `rgba(16, 20, 32, ${config.opacity})`,
          backdropFilter: "var(--hud-backdrop-filter, none)",
          WebkitBackdropFilter: "var(--hud-backdrop-filter, none)",
          borderRadius: `${config.borderRadius}px`,
          borderColor: isPlaying ? `${accent}70` : "rgba(255, 255, 255, 0.12)",
        }}
      >
        <ThemeSupplement media={media} config={config} album={true} badge={false} currentTime={formattedCurrent} durationTime={formattedDuration} />
        {/* Holographic Orb with Acoustic Ring Waves */}
        {config.showArt && (
          <div className="orb-art-section">
            {isPlaying && (
              <div
                className="orb-acoustic-ring"
                style={{ borderColor: `${accent}60` }}
              />
            )}
            <div className="orb-disc mpo-art" style={{ borderColor: accent }}>
              {artUrl ? (
                <img src={artUrl} alt="" className="orb-img mpo-art-img" />
              ) : (
                <div className="orb-fallback" style={{ background: accent }}>
                  <Disc size={26} color="#fff" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="orb-content">
          <div className="orb-top">
            {config.showBadge && (
              <span
                className="orb-badge mpo-badge"
                style={{ color: accent, borderColor: `${accent}50`, background: `${accent}15` }}
              >
                {media.app_name || "AUDIO ORB"}
              </span>
            )}
            <span className="mpo-playback-status orb-status">{isPlaying ? (config.themePlayingLabel || "STREAMING") : (config.themePausedLabel || "IDLE")}</span>
          </div>

          {config.showTitle && (
            <div className="orb-title mpo-title" title={media.title}>
              {media.title || "No Track Active"}
            </div>
          )}

          {config.showArtist && (
            <div className="orb-artist mpo-artist">
              {media.artist || "Awaiting Player"}
            </div>
          )}

          {config.showProgress && positionKnown && durationKnown && (
            <div className="orb-progress mpo-progress">
              <div className="orb-track">
                <div
                  className="orb-fill mpo-progress-fill"
                  style={{
                    transform: `scaleX(${progress})`,
                    background: accent,
                  }}
                />
              </div>
              <div className="orb-times">
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
