# 7.0.0-beta.18 — implementation plan

Status: implemented on 2026-11-10 following user request: "Desktop Overlay should be Always Clean no matter its scale small or big, as when shrinked it becomes blurry and not comfortable at all , as beta 18". See BETA18-NOTES.md for verification results and release summary. The full Tauri build remains for the user to compile manually.

## 1. Problem Analysis & Root Cause

When users shrink the Desktop Overlay HUD (e.g. 50%–85% via presets or the corner scale grip) or enlarge it (e.g. 120%–200%):
1. **GPU Texture Downsampling**: Themes rendered via CSS `transform: scale(...)` on `.mpo-theme-container`. In Chromium/WebView2, `transform: scale` rasterizes the theme into an offscreen texture at 100% scale and then applies GPU bilinear downsampling/upsampling.
2. **Text Blurriness**: Downsampling a 14px raster bitmap to 8px–10px destroys glyph hinting, produces anti-aliasing halos, and breaks subpixel ClearType rendering (which assumes 1:1 physical RGB stripe alignment). The resulting text is fuzzy, washed out, low-contrast, and strains the user's eyes ("not comfortable at all").
3. **Font Smoothing Mismatch**: Default `-webkit-font-smoothing: antialiased` forces grayscale anti-aliasing on Windows, further degrading glyph stem contrast on translucent/glass HUD backgrounds.
4. **Artwork Softness**: Album art downscaled through standard composite filtering suffers from bilinear blurring.

## 2. Technical Solution

1. **DirectWrite Native Layout Zoom**:
   - Replace GPU `transform: scale` with CSS native layout `zoom: var(--desktop-hud-scale)` for `.desktop-overlay-container`.
   - With layout zoom, DirectWrite rasterizes glyphs directly at the exact physical device pixel resolution corresponding to the scaled size, preserving font hinting, sharp stem boundaries, and maximum contrast.
   - Vector elements (1px borders, progress rails, SVG icons, visualizer bars) snap cleanly to the physical pixel grid without blurring.
2. **Subpixel Antialiasing & Precision**:
   - Enable `-webkit-font-smoothing: subpixel-antialiased` and `text-rendering: geometricPrecision` across HUD containers.
   - Set `backface-visibility: hidden` to eliminate subpixel coordinate drift during scaling gestures.
3. **High-Quality Image Downscaling**:
   - Enable `image-rendering: -webkit-optimize-contrast` and `image-rendering: high-quality` for cover artwork so album images use high-quality bicubic downsampling rather than nearest-neighbor or coarse bilinear filtering.
4. **Desktop Overlay Widget & Style Engine Integration**:
   - Pass `--desktop-hud-scale` inline from [DesktopOverlayWidget.tsx](file:///c:/Users/MD-J/MPO-pro/beta/src/components/overlay/DesktopOverlayWidget.tsx).
   - Inject override rules in [desktop-hud.css](file:///c:/Users/MD-J/MPO-pro/beta/src/styles/dashboard/overlay/desktop-hud.css) and [ThemeStyleEngine.ts](file:///c:/Users/MD-J/MPO-pro/beta/src/utils/ThemeStyleEngine.ts) ensuring `transform: none !important` and `zoom: var(--desktop-hud-scale, scale) !important` apply consistently to built-in, collection, and SDK themes.
   - Retain `ThemeEffectBoundary` layout sizing and Tauri window `resize_desktop_overlay` logic without coordinate distortion.

## 3. Version Bump & Release Artifacts

- Bump version to `7.0.0-beta.18` across `package.json`, `package-lock.json`, `Cargo.toml`, `Cargo.lock`, `tauri.conf.json`, `README.md`, `THEME-SDK.md`, `THEME-SDK-LLM.md`, `AppLaunchScreen.tsx`, `DiagnosticsModal.tsx`, `SettingsHeader.tsx`, `SettingsTabAbout.tsx`, and `SdkDocsExplorer.tsx`.
- Create `BETA18-NOTES.md` and `BETA18-PLAN.md`.
- Add `scripts/test-beta18.cjs` to verify that anti-blur zoom styles and version identifiers are synchronized.
