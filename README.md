# MPO-PRO-BETA (`v7.0.0-beta.11`)

High-Performance Windows Media Overlay for OBS Studio, TikTok Live, Big Presentation Stages, and Desktop HUD.

This repository hosts the standalone **MPO-PRO-BETA** codebase featuring:
- **Four Creative Studios**: Overlay Studio (OBS 16:9), TikTok Studio (9:16), Desktop Overlay HUD, and Big Studio Stage.
- **Dynamic React Theme SDK**: On-the-fly Sucrase transpiler (< 2ms) with full scoped CSS and motion support.
- **Creator Dev Hub**: Split 50/50 IDE workspace launcher (VS Code, Cursor, Codex, Claude Code, Antigravity, etc.) with real-time compiler watcher terminal and file changelogs.
- **Native Windows GSMTC Hook**: Low-latency WinRT multimedia telemetry without cloud dependencies or telemetry tracking.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run in development mode:
   ```bash
   npm run tauri dev
   ```

3. Run theme and popover test suites:
   ```bash
   npm run test:themes
   npm run test:popover
   ```

4. Compile production installer:
   ```bash
   npm run tauri build
   ```

## Developer & Ecosystem Links
- **Website**: [https://mpopro.notion.site/](https://mpopro.notion.site/)
- **Telegram Updates**: [https://t.me/mpo_pro](https://t.me/mpo_pro)
- **Developer Hub**: [https://jadaan.dev](https://jadaan.dev)
- **Developer**: Mohammed Jadaan (Jadaan.Dev)

