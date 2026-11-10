import type { ThemeBundle } from "../compiler/types";
import sdkLlmContract from '../../../THEME-SDK-LLM.md?raw';
import { DEFAULT_THEME_CANVAS_SIZES } from '../canvasSizes';
export { DEFAULT_THEME_CANVAS_SIZES } from '../canvasSizes';

const AUTHORING_TYPES = `import type React from "react";

export type ThemeSurface = "obs" | "tiktok" | "desktop" | "big";
export type ThemeRole = "frame" | "artwork" | "artwork-image" | "title" | "artist" | "album" | "themeLabel" | "badge" | "status" | "timestamps" | "progress" | "progress-track" | "progress-fill" | "indicator" | "indicator-bar";
export interface ThemeManifest {
  schemaVersion: 2;
  id: string;
  name: string;
  version?: string;
  author?: string;
  description?: string;
  entryPoint?: string;
  targetStudios?: ThemeSurface[];
  /** Unscaled design canvas; layer dimensions and scale remain editable. */
  canvasSizes?: Partial<Record<ThemeSurface, { width: number; height: number }>>;
  dependencies?: Record<string, string>;
  stylesheets?: string[];
  configSchema?: Record<string, { type: "string" | "number" | "boolean" | "color"; label: string; default: unknown }>;
}
export interface MediaState {
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
  timeline?: { position_valid: boolean; duration_known: boolean; kind: "finite" | "live" | "unknown"; origin: "observed" | "estimated" | "unavailable"; advancing: boolean; uncertainty_ms: number; observed_position_ms: number | null; observed_at_ms: number | null; received_at_ms: number; start_ms: number | null; end_ms: number | null; min_seek_ms: number | null; max_seek_ms: number | null; raw_observation?: Record<string, number | null> | null };
}
export interface MpoThemeColors {
  dominant: string;
  contrastText: string;
  accent: string;
  vibrant?: string;
  muted?: string;
}
export interface MpoThemeTime { current: string; duration: string; }
export interface MpoTextFit { overflow?: "theme" | "ellipsis" | "shrink" | "marquee"; minSize?: number; marqueeSpeed?: number; }
export interface MpoLayoutControls {
  layoutBoundary?: "legacy" | "constrain" | "overflow" | "grow";
  widthMode?: "fixed" | "content";
  contentMinWidth?: number;
  contentMaxWidth?: number;
  typography?: Partial<Record<"title" | "artist" | "album" | "themeLabel" | "badge" | "status" | "timestamps", MpoTextFit & Record<string, any>>>;
}
export interface MpoThemeProps {
  media: MediaState;
  rawMedia?: MediaState;
  timeline?: { positionKnown: boolean; durationKnown: boolean; kind: "finite" | "live" | "unknown"; state: "determinate" | "elapsed" | "unavailable" };
  artUrl: string;
  colors: MpoThemeColors;
  surface: ThemeSurface;
  format: "horizontal" | "vertical";
  progress: number;
  formattedTime: MpoThemeTime;
  config?: Record<string, any> & MpoLayoutControls;
}
export type MpoThemeComponent = React.ComponentType<MpoThemeProps>;
`;

/** Include the authoring contract in disk themes and portable source exports. */
export function withBundleAuthoringFiles(bundle: ThemeBundle): ThemeBundle {
  const manifest = {
    ...bundle.manifest,
    canvasSizes: { ...DEFAULT_THEME_CANVAS_SIZES, ...bundle.manifest.canvasSizes },
  };
  const readme = `# ${manifest.name}

Edit Theme.tsx and style.css, then save to refresh the running preview. types.d.ts describes the props, semantic roles, and manifest sizing contract. Exported .mpotheme.json packages retain these source files and manifest settings.

For an LLM or IDE assistant, read MPO-SDK-LLM.md and mpo-sdk.d.ts in this folder first. They contain the complete SDK contract, working examples and validation checklist; no copying from the app is needed. Ask the assistant to preserve your source files and implement all four studio surfaces. Preview the theme in each studio and check the acceptance checklist before exporting it.

## Canvas and layer controls

manifest.json canvasSizes declares the unscaled design canvas for each studio. The layer inspector can override width, height, and scale. Use width:100%;height:100%;box-sizing:border-box on a full-canvas card; avoid fixed min/max sizes or another root scale that defeats those controls. Adapt the inner layout using the surface prop.

## Semantic roles

Put data-theme-role="frame" and className="mpo-card" on the visible card. Annotate inner elements with artwork, artwork-image, title, artist, album, themeLabel, badge, status, timestamps, progress, progress-track, progress-fill, indicator, and indicator-bar as appropriate. Use progress on the scrubber track with data-theme-part="progress-track", and progress-fill on its moving fill; keep timestamps outside the progress element so both visibility controls work independently. Put indicator-bar on each visualizer bar. Put a role on a positioning wrapper and animate its child so Arrange offsets and your animation can coexist.

The runtime connects these roles to the shared layer controls: visibility, offsets, scale, typography, colors, artwork styling, progress, and visualizer styling. Native theme styles remain the fallback. With a layer configuration, the runtime supplements missing album, source, playback status, timestamps, and theme labels when enabled. The shared visualizer replaces a native indicator when the layer visualizer control is present, enabling its count, style, height, color, and positioning controls; SDK previews without a layer configuration retain the native design. Legacy themes receive class-name compatibility, while explicit roles keep custom names reliable. Untouched authored-hidden defaults remain hidden. Explicit Arrange visibility records visibilityOverrides and can reveal hidden semantic nodes. Missing title, artist, artwork, and progress receive shared fallbacks only when explicitly enabled. Mark hidden nodes data-theme-default-hidden="true" and data-theme-display="flex" (or their natural display mode).

## Soft card edges

The host provides a 32px transparent effect gutter. Keep outer positioning wrappers transparent with overflow:visible and put backgrounds, borders and box-shadow:var(--mpo-frame-shadow) on the inner card. Keep the frame and general layout ancestors open for Arrange movement; clip only artwork, text ellipsis and separate decorative surfaces. Do not add a second gutter or mask/filter/paint the host. Never fade text or artwork to disguise a clipped shadow. Layer Custom CSS is scoped and applied last; normal specificity and importance rules apply.

## Beta 14 sizing and direct Arrange

The host provides dragging, proportional/dimension resize, arrow nudging, cancellation and gesture undo through semantic roles. Do not implement a second studio drag system. Builder uses these same nominal canvas sizes and exposes per-studio dimensions. Generated visual projects carry mpo-builder.json; preserve it for visual re-editing. Changing generated Theme.tsx or style.css makes the visual Builder treat the project as code, preserving external edits.

Optional layer controls include layoutBoundary (legacy, constrain, overflow, grow), widthMode (fixed or content), contentMinWidth and contentMaxWidth. Grow extends the frame surface without reflowing percentage children. Bounded width reserves maximum-width capture space. Per-text typography entries can choose overflow (theme, ellipsis, shrink, marquee), minSize and marqueeSpeed. Marquee respects text direction and reduced motion. Keep flexible text columns and do not override host-owned data-mpo-* attributes or fitting variables. Custom CSS remains the final override.

## Beta 15 Arrange selection

A normal click selects an element without editing its placement. The shared host starts movement only after 5 screen pixels (8 for touch), independent of preview and theme scale. Keep semantic roles on stable positioning wrappers. Do not add long-press selection, a second drag system or click handlers that fight the host. The host protects inspector fields and portal dropdowns from canvas gestures.

## Beta 16 movement lock

Movement is locked by default. Use the Movement locked/unlocked control before the Arrange button in any studio. While locked, clicking a role opens styling; drag, resize, nudging, explicit placement and geometry history are disabled. Unlock deliberately to test full manipulation. Locking an active gesture restores its starting placement. Typography and content can still reflow naturally; the editor lock does not freeze playback animation or intentional advanced CSS/source edits. Never implement theme gestures that bypass the host lock.

## Beta 17 SDK compliance across system themes

All 44 built-in and collection system themes follow the SDK semantic role contract. Use data-theme-role for all 11 semantic roles (frame, artwork, artwork-image, title, artist, album, themeLabel, badge, status, timestamps, progress, progress-track/progress-fill, indicator, indicator-bar). Animate child nodes inside semantic positioning wrappers, support custom kicker themeLabel content, and honor independent position/duration validity.

## Beta 18 clean native vector scaling

Desktop Overlay HUD uses DirectWrite layout zoom and subpixel antialiasing instead of GPU texture downsampling, ensuring text, borders, and artwork remain crisp and legible at any scale (small or big).

## Scale-safe title scrolling

Browser URLs normally use quality=2; studio previews, Arrange scale and Desktop scale can add more transforms. Compare the original text span's scrollWidth to its viewport's clientWidth (both unscaled CSS pixels). Never compare getBoundingClientRect().width with clientWidth. Give the title viewport a stable width (for example flex:1;min-width:0) independent of the scrolling track. Use a non-shrinking, max-content track and non-shrinking text spans; mark duplicate copies aria-hidden="true". Observe the viewport and fonts, not the animating track; cancel pending animation frames and ignore late fonts.ready callbacks after unmount. Key title transitions only to track metadata, never the media object, playhead or layer refresh. When shared typography overflow is not theme, let the host own text scrolling. Test a short title, a long title, late fonts and Arabic text at quality=1 and quality=2, preview zoom and 50%/150% layer scale. A short title must remain single and stationary through repeated layer refreshes.

## Playback time

media.position_ms, progress and formattedTime use the shared host clock. Do not create another timer or extrapolate updated_at yourself. rawMedia is the backend publication; rawMedia.timeline.raw_observation contains the provider tuple. timeline.positionKnown and durationKnown are independent. Show formattedTime.current alone when durationKnown is false; unavailable positions are --:--. Progress is zero when indeterminate; use an indeterminate rail without an exact percentage. Missing duration does not mean LIVE. Only timeline.kind === "live" is live evidence. Rates may be assumed (playback_rate_known is false), and origin/uncertainty describe estimated data.
`;
  return {
    ...bundle,
    manifest,
    files: {
      "types.d.ts": AUTHORING_TYPES,
      "README.md": readme,
      ...bundle.files,
      "MPO-SDK.md": readme,
      "MPO-SDK-LLM.md": sdkLlmContract,
      "mpo-sdk.d.ts": AUTHORING_TYPES,
      "manifest.json": JSON.stringify(manifest, null, 2),
    },
  };
}
