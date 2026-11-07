# MPO-PRO-BETA (`v7.0.0-beta.15`)

High-Performance Windows Media Overlay for OBS Studio, TikTok Live, Big Presentation Stages, and Desktop HUD.

This repository hosts the standalone **MPO-PRO-BETA** codebase featuring:
- **Four Creative Studios**: Overlay Studio (OBS 16:9), TikTok Studio (9:16), Desktop Overlay HUD, and Big Studio Stage.
- **Dynamic React Theme SDK**: On-the-fly Sucrase transpiler (< 2ms) with full scoped CSS and motion support.
- **Creator Dev Hub**: Split 50/50 IDE workspace launcher (VS Code, Cursor, Codex, Claude Code, Antigravity, etc.) with real-time compiler watcher terminal and file changelogs.
- **Native Windows GSMTC Hook**: Low-latency WinRT multimedia telemetry without cloud dependencies or telemetry tracking.

Beta 15 fixes Arrange selection: a normal click selects without moving or clearing the element, and dragging starts only after deliberate pointer movement. Inspector edits and floating menus preserve selection. Arrange and shared inspector dropdowns now use styled, keyboard-accessible studio popups that fit the viewport. See [beta 15 release notes](BETA15-NOTES.md).

The sizing controls include direct canvas dragging, proportional or dimension resize handles, keyboard nudging, Escape cancellation, and gesture undo/redo. Frame policies can constrain content, reserve overflow capture space, or extend the frame surface without reflowing its layout. Bounded content width, ellipsis, minimum-size auto-shrink, and RTL/reduced-motion marquee are shared controls. The unlocked HUD has an independent scale grip; Big Studio labels and resets stage/layer scales separately.

Builder uses the same nominal canvases as live output, supports per-surface dimensions and interactive visual editing, and preserves editable visual projects in generated source. Legacy dimensions preserve existing live output. Externally modified source is treated as code to avoid overwriting edits.

React and declarative SDK themes retain the full shared Arrange editor across all four studios, including hidden-target selection and explicit visibility overrides. Theme manifests can declare per-studio `canvasSizes`, while layer width, height, and scale stay editable. Starter templates and Builder exports include semantic roles, complete studio layouts, and portable SDK authoring references. The in-app LLM copy/download actions provide the [complete SDK contract and working example](THEME-SDK-LLM.md).

Playback now uses validated stateful GSMTC anchors and one shared frontend clock. This removes the backend's 30-second extrapolation plateau, supports playback rates, preserves stale-data pause/resume positions, and rejects duplicate or delayed state across transports. Unknown duration can show credible elapsed time without inventing a total or LIVE label. Diagnostics can copy a bounded in-memory raw media trace. See the [implementation follow-up and remaining browser validation](BROWSER-MEDIA-TELEMETRY-REVIEW.md#9-beta-13-implementation-follow-up).

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run in development mode:
   ```bash
   npm run tauri dev
   ```

3. Run the validation suites:
   ```bash
   npm run test:themes
   npm run test:popover
   npm run test:media
   npm run test:sizing
   cd src-tauri
   cargo test -- --skip autostart::tests::test_autostart_toggle_cycle
   cd ..
   ```

   The excluded autostart integration test writes the user's Windows startup registry settings; run it separately only in an appropriate Windows test environment.

4. Compile production installer:
   ```bash
   npm run tauri build
   ```

## Developer & Ecosystem Links
- **Website**: [https://mpopro.notion.site/](https://mpopro.notion.site/)
- **Telegram Updates**: [https://t.me/mpo_pro](https://t.me/mpo_pro)
- **Developer Hub**: [https://jadaan.dev](https://jadaan.dev)
- **Developer**: Mohammed Jadaan (Jadaan.Dev)

