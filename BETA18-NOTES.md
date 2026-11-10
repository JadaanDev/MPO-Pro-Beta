# 7.0.0-beta.18 — crisp native vector scaling (anti-blur) for Desktop Overlay

Desktop Overlay HUD is now permanently clean, razor-sharp, and comfortable to read at any scale, whether shrinked down to a small discreet HUD widget (e.g. 50%–85%) or enlarged up to 200%.

### Technical Highlights

1. **DirectWrite Native Layout Zoom**:
   - Replaced GPU texture downsampling (`transform: scale(...)`) with layout-level zoom (`zoom: var(--desktop-hud-scale)`).
   - In Chromium/WebView2, CSS `zoom` recomputes layout at the target device pixel density. DirectWrite rasterizes glyphs directly at the physical pixel resolution with active font hinting and high-contrast stems instead of downsampling a 1.0 raster bitmap on the GPU.
   - Text remains sharp and effortlessly legible even at small sizes (8px–11px) on translucent glass backgrounds.

2. **Subpixel Antialiasing & Rendering Precision**:
   - Enabled `-webkit-font-smoothing: subpixel-antialiased` and `text-rendering: geometricPrecision` on Desktop Overlay containers.
   - Enabled `backface-visibility: hidden` to eliminate subpixel coordinate jitter during live scaling gestures.

3. **High-Quality Artwork Downscaling**:
   - Configured `image-rendering: -webkit-optimize-contrast` and `image-rendering: high-quality` for cover artwork so album art downscaling uses bicubic filtering instead of coarse bilinear or nearest-neighbor interpolation.

4. **Seamless Integration Across Built-in & Custom Themes**:
   - `desktop-hud.css` and `ThemeStyleEngine.ts` enforce `transform: none !important` and `zoom: var(--desktop-hud-scale, scale) !important` on `.mpo-theme-container`, covering all 14 built-in root themes, 30 collection themes, and custom SDK themes (`BuiltThemeMount`).
   - `DesktopOverlayWidget.tsx` dynamically passes `--desktop-hud-scale` inline during live HUD scale dragging, updating the layout and resizing the native Tauri overlay window smoothly.

### Validation

- Full test suite verified:
  - `test:themes`: Parity, artwork colors, element CSS, theme SDK, SDK controls, theme effects, and SDK arrange tests passed.
  - `test:popover`, `test:media`, `test:sizing`, `test:beta16`, `test:beta17`, `test:beta18`: All passed cleanly.
- Visual headless Edge render comparison verified side-by-side sharpness of typography, borders, and progress indicators at 60% and 140% scales.
- Production TypeScript frontend build (`tsc && vite build`) built cleanly in < 5 seconds.
- Rust checks and tests (`cargo check` and `cargo test authoring_tests`) passed cleanly with `7.0.0-beta.18`.

The full Tauri build and installer remain for the user to compile manually.
