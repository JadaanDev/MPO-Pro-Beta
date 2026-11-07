# 7.0.0-beta.15 — Arrange selection and studio controls

Arrange now selects on a normal click without moving the element. The previous immediate pointer capture could retarget the following click to the canvas, where a second selection handler cleared the selection. A movement tolerance of only 0.3 layout pixels also turned small hand movements into edits.

The shared canvas owns selection once, delays pointer capture until deliberate movement (5 screen pixels, 8 for touch), and excludes inspector controls and React portals from canvas gestures. Clicks and small jitter do not edit configuration or create history. Deliberate dragging, resize modes, keyboard nudging, Escape/pointer cancellation and undo remain available. Capture loss or window blur rolls back an active gesture. Hover and selection share semantic-role resolution, including legacy selectors and SDK role aliases, across OBS, TikTok, Desktop and Big Studio.

Arrange resize behavior, element selection, typography, layout policies and shared inspector choices now use a styled studio dropdown with a viewport-positioned body portal. The popup supports arrow keys, Home/End, type-ahead, Enter/Space, Escape and Tab. Selection remains intact while using these controls. Fields, buttons, focus rings and selection outlines use the studio's dark surfaces and lavender accents. The toolbar occupies a reserved area above the preview, so it cannot cover a neighbouring title or artist. These changes preserve saved layer values and theme styling.

History records each gesture's own final snapshot, including rapid keyboard nudges, and cancels pending history callbacks when switching layers or leaving Arrange. Undo retains independently edited properties.

Release identifiers, settings/about screens, diagnostics and SDK export labels are updated to beta 15. The full Tauri build and installer remain for the user to compile manually.

Validation covers theme parity and SDK controls, quick clicks/jitter at 0.25–2x preview zoom with no edits/history, movement thresholds, touch tolerance, pointer-capture loss, dragging, resize modes, keyboard nudges and undo, linked theme refresh, and popup viewport geometry. Browser checks use the isolated fixture in scripts/preview-sizing.cjs: adjacent native and compiled element selection, four SDK studio surfaces, Big preview fitting, deliberate drag/Undo, hidden-element access and keyboard/pointer dropdown selection. These browser/component checks do not establish native Windows pointer/DPI or OBS/TikTok compositor behavior; check those after the manual build.
