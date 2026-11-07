# MPO-pro Theme SDK: complete authoring and Arrange contract

Release target: **`7.0.0-beta.15`**. This document is also the full prompt copied from **SDK Docs & API** inside the app.

You are creating a portable React theme for MPO-pro. Deliver `manifest.json`, `Theme.tsx`, and `style.css`, with optional local component files. Support the four studio surfaces, semantic element selection, independent shared controls, Arrange offsets and scale, and soft transparent outer edges. Follow the contract below and the acceptance checklist. Preserve the author's native design as the fallback when no layer configuration is supplied.

## 1. Files, runtime, and props

Themes are source bundles with `schemaVersion: 2`, a manifest, and a filename-to-source map. The entry point defaults to `Theme.tsx`; export a default React component. The in-app compiler resolves local files and type-only imports. Do not import the app's internal source files or browser DOM globals during module initialization.

Supported imports include `react`, `lucide-react`, and `motion/react` (`motion` and `framer-motion` compatibility are also available). External ESM URLs and manifest dependency URLs can load optional modules. Styles are scoped to the theme instance. Use local classes and semantic attributes; do not style the studio UI, `html`, or `body`.

```ts
export type ThemeSurface = "obs" | "tiktok" | "desktop" | "big";
export interface MpoThemeProps {
  media: {
    title: string;
    artist: string;
    album_title: string;
    status: "Playing" | "Paused" | "Stopped" | "Closed" | "Buffering";
    position_ms: number;
    duration_ms: number;
    app_name: string;
    has_art: boolean;
    art_timestamp: number;
    updated_at: number;
    source_id?: string;
    source_generation?: number;
    sequence?: number;
    stream_id?: string;
    playback_rate?: number;
    playback_rate_known?: boolean;
    timeline?: {
      position_valid: boolean;
      duration_known: boolean;
      origin: "observed" | "estimated" | "unavailable";
      kind: "finite" | "live" | "unknown";
      advancing: boolean;
      uncertainty_ms: number;
      observed_position_ms: number | null;
      observed_at_ms: number | null;
      received_at_ms: number;
      start_ms: number | null;
      end_ms: number | null;
      min_seek_ms: number | null;
      max_seek_ms: number | null;
      raw_observation?: Record<string, number | null> | null;
    };
  };
  rawMedia?: MpoThemeProps["media"];
  timeline?: { positionKnown: boolean; durationKnown: boolean; kind: "finite" | "live" | "unknown"; state: "determinate" | "elapsed" | "unavailable" };
  artUrl: string;
  colors: {
    dominant: string;
    contrastText: string;
    accent: string;
    vibrant?: string;
    muted?: string;
  };
  surface: ThemeSurface;
  format: "horizontal" | "vertical";
  progress: number; // Shared projected progress, 0..1; zero if indeterminate.
  formattedTime: { current: string; duration: string };
  config?: Record<string, any>; // Layer controls; can be absent/empty in SDK preview.
}
```

Use `artUrl` for artwork and handle an empty URL. Treat optional palette extensions as optional. Keep title, artist, album, source, playback status, and timestamps separate; never concatenate artist and album into one styled element. Render useful stopped/empty-media fallbacks.

### Playback clock and unknown data

`media.position_ms` is the host's shared projected playhead, including playback rate and validated bounds. Built-in, declarative, compiled, Desktop HUD, browser outputs and Big Studio use this clock. Use it directly or use `progress` and `formattedTime`; do not create another timer, add elapsed time to `updated_at`, or compensate provider timestamps yourself. `rawMedia` is the backend publication at `updated_at`; its `timeline.raw_observation` retains the provider tuple. That tuple can be older than the publication. Separate those times in diagnostics.

Position and duration validity are independent. Render `formattedTime.current` alone when `timeline.durationKnown` is false. It is `--:--` when the position is unavailable; the unknown total is also `--:--` in the props. Show a determinate rail/percentage only when `timeline.state === "determinate"`; otherwise use an indeterminate rail without `aria-valuenow`. Do not use `duration_ms || 1`, start a counter from zero, or label an unknown duration as LIVE. A live label requires `timeline.kind === "live"` evidence. Moving DVR seek bounds are not a finite media duration.

The host freezes stale samples on pause and resumes without adding the paused interval. Authoritative seeks, source/track generation changes and recovery can correct the playhead backward. `playback_rate_known: false` means the rate is assumed. `origin: "estimated"` and increasing `uncertainty_ms` describe interpolation, not guaranteed measurement accuracy. Playback status alone cannot reveal buffering hidden by a provider. `Buffering` evidence suspends advancement. A frontend missing backend publications for 15 seconds stops projecting until state recovers; backend repeated raw tuples continue from their monotonic anchor while explicitly accumulating uncertainty.

## 2. All four studios and design dimensions

| Surface | Purpose | Default unscaled design canvas |
| --- | --- | --- |
| `obs` | Horizontal stream overlay | 640 × 180 |
| `tiktok` | Vertical stream overlay | 360 × 640 |
| `desktop` | Floating desktop HUD | 490 × 180 |
| `big` | Presentation stage | 1280 × 720 |

Optional manifest `canvasSizes` overrides the design size per surface. In Fixed/theme width mode, layer `customWidth` and `customHeight`, when positive, take priority. Bounded-content width is an explicit alternative described in section 10. Zero uses the manifest/default size. The layer's overall scale is applied by the mount outside the theme; do not reapply `config.scale` inside your component. Desktop and Big Studio can have their own sizing settings; use the dimensions supplied by the host instead of reading another studio's state.

A full-canvas card should use `width:100%; height:100%; box-sizing:border-box; min-width:0; min-height:0`. Avoid fixed `min-width`/`max-width`, fixed `min-height`/`max-height`, another root `transform:scale(...)`, or a viewport-sized inner wrapper that blocks layer sizing. Adapt layout with `surface`; `format` distinguishes horizontal and vertical orientation. The SDK preview without a layer configuration is the native-design preview, while studio layer previews and live outputs apply the same shared controls.

## 3. Semantic roles: the selection and styling API

Put `data-theme-role` on real rendered DOM nodes, including DOM nodes created by Motion. Prefer one outer target for each field. The runtime adds compatibility roles for common older class names, but explicit roles support arbitrary naming and are the reliable authoring API. The transparent SDK host is not the visible frame.

| Attribute value | Where it belongs | Arrange target |
| --- | --- | --- |
| `frame` | Visible inner card; also give it `.mpo-card` | Frame |
| `artwork` | Artwork positioning/size wrapper | Artwork |
| `artwork-image` | Actual `<img>` inside the artwork wrapper | Artwork |
| `title` | Track title only | Track title |
| `artist` | Artist only | Artist |
| `album` | Album only | Album |
| `themeLabel` | Custom theme text, such as NOW PLAYING | Theme text |
| `badge` | Media source/app name only | Source badge |
| `status` | Playing/paused/stopped status only | Playback status |
| `timestamps` | Current/duration labels, outside progress track | Timestamps |
| `progress` | Positioning target for the scrubber track | Progress bar |
| `progress-track` | Optional separate nested track/rail | Progress bar |
| `progress-fill` | Moving fill inside the rail | Progress bar |
| `indicator` | Native visualizer/equalizer wrapper | Playback indicator |
| `indicator-bar` | Each bar/dot in that native visualizer | Playback indicator |

If `progress` is itself the rail, add `data-theme-part="progress-track"` to the same node. A separate nested rail can instead use `data-theme-role="progress-track"`. Keep time labels outside the `progress` target, so progress and timestamps can be hidden independently. Keep `badge` and `status` as siblings, even when visually grouped in one pill. Give the artwork role to its outer positioning wrapper and `artwork-image` to its image; do not repeat `artwork` on every nested frame.

Compatibility aliases include `card` → `frame`, `source` → `badge`, `text`/`theme-label` → `themeLabel`, `visualizer` → `indicator`, and `playback-status` → `status`. Class inference exists for older iOS, Neon, and common card/artwork/scrubber naming patterns. It cannot infer arbitrary unnamed decorations reliably; annotate them when they represent a supported target. Arrange selects a semantic field rather than giving every decorative child its own independent layer.

## 4. Arrange placement and motion

The studio's Arrange mode selects these targets, opens their full matching shared controls, and stores placement on the layer. Use the target picker to select hidden or currently absent fields as well as clicking visible content. React and declarative themes use the full shared editor; declarative themes can additionally expose authored canvas geometry. Role aliases such as artwork image, progress fill, and visualizer bar resolve to their parent Artwork, Progress, and Indicator editors. Frame selection reaches frame controls. The runtime also normalizes legacy SDK DOM so older supported class names participate.

```ts
config.elementPositions = {
  title: { x: 12, y: -6, scale: 1.15 },
  artwork: { x: -8, y: 4, scale: 1.1 },
  frame: { x: 0, y: 0, scale: 1 }
};
```

Keys are `frame`, `artwork`, `title`, `artist`, `album`, `themeLabel`, `badge`, `status`, `timestamps`, `progress`, and `indicator`. X/Y are pixel offsets from the authored layout, not canvas percentages. Scale is a multiplier; zero is a valid hidden-size result. Layer width/height and overall layer scale are separate controls. Builder declarative X/Y/width/height remain canvas percentages; do not confuse those with layer Arrange offsets.

The engine uses the individual CSS `translate` and `scale` properties so it does not replace an authored `transform` string. The most dependable design puts the semantic role on a stable positioning wrapper and native animation on its child. For example:

```tsx
<div data-theme-role="artwork" className="artwork-position">
  <motion.div animate={{ scale: playing ? 1 : 0.96 }} className="artwork-motion">
    <img data-theme-role="artwork-image" src={artUrl} alt="Album artwork" />
  </motion.div>
</div>
```

Do not run Motion `x`, `y`, or `scale` animation on the same semantic wrapper when that animation should be independent of Arrange placement. Put centering, rotation, track `scaleX`, artwork spin, and entrance animation on the appropriate child. Do not apply the same stored offset to both wrapper and image.

## 5. Shared controls that themes must permit

Controls below are layer overrides. They are scoped to this theme instance. Absent controls leave native styles available as fallbacks; real studio layers normally contain the shared default configuration.

| Area | Relevant configuration | Expected behavior |
| --- | --- | --- |
| Layer/frame | `customWidth`, `customHeight`, `scale`, `elementPositions.frame` | Resize/scale the whole card without fixed inner bounds defeating it |
| Frame material | `opacity`, `blur`, `highContrast`, `borderRadius`, `framePadding`, `frameBorderWidth`, `frameBorderColor`, `frameShadow` | Control the visible card; opacity is surface alpha, not faded text/artwork |
| Visibility | `showTitle`, `showArtist`, `showAlbum`, `showArt`, `showBadge`, `showPlaybackStatus`, `showThemeLabel`, `showTimestamps`, `showProgress`, `showVisualizer` | Toggle fields independently |
| Typography | `typography.title/artist/album/themeLabel/badge/status/timestamps` | Each supports `font`, `size` in px, `weight`, `color`, `italic`, and `transform` (`none/uppercase/lowercase/capitalize`) |
| Earlier text controls | `titleFont`, `titleSize`, `titleWeight`, `titleColor`, `titleTransform`, `titleGlow`; artist equivalents and `albumSize`; `fontFamily` | Per-field typography overrides earlier text settings |
| Content | `themeLabel`, `themePlayingLabel`, `themePausedLabel` | Override custom label and status text; support them directly if a status element contains rich children |
| Artwork | `artSize`, `artRadius`, `artBorder`, `artGlow`, `spinningVinyl` | Size, crop shape, border, glow, and image spin without replacing wrapper placement |
| Progress | `progressHeight`, `progressTrackColor`, `progressFillColor`, `progressShape` (`theme/square/rounded/pill`) | Style track and fill separately; preserve progress animation |
| Shared visualizer | `visualizerType` (`bars/wave/pulse/dots`), `visualizerCount`, `visualizerHeight`, `visualizerColor`, `elementPositions.indicator` | Count/style/height/color/placement affect the configured shared visualizer |
| Artwork-derived palette | `artworkColors.surface/accent/text/border/progress/indicator` (`manual/artwork/contrast`), `autoAlbumColor`, `accentColor` | Palette overrides apply to the same semantic fields |

Avoid theme CSS `!important` on ordinary role geometry, typography, material, visibility, or colors; it can compete with user controls. Bound local content with `min-width:0`, natural wrapping, or local ellipsis. Do not force all metadata to one fixed font size or hardcode a title-and-artist composite node.

Compatibility variables are available for native CSS fallbacks:

```css
var(--mpo-card-radius, 18px)
var(--mpo-card-blur, 20px)
var(--mpo-card-opacity, 0.88)
var(--mpo-frame-padding, 16px)
var(--mpo-frame-shadow, 0 7px 18px -7px #0006)
var(--mpo-font-family, system-ui, sans-serif)
var(--mpo-title-size, 20px)
var(--mpo-artist-size, 14px)
var(--mpo-text-color, #ffffff)
var(--mpo-glow-color, #38bdf8)
```

## 6. Supplemental fields, native indicators, and hidden elements

With a real layer configuration, the runtime supplements absent album, source badge, playback status, timestamps, and custom theme label when their controls and data permit. Existing semantic fields are kept, so a field should not be duplicated. A custom label needs non-empty label text; timestamps show elapsed time when position is credible, or --:-- when unavailable; no total is invented; album needs album metadata. Missing title, artist, artwork, and progress can receive shared fallback elements only when the user explicitly enables that field through Arrange visibility; untouched minimal themes do not gain those base fields automatically.

When the layer has `showVisualizer` configured, the native indicator is hidden and the shared visualizer is rendered when enabled. This is how arbitrary older theme designs get reliable bar count, type, height, color, and placement controls. SDK previews with no layer configuration keep the theme's own indicator. Do not add your own second shared visualizer or permanently remove the native one based on application-global state.

Plain-text older artist fields that exactly combine known artist and album values may be normalized into independent fields. Do not depend on this compatibility repair; author them separately. The runtime can update a rich status/label text leaf while preserving icons and can pass typography into nested text. For predictable custom content, also read `config.themeLabel`, `config.themePlayingLabel`, and `config.themePausedLabel` directly in the theme. Keep text nested children inheriting the role wrapper's font/color instead of hardcoding conflicting styles on every span.

Untouched Builder `visible:false` or authored-hidden DOM defaults remain hidden. An explicit Arrange visibility toggle records `config.visibilityOverrides` alongside the matching `show...` flag; a true override can reveal an authored-hidden semantic node. For example, set `showArtist:true` and `visibilityOverrides.showArtist:true` together. The keys are `showTitle`, `showArtist`, `showAlbum`, `showArt`, `showBadge`, `showPlaybackStatus`, `showThemeLabel`, `showTimestamps`, `showProgress`, and `showVisualizer`. The UI records this intent; authors should not fabricate overrides merely to turn on defaults.

Generated hidden DOM uses `data-theme-default-hidden="true"` and `data-theme-display="flex"` to retain the intended display mode when revealed. Custom hidden nodes should provide their natural display mode (`block`, `flex`, `grid`, or `inline-flex`) the same way. Actual conditionally omitted DOM cannot be revealed by CSS; the limited shared fallbacks above may supply a missing field, or the author must render its semantic node. Empty media data can also explain absent content. Test authored-hidden, omitted, and empty-data cases separately.

## 7. Soft edges and local clipping

All four studios and SDK previews reserve a **32px transparent effect gutter** around the theme. The visible inner `.mpo-card`/`frame` owns background, border, radius, and bounded shadow. Use `box-shadow:var(--mpo-frame-shadow)` so the shadow falls to transparency inside that gutter. Keep the host and positioning ancestors transparent, with `overflow:visible`; never paint a full rectangular host or add a second effect gutter.

For full Arrange freedom, avoid clipping ancestors around moveable fields. A frame can have rounded background/border painting without `overflow:hidden`. Clip only artwork inside its own rounded wrapper, individual text at its own local ellipsis box, or a separate decorative surface layer. If a design deliberately clips a frame/content group, moved children remain subject to that local clipping. Rounded corner clipping belongs on the decorative surface, not a general positioning wrapper.

Do not mask/filter the outer host, add outer opacity, or fade text/artwork to conceal an edge. Those operations can change backdrop sampling or fade content. Glass blur belongs on the visible card; outer wrappers must allow the card's shadow and moved fields to overflow. Output windows/browser-source viewports still have physical bounds: size and position the source to contain the intended design and effect gutter.

## 8. CSS order and custom override priority

The runtime applies scoped theme CSS, shared layer styling and compatibility rules, then scoped user Custom CSS last. `customCss` and legacy `config.elementCss` are merged without dropping edits. Custom CSS is the final authored override layer; normal CSS specificity and `!important` still apply. To override an important shared control, use a matching or more specific scoped selector with `!important`. Theme source should leave this final layer free for the user.

```css
/* Example user Custom CSS, entered in the layer inspector. */
[data-theme-role="title"] { letter-spacing: .02em !important; }
[data-theme-role="frame"] { background: #101827dd !important; }
```

Portable `.mpotheme.json` exports retain source files, per-studio Builder layouts/styles, authored-hidden defaults, and manifest canvas metadata. New bundles contain `types.d.ts`/`README.md`; exports also carry current `mpo-sdk.d.ts`/`MPO-SDK.md` references without overwriting the author's existing files.

## 9. Complete example

### `manifest.json`

```json
{
  "schemaVersion": 2,
  "id": "arrange-ready-player",
  "name": "Arrange Ready Player",
  "version": "1.0.0",
  "author": "Theme Author",
  "description": "Four-studio player with independent semantic controls and motion children.",
  "targetStudios": ["obs", "tiktok", "desktop", "big"],
  "entryPoint": "Theme.tsx",
  "canvasSizes": {
    "obs": { "width": 640, "height": 180 },
    "tiktok": { "width": 360, "height": 640 },
    "desktop": { "width": 490, "height": 180 },
    "big": { "width": 1280, "height": 720 }
  }
}
```

### `Theme.tsx`

```tsx
import React from "react";
import { Music, Play, Pause } from "lucide-react";
import { motion } from "motion/react";
import type { MpoThemeProps } from "./types";

export default function Theme({
  media, artUrl, colors, surface, progress, formattedTime, timeline, config = {},
}: MpoThemeProps) {
  const playing = media.status === "Playing";
  const statusText = playing
    ? (config.themePlayingLabel || "Playing")
    : (config.themePausedLabel || (media.status === "Paused" ? "Paused" : "Stopped"));
  const label = config.themeLabel || "NOW PLAYING";
  const accent = colors.accent || colors.dominant || "#38bdf8";
  const amount = Math.max(0, Math.min(1, progress));
  const bars = [45, 70, 55, 90, 60, 80, 50, 75];

  return (
    <div
      className={`mpo-card arrange-card surface-${surface}`}
      data-theme-role="frame"
      style={{ "--example-accent": accent } as React.CSSProperties}
    >
      <div className="decorative-surface" aria-hidden="true" />

      <div className="artwork-position" data-theme-role="artwork">
        <motion.div
          className="artwork-motion"
          animate={{ scale: playing ? 1 : 0.96 }}
          transition={{ duration: 0.25 }}
        >
          {artUrl ? (
            <img className="cover-image" data-theme-role="artwork-image" src={artUrl} alt="Album artwork" />
          ) : (
            <div className="cover-fallback"><Music size={32} /></div>
          )}
        </motion.div>
      </div>

      <div className="copy-column">
        <div className="meta-row">
          <span className="theme-label" data-theme-role="themeLabel">{label}</span>
          <span className="source-badge" data-theme-role="badge">{media.app_name || "Media"}</span>
          <span className="status-label" data-theme-role="status">
            {playing ? <Play size={10} /> : <Pause size={10} />}
            <span>{statusText}</span>
          </span>
        </div>

        <div className="title-text" data-theme-role="title" title={media.title}>
          <motion.span key={media.title} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {media.title || "Nothing playing"}
          </motion.span>
        </div>
        <div className="artist-text" data-theme-role="artist">{media.artist || "Unknown artist"}</div>
        <div className="album-text" data-theme-role="album">{media.album_title || ""}</div>

        <div className="track-position" data-theme-role="progress">
          <div className="track-rail" data-theme-role="progress-track">
            <div className="track-fill" data-theme-role="progress-fill" style={{ width: timeline?.state === "determinate" ? `${amount * 100}%` : "25%", opacity: timeline?.state === "determinate" ? 1 : .35 }} />
          </div>
        </div>

        <div className="footer-row">
          <div className="time-labels" data-theme-role="timestamps">
            <span>{formattedTime.current}</span>{timeline?.durationKnown && <span>{formattedTime.duration}</span>}
          </div>
          <div className={`native-equalizer ${playing ? "playing" : "paused"}`} data-theme-role="indicator" aria-label="Playback indicator">
            {bars.map((height, index) => (
              <span
                key={index}
                data-theme-role="indicator-bar"
                className="native-bar"
                style={{ height: `${height}%`, animationDelay: `${index * -0.08}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### `style.css`

```css
.arrange-card {
  position: relative;
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  align-items: center;
  gap: 16px;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  padding: var(--mpo-frame-padding, 16px);
  box-sizing: border-box;
  overflow: visible;
  background: rgba(15, 23, 42, var(--mpo-card-opacity, 0.88));
  border: 1px solid #ffffff24;
  border-radius: var(--mpo-card-radius, 18px);
  box-shadow: var(--mpo-frame-shadow, 0 7px 18px -7px #0006);
  backdrop-filter: blur(var(--mpo-card-blur, 20px));
  -webkit-backdrop-filter: blur(var(--mpo-card-blur, 20px));
  color: var(--mpo-text-color, #ffffff);
  font-family: var(--mpo-font-family, system-ui, sans-serif);
}
.decorative-surface {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(ellipse at top left, #ffffff0b, transparent 65%);
}
.artwork-position {
  position: relative;
  width: 88px;
  height: 88px;
  border-radius: 14px;
  overflow: hidden;
}
.artwork-motion, .cover-image, .cover-fallback { width: 100%; height: 100%; border-radius: inherit; }
.cover-image { display: block; object-fit: cover; }
.cover-fallback { display: grid; place-items: center; background: #ffffff12; color: var(--example-accent); }
.copy-column { position: relative; min-width: 0; overflow: visible; }
.meta-row { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-bottom: 5px; }
.theme-label { color: var(--example-accent); font-size: 9px; letter-spacing: .1em; font-weight: 700; }
.source-badge { font-size: 10px; border: 1px solid #ffffff20; border-radius: 20px; padding: 2px 6px; }
.status-label { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; }
.title-text, .artist-text, .album-text { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.title-text { font-size: var(--mpo-title-size, 20px); font-weight: 700; line-height: 1.2; }
.artist-text { margin-top: 3px; font-size: var(--mpo-artist-size, 14px); color: #cbd5e1; }
.album-text { margin-top: 2px; font-size: 11px; color: #94a3b8; }
.track-position { margin-top: 10px; overflow: visible; }
.track-rail { height: 4px; border-radius: 999px; overflow: hidden; background: #ffffff2b; }
.track-fill { height: 100%; border-radius: inherit; background: var(--example-accent); transition: width .3s linear; }
.footer-row { display: flex; align-items: center; gap: 12px; margin-top: 5px; overflow: visible; }
.time-labels { display: flex; flex: 1; justify-content: space-between; gap: 10px; font-size: 10px; font-variant-numeric: tabular-nums; color: #94a3b8; }
.native-equalizer { display: flex; align-items: flex-end; gap: 2px; height: 14px; }
.native-bar { width: 3px; border-radius: 2px; background: var(--example-accent); transform-origin: bottom; }
.native-equalizer.playing .native-bar { animation: exampleEq .7s ease-in-out infinite alternate; }
.native-equalizer.paused .native-bar { transform: scaleY(.25); }
@keyframes exampleEq { from { transform: scaleY(.3); } to { transform: scaleY(1); } }
.surface-tiktok { grid-template-columns: minmax(0, 1fr); justify-items: center; align-content: center; gap: 24px; padding: 24px; }
.surface-tiktok .artwork-position { width: 180px; height: 180px; }
.surface-tiktok .copy-column { width: 100%; text-align: center; }
.surface-tiktok .meta-row { justify-content: center; }
.surface-big { grid-template-columns: 240px minmax(0, 1fr); gap: 48px; padding: 64px; }
.surface-big .artwork-position { width: 240px; height: 240px; }
.surface-big .title-text { font-size: var(--mpo-title-size, 44px); }
.surface-big .artist-text { font-size: var(--mpo-artist-size, 26px); }
.surface-big .album-text { font-size: 18px; }
```

The example keeps native effects on children, local crop/ellipsis at each field, and all general positioning ancestors open. Studio layer controls can replace native typography/material values, relocate elements, and supply the shared visualizer without changing the source.

## 10. Beta 14 sizing, fitting and direct Arrange

Builder, package generation and runtime mounting use one nominal canvas resolver: OBS 640×180, TikTok 360×640, Desktop 490×180, Big 1280×720, unless the theme declares another size. Builder fits that complete canvas uniformly; a smaller preview never changes pixel fonts or authored percentages. The Canvas tab edits width/height independently per studio and writes matching manifest sizes. Legacy themes retain their existing live-output defaults, and explicit existing manifest sizes are preserved.

Studio Arrange wraps native, compiled and declarative content with the same host interaction layer. Drag a semantic target to move it, use Arrow keys for 1px or Shift+Arrow for 10px, and choose the resize handle's mode. Proportional scale changes elementPositions[role].scale; dimension mode changes frame width/height, artSize, typography[role].size, progressHeight or visualizerHeight. Pointer movement is converted through preview/ancestor scale; the author does not need to wire studio drag callbacks. Escape/pointer cancellation restores the pre-gesture configuration, and each completed gesture has one undo entry. Gesture undo preserves independent properties edited afterward. CSS rotation and progress transforms remain separate from Arrange translate/scale.

The visual Builder edits authored percentage geometry directly, with its own handles, arrow nudging, Undo/Redo and a New visual theme action. Generated bundles contain mpo-builder.json with geometry and source fingerprints, preserving visual editing after disk reload. Retain this file in packages. If Theme.tsx or style.css is externally changed, Builder treats that bundle as a code theme instead of overwriting those edits with stale geometry; use the studio Arrange layer or the source editor. Additional source files are retained during normal visual saves.

Optional shared layer configuration:

```ts
layoutBoundary?: "legacy" | "constrain" | "overflow" | "grow";
widthMode?: "fixed" | "content";
contentMinWidth?: number; // defaults to 320 when bounded-content mode is enabled
contentMaxWidth?: number; // defaults to 600; never less than the minimum
// Each entry remains independent of its color, weight and font settings.
typography?: Partial<Record<TextElement, {
  overflow?: "theme" | "ellipsis" | "shrink" | "marquee";
  minSize?: number;       // readable minimum for auto-shrink, default 12px
  marqueeSpeed?: number; // pixels/second, default 30
}>>;
```

- **Theme default / legacy:** leaves existing frame behavior unchanged. Existing projects do not automatically expand.
- **Constrain:** limits rendered element bounds inside the card, with direct manipulation/nudging respecting those limits. Requested numeric offsets can be limited by the frame; direct manipulation starts from the effective visible placement.
- **Allow overflow:** leaves the frame background at its nominal size and reserves transparent paint space for moved/scaled roles plus the normal shadow gutter.
- **Grow frame surface:** extends the background, border, radius and shadow around arranged content. The nominal layout and percentage anchors stay fixed, preventing feedback-driven growth. This extends the frame surface rather than reflowing all children. Local artwork/text clipping remains deliberate.

Bounded-content width measures loaded text, clamps the card between min/max bounds, and reserves the maximum width for the outer capture canvas. Short and long titles can change card width without changing that width recommendation. Auto height and explicitly overflowing/growing content can still require different capture height/bounds; use fixed height when the scene requires it. Primary metadata stays on one line in this mode. Keep flexible text columns and min-width:0; fixed inner widths can still defeat any responsive authoring contract.

Text modes are opt-in per field; theme keeps the native behavior. Auto-shrink stops at the configured readable minimum and uses ellipsis if text still cannot fit. Marquee activates only for overflow, respects explicit direction or infers direction from text, pauses on hover/focus, and uses static ellipsis for reduced-motion preferences. Recognizable native marquee/ticker/scroll CSS animations are stopped when a host text fitting policy replaces them, avoiding two scrolling systems. Generated marquee text is decorative for accessibility; the original readable text remains available. General authors should keep a field's own text box constrained and separate from artwork/icons.

The host owns data-mpo-* sizing/fitting attributes and --mpo-content-*, --mpo-fit-*, --mpo-marquee-* and --mpo-constrained-* variables. Do not hardcode or animate those internals. Layer Custom CSS remains the final override; intentionally overriding layout/clipping rules can override a chosen policy.

The unlocked Desktop HUD scale grip updates independent desktop scale and copies active dimensions when first enabling separate Desktop sizing, preserving stream output. It saves only the selected layer's Desktop sizing under the existing local write/origin policy. The 50–200% slider range is a convenience, not a hard limit on exact scale or the grip; native window/platform size limits still apply. Big Studio retains stage content scale (all layers) × selected layer scale, shows effective scale, and provides separate resets; Advanced styling no longer duplicates the selected-layer scale control.

### Scale-safe native marquee

Browser sources normally render at `quality=2`. Arrange zoom, layer scale and Desktop scale can add more transforms. For overflow detection compare the original text span's `scrollWidth` with the title viewport's `clientWidth`, both in unscaled CSS pixels. Never compare `getBoundingClientRect().width` with `clientWidth`: a short title can falsely overflow at 2x, starting/stopping its animation as its contents change.

Keep the viewport independent of its text: use a flexible column with `min-width:0`, a stable viewport width, a `width:max-content` non-shrinking track, and `flex-shrink:0` on text copies. Mark the second copy `aria-hidden="true"`; it must not participate in measurement. Observe the viewport and font readiness rather than animated track bounds. Coalesce measurements with one requestAnimationFrame, disconnect observers, cancel the frame and guard late font promises after unmount. Key track/title transitions to stable metadata, never `media`, position, timestamps, or layer refresh counters. When `config.typography?.title?.overflow` is set to a host mode, let that mode own scrolling.

Layer and library snapshots retain portable source fallbacks. Editing an installed source file must publish the validated new bundle to the shared library and linked OBS, TikTok, Desktop and Big layers; previewing disk code alone does not update an old routed snapshot.

### Beta 15 selection and controls

Arrange selects a semantic element on a normal primary pointer press. A click, long press without movement, or small hand jitter does not change layout or add history. Movement begins only after 5 screen pixels (8 for touch), independent of preview and theme scaling. Do not add a competing click-to-select handler, long-press timer or private drag system to a theme. Animate children inside semantic positioning wrappers so selecting and moving the wrapper remains stable. App inspector inputs and portal dropdowns preserve selection; theme playback buttons are treated as selectable content while Arrange is enabled.

## 11. Acceptance checklist

- [ ] Default component, manifest, CSS, and optional local imports load with empty artwork and stopped media.
- [ ] OBS, TikTok, Desktop, and Big Studio each use the intended manifest canvas and adapt their inner layout.
- [ ] Positive custom width/height override the design size; zero returns to auto; overall scale is applied once.
- [ ] Arrange can select Frame, Artwork (including clicking the image), Title, Artist, Album, Theme text, Badge, Status, Timestamps, Progress (including fill), and Indicator (including bars).
- [ ] Each target's offsets and scale survive media updates, Motion transitions, artwork spin, and progress interpolation without duplicate transforms.
- [ ] Fields move beyond the original inner padding without a general layout wrapper cropping them; artwork and text retain only deliberate local clipping.
- [ ] Each visibility toggle affects its own field. Artist does not hide album; badge does not hide status; progress does not hide timestamps.
- [ ] Per-field font, size, weight, italic, case, and color apply independently. Rich label/status text honors its content overrides.
- [ ] Frame radius, padding, border, shadow, material opacity/blur, artwork style, track/fill color, height/shape, and artwork-derived colors respond to controls.
- [ ] Shared visualizer type/count/height/color and placement apply with a layer configuration; a bare SDK preview keeps native indicator styling.
- [ ] Missing supplemental fields appear once when enabled and data exists. Untouched authored-hidden defaults remain hidden; explicit Arrange visibility can reveal them. Explicitly enabled missing base fields get shared fallbacks without expanding untouched minimal themes.
- [ ] Text and artwork remain opaque while the bounded outer shadow merges into transparency on dark, light, and patterned backgrounds.
- [ ] User Custom CSS is scoped, applied last, and can override intended controls with appropriate specificity/importance.
- [ ] Export/import preserves source, per-surface layouts, canvas sizes, and the current SDK contract references.

Do not claim desktop/OBS/Tauri visual verification without testing those surfaces. A source or unit check does not establish Windows compositor behavior. When delivering theme source, list the checks performed and any remaining live visual checks.

- [ ] Time and progress come from the shared host props, with no private interpolation timer. Unknown duration shows elapsed-only time, unavailable position shows --:--, and indeterminate progress has no exact percentage. Pause, resume, seeks, 0.5x/2x rates and identical-title source switches preserve the host behavior.

- [ ] Drag, proportional and dimension resize, arrow nudging, cancel and undo work through preview fitting and overall layer scale.
- [ ] Boundary policies preserve nominal SDK percentage geometry, include paint bounds and do not recursively enlarge the canvas.
- [ ] Short/long/Arabic metadata, loaded fonts, auto-shrink minimums, marquee direction and reduced motion behave consistently.
- [ ] Short titles remain single and stationary at quality=1/2, preview zoom and 50%/150% layer scale; long titles scroll continuously without restarting on playhead or identical layer updates. Installed source edits reach linked layer URLs.
- [ ] Builder design dimensions, exported manifests and live studio canvases agree; generated visual projects reopen without overwriting external code edits.
