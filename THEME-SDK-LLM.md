# MPO-pro React Theme SDK — LLM Reference & Specification (`llms.txt`)

> **Target Audience**: AI coding assistants (ChatGPT, Claude, Antigravity, GitHub Copilot, Cursor).  
> **Release Target**: `v7.0.0-beta.11`
> **Purpose**: Ingest this document to generate 100% valid, bug-free, beautiful React themes for MPO-pro with native Arrange Mode and Overlay Styling support.

---

## 1. Core Architecture Overview

MPO-pro v7.0.0-beta.11 executes themes as **pure React components** (`React.FC<MpoThemeProps>`) compiled on-the-fly via an in-app Sucrase compiler (< 2ms) with content-hash memoization caching. Themes have full access to React hooks, scoped CSS, Framer Motion animations, Lucide icons, and modern Web APIs. Developers have full freedom to edit themes in their favorite external IDE (VS Code, Codex, Claude Code, Antigravity, Cursor, Windsurf, WebStorm, IntelliJ, Sublime, Zed) with 1-click launch, real-time compiler status, watcher logs, and file changelog in the dedicated My Themes Dev Hub.

Every theme project is defined by an on-disk multi-file bundle:
- `manifest.json`: Metadata, target studios, exposed parameters.
- `Theme.tsx`: Main React component entry point.
- `Visualizer.tsx` (optional): Sub-components (wave visualizer, vinyl, etc.).
- `style.css`: Modern scoped CSS styles with top-level keyframe support.

---

## 2. Complete TypeScript Definitions

```typescript
export interface MediaState {
  title: string;             // Active track title (e.g. "Blinding Lights")
  artist: string;            // Active artist name (e.g. "The Weeknd")
  album_title: string;       // Album name (e.g. "After Hours")
  status: "Playing" | "Paused" | "Stopped";
  position_ms: number;       // Current playback position in ms
  duration_ms: number;       // Total track duration in ms
  app_name: string;          // Source application (e.g. "Spotify", "Apple Music", "YouTube")
  has_art: boolean;          // Whether high-res artwork is loaded
}

export interface MpoThemeColors {
  dominant: string;          // Dominant artwork color (hex, e.g. "#38bdf8")
  contrastText: string;      // High-contrast text color ("#ffffff" or "#000000")
  accent: string;            // Active theme accent color
  vibrant?: string;          // Optional vibrant color
  muted?: string;            // Optional muted color
}

export interface MpoThemeTime {
  current: string;           // Formatted current time (e.g. "01:24")
  duration: string;          // Formatted duration (e.g. "03:45")
}

export type ThemeSurface = "desktop" | "obs" | "tiktok" | "big";

export interface MpoThemeProps {
  media: MediaState;
  artUrl: string;            // Artwork URL or empty string
  colors: MpoThemeColors;
  surface: ThemeSurface;     // Target studio: "desktop" (HUD), "obs" (16:9), "tiktok" (9:16), "big" (Stage)
  format: "horizontal" | "vertical"; // "horizontal" for 16:9/Desktop HUD, "vertical" for TikTok
  progress: number;          // Normalized 0.0 to 1.0
  formattedTime: MpoThemeTime;
  config?: Record<string, any>; // Layer configuration & Arrange Mode offsets
}
```

---

## 3. Semantic Roles & Interactive Arrange Mode (v7.0.0-beta.9)

Always annotate your JSX elements with `data-theme-role`. This enables users to click and drag elements, adjust offsets, scale them, and toggle their visibility directly in the MPO-pro Dashboard Arrange Mode:

| Attribute | Purpose & Target Element |
| :--- | :--- |
| `data-theme-role="artwork"` | Album art container or image frame |
| `data-theme-role="title"` | Track title element |
| `data-theme-role="artist"` | Artist name element |
| `data-theme-role="album"` | Album title element |
| `data-theme-role="progress"` | Scrubber track or progress bar section |
| `data-theme-role="timestamps"`| Current time and duration label row |
| `data-theme-role="status"` | Playing / Paused badge |
| `data-theme-role="indicator"`| Audio visualizer or equalizer waveform |
| `data-theme-role="badge"` | Source app pill (Spotify, YouTube, etc.) |

---

## 4. Root CSS Custom Properties (Injected by Dashboard)

The MPO-pro runtime automatically injects these CSS variables onto the theme root based on user sliders in the Shared Style Inspector:

```css
/* Card & Glassmorphism Properties */
var(--mpo-card-radius)      /* User border-radius slider (e.g. 24px) */
var(--mpo-card-blur)        /* Background blur depth (e.g. 40px) */
var(--mpo-card-opacity)     /* Background opacity (0.0 to 1.0) */
var(--mpo-glow-intensity)   /* Ambient glow multiplier */
var(--mpo-glow-color)       /* Ambient lighting color */
var(--mpo-frame-padding)    /* Card frame padding */
var(--mpo-frame-shadow)     /* Shared bounded shadow; apply to the visible .mpo-card */

/* Typography Properties */
var(--mpo-font-family)      /* User selected font family */
var(--mpo-title-size)       /* Title font size override */
var(--mpo-artist-size)      /* Artist font size override */
var(--mpo-text-color)       /* Text color override */
```

---

## 5. Allowed Imports & Pre-Bundled Libraries

Theme code can import the following libraries directly with zero configuration:
1. **`react`**: `useState`, `useEffect`, `useRef`, `useMemo`, `useCallback`, `React.FC`.
2. **`lucide-react`**: Any Lucide icon (e.g. `import { Play, Pause, Disc, Music, Volume2, Sparkles } from "lucide-react"`).
3. **`motion`** / **`framer-motion`** / **`motion/react`**: Animation components (`motion.div`, `AnimatePresence`).
4. **Local files**: `import { MyVisualizer } from "./Visualizer"` or `import "./style.css"`.
5. **External ESM CDNs**: `import confetti from "https://esm.sh/canvas-confetti"`.

---

## 6. Multi-Studio Adaptation Guidelines

### Mandatory soft-edge structure

Every studio and SDK preview supplies a transparent host with a 32px effect gutter. The bounded shadow naturally falls to transparent inside that gutter so external shadows merge into the background. Keep the theme's visible card inside it, annotate the card with `.mpo-card`, and use `box-shadow: var(--mpo-frame-shadow)`. Place background, border, border radius, and content clipping on that card. Leave positioning wrappers transparent with visible overflow. Do not shadow or paint the rectangular host, mask or filter its outer boundary, or add another effect gutter inside the theme. Outer masks, filters, and opacity layers can create a backdrop root and prevent glass from sampling its surroundings. Keep text and artwork at full opacity.

Themes should adapt smoothly to all 4 studios using the `surface` and `format` props:
- **`surface === "desktop"`** (Desktop HUD): Floating on user screen. Keep compact, high-contrast, semi-transparent background with `backdrop-filter: blur(var(--mpo-card-blur, 20px))`.
- **`surface === "obs"`** (OBS 16:9): Live broadcast overlay. Widescreen horizontal orientation (typically 640x180 or 800x220).
- **`surface === "tiktok"`** (TikTok 9:16): Vertical mobile stage (typically 360x640). Stack elements vertically: artwork on top, title/artist in center, progress bar on bottom.
- **`surface === "big"`** (Big Studio): Stage presentation (e.g. 1920x1080). Use expansive typography, full-screen visualizers, and ambient art glows.

---

## 7. Animation & Equalizer Best Practices

1. **Equalizer Baseline**: Anchor equalizer bars to the bottom baseline using `align-items: flex-end;`.
2. **GPU Acceleration**: Animate `transform: scaleY(...)` with `transform-origin: bottom;` instead of `height`. Animating `height` causes layout reflows, while `transform` runs at 60 FPS on the GPU compositor.
3. **Progress Bar Smoothness**: Use `transition: width 0.4s linear;` on the scrubber fill for seamless, fluid time progression.

---

## 8. Production Reference Template (Copy & Adapt)

### `Theme.tsx`
```tsx
import React from "react";
import { Play, Pause, Music, Volume2 } from "lucide-react";
import type { MpoThemeProps } from "./types";

export default function MyCustomTheme({
  media,
  artUrl,
  colors,
  surface,
  progress,
  formattedTime,
}: MpoThemeProps) {
  const isPlaying = media.status === "Playing";
  const isVertical = surface === "tiktok";

  return (
    <div
      className={`mpo-card theme-card ${isVertical ? "vertical-mode" : "horizontal-mode"}`}
      style={{ "--accent": colors.dominant || "#38bdf8" } as React.CSSProperties}
    >
      {/* 1. Artwork */}
      <div className="art-box" data-theme-role="artwork">
        {artUrl ? (
          <img src={artUrl} alt="Album Art" className="art-img" />
        ) : (
          <div className="art-fallback"><Music size={24} /></div>
        )}
      </div>

      <div className="details-col">
        {/* 2. Badge & Status */}
        <div className="badge-row">
          <span className="source-pill" data-theme-role="badge">{media.app_name || "Media"}</span>
          <span className="status-pill" data-theme-role="status">
            {isPlaying ? <Play size={10} /> : <Pause size={10} />} {media.status}
          </span>
          <span className="time-pill" data-theme-role="timestamps">
            {formattedTime.current} / {formattedTime.duration}
          </span>
          {/* 3. Live 4-Bar Equalizer */}
          <div
            className={`live-eq ${isPlaying ? "playing" : "paused"}`}
            data-theme-role="indicator"
            aria-label="Playback indicator"
          >
            <span className="eq-bar bar-1" />
            <span className="eq-bar bar-2" />
            <span className="eq-bar bar-3" />
            <span className="eq-bar bar-4" />
          </div>
        </div>

        {/* 4. Track Metadata */}
        <h1 className="title-text" data-theme-role="title" title={media.title}>
          {media.title || "No Track Playing"}
        </h1>
        <h2 className="artist-text" data-theme-role="artist">
          {media.artist || "Unknown Artist"}
        </h2>
        {media.album_title && (
          <p className="album-text" data-theme-role="album">
            {media.album_title}
          </p>
        )}

        {/* 5. Scrubber Progress */}
        <div className="track-bar" data-theme-role="progress">
          <div
            className="track-fill"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
```

### `style.css`
```css
.theme-card {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: var(--mpo-frame-padding, 16px);
  background: rgba(15, 23, 42, var(--mpo-card-opacity, 0.88));
  backdrop-filter: blur(var(--mpo-card-blur, 24px));
  -webkit-backdrop-filter: blur(var(--mpo-card-blur, 24px));
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--mpo-card-radius, 16px);
  box-shadow: var(--mpo-frame-shadow, 0 7px 18px -7px rgba(0, 0, 0, 0.36));
  box-sizing: border-box;
  overflow: hidden;
  color: var(--mpo-text-color, #ffffff);
  font-family: var(--mpo-font-family, system-ui, -apple-system, sans-serif);
}

.theme-card.vertical-mode {
  flex-direction: column;
  justifyContent: center;
  text-align: center;
}

.art-box {
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  border-radius: 12px;
  overflow: hidden;
}

.art-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.details-col {
  flex: 1;
  min-width: 0;
}

.badge-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  margin-bottom: 4px;
}

.source-pill {
  font-weight: 700;
  color: var(--accent);
  text-transform: uppercase;
}

.title-text {
  margin: 0;
  font-size: var(--mpo-title-size, 17px);
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.artist-text {
  margin: 2px 0 0 0;
  font-size: var(--mpo-artist-size, 13px);
  opacity: 0.75;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.album-text {
  margin: 1px 0 0 0;
  font-size: 11px;
  opacity: 0.55;
}

.track-bar {
  margin-top: 8px;
  height: 4px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 999px;
  overflow: hidden;
}

.track-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 999px;
  transition: width 0.4s linear;
}

/* 4-Bar Equalizer */
.live-eq {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 12px;
  margin-left: auto;
}

.eq-bar {
  width: 2.5px;
  height: 12px;
  background: var(--accent);
  border-radius: 999px;
  transform-origin: bottom;
  transform: scaleY(0.2);
  transition: transform 0.25s ease;
}

.live-eq.playing .bar-1 { animation: mpoEqPulse 0.7s infinite alternate ease-in-out; }
.live-eq.playing .bar-2 { animation: mpoEqPulse 0.5s infinite alternate ease-in-out 0.15s; }
.live-eq.playing .bar-3 { animation: mpoEqPulse 0.85s infinite alternate ease-in-out 0.3s; }
.live-eq.playing .bar-4 { animation: mpoEqPulse 0.6s infinite alternate ease-in-out 0.08s; }

.live-eq.paused .eq-bar {
  transform: scaleY(0.2);
  opacity: 0.45;
}

@keyframes mpoEqPulse {
  0% { transform: scaleY(0.25); }
  50% { transform: scaleY(0.95); }
  100% { transform: scaleY(0.4); }
}
```


