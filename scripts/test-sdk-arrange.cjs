const esbuild = require("esbuild");
const path = require("node:path");

const source = `
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ContextualThemeEditor, THEME_ELEMENT_LABELS, findThemeElement } from "./src/components/dashboard/ContextualThemeEditor";
import { ArrangeElementPicker } from "./src/components/dashboard/ArrangeElementPicker";
import { DEFAULT_THEME_CONFIG } from "./src/types/themes";
import { presentationEditorConfig, applyPresentationEdit } from "./src/utils/presentationEditorConfig";
import { setVisibility } from "./src/utils/visibility";

const roles = Object.keys(THEME_ELEMENT_LABELS);
assert.equal(roles.length, 11, "Arrange must cover every system role");
const textRoles = new Set(["title", "artist", "album", "themeLabel", "badge", "timestamps", "status"]);
const authoredTypes = { title: "title", artist: "artist", album: "album", themeLabel: "text", badge: "source", status: "status", artwork: "artwork", progress: "progress" };
const declarative = {
  schemaVersion: 1, id: "arrange-declarative", name: "Arrange Declarative",
  elements: Object.entries(authoredTypes).map(([id, type], index) => ({ id, type, x: index, y: index + 1, width: 50, height: 10, visible: true, color: "#abcdef", fontSize: 21 })),
};
const compiled = { ...declarative, id: "arrange-compiled", bundle: { manifest: { schemaVersion: 2, id: "arrange-compiled", name: "Arrange Compiled", version: "1.0.0", targetStudios: ["obs", "tiktok", "desktop", "big"], entryPoint: "Theme.tsx" }, files: { "Theme.tsx": "export default function Theme(){ return null; }" } } };
const config = { ...DEFAULT_THEME_CONFIG, customWidth: 1200, customHeight: 480, elementPositions: { title: { x: -17.25, y: 6.5, scale: 1.35 } } };
const noop = () => {};
const sectionFields = {
  frame: ["Exact border width", "Border color", "Shadow strength", "Card Scale", "Inner Frame Padding", "Background Opacity", "Blur"],
  artwork: ["Artwork glow", "Rotate artwork", "Artwork Size", "Corner Radius", "Border Width"],
  progress: ["Progress thickness", "Progress shape", "Fill color", "Track color", "Use theme fill"],
  indicator: ["Indicator style", "Indicator count", "Indicator height", "Wave", "Dots"],
};
for (const [kind, theme] of [["compiled", compiled], ["declarative", declarative]]) {
  for (const selected of roles) {
    const html = renderToStaticMarkup(React.createElement(ContextualThemeEditor, {
      selected, config, onConfigChange: noop, onCommitHistory: noop, onClose: noop,
      extractedColor: "#112233", customCss: ".keep-existing { color: red; }", onCustomCssChange: noop,
      builtTheme: theme, onUpdateBuiltTheme: noop, onOpenBuilder: noop, surface: "desktop",
    }));
    const check = (text) => assert.ok(html.includes(text), kind + " " + selected + " is missing " + text);
    for (const field of ["Arrange placement", "Horizontal offset", "Vertical offset", "Element scale", "Reset placement", "Element CSS", "Arrange CSS for this layer", ".keep-existing"]) check(field);
    check('data-theme-role=&quot;' + selected + '&quot;');
    assert.ok(/<button[^>]*class="val-badge editable"/.test(html), "Exact placement must be keyboard accessible");
    check('aria-label="Edit horizontal offset:');
    if (textRoles.has(selected)) {
      for (const field of ["Size (px)", "Weight", "Case", "Custom Google font", "Italic", "Reset text style", "HEX color"]) check(field);
    } else for (const field of sectionFields[selected]) check(field);
    if (["artwork", "progress", "indicator"].includes(selected)) check('aria-label="Show ' + THEME_ELEMENT_LABELS[selected] + '"');
    if (selected === "themeLabel") check("Custom text content");
    if (selected === "status") for (const field of ["Playing Status Text", "Paused or Stopped Status Text"]) check(field);
    const hasAuthoredGeometry = kind === "declarative" && selected in authoredTypes;
    assert.equal(html.includes("sdk-authored-layout"), hasAuthoredGeometry, kind + " " + selected + " lost the distinction between layer styling and authored geometry");
    if (hasAuthoredGeometry) for (const field of ["SDK layout geometry", "X Position (%)", "Y Position (%)", "Width (%)", "Height (%)"]) check(field);
    if (kind === "compiled") check("Open Code Studio");
  }
}

const conflictingIds = { ...declarative, elements: [
  { ...declarative.elements[0], id: "artist", type: "title" },
  { ...declarative.elements[1], id: "performer", type: "artist" },
] };
const correctGeometry = renderToStaticMarkup(React.createElement(ContextualThemeEditor, {
  selected: "artist", config, onConfigChange: noop, onClose: noop, extractedColor: null,
  customCss: "", onCustomCssChange: noop, builtTheme: conflictingIds, onUpdateBuiltTheme: noop,
}));
assert.ok(correctGeometry.includes("Artist &lt;artist&gt;"), "Authored geometry must follow the semantic type when an unrelated element ID matches the selected role");

const picker = renderToStaticMarkup(React.createElement(ArrangeElementPicker, { selected: "frame", onSelect: noop }));
const pickerCss = picker.replaceAll("&quot;", '"').replaceAll("&#x27;", "'");
assert.equal((picker.match(/<option /g) || []).length, 12, "Hidden and absent roles must remain selectable");
assert.ok(picker.includes('aria-label="Arrange element"'));
for (const role of roles) {
  assert.ok(picker.includes('value="' + role + '"'), "Missing Arrange option: " + role);
  assert.ok(pickerCss.includes('data-arrange-selected="' + role + '"'), "Missing selected highlight: " + role);
  assert.ok(pickerCss.includes('data-arrange-hovered="' + role + '"'), "Missing hover highlight: " + role);
}
for (const alias of ["artwork-image", "progress-track", "progress-fill", "indicator-bar", "source", "card", "text", "theme-label", "visualizer", "playback-status"]) {
  assert.ok(pickerCss.includes('data-theme-role="' + alias + '"'), "Semantic part has no pointer/highlight target: " + alias);
}

const mount = {};
const node = (role, parent = mount, nativeClass = "") => ({ closest: () => mount, getAttribute: name => name === "data-theme-role" ? role : null, parentElement: parent, matches: selector => selector === nativeClass });
for (const role of roles) assert.equal(findThemeElement(node(role)), role);
for (const [alias, role] of Object.entries({ "artwork-image": "artwork", "progress-track": "progress", "progress-fill": "progress", "indicator-bar": "indicator", source: "badge", card: "frame", text: "themeLabel", "theme-label": "themeLabel", visualizer: "indicator", "playback-status": "status" })) assert.equal(findThemeElement(node(alias)), role, "Semantic selection alias failed: " + alias);
assert.equal(findThemeElement(node("artist", mount, ".mpo-title")), "artist", "Canonical roles must win over class guesses");
assert.equal(findThemeElement(node("host", mount, ".mpo-theme-container")), null, "A transparent SDK host is not the visible frame");
assert.equal(findThemeElement(node(null, node("artwork"))), "artwork", "Nested icons must select their semantic ancestor");
assert.equal(findThemeElement({ closest: () => null }), null);

const original = { ...config, customWidth: 560, customHeight: 130, bigCustomWidth: 1920, bigCustomHeight: 1080 };
const snapshot = JSON.stringify(original);
const view = presentationEditorConfig(original);
assert.equal(view.customWidth, 1920); assert.equal(view.customHeight, 1080);
const edited = applyPresentationEdit(original, current => ({ ...current, customWidth: 2400, customHeight: 900, borderRadius: 42 }));
assert.equal(edited.customWidth, 560); assert.equal(edited.customHeight, 130);
assert.equal(edited.bigCustomWidth, 2400); assert.equal(edited.bigCustomHeight, 900); assert.equal(edited.borderRadius, 42);
const cleared = applyPresentationEdit(original, current => ({ ...current, customWidth: 0, customHeight: 0 }));
assert.equal(cleared.bigCustomWidth, 0); assert.equal(cleared.bigCustomHeight, 0); assert.equal(cleared.customWidth, 560);
const unrelated = applyPresentationEdit(original, current => ({ ...current, opacity: .42 }));
assert.equal(unrelated.bigCustomWidth, 1920); assert.equal(unrelated.bigCustomHeight, 1080);
const automatic = { ...config, customWidth: 777, customHeight: 222, bigCustomWidth: undefined, bigCustomHeight: undefined };
assert.equal(presentationEditorConfig(automatic).customWidth, 0);
assert.equal(applyPresentationEdit(automatic, current => ({ ...current, scale: 1.7 })).bigCustomWidth, undefined);
assert.equal(JSON.stringify(original), snapshot, "Presentation controls mutated the saved overlay configuration");

const visibilityBefore = { ...config, visibilityOverrides: { showTitle: false }, elementCss: ".saved {}" };
const before = JSON.stringify(visibilityBefore);
const shown = setVisibility(visibilityBefore, "showTitle", true);
const hidden = setVisibility(shown, "showArt", false);
assert.equal(shown.showTitle, true); assert.equal(shown.visibilityOverrides.showTitle, true);
assert.equal(hidden.showArt, false); assert.equal(hidden.visibilityOverrides.showArt, false);
assert.equal(hidden.visibilityOverrides.showTitle, true);
assert.deepEqual(hidden.elementPositions, config.elementPositions); assert.equal(hidden.elementCss, ".saved {}");
assert.equal(JSON.stringify(visibilityBefore), before, "Visibility override mutated or discarded existing styling");
console.log("SDK Arrange: all 11 shared editors, authored geometry, role picker/highlights, semantic selection, Big Studio dimension isolation and explicit visibility flags OK");
`;

(async () => {
  const output = await esbuild.build({ stdin: { contents: source, resolveDir: path.resolve(__dirname, ".."), sourcefile: "sdk-arrange.test.tsx", loader: "tsx" }, bundle: true, platform: "node", format: "cjs", write: false, packages: "external", loader: { ".css": "empty" } });
  const mod = { exports: {} };
  new Function("require", "module", "exports", output.outputFiles[0].text)(require, mod, mod.exports);
})().catch(error => { console.error(error); process.exitCode = 1; });
