# MPO-pro Theme SDK — Developer Guide (`v7.0.0-beta.14`)

All studios provide the shared projected playhead through `media.position_ms`, `progress` and `formattedTime`; do not add another interpolation timer. `rawMedia` retains the backend publication and provider tuple for diagnostics. Use `timeline.positionKnown` and `timeline.durationKnown` independently: elapsed-only time when the total is unknown, `--:--` when position is unavailable, and an indeterminate rail without a percentage when progress is unknown. Missing duration is not LIVE evidence. The [complete playback contract](THEME-SDK-LLM.md#playback-clock-and-unknown-data) documents rates, bounds, uncertainty and recovery.

Welcome to the **MPO-pro Theme Development Platform**. With v7.0.0-beta.14, you can author high-performance, broadcast-ready media overlay themes using **modern React (TSX/JSX) and scoped CSS**, compiled in real time directly inside MPO-pro.

---

## 1. Quickstart: Your First React Theme in 3 Steps

1. In MPO-pro, open **Builder & My Themes** from the left navigation bar.
2. Click **"+ New Theme"** and choose a starter template (e.g. *Neon Pulse React* or *Glassmorphism Clean*).
3. Switch to the **Code Studio (IDE)** tab to edit `Theme.tsx` and `style.css`.
   - Edits are compiled and live hot-reloaded across the preview and Desktop HUD in **under 2 milliseconds**.

---

## 2. Multi-File Project Structure

### Soft card edges

The Desktop, OBS, TikTok, and Big Studio render hosts reserve a 32px transparent effect gutter. SDK previews use the same boundary. The bounded shadow falls to transparent before it reaches the canvas edge without fading the card, metadata, or artwork. The outer boundary stays free of masks, filters, and opacity layers so glass can still sample its backdrop.

Give the visible card the `.mpo-card` class and keep backgrounds, borders, shadows, and rounded content clipping on that element. Use `box-shadow: var(--mpo-frame-shadow)` to inherit the layer's shared shadow setting. Wrapper elements must stay transparent and allow overflow. Do not add another gutter inside your theme, shadow the full rectangular host, or mask the entire card. `overflow: hidden` is appropriate on the inner rounded card and artwork containers.

### Layer controls and design canvases

Add `data-theme-role="frame"` to the visible card. Annotate its controls with `artwork`, `artwork-image`, `title`, `artist`, `album`, `themeLabel`, `badge`, `status`, `timestamps`, `progress`, `progress-fill`, `indicator`, and `indicator-bar`. The runtime connects these elements to the shared inspector for visibility, offsets, scale, fonts, colors, artwork, progress, and visualizer styling. Existing common class names receive compatibility, but explicit roles support any naming style. Keep timestamps outside the `progress` track so hiding progress does not hide time labels. Mark the track with `data-theme-part="progress-track"`; a separate nested rail may use role `progress-track`.

Declare optional `manifest.json` `canvasSizes` as a map from studio name to `{ "width": 640, "height": 180 }`. Defaults are OBS 640×180, TikTok 360×640, Desktop 490×180, and Big Studio 1280×720. These are unscaled design dimensions; users can still override layer width, height, and scale. A full-canvas card should use `width:100%;height:100%;box-sizing:border-box` without fixed minimum/maximum sizes or another root scale. Animate children of Arrange wrappers to preserve independent positioning.

Generated source preserves per-studio Builder layouts and element styles. Untouched `visible:false` defaults are preserved. Explicit Arrange visibility records `visibilityOverrides` and can reveal hidden semantic nodes; title, artist, artwork, and progress fallbacks are added only when explicitly enabled. With a layer configuration, missing album, source, status, timestamps, and theme labels are supplemented when enabled. The shared visualizer replaces a native indicator when layer visualizer controls are present, giving users control of count, style, height, color, and position. SDK previews without layer configuration retain the native indicator.

Every theme in MPO-pro consists of:
- `manifest.json`: Metadata, target studios (`obs`, `tiktok`, `desktop`, `big`), and external dependencies.
- `Theme.tsx`: The main React component receiving `MpoThemeProps`.
- `style.css`: Scoped CSS styles. Rules are automatically namespaced to prevent styling leaks.
- `Visualizer.tsx` (optional): Sub-components, audio waveforms, or custom canvas effects.
- `types.d.ts` and `README.md`: Generated authoring interfaces and control guidance. Portable exports also include current `mpo-sdk.d.ts` and `MPO-SDK.md` references, retaining the author's existing files.

### Full Arrange workflow

React and declarative themes use the same full shared editor. Select the visible field or use the target picker for hidden/absent fields. Frame, Artwork/image, Title, Artist, Album, Theme text, Source badge, Status, Timestamps, Progress/track/fill, and Indicator/bar all resolve to their corresponding controls. Declarative themes can additionally edit authored percentage geometry; layer placement uses pixel offsets and a scale multiplier.

Separate artist from album, source badge from status, and progress from timestamps. Put each role on one primary positioning wrapper, animate a child, and let nested text inherit the wrapper's font/color. Keep general positioning ancestors open so moved elements can cross the original padding; clip artwork, text ellipsis, and decorative surfaces locally. Explicit Arrange visibility is tracked separately from untouched author defaults. Layer Custom CSS is applied after shared styling and compatibility rules; CSS specificity and importance still apply.

See [the complete authoring contract](THEME-SDK-LLM.md) for the full role table, all shared controls, visibility/supplement behavior, and a complete manifest/TSX/CSS example with an acceptance checklist. The app's LLM copy and download actions use that exact document, so exported guidance stays current.

---

## 3. Working in External IDEs (VS Code, Antigravity, Cursor)

You don't have to code inside the app's browser window—you can use your favorite code editor!

1. In the **Code Studio** toolbar, click **"Open in VS Code"** or **"Reveal in Explorer"**.
2. MPO-pro opens the theme directory on your computer (`%APPDATA%/MPO-pro-beta/themes/<theme-id>/`, unless you chose another workspace).
3. Edit `Theme.tsx` and `style.css` in VS Code or Cursor with full TypeScript intellisense, formatters, and Copilot.
4. Whenever you save a file in VS Code (`Ctrl+S`), MPO-pro automatically detects the change, transpiles the code, and updates your on-screen Desktop HUD immediately.

---

## 4. One-Click Portable Theme Bundles (`.mpotheme.json`)

Sharing and backing up themes is effortless:
- **Export**: Click **"Export .mpotheme"** in the toolbar to save `<theme-name>.mpotheme.json`. This single file contains all raw source code, styles, and manifest settings.
- **Import**: Click **"Import Theme"** or drag-and-drop any `.mpotheme.json` file into the Builder. The app compiles the code on the fly and immediately activates it.

---

## 5. Using External Libraries & Fonts

### 5.1 Web Fonts and External CSS
In `style.css`, load fonts or CSS libraries with standard `@import`:
```css
@import url("https://fonts.googleapis.com/css2?family=Orbitron:wght@700&display=swap");
@import url("https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css");
```

### 5.2 NPM Libraries via ESM CDNs
Directly import packages in `Theme.tsx`:
```tsx
import confetti from "https://esm.sh/canvas-confetti";
import { colord } from "https://esm.sh/colord";
```

### 5.3 Built-in Zero-Config Libraries
- **`react`**: `useState`, `useEffect`, `useRef`, `useMemo`, `useCallback`
- **`lucide-react`**: Over 800 icons (`Play`, `Pause`, `Disc`, `Sparkles`, `Music`)
- **`motion`**: Framer Motion animation engine

---

## 6. Multi-Studio Support Matrix

A single built theme can be routed to any of MPO's 4 studios from the **Route Theme** panel:
- **Desktop HUD**: Floating on your Windows desktop (click-through, translucent, lockable).
- **OBS Studio (16:9)**: Browser source for Twitch/YouTube live streaming.
- **TikTok Live Studio (9:16)**: Vertical phone layout for TikTok live broadcasts.
- **Big Studio**: Full-screen stage visualizer for events, TV screens, or high-res monitors.

Use the `surface` prop to adjust formatting:
```tsx
export default function Theme({ surface, ...props }: MpoThemeProps) {
  const isVertical = surface === "tiktok";
  return (
    <div className={isVertical ? "layout-vertical" : "layout-horizontal"}>
      {/* ... */}
    </div>
  );
}
```


## Beta 14 sizing and Arrange

Direct dragging, resize modes, keyboard nudging, cancellation and gesture undo now work across native and SDK studio themes. Shared frame policies offer Constrain, Allow overflow or Grow frame surface while preserving legacy defaults. Bounded-content width reserves maximum-width capture space; per-text Ellipsis, minimum-size Auto-shrink and RTL/reduced-motion Marquee are opt-in. The unlocked HUD grip saves independent Desktop scale; Big Studio shows stage × layer scale with separate resets.

Builder shares nominal dimensions with live outputs, exposes per-surface canvas width/height, and supports visual drag/resize plus undo. Generated source retains mpo-builder.json for reopening editable visual projects; external TSX/CSS edits are preserved by treating changed bundles as code themes. See [the complete beta 14 contract](THEME-SDK-LLM.md#10-beta-14-sizing-fitting-and-direct-arrange).
