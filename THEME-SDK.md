# MPO Theme SDK (`v7.0.0-beta.15`)

Playback uses the same shared clock as built-in themes in all four studios. Use projected `media.position_ms`, `progress` and `formattedTime` directly; `rawMedia` preserves the backend publication and raw provider tuple. Position and duration validity are independent: show elapsed-only time for a credible position with no total, `--:--` for unavailable position, and indeterminate progress without an exact percentage. Missing duration does not mean LIVE. See [the complete playback contract](THEME-SDK-LLM.md#playback-clock-and-unknown-data).

MPO-pro v7.0.0-beta.15 modularizes the creator experience into three dedicated pages under the **THEMES & SDK** sidebar:
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

### Full layer controls and canvas sizes

Annotate the visible card with `data-theme-role="frame"` and its inner elements with `artwork`, `artwork-image`, `title`, `artist`, `album`, `themeLabel`, `badge`, `status`, `timestamps`, `progress`, `progress-fill`, `indicator`, and `indicator-bar`. These roles connect SDK themes to the same visibility, positioning, scale, typography, artwork, progress, and visualizer controls used by built-in themes. Put `progress` and `data-theme-part="progress-track"` on the track, and keep timestamps outside it so the two visibility toggles stay independent. Use `progress-track` for a separate nested rail when needed. Put Arrange roles on a positioning wrapper and animate its child.

Optional manifest `canvasSizes` declares the unscaled design canvas for each studio:

```json
"canvasSizes": {
  "obs": { "width": 640, "height": 180 },
  "tiktok": { "width": 360, "height": 640 },
  "desktop": { "width": 490, "height": 180 },
  "big": { "width": 1280, "height": 720 }
}
```

Those sizes are the fallback when a layer has no custom dimensions. The layer's width, height, and scale controls remain editable. Use `width: 100%; height: 100%; box-sizing: border-box` for a full-canvas card, and adapt its inner layout to `surface`. Avoid fixed minimum/maximum sizes and a second root scale that would defeat the inspector controls.

Generated bundles retain every studio layout, element style, and authored hidden element. Untouched authored-hidden defaults are preserved. Explicit Arrange visibility records `visibilityOverrides` and can reveal hidden semantic nodes; missing base title, artist, artwork, and progress fields receive shared fallbacks only when explicitly enabled. Existing themes receive compatibility for common class names, including iOS-style cards, while explicit roles make custom names dependable. With a layer configuration, missing album, source, status, timestamps, and theme labels are supplemented when enabled. A configured shared visualizer replaces the native indicator so count, style, height, color, and position controls apply; SDK previews without a layer configuration retain the native design.

Starter and generated themes include `types.d.ts` and `README.md`. Portable exports include current `mpo-sdk.d.ts` and `MPO-SDK.md` contract references alongside existing author files, preserving custom code, manifest canvas sizes, and studio layouts.

### Complete Arrange authoring reference

Both React and declarative SDK themes open the full shared editor in Arrange mode. Select a visible semantic element or use the target picker for hidden/absent targets. Image, progress fill, and indicator bar clicks resolve to Artwork, Progress, and Indicator controls; declarative themes can additionally expose authored percentage geometry. Layer offsets are pixels, and element scale is independent of overall layer scale.

Keep one primary role wrapper per field, let nested text inherit typography, and put Motion/spin/entrance effects on children. Keep layout ancestors open with `overflow:visible`; clip only the artwork crop, local text ellipsis, or decorative surface. Scoping keeps styles within the theme, and layer Custom CSS is the final override layer with normal specificity and `!important` rules.

The [complete LLM authoring contract](THEME-SDK-LLM.md) contains the full role table, configuration/control matrix, visibility override behavior, supplementation rules, working manifest/TSX/CSS example, and acceptance checklist. The in-app **Copy LLM Context** and **Download SDK** actions read that same document.

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

## Beta 14 sizing and Arrange

Direct dragging, resize modes, keyboard nudging, cancellation and gesture undo now work across native and SDK studio themes. Shared frame policies offer Constrain, Allow overflow or Grow frame surface while preserving legacy defaults. Bounded-content width reserves maximum-width capture space; per-text Ellipsis, minimum-size Auto-shrink and RTL/reduced-motion Marquee are opt-in. The unlocked HUD grip saves independent Desktop scale; Big Studio shows stage × layer scale with separate resets.

Builder shares nominal dimensions with live outputs, exposes per-surface canvas width/height, and supports visual drag/resize plus undo. Generated source retains mpo-builder.json for reopening editable visual projects; external TSX/CSS edits are preserved by treating changed bundles as code themes. See [the complete beta 14 contract](THEME-SDK-LLM.md#10-beta-14-sizing-fitting-and-direct-arrange).
