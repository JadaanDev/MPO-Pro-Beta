import type { MediaState } from "../../types/media";
import type { ThemeConfig } from "../../types/themes";
import type { SdkRole } from "./sdkBridge";
import { timelinePresentation } from "../../utils/timelinePresentation";

export function sdkSupplementState(roles: Set<SdkRole>, media: MediaState, config: Partial<ThemeConfig>) {
  const edited = config.visibilityOverrides || {};
  const artwork = !roles.has("artwork") && !roles.has("artwork-image") && edited.showArt === true;
  const title = !roles.has("title") && edited.showTitle === true;
  const artist = !roles.has("artist") && edited.showArtist === true;
  const progress = !roles.has("progress") && !roles.has("progress-track") && edited.showProgress === true;
  const hasSupplement = Object.keys(config).length > 0 && Boolean(artwork || title || artist || progress ||
    (!roles.has("album") && config.showAlbum && media.album_title) || (!roles.has("badge") && config.showBadge) ||
    (!roles.has("status") && config.showPlaybackStatus) || (!roles.has("themeLabel") && config.showThemeLabel !== false && config.themeLabel) ||
    (!roles.has("timestamps") && config.showTimestamps !== false) || config.showVisualizer);
  const room = Math.max(38, config.showVisualizer ? (config.visualizerHeight ?? 24) + 16 : 0, artwork ? (config.artSize || 48) + 16 : 0);
  return { artwork, title, artist, progress, hasSupplement, room };
}

/** Fill absent semantic slots without duplicating metadata authored by a theme. */
export function SdkThemeSupplement({ roles, media, artUrl = "", config, currentTime, durationTime }: {
  roles: Set<SdkRole>;
  media: MediaState;
  artUrl?: string;
  config: Partial<ThemeConfig>;
  currentTime: string;
  durationTime: string;
}) {
  const enabled = Object.keys(config).length > 0;
  if (!enabled) return null;
  const missing = sdkSupplementState(roles, media, config);
  const timeline = timelinePresentation(media, currentTime, durationTime);
  const count = Math.max(0, Math.min(128, Math.round(config.visualizerCount ?? config.visualizerBars ?? 8)));
  const height = Math.max(0, config.visualizerHeight ?? 24);
  return <div className="mpo-sdk-supplement" data-theme-sdk-generated data-mpo-sdk-supplement>
    {missing.artwork && <div data-theme-role="artwork" style={{ width: 48, height: 48, borderRadius: 8, overflow: "hidden", flex: "none" }}>{artUrl ? <img data-theme-role="artwork-image" src={artUrl} alt="Album artwork" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <span aria-label="Album artwork">♫</span>}</div>}
    {missing.title && <span data-theme-role="title">{media.title || "No Track"}</span>}
    {missing.artist && <span data-theme-role="artist">{media.artist || "Unknown Artist"}</span>}
    {missing.progress && <div data-theme-role="progress" data-theme-part="progress-track" data-timeline-state={timeline.state} role="progressbar" aria-label="Playback progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={timeline.determinate ? Math.max(0, Math.min(100, media.position_ms / media.duration_ms * 100)) : undefined} aria-valuetext={timeline.label} style={{ width: 100, minWidth: 40, height: 4, background: "#ffffff33", borderRadius: 4 }}><div data-theme-role="progress-fill" style={{ width: timeline.determinate ? `${Math.max(0, Math.min(100, media.position_ms / media.duration_ms * 100))}%` : "25%", opacity: timeline.determinate ? 1 : .35, height: "100%", borderRadius: "inherit", background: "#ffffff" }} /></div>}
    {!roles.has("themeLabel") && config.showThemeLabel !== false && config.themeLabel && <span data-theme-role="themeLabel">{config.themeLabel}</span>}
    {!roles.has("badge") && config.showBadge && <span data-theme-role="badge">{media.app_name || "Media"}</span>}
    {!roles.has("album") && config.showAlbum && media.album_title && <span data-theme-role="album">{media.album_title}</span>}
    {!roles.has("status") && config.showPlaybackStatus && <span data-theme-role="status">{media.status === "Playing" ? (config.themePlayingLabel || "Playing") : (config.themePausedLabel || (media.status === "Paused" ? "Paused" : "Stopped"))}</span>}
    {!roles.has("timestamps") && config.showTimestamps !== false && <span data-theme-role="timestamps" data-timeline-state={timeline.state}>{timeline.label}</span>}
    {config.showVisualizer && <div data-theme-role="indicator" className={`mpo-universal-visualizer style-${config.visualizerType || "bars"} ${media.status === "Playing" ? "playing" : ""}`} role="img" aria-label="Animated playback indicator" style={{ height, width: count * 6 }}>
      {Array.from({ length: count }, (_, index) => <span key={index} data-theme-role="indicator-bar" className="mpo-vis-bar" style={{ height: `${30 + ((index * 37) % 71)}%`, animationDelay: `${(index % 7) * -0.12}s` }} />)}
    </div>}
  </div>;
}
