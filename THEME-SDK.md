# MPO Theme SDK (`v7.0.0-beta.11`)

MPO-pro v7.0.0-beta.11 modularizes the creator experience into three dedicated pages under the **THEMES & SDK** sidebar:
1. **My Themes** (`MyThemesPage.tsx`): Dev Hub featuring a 50/50 split layout:
   - **Left 50% (Open in IDE)**: One-click launch cards with icons and tags for **VS Code**, **Cursor**, **Codex**, **Claude Code**, **Antigravity**, **Windsurf**, **WebStorm**, **IntelliJ IDEA**, **Sublime Text**, and **Zed**.
   - **Right 50% (Compiler & Watcher Hub)**: Real-time compiler status badge (`✓ Transpiled in < 3ms`), live Watcher Terminal event logs, and dynamic Files Changelog.
   - **Live Preview Bar**: Collapsible responsive live canvas preview (opened by default) with studio switchers (OBS 16:9, TikTok 9:16, Desktop HUD, Big Stage).
2. **Theme Builder** (`ThemeBuilderPage.tsx`): Clean, dedicated visual drag-and-drop canvas with element palette, 4-studio surface selector, alignment tools, and studio routing.
3. **SDK Docs & API** (`SdkDocsExplorer.tsx`): Dedicated child navigation page with full interactive TypeScript interfaces, live code examples, and LLM machine-readable prompt exporter.

## 1. HTML-like Declarative Markup (`<mpo-theme>`)

### Soft edges on every studio

All four studios and SDK previews reserve a 32px transparent effect gutter around the theme. The host stays transparent and allows overflow; the visible inner `.mpo-card` owns the background, border, shadow, radius, and content clipping. The bounded shadow naturally falls to transparent inside the gutter, so text, artwork, and the card border stay sharp while the shadow merges with the surrounding background. The outer host has no mask, filter, or opacity layer that could block glass backdrop sampling.

New React themes should put `className="mpo-card your-theme-card"` on the visible card and use `box-shadow: var(--mpo-frame-shadow)` for the shared shadow. Keep `overflow: hidden` on the card when its contents need clipping. Do not paint, shadow, or clip the SDK host, add a second effect gutter, or apply a fading mask to the card or its text. Generated themes and starter templates follow this structure automatically.

Each built theme is defined using `<mpo-theme>` markup that specifies element placement (`x`, `y`, `width`, `height` as canvas percentages) and visual preferences (`visible`, `color`, `fontSize`):

```html
<mpo-theme id="neon-pulse-sdk" name="Neon Pulse SDK" version="1">
  <artwork id="artwork" x="3" y="10" width="22" height="80" visible="true" />
  <title id="title" x="28" y="14" width="68" height="24" visible="true" color="#ffffff" fontSize="22" />
  <artist id="artist" x="28" y="42" width="68" height="18" visible="true" color="#94a3b8" fontSize="15" />
  <album id="album" x="28" y="62" width="46" height="14" visible="true" color="#64748b" fontSize="12" />
  <progress id="progress" x="28" y="82" width="68" height="6" visible="true" color="#6366f1" />
  <source id="source" x="76" y="62" width="20" height="14" visible="true" color="#38bdf8" fontSize="11" />
  <status id="status" x="76" y="14" width="20" height="14" visible="true" color="#10b981" fontSize="11" />

  <surface name="tiktok">
    <artwork id="artwork" x="15" y="6" width="70" height="42" visible="true" />
    <title id="title" x="8" y="52" width="84" height="10" visible="true" color="#ffffff" fontSize="22" />
    <artist id="artist" x="8" y="63" width="84" height="8" visible="true" color="#94a3b8" fontSize="15" />
    <album id="album" x="8" y="72" width="84" height="6" visible="true" color="#64748b" fontSize="12" />
    <progress id="progress" x="8" y="82" width="84" height="3" visible="true" color="#6366f1" />
    <source id="source" x="8" y="89" width="40" height="6" visible="true" color="#38bdf8" fontSize="11" />
    <status id="status" x="52" y="89" width="40" height="6" visible="true" color="#10b981" fontSize="11" />
  </surface>
</mpo-theme>
```

## 2. Unified "Builder & My Themes" Workspace

- **My Themes** and **Builder** live together in a single workspace (`?tab=builder`).
- Edit themes either visually on the interactive canvas or directly via the HTML-like `<mpo-theme>` SDK markup.
- **Route to any of the 4 Studios**: Any built theme can be routed with one click to:
  1. **Overlay Studio (`obs`)** — Landscape 16:9 broadcast overlay
  2. **TikTok Studio (`tiktok`)** — Portrait 9:16 vertical broadcast overlay
  3. **Desktop Overlay (`desktop`)** — Floating Windows HUD
  4. **Big Studio (`big`)** — Fullscreen presentation stage
