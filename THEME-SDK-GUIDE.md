# MPO-pro Theme SDK — Developer Guide (`v7.0.0-beta.11`)

Welcome to the **MPO-pro Theme Development Platform**. With v7.0.0-beta.11, you can author high-performance, broadcast-ready media overlay themes using **modern React (TSX/JSX) and scoped CSS**, compiled in real time directly inside MPO-pro.

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

Every theme in MPO-pro consists of:
- `manifest.json`: Metadata, target studios (`obs`, `tiktok`, `desktop`, `big`), and external dependencies.
- `Theme.tsx`: The main React component receiving `MpoThemeProps`.
- `style.css`: Scoped CSS styles. Rules are automatically namespaced to prevent styling leaks.
- `Visualizer.tsx` (optional): Sub-components, audio waveforms, or custom canvas effects.

---

## 3. Working in External IDEs (VS Code, Antigravity, Cursor)

You don't have to code inside the app's browser window—you can use your favorite code editor!

1. In the **Code Studio** toolbar, click **"Open in VS Code"** or **"Reveal in Explorer"**.
2. MPO-pro opens the theme directory on your computer (`%APPDATA%/mpo-pro/themes/<theme-id>/`).
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

