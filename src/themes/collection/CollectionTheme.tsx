import React from "react";
import { Music2 } from "lucide-react";
import { ThemeProps } from "../../types/themes";
import { useScrubber } from "../../hooks/useScrubber";
import { ThemeSupplement } from "../ThemeSupplement";
import "./collection-base.css";

/** Shared accessible media elements; each design owns its composition and CSS. */
export const CollectionTheme: React.FC<ThemeProps & { design: string; surface: "obs" | "tiktok" | "desktop"; kicker: string }> = ({ media, artUrl, config, design, surface, kicker }) => {
  const { formattedCurrent, formattedDuration, progress, positionKnown, durationKnown } = useScrubber(media);
  const alpha = Math.max(0, Math.min(1, config.opacity ?? 0.88));
  const color = config.highContrast ? `rgba(6,8,13,${alpha})` : `rgba(19,22,31,${alpha})`;
  return <div className={`mpo-theme-container collection-root collection-${surface} design-${design}`} style={{ transform: `scale(${config.scale ?? 1})`, transformOrigin: "center" }}>
    <div className="mpo-card collection-card" data-theme-role="frame" data-art={config.showArt ? "true" : "false"} style={{ backgroundColor: color, backdropFilter: "var(--hud-backdrop-filter, none)", WebkitBackdropFilter: "var(--hud-backdrop-filter, none)", "--surface-alpha": alpha } as React.CSSProperties}>
      <div className="collection-ornament" aria-hidden="true" />
      {config.showArt && <div className="mpo-art collection-art" data-theme-role="artwork">{artUrl ? <img className="mpo-art-img collection-art-image" data-theme-role="artwork-image" src={artUrl} alt="" /> : <div className="collection-art-empty"><Music2 size={24} /></div>}</div>}
      <div className="collection-info">
        <div className="collection-header">{config.showThemeLabel !== false && <span className="mpo-theme-label collection-kicker" data-theme-role="themeLabel">{config.themeLabel || kicker}</span>}{config.showBadge && <span className="mpo-badge collection-badge" data-theme-role="badge">{media.app_name || "MEDIA"}</span>}</div>
        {config.showTitle && <div className="mpo-title collection-title" data-theme-role="title" title={media.title}>{media.title || "No track playing"}</div>}
        {config.showArtist && <div className="mpo-artist collection-artist" data-theme-role="artist">{media.artist || "Waiting for a player"}</div>}
        {config.showAlbum && media.album_title && <div className="mpo-album collection-album" data-theme-role="album">{media.album_title}</div>}
        {config.showProgress && positionKnown && durationKnown && <div className="mpo-progress collection-progress" data-theme-role="progress"><div className="collection-progress-track" data-theme-role="progress-track" data-theme-part="progress-track"><div className="mpo-progress-fill collection-progress-fill" data-theme-role="progress-fill" style={{ transform: `scaleX(${progress})` }} /></div></div>}
      </div>
      <ThemeSupplement label={false} media={media} config={config} album={false} badge={false} currentTime={formattedCurrent} durationTime={formattedDuration} />
    </div>
  </div>;
};
