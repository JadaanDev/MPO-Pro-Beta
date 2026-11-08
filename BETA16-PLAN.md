# 7.0.0-beta.16 — implementation plan

Status: implemented on 2026-11-08 following the user's instruction to proceed. See BETA16-NOTES.md for results and validation. The full Tauri build remains for the user to compile manually.

## 1. Full SDK instructions inside every new theme

### Result

Each new theme folder and exported theme package includes:

- `MPO-SDK-LLM.md`: the complete, extended, versioned SDK/LLM authoring contract, examples and acceptance checklist.
- `MPO-SDK.md`: a short starting guide pointing to the full contract and explaining which source files to edit, how to preview changes, and how to check all four studios.
- The existing authoring types and manifest. An app-generated README links to these documents; preserve an author's existing README and other custom files.

Opening the theme folder in an IDE or giving the folder to an LLM supplies the required SDK context without copying it from the app.

### Implementation

1. Keep `THEME-SDK-LLM.md` as the canonical full contract. Reuse its contents for the in-app documentation, generated theme files and portable exports rather than maintaining separate copies manually.
2. Add the full document through the shared authoring-file generator. Normalize compiled bundles on the save path as well as declarative themes; the current `saveTheme` path can save a supplied bundle without adding authoring files.
3. Cover new visual themes, React starter templates, duplication, imports saved as themes, package export and native theme creation/seeding. Provide native fallback documentation from the same canonical source for direct native saves.
4. Keep disk, library and exported bundle contents consistent. Reserved SDK documents are app-managed; source, custom README files and unrelated author files remain intact. Do not rewrite every existing theme at startup; add/update managed documentation when a theme is explicitly created, saved or exported.
5. Include practical instructions for semantic roles, four studio surfaces, sizing/Arrange support, soft edges, scale-safe marquees, shared playback timing, unknown media data, source refresh, debugging and the new movement lock.
6. Make generated content deterministic. Documentation-only changes must not remount a compiled theme or restart title animations; review the compiler's current hash of every bundle file and exclude non-runtime authoring documents from cache invalidation.
7. Extend test bundling to load the canonical Markdown where needed. Verify generated documentation matches that source and its release target.

Primary files: `src/theme-sdk/templates/bundleAuthoring.ts`, `themeStore.ts`, `templates/bundleGenerator.ts`, `templates/bundleStorage.ts`, `templates/starterBundles.ts`, `compiler/themeCompiler.ts`, `SdkDocsExplorer.tsx`, `THEME-SDK-LLM.md`, and `src-tauri/src/themes/mod.rs`.

## 2. Movement lock before the Arrange button

### Proposed behavior

- Add a styled **Movement locked / Movement unlocked** control immediately before the Arrange button in OBS, TikTok, Desktop and Big Studio.
- Default to **locked**. Remember the preference across studio switches and restarts, including when "Always start in Arrange mode" is enabled.
- The setting can be chosen before entering Arrange. Changing it does not automatically enter or leave Arrange.
- With Arrange enabled and movement locked, clicking an element selects it and opens its styling inspector. Holding or dragging that element cannot move it.
- Unlocking restores deliberate dragging, resizing, nudging and placement editing from beta 15.

Use one shared preference/control implementation so the four studios cannot drift. The lock is an editor preference, not a saved transform or a change to the live Desktop HUD's separate operating-system window lock.

### Locked state

1. Keep role hit testing, hover/selection outlines, the element picker and styling controls available for native, declarative and compiled SDK themes.
2. Return after selection before starting a movement gesture. Block drag, resize handles, keyboard nudges and Arrange gesture history actions that would replay geometry.
3. Hide or disable numeric placement/reset controls and authored SDK geometry controls. Do not hide unrelated styling controls such as color, typography, visibility, borders or material appearance.
4. Show an unobtrusive "Movement locked — click to style" indication in the reserved Arrange toolbar. Hide resize affordances and remove movement cursor/instruction hints while locked.
5. If locking during a pending/active gesture, cancel it, restore its starting placement and remove pending capture/listeners/history callbacks. Preserve selection.
6. Protect editing inside inputs, menus and color pickers. Keep ordinary text-field Undo/Redo available; do not treat it as canvas movement.

The lock prevents direct geometry edits through Arrange. It does not freeze playback animations. Intentional typography, content and visibility edits may change the theme's natural layout; source/advanced CSS editing remains an explicit authoring action.

### Implementation

- Add a shared persisted preference hook with same-window and cross-window updates.
- Pass the lock explicitly into `ArrangeCanvas` and `ContextualThemeEditor`; use a safe locked default for callers that omit it.
- Gate geometry at the gesture/command handlers, not only by hiding buttons or adding CSS.
- Apply the same restriction to the focused shared inspector's geometry controls; preserve normal styling access.
- Reuse studio button/toggle styles, accessible names, keyboard focus states and lock icons.

Primary files: `src/components/dashboard/OverlayStudio.tsx`, `src/big-studio/BigStudio.tsx`, `ArrangeCanvas.tsx`, `ContextualThemeEditor.tsx`, `SharedStyleInspector.tsx`, relevant studio CSS, and a shared lock preference/control module.

## 3. Acceptance and verification

- Every new-theme route produces the full SDK Markdown on disk; it survives export/import without losing custom files.
- New theme documentation matches the in-app canonical contract and explains how to use the theme folder with an LLM.
- Updating only SDK documents preserves the compiled component identity; changing runtime TSX/CSS still refreshes the theme.
- In locked Arrange, repeated clicks, long presses, pointer movement, resize attempts and arrow keys do not change saved placement or produce geometry history entries.
- Clicks still open the correct styling panel, including hidden roles selected through the picker.
- Style changes work without clearing selection or silently unlocking movement.
- Locking during a gesture rolls it back cleanly. Unlocking restores drag/resize, Escape cancellation and gesture Undo/Redo.
- The preference is consistent across all four studios, native/SDK themes, preview zoom and app restarts.
- Browser checks verify control placement, locked/unlocked affordances, styled popups and keyboard behavior. Run the relevant theme, sizing/Arrange, authoring/export and popup suites, then TypeScript/frontend build checks.
- If native documentation save behavior changes, run isolated Rust tests without producing an installer.
- Bump release identifiers and SDK export labels to `7.0.0-beta.16` once implementation is ready. Commit/push the completed, verified changes under the existing workflow. Leave the full Tauri build to the user.

## 4. Additional beta 16 findings

Scope is limited to the automatic SDK documents and Arrange movement lock described above.
