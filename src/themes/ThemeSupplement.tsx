import React from "react";
import { MediaState } from "../types/media";
import { ThemeConfig } from "../types/themes";
import { timelinePresentation } from "../utils/timelinePresentation";

/** Shared optional elements for themes that lack an independent slot. The bars
 * indicate playback state; they are not a live audio spectrum. */
export const ThemeSupplement: React.FC<{ media: MediaState; config: ThemeConfig; album: boolean; badge: boolean; label?: boolean; currentTime: string; durationTime: string }> = ({ media, config, album, badge, label = true, currentTime, durationTime }) => {
  const count = Math.max(0, Math.min(128, Math.round(config.visualizerCount ?? config.visualizerBars ?? 8)));
  const height = Math.max(0, config.visualizerHeight ?? 24);
  const hasAlbum = album && config.showAlbum && Boolean(media.album_title);
  const hasBadge = badge && config.showBadge;
  const timeline = timelinePresentation(media, currentTime, durationTime);
  const hasTimes = config.showTimestamps !== false;
  const hasStatus = config.showPlaybackStatus === true;
  if (!hasAlbum && !hasBadge && !hasTimes && !hasStatus && !config.showVisualizer && !(label && config.showThemeLabel !== false && config.themeLabel)) return null;
  return <div className="mpo-theme-supplement">
    {label && config.showThemeLabel !== false && config.themeLabel && <span className="mpo-theme-label mpo-theme-custom-label" data-theme-role="themeLabel">{config.themeLabel}</span>}
    {hasBadge && <span className="mpo-badge mpo-supplement-badge" data-theme-role="badge">{media.app_name || "Media"}</span>}
    {hasAlbum && <span className="mpo-album mpo-supplement-album" data-theme-role="album" title={media.album_title}>{media.album_title}</span>}
    {hasStatus && <span className="mpo-playback-status" data-theme-role="status">{media.status === "Playing" ? (config.themePlayingLabel || "Playing") : (config.themePausedLabel || (media.status === "Paused" ? "Paused" : "Stopped"))}</span>}
    {hasTimes && <span className="mpo-universal-timestamps" data-theme-role="timestamps" data-timeline-state={timeline.state}>{timeline.label}</span>}
    {config.showVisualizer && <div className={`mpo-universal-visualizer style-${config.visualizerType || "bars"} ${media.status === "Playing" ? "playing" : ""}`} style={{ height, width: count * 5 }} role="img" aria-label="Animated playback indicator" data-theme-role="indicator">
      {Array.from({ length: count }, (_, index) => <span key={index} className="mpo-vis-bar" data-theme-role="indicator-bar" style={{ height: `${30 + ((index * 37) % 71)}%`, animationDelay: `${(index % 7) * -0.12}s` }} />)}
    </div>}
  </div>;
};
