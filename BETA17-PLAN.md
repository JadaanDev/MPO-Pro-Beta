# 7.0.0-beta.17 — implementation plan

Status: implemented on 2026-11-08. See BETA17-NOTES.md for verification results and release summary. The full Tauri build remains for the user to compile manually.

## 1. System Themes SDK Compliance

### Objective

Upgrade all 44 system themes (14 built-in root themes + 30 collection themes powered by `CollectionTheme.tsx`, plus `ThemeSupplement.tsx`) to complete SDK compliance:
- Explicit `data-theme-role` annotations across all 11 semantic roles:
  1. `frame` — outer visible card container.
  2. `artwork` / `artwork-image` — album cover wrapper and image element.
  3. `title` — track title text wrapper and element.
  4. `artist` — artist name text element.
  5. `album` — album title text element.
  6. `themeLabel` — custom kicker / theme badge text element.
  7. `badge` — media player / source badge container.
  8. `status` — playback status text or pill.
  9. `timestamps` — current position and total duration timeline row.
  10. `progress`, `progress-track`, `progress-fill` — track and progress indicator elements.
  11. `indicator`, `indicator-bar` — animated visualizer container and individual bars.
- Motion boundary separation: semantic role attributes sit on stable positioning wrappers while animated transitions (`motion.div`, CSS keyframes) act on inner child elements.
- Custom kicker (`themeLabel`) support: ensure `config.themeLabel` renders across all themes when set.
- Universal timeline compliance: handle unknown total duration gracefully (elapsed time only) without assuming LIVE or creating private timers.

### Implementation Scope

1. **`ThemeSupplement.tsx`**: Add explicit `data-theme-role` attributes to all supplemental elements (`themeLabel`, `badge`, `album`, `status`, `timestamps`, `indicator`, `indicator-bar`).
2. **`CollectionTheme.tsx`**: Add explicit semantic roles covering all 30 collection designs (`desktop-*`, `obs-*`, `tiktok-*`), with `data-theme-part="progress-track"` and `data-theme-role="progress-fill"`.
3. **14 Root Built-in Themes**:
   - `AeroGlass.tsx`
   - `AppleMusicLive.tsx`
   - `CompactTag.tsx`
   - `CyberHud.tsx`
   - `DynamicIslandMini.tsx`
   - `FloatingOrb.tsx`
   - `GlassModern.tsx`
   - `MinimalPill.tsx`
   - `NeonBlade.tsx`
   - `SplitHorizon.tsx`
   - `StreamerBanner.tsx`
   - `VerticalStory.tsx`
   - `VinylRetro.tsx`
   - `ZenMono.tsx`
4. **Dev Hub IDE Discovery**: Ensure `KNOWN_IDES` is exported and used as initial state in `MyThemesPage.tsx` so SSR / static tests render the Dev Hub cleanly.

## 2. Version Bump to 7.0.0-beta.17

- Update version numbers across:
  - `package.json` & `package-lock.json`
  - `src-tauri/Cargo.toml` & `src-tauri/Cargo.lock`
  - `src-tauri/tauri.conf.json`
  - `README.md`
  - `THEME-SDK.md`
  - `THEME-SDK-LLM.md`
  - `src-tauri/src/themes/mod.rs` (inline test)
  - `src/components/common/AppLaunchScreen.tsx`
  - `src/components/dashboard/DiagnosticsModal.tsx`
  - `src/components/dashboard/settings/SettingsHeader.tsx`
  - `src/components/dashboard/settings/tabs/SettingsTabAbout.tsx`
  - `src/theme-sdk/SdkDocsExplorer.tsx`
  - `src/theme-sdk/templates/bundleAuthoring.ts`

## 3. Test & Verification Plan

- `test:themes`: Test all 44 themes in horizontal and vertical formats, verifying typography, visibility, artwork, and visualizer rendering.
- `test:popover`: Test popover geometry and positioning.
- `test:media`: Test shared monotonic media timeline, scrubbers, and seek handling.
- `test:sizing`: Test sizing, Arrange handlers, and SDK refresh.
- `test:beta16`: Test movement lock and canonical SDK authoring file generation.
- `test:beta17`: Verify that all 44 system themes contain explicit `data-theme-role` annotations and that version strings match across the application.
- Frontend build: `npm run build` (`tsc && vite build`).
- Rust check & tests: `cargo check` and `cargo test authoring_tests`.
