# 7.0.0-beta.16 — local SDK contract and Arrange movement lock

Every new or explicitly saved/exported theme receives `MPO-SDK-LLM.md`, the full canonical authoring contract with local IDE/LLM usage instructions, examples, all four studios, semantic roles, sizing, playback timing and a validation checklist. The existing quick start and types remain alongside it. Compiled imports and direct native saves are covered. Author README/source/custom files are preserved; existing folders are not rewritten at startup. Native disk-save failures now propagate rather than publishing a supposedly saved library entry. SDK Markdown and declarations no longer invalidate executable compilation, so documentation refreshes do not remount themes or restart animations.

The Movement locked/unlocked control appears before Arrange in OBS, TikTok, Desktop and Big Studio. It defaults to locked and remembers the preference across studio changes and restarts. Locked Arrange selects roles and opens styling while disabling pointer movement, resizing, nudging, explicit geometry controls and Arrange geometry history. Locking mid-gesture restores its original placement without a history entry. Unlocking restores beta 15 manipulation. Typography, colors, visibility, borders, material settings and intentional advanced source/CSS editing remain available. This editor preference is separate from the live Desktop HUD window lock.

Geometry restrictions are enforced in update handlers as well as control visibility. SDK authored geometry is unavailable while locked, and the shared/Big inspector preserves existing geometry while allowing styling updates. The lock can still be changed for the current session if persistent storage is unavailable.

Validation:

- Theme parity/SDK suites, sizing and Arrange handler tests, beta 16 document/cache/preference tests, popup geometry and media timeline tests.
- TypeScript and Vite frontend production build. Existing chunk-size and Tauri import advisories remain.
- Isolated Rust `authoring_tests`: canonical documentation is written and refreshed while author source/README/quick-start files are preserved; test files use an isolated temporary directory.
- Browser fixture: locked dragging caused no edit/history; unlocking moved the title by 40×20 logical pixels; reloading restored the saved lock preference. Typography stayed editable, explicit placement/resize tools disappeared, and selection worked on all four SDK surfaces. Native selection, hidden geometry and normal appearance controls were also inspected. No native Windows/OBS compositor claim is made from these browser checks.

The full Tauri build and installer are left to the user. No release installer was compiled.
