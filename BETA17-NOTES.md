# 7.0.0-beta.17 — complete system theme SDK compliance

Every system theme in MPO-pro (14 built-in root themes + 30 curated collection themes for OBS, TikTok, and Desktop HUD, plus `ThemeSupplement.tsx`) now fully complies with the MPO Theme SDK semantic specification.

All themes feature explicit `data-theme-role` annotations for all 11 semantic roles:
- `frame`: Visible outer card boundary owning borders, shadows, background, and corner radii.
- `artwork` and `artwork-image`: Album artwork wrapper and image tag with direct style/size control.
- `title`: Track title text container and typography target.
- `artist`: Artist metadata text element.
- `album`: Album title text element.
- `themeLabel`: Custom kicker / theme badge text element (`config.themeLabel`).
- `badge`: Audio source and app identity badge.
- `status`: Playback status indicator pill or text.
- `timestamps`: Current position and total duration timeline row.
- `progress`, `progress-track`, and `progress-fill`: Progress rail and fill elements.
- `indicator` and `indicator-bar`: Animated visualizer rail and individual bars.

### Motion Boundary Separation

Semantic role attributes now reside on stable positioning wrappers, while motion and entry animations (such as `motion.div` transitions, vinyl spinning, and pulse effects) act on inner child nodes. This guarantees that Arrange dragging, scaling, offsets, and selection outlines remain stable and never fight active CSS or framer-motion transforms.

### Dev Hub IDE Discovery Static Initialization

The Dev Hub (`MyThemesPage.tsx`) initializes with `KNOWN_IDES` out of the box, ensuring that server-side rendering, static markup generation, and unit tests always render the full IDE grid (VS Code, Cursor, Codex, Claude Code, Antigravity, Windsurf, WebStorm, IntelliJ, Sublime Text, Zed) before async discovery completes.

### Validation

- Full test suites passed:
  - `test:themes`: Parity, artwork colors, element CSS, theme SDK, SDK controls, theme effects, and SDK arrange tests all green across all 44 themes.
  - `test:popover`: Geometry, screen bounds, flipping, and offsets verified.
  - `test:media`: Jitter classification, rates, transport ordering, seeks, and unknown-data handling verified.
  - `test:sizing`: Canvases, Arrange handlers, and linked source refreshes verified.
  - `test:beta16`: SDK contracts and movement lock verified.
  - `test:beta17`: Explicit semantic roles verified across all 44 system themes; version sync verified.
- Production TypeScript frontend build: `tsc && vite build` completed cleanly in < 5 seconds.
- Rust check & unit tests: `cargo check` and `cargo test authoring_tests` passed cleanly with `7.0.0-beta.17`.

The full Tauri build and installer remain for the user to compile manually.
