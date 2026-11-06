# 7.0.0-beta.14 — sizing and Arrange

This release implements the six sizing/Arrange improvements while preserving existing live dimensions and legacy frame behavior by default.

| Area | Result |
| --- | --- |
| Direct Arrange | Shared native/compiled/declarative studio interaction layer; drag, proportional scale or dimension/font resize, 1px/10px keyboard nudging, Escape/pointer cancellation, and gesture undo/redo. Pointer coordinates account for preview/ancestor scale. Undo preserves independent properties edited afterward. |
| Frame boundaries | Opt-in Constrain, Allow overflow with transparent capture space, or Grow frame surface. Growing the decorative surface keeps nominal percentage geometry fixed, avoiding resize feedback. |
| Desktop HUD | Unlocked corner scale grip and keyboard adjustments; Desktop scale saves independently of stream dimensions. A targeted server update preserves unrelated project fields. Fixed minimum effect gutters are included in the resize math. |
| Builder parity | One shared nominal canvas resolver for Builder, live mounting and generated source; per-surface dimensions, uniformly fitted previews, new visual projects, direct geometry editing and undo/redo. Generated visual projects reopen from disk while external source edits are preserved as code themes. |
| Content fitting | Bounded content width reserves maximum-width capture space. Per-field Ellipsis, minimum-size Auto-shrink and overflow-only Marquee support RTL and reduced motion. Fixed height remains useful when a scene also needs a constant capture height. |
| Big Studio scale | Existing stage × layer multiplication is preserved, now explicitly labelled with effective scale and separate resets. Advanced styling no longer duplicates the layer scale control. |

Studio-specific visual size presets and the complete SDK/LLM authoring guidance are included. Builder source packages retain extra files and authored manifest metadata. Source fingerprints prevent stale visual geometry from overwriting changes to generated TSX/CSS or a custom entry point.

Validation:

- `npm run test:themes`, `npm run test:sizing`, `npm run test:media`, and `npm run test:popover` pass.
- `npm run build` passes TypeScript and the Vite production build. Shared runtime chunking avoids a creator/OBS dependency cycle; existing package-size/dynamic-import advisories remain.
- `cargo test -- --skip autostart::tests::test_autostart_toggle_cycle`: 15 tests pass, including isolated HUD field updates and unchanged origin restrictions. The excluded existing integration test writes Windows startup registry settings.
- A local browser fixture verified native/SDK 320–600px content sizing within a stable 664px logical capture width, minimum font fitting, RTL marquee direction and accessible text, overflow padding, growing surfaces without nominal reflow, constraints, keyboard Arrange undo, editable Builder dimensions, a uniformly fitted 1280×720 canvas, and HUD keyboard scale saving. No browser console errors were observed. `scripts/preview-sizing.cjs` recreates this isolated fixture for further checks.

The full Tauri build/installer is intentionally left to the user. No beta 14 installer was produced. Native Windows pointer/DPI behavior and OBS/TikTok capture should be checked after that build; browser/component tests do not establish native compositor behavior.
