import { MediaState } from "./media";

export type ThemeId =
  | "glass-modern"
  | "cyber-hud"
  | "minimal-pill"
  | "vinyl-retro"
  | "streamer-banner"
  | "aero-glass"
  | "zen-mono"
  | "neon-blade"
  | "floating-orb"
  | "compact-tag"
  | "dynamic-island"
  | "split-horizon"
  | "vertical-story"
  | "apple-music-live"
  | "obs-signal-desk"
  | "obs-on-air"
  | "obs-editorial"
  | "obs-circuit"
  | "obs-tape-room"
  | "obs-lower-third"
  | "obs-spotlight"
  | "obs-mono-frame"
  | "obs-marquee"
  | "obs-spectrum"
  | "tiktok-aurora"
  | "tiktok-cover-story"
  | "tiktok-neon-story"
  | "tiktok-postcard"
  | "tiktok-spotlight"
  | "tiktok-split-note"
  | "tiktok-ticket"
  | "tiktok-minimal"
  | "tiktok-prism"
  | "tiktok-player"
  | "desktop-air"
  | "desktop-island"
  | "desktop-meter"
  | "desktop-slate"
  | "desktop-record"
  | "desktop-frost"
  | "desktop-edge"
  | "desktop-focus"
  | "desktop-prism"
  | "desktop-desk";

export type LayerFormat = "horizontal" | "vertical";

export type TrackTransitionStyle =
  | "soft-fade" | "glide" | "iris" | "curtain" | "orbit" | "focus" | "ribbon" | "bounce"
  // Retained for saved configurations
  | "dissolve"
  | "push"
  | "zoom-depth"
  | "anamorphic-flare"
  | "flip"
  | "cube"
  | "origami-fold"
  | "vinyl-spin"
  | "glitch"
  | "pixel-disintegrate"
  | "hologram-scan"
  | "vhs-rewind"
  | "neon-portal"
  | "black-hole"
  | "hyperdrive-streak"
  | "prism-shatter"
  // Legacy aliases for backwards compatibility
  | "fade"
  | "zoom-blur"
  | "flip-3d"
  | "cube-rotate"
  | "scale-pop"
  | "glitch-cyber"
  | "disc-spin"
  | "card-swap"
  | "shutter-wipe"
  | "elastic-slide"
  | "neon-flash"
  | "liquid-morph"
  | "slide-left"
  | "slide-right"
  | "slide-up"
  | "slide-down";

export type TransitionDirection = "left" | "right" | "up" | "down" | "center";
export type TransitionIntensity = "subtle" | "standard" | "dramatic" | "extreme";

export type TextElement = "title" | "artist" | "album" | "themeLabel" | "badge" | "timestamps" | "status";
export interface TextAppearance { color?: string; size?: number; weight?: number; italic?: boolean; transform?: "none" | "uppercase" | "lowercase" | "capitalize"; font?: string; }
export type ArtworkColorTarget = "surface" | "accent" | "text" | "border" | "progress" | "indicator";
export type ArtworkColorMode = "manual" | "artwork" | "contrast";
export interface ThemeConfig {
  artworkColors?: Partial<Record<ArtworkColorTarget, ArtworkColorMode>>;
  scale: number;
  opacity: number;
  blur: number;
  borderRadius: number;
  accentColor: string;
  highContrast: boolean;
  autoAlbumColor: boolean;
  customWidth: number; // 0 = auto
  customHeight: number; // 0 = auto
  // Optional presentation branding; embedded raster logos travel with exported layers.
  bigBrandName?: string;
  bigBrandLogo?: string;
  // Big Studio dimensions are opt-in and independent of legacy overlay sizes.
  bigCustomWidth?: number;
  bigCustomHeight?: number;

  // Independent Desktop Overlay Sizing Overrides
  useSeparateDesktopSize?: boolean;
  desktopScale?: number;
  desktopCustomWidth?: number;
  desktopCustomHeight?: number;

  // Data visibility toggles
  showTitle: boolean;
  showArtist: boolean;
  showAlbum: boolean;
  showArt: boolean;
  showProgress: boolean;
  showBadge: boolean;
  showVisualizer: boolean;
  showPlaybackStatus?: boolean;
  // Explicit switches can override an SDK element's authored hidden default.
  visibilityOverrides?: Partial<Record<"showTitle" | "showArtist" | "showAlbum" | "showArt" | "showBadge" | "showProgress" | "showTimestamps" | "showPlaybackStatus" | "showVisualizer" | "showThemeLabel", boolean>>;

  // Optional per-layer theme text overrides; an empty value uses the theme default.
  showThemeLabel?: boolean;
  typography?: Partial<Record<TextElement, TextAppearance>>;
  themeLabel?: string;
  themePlayingLabel?: string;
  themePausedLabel?: string;

  // Granular Element-level Styling
  fontFamily?: string;
  framePadding?: number;
  frameBorderWidth?: number;
  frameBorderColor?: string;
  frameShadow?: number;
  titleFont?: string;
  titleSize?: number;
  titleWeight?: number;
  titleTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  titleGlow?: boolean;
  titleColor?: string;
  artistSize?: number;
  artistWeight?: number;
  artistTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  artistColor?: string;
  albumSize?: number;
  artSize?: number; // 0 = auto
  artRadius?: number;
  artBorder?: number;
  spinningVinyl?: boolean;
  artGlow?: boolean;
  progressHeight?: number;
  progressFillColor?: string;
  progressTrackColor?: string;
  progressShape?: "theme" | "square" | "rounded" | "pill";
  showTimestamps?: boolean;
  visualizerType?: "bars" | "wave" | "pulse" | "dots";
  visualizerBars?: number;
  visualizerCount?: number;
  visualizerHeight?: number;
  visualizerColor?: string;
  elementCss?: string;
  elementPositions?: Record<string, { x: number; y: number; scale?: number }>;

  // Track Transitions & Animation Timing (v4.6.0 Pro Engine)
  transitionStyle?: TrackTransitionStyle;
  transitionDirection?: TransitionDirection; // default: "left"
  transitionIntensity?: TransitionIntensity; // default: "standard"
  transitionDurationMs?: number;            // default: 350ms
  transitionDelayMs?: number;               // default: 0ms
  transitionDuration?: number;              // In seconds (e.g. 0.55s)
  transitionDelay?: number;                 // In seconds (e.g. 0.0s)
}

export interface ThemeProps {
  media: MediaState;
  artUrl: string;
  config: ThemeConfig;
  customCss?: string;
  format?: LayerFormat;
  extractedColor?: string | null;
}

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  tagline: string;
  description: string;
  badgeColor: string;
  previewBg: string;
  category: "minimal" | "broadcast" | "retro" | "vertical";
  surface?: "obs" | "tiktok" | "desktop";
  defaultConfig: ThemeConfig;
  defaultCustomCss: string;
}

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  scale: 1.0,
  opacity: 0.88,
  blur: 20,
  borderRadius: 18,
  accentColor: "#6366f1",
  highContrast: true,
  autoAlbumColor: false,
  customWidth: 0,
  customHeight: 0,
  useSeparateDesktopSize: false,
  desktopScale: 1.0,
  desktopCustomWidth: 0,
  desktopCustomHeight: 0,
  transitionStyle: "focus",
  transitionDurationMs: 300,
  transitionDelayMs: 0,
  showTitle: true,
  showArtist: true,
  showAlbum: true,
  showArt: true,
  showProgress: true,
  showBadge: true,
  showVisualizer: true,
  showPlaybackStatus: false,
  framePadding: 0,
  titleFont: "Inter",
  titleSize: 16,
  titleWeight: 700,
  titleColor: "",
  artistSize: 13,
  artistColor: "",
  albumSize: 11,
  artSize: 0,
  artRadius: 10,
  artBorder: 0,
  visualizerCount: 8,
  visualizerHeight: 24,
  visualizerColor: "",
  elementCss: "",
};
