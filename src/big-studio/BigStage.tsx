import type { CSSProperties } from "react";
import { Music2 } from "lucide-react";
import { MediaState } from "../types/media";
import { ThemeConfig } from "../types/themes";
import { useScrubber } from "../hooks/useScrubber";
import { TrackTransitionWrapper } from "../components/common/TrackTransitionWrapper";
import { generateEffectiveThemeCss } from "../utils/ThemeStyleEngine";
import type { BigLayer, BigTheme } from "./types";
import { BIG_THEMES } from "./themes";
import { makeBigLayer } from "./layers";
import "./big-studio.css";
import { BuiltThemeMount } from "../theme-sdk/BuiltThemeMount";
import { ThemeEffectBoundary } from "../components/common/ThemeEffectBoundary";

export function BigStage({
  theme: themeProp,
  layer,
  media,
  artUrl,
  scale = 1,
  config: configProp,
  customCss: customCssProp = "",
  extractedColor = null,
  replay = 0,
}: {
  theme?: BigTheme;
  layer?: BigLayer;
  media: MediaState;
  artUrl: string;
  scale?: number;
  config?: ThemeConfig;
  customCss?: string;
  extractedColor?: string | null;
  replay?: number;
}) {
  const { timeline, progress } = useScrubber(media);
  const resolvedTheme =
    themeProp ||
    (layer ? BIG_THEMES.find((t) => t.id === layer.themeId) : undefined) ||
    BIG_THEMES[0];
  const baseConfig = configProp || layer?.config || makeBigLayer("Preview", resolvedTheme.id).config;
  const effectiveAccent =
    baseConfig.autoAlbumColor && extractedColor
      ? extractedColor
      : baseConfig.accentColor || resolvedTheme.accent;
  const c: ThemeConfig = {
    ...baseConfig,
    accentColor: effectiveAccent,
  };
  const resolvedCustomCss = customCssProp || layer?.customCss || "";
  // Legacy shared-inspector card dimensions describe a small browser overlay.
  // They cannot describe a full-window presentation and can be smaller than
  // the artwork itself. Keep them in the saved layer, but do not apply them to
  // the stage; its layout always follows the available presentation window.
  const stageStyleConfig = { ...c, customWidth: c.bigCustomWidth ?? 0, customHeight: c.bigCustomHeight ?? 0 };
  const effectiveCss = generateEffectiveThemeCss(
    stageStyleConfig,
    "horizontal",
    extractedColor,
    resolvedCustomCss,
    ".big-stage",
    { unboundedSizes: true }
  );
  if (layer?.builtTheme) return <div className="mpo-feed-wrapper big-built-stage" style={{ width: "100%", height: "100%", position: "relative" }}>
    <style>{generateEffectiveThemeCss(stageStyleConfig, "horizontal", extractedColor, resolvedCustomCss, ".big-built-stage", { unboundedSizes: true })}</style>
    <ThemeEffectBoundary fullSize configScale={scale * (c.scale ?? 1)}>
      <TrackTransitionWrapper transitionKey={`${media.title}-${media.artist}-${media.album_title}-${replay}`} style={c.transitionStyle} direction={c.transitionDirection} intensity={c.transitionIntensity} durationMs={c.transitionDurationMs ?? ((c.transitionDuration ?? .35) * 1000)} delayMs={c.transitionDelayMs ?? ((c.transitionDelay ?? 0) * 1000)}>
        <BuiltThemeMount theme={layer.builtTheme} surface="big" media={media} artUrl={artUrl} config={stageStyleConfig} extractedColor={extractedColor} customCss={resolvedCustomCss} scale={scale * (c.scale ?? 1)} fill/>
      </TrackTransitionWrapper>
    </ThemeEffectBoundary>
    {(c.bigBrandName || c.bigBrandLogo) && <div className="big-signature">{c.bigBrandLogo && <img src={c.bigBrandLogo} alt=""/>}{c.bigBrandName}</div>}
  </div>;
  const isPlaying = media.status === "Playing";
  const times = c.showTimestamps !== false;
  const visCount = Math.max(0, Math.round(c.visualizerCount ?? c.visualizerBars ?? 8));
  const visHeight = Math.max(0, c.visualizerHeight ?? 24);
  const visType = c.visualizerType || "bars";

  return (
    <div
      className={`mpo-feed-wrapper big-stage big-theme-${resolvedTheme.id} ${resolvedTheme.className} ${c.highContrast ? "high-contrast" : ""}`}
      data-art={c.showArt !== false ? "true" : "false"}
      style={{ "--big-accent": effectiveAccent, "--accent-primary": effectiveAccent } as CSSProperties}
    >
      <style>{effectiveCss}</style>
      <div className="big-dim" style={{ opacity: Math.max(0, Math.min(1, 1 - (c.opacity ?? 1))) }} />
      <div className="big-grain" aria-hidden="true" />
      <ThemeEffectBoundary fullSize configScale={scale * (c.scale ?? 1)}>
      <TrackTransitionWrapper
        transitionKey={`${media.title}-${media.artist}-${media.album_title}-${replay}`}
        style={c.transitionStyle || "focus"}
        direction={c.transitionDirection || "left"}
        intensity={c.transitionIntensity || "standard"}
        durationMs={c.transitionDurationMs ?? (c.transitionDuration != null ? c.transitionDuration * 1000 : 350)}
        delayMs={c.transitionDelayMs ?? (c.transitionDelay != null ? c.transitionDelay * 1000 : 0)}
      >
        <div className="mpo-card big-stage-inner" style={{ transform: `scale(${scale * (c.scale ?? 1)})` }}>
          {c.showArt !== false && (
            <div className={`mpo-art big-art ${c.spinningVinyl && isPlaying ? "spinning-vinyl" : ""}`}>
              {artUrl ? <img className="mpo-art-img" src={artUrl} alt="Album artwork" /> : <Music2 aria-hidden="true" />}
            </div>
          )}
          <div className="big-copy">
            {c.showThemeLabel !== false && (
              <div className="mpo-theme-label big-eyebrow">
                <span /> {c.themeLabel || resolvedTheme.label}
              </div>
            )}
            {c.showTitle !== false && (
              <h1 className="mpo-title" title={media.title}>
                {media.title || "Ready when you are"}
              </h1>
            )}
            {c.showArtist !== false && (
              <p className="mpo-artist big-artist">{media.artist || "Play something to get started"}</p>
            )}
            {c.showAlbum !== false && media.album_title && (
              <p className="mpo-album big-album">{media.album_title}</p>
            )}
            {c.showProgress !== false && (
              <div className="mpo-progress big-progress" data-timeline-state={timeline.state} role="progressbar" aria-label="Playback progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={timeline.determinate ? progress * 100 : undefined} aria-valuetext={timeline.label}>
                <span className="mpo-progress-fill" style={timeline.determinate ? { transform: `scaleX(${progress})` } : { width: "25%", opacity: .35 }} />
              </div>
            )}
            <div className="big-meta">
              {times && (
                <span className="mpo-universal-timestamps" data-timeline-state={timeline.state}>
                  {timeline.label}
                </span>
              )}
              <span>
                {c.showBadge !== false && <span className="mpo-badge">{media.app_name || "MPO-pro"}</span>}
                {c.showBadge !== false && c.showPlaybackStatus !== false && " · "}
                {c.showPlaybackStatus !== false && (
                  <span className="mpo-playback-status">
                    {isPlaying
                      ? c.themePlayingLabel || "Playing"
                      : c.themePausedLabel || (media.status === "Paused" ? "Paused" : "Waiting")}
                  </span>
                )}
              </span>
            </div>
            {c.showVisualizer && (
              <div
                className={`mpo-universal-visualizer style-${visType} ${isPlaying ? "playing" : ""}`}
                aria-label="Animated playback indicator"
                role="img"
                style={{ height: visHeight, width: visCount * 6 }}
              >
                {Array.from({ length: visCount }, (_, i) => (
                  <span
                    key={i}
                    className="mpo-vis-bar"
                    style={{
                      height: `${30 + ((i * 37) % 70)}%`,
                      animationDelay: `${(i % 7) * -0.12}s`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </TrackTransitionWrapper>
      </ThemeEffectBoundary>
      <div className="big-signature">{c.bigBrandLogo && <img src={c.bigBrandLogo} alt="" />}{c.bigBrandName?.trim() || (!c.bigBrandLogo ? "MPO / BIG STUDIO" : null)}</div>
    </div>
  );
}
