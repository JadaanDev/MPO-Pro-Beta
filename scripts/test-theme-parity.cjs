const esbuild = require("esbuild");
const path = require("path");
const source = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { THEME_COMPONENTS, THEME_REGISTRY } from "./src/themes/ThemeRegistry";
import { DEFAULT_THEME_CONFIG } from "./src/types/themes";
import { BIG_THEMES } from "./src/big-studio/themes";
import { BigStage } from "./src/big-studio/BigStage";
import { sanitizeBigLayer } from "./src/big-studio/layers";
if (BIG_THEMES.length !== 12 || new Set(BIG_THEMES.map(theme=>theme.id)).size !== 12 || new Set(BIG_THEMES.map(theme=>theme.className)).size !== 12) throw Error("Big Studio requires twelve distinct presentation layouts");
const bigMedia = {title:"Sample track",artist:"Sample artist",album_title:"Sample album",status:"Playing",position_ms:5000,duration_ms:30000,app_name:"Sample player",has_art:false,art_timestamp:0,updated_at:0};
for (const theme of BIG_THEMES) {
  const html = renderToStaticMarkup(React.createElement(BigStage,{theme,media:bigMedia,artUrl:"",scale:1,extractedColor:"#ff00aa",config:{...DEFAULT_THEME_CONFIG,autoAlbumColor:true,showVisualizer:true,visualizerType:"wave",visualizerCount:7,visualizerHeight:28,visualizerColor:"#00ff88",highContrast:true,spinningVinyl:true,artGlow:true,progressHeight:6}}));
  for (const text of ["Sample track","Sample artist",theme.label,"big-theme-"+theme.id,"style-wave","mpo-vis-bar","mpo-progress-fill","--big-accent:#ff00aa","high-contrast","spinning-vinyl","mpo-theme-effect-boundary"]) if (!html.includes(text)) throw Error(theme.name + " is missing " + text);
}
// Saved overlay presets must never turn a presentation into a tiny 560x130 card.
const legacySize = {...DEFAULT_THEME_CONFIG, customWidth:560, customHeight:130, artSize:200};
const legacyStage = renderToStaticMarkup(React.createElement(BigStage,{theme:BIG_THEMES[3],media:bigMedia,artUrl:"",config:legacySize}));
if (/width:\s*560px\s*!important|height:\s*130px\s*!important/.test(legacyStage)) throw Error("Overlay dimensions are constraining the Big Studio stage");
if (!legacyStage.includes("width: 200px !important")) throw Error("Big Studio artwork customization was lost");
if (legacySize.customWidth !== 560 || legacySize.customHeight !== 130) throw Error("Big Studio mutated the saved layer");
const largeConfig = {...legacySize, bigCustomWidth:2400, bigCustomHeight:1500, artSize:720, progressHeight:42, frameBorderWidth:35, visualizerCount:30, visualizerHeight:90, showVisualizer:true, typography:{title:{size:250}}};
const largeStage = renderToStaticMarkup(React.createElement(BigStage,{theme:BIG_THEMES[3],media:bigMedia,artUrl:"",config:largeConfig}));
for (const rule of ["width: 2400px !important", "height: 1500px !important", "width: 720px !important", "height: 42px !important", "border-width: 35px !important", "font-size: 250px !important"]) if (!largeStage.includes(rule)) throw Error("Big Studio capped " + rule);
if ((largeStage.match(/class="mpo-vis-bar"/g) || []).length !== 30) throw Error("Big Studio capped visualizer bars");
const brandedStage=renderToStaticMarkup(React.createElement(BigStage,{theme:BIG_THEMES[0],media:bigMedia,artUrl:"",config:{...DEFAULT_THEME_CONFIG,bigBrandName:"Example Brand",bigBrandLogo:"data:image/png;base64,YQ=="}}));
if (!brandedStage.includes("Example Brand") || !brandedStage.includes("data:image/png;base64,YQ==")) throw Error("Big Studio branding is not rendered");
if (legacyStage.includes("Example Brand")) throw Error("Branding leaked into an existing layer");
const savedBrand = sanitizeBigLayer({id:"old",name:"Saved",themeId:"afterglow",config:{...DEFAULT_THEME_CONFIG,bigBrandName:"Example Brand",bigBrandLogo:"data:image/png;base64,YQ=="}});
if (savedBrand?.config.bigBrandName !== "Example Brand" || savedBrand?.config.bigBrandLogo !== "data:image/png;base64,YQ==") throw Error("Branding was lost on saved layer import");
for (const theme of BIG_THEMES) { const html=renderToStaticMarkup(React.createElement(BigStage,{theme,media:bigMedia,artUrl:"",config:{...DEFAULT_THEME_CONFIG,bigBrandName:"Example Brand",bigBrandLogo:"data:image/png;base64,YQ=="}})); if (!html.includes("Example Brand") || !html.includes("data:image/png;base64,YQ==")) throw Error("Branding is missing from "+theme.name); }
console.log("Twelve unique Big Studio layouts, branding and customizer options OK");
import { BigStudio } from "./src/big-studio/BigStudio";
const bigStudioHtml = renderToStaticMarkup(React.createElement(BigStudio, {media:bigMedia, artUrl:"", extractedColor:"#ff00aa"}));
for (const expected of ["Themes &amp; Layers", "Preview", "Styling", "Big Studio", "Arrange", "Branding", "Brand name", "Visible elements", "Track title", "Playback status"]) {
  if (!bigStudioHtml.includes(expected)) throw Error("BigStudio missing unified studio control: " + expected);
}
console.log("BigStudio unified workspace & Preview ON/OFF toggle OK");
import { isTimelineSeek } from "./src/hooks/useScrubber";
const sample = (position, timestamp, status = "Playing") => ({ position, timestamp, status });
const prev = sample(10000, 100000);
for (const next of [sample(10000, 101000), sample(10500, 101000), sample(12000, 101000), sample(10000, 101200)]) {
  if (isTimelineSeek(prev, next)) throw Error("Browser timeline jitter was mistaken for a seek");
}
if (!isTimelineSeek(prev, sample(3000, 101000)) || !isTimelineSeek(prev, sample(25000, 101000))) throw Error("Real backwards and forwards seeks must resynchronize");
if (isTimelineSeek(prev, sample(10000, 101000, "Paused"))) throw Error("Pause must not be classified as a seek");
console.log("Browser timeline jitter and seek classification OK");
import { generateEffectiveThemeCss } from "./src/utils/ThemeStyleEngine";
import { browserSourceUrl, recommendedSourceSize, sourceResolutionScale } from "./src/utils/browserSource";
import { themeEffectSize } from "./src/utils/themeEffects";
const sourceSize = recommendedSourceSize(480, 146, 1.15);
if (sourceSize.width !== 1252 || sourceSize.height !== 484) throw Error("2x browser-source dimensions or scaled effect gutters are incorrect");
for (const [scale, width, height] of [[0.5,304,137],[1,544,210],[3,1632,630]]) {
  const bounds = themeEffectSize(480,146,scale);
  const source = recommendedSourceSize(480,146,scale);
  if (bounds.width !== width || bounds.height !== height || source.width !== bounds.width*2 || source.height !== bounds.height*2) throw Error("Preview, native and browser-source paint bounds disagree at scale " + scale);
}
const noShadowCss = generateEffectiveThemeCss({...DEFAULT_THEME_CONFIG,frameShadow:0});
if (!noShadowCss.includes("--mpo-frame-shadow: none")) throw Error("Disabling the frame shadow must also disable SDK shadows");
const sourceUrl = new URL(browserSourceUrl("127.0.0.1:4849", "vertical", "layer with & symbol"));
if (sourceUrl.searchParams.get("layer") !== "layer with & symbol" || sourceUrl.searchParams.get("quality") !== "2" || sourceUrl.searchParams.get("mode") !== "vertical") throw Error("Browser source URL must target the selected layer and 2x rendering");
if (sourceResolutionScale(null) !== 1 || sourceResolutionScale("2") !== 2 || sourceResolutionScale("99") !== 1) throw Error("Existing browser URLs must keep their original rendering scale");
console.log("Layer-specific browser-source URLs, 2x sizing and legacy compatibility OK");
import { ContextualThemeEditor, findThemeElement } from "./src/components/dashboard/ContextualThemeEditor";
const mount = {};
const fakeTitle = {closest:()=>mount, matches:(selector)=>selector === ".mpo-title", parentElement:mount};
if (findThemeElement(fakeTitle as any) !== "title") throw Error("Big Studio or overlay Arrange must recognize elements inside the preview mount");
const textEditor = renderToStaticMarkup(React.createElement(ContextualThemeEditor,{selected:"title",config:{...DEFAULT_THEME_CONFIG,titleSize:22,titleColor:"#aabbcc"},onConfigChange:()=>{},onCustomCssChange:()=>{},onClose:()=>{},customCss:"",extractedColor:null}));
if (!textEditor.includes('value="22"') || !textEditor.toLowerCase().includes('value="#aabbcc"')) throw Error("Arrange must show previously saved text styling");
if (textEditor.includes("Title Font Size") || !textEditor.includes("Custom Google font")) throw Error("Arrange text controls should be consolidated without losing custom fonts");
console.log("Consolidated text editor and saved styles OK");
import { LayerCard } from "./src/components/dashboard/LayerCard";
const commonCardProps = {layer:{id:"one",name:"Example layer",themeId:"desktop-air",format:"horizontal",config:{...DEFAULT_THEME_CONFIG,scale:1,customWidth:500,useSeparateDesktopSize:true,desktopCustomWidth:360,desktopScale:.8}},active:true,copied:false,canDelete:false,editing:false,editName:"",onEditName:()=>{},onSelect:()=>{},onRename:()=>{},onSaveRename:()=>{},onCancelRename:()=>{},onCopy:()=>{},onDuplicate:()=>{},onDelete:()=>{},onMenu:()=>{}};
for (const desktop of [false,true]) {
  const html=renderToStaticMarkup(React.createElement(LayerCard,{...commonCardProps,desktop}));
  for (const expected of ["unified-layer-card is-active", "unified-layer-active", "Rename Example layer", "Copy URL for Example layer", "Duplicate Example layer", "Delete Example layer", "disabled"]) if (!html.includes(expected)) throw Error("Shared layer card missing " + expected);
  if (desktop && (!html.includes("360px") || !html.includes("80%"))) throw Error("Desktop card must show effective desktop dimensions");
  if (!desktop && (!html.includes("500px") || !html.includes("100%"))) throw Error("Streaming card must show base dimensions");
}
const presentationCard = renderToStaticMarkup(React.createElement(LayerCard,{...commonCardProps,presentation:true,themeName:"Afterglow",onExport:()=>{}}));
for (const expected of ["Afterglow", "Stage", "Export Example layer"]) if (!presentationCard.includes(expected)) throw Error("Presentation layer card missing " + expected);
console.log("Shared layer cards and independent desktop dimensions OK");
import { setVisibility } from "./src/utils/visibility";
import { desktopEditorConfig, applyDesktopEdit } from "./src/utils/desktopEditorConfig";
import { DesktopHudStudio } from "./src/components/dashboard/DesktopHudStudio";
import { galleryMatchesSurface } from "./src/components/dashboard/OverlayStudio";
for (const active of ["obs", "tiktok", "desktop"]) {
  for (const category of ["obs", "tiktok", "desktop"]) {
    const themes = Object.values(THEME_REGISTRY).filter(theme => galleryMatchesSurface(theme.surface, category, active));
    if (themes.length !== 10 || themes.some(theme => theme.surface !== category)) throw Error(active + " cannot browse " + category + " collection");
  }
  if (Object.values(THEME_REGISTRY).filter(theme => galleryMatchesSurface(theme.surface, "all", active)).length !== 44) throw Error("All collection missing themes");
}
console.log("All studios can browse each theme source OK");
import { DEFAULT_DESKTOP_LAYERS, sanitizeLayers, sanitizeDesktopLayers } from "./src/types/layers";
const oldLayer = { id: "existing-obs-layer", name: "Existing", format: "horizontal", themeId: "aero-glass", config: { transitionStyle: "zoom-depth", transitionDurationMs: 735, accentColor: "#123456" }, customCss: ".existing{}", createdAt: 1, updatedAt: 2 };
for (const migrated of [sanitizeLayers([oldLayer])[0], sanitizeDesktopLayers([oldLayer])[0]]) {
  if (migrated.id !== oldLayer.id || migrated.themeId !== oldLayer.themeId || migrated.config.transitionDurationMs !== 735 || migrated.config.accentColor !== "#123456" || migrated.customCss !== oldLayer.customCss) throw Error("Existing production layer was not preserved");
}
console.log("Existing production layer and styling compatibility OK");
import { TRACK_TRANSITION_OPTIONS, normalizeTransitionConfig, transitionVariants } from "./src/components/common/TrackTransitionWrapper";
import { TransitionTimingFields } from "./src/components/dashboard/TransitionTimingFields";
if (TRACK_TRANSITION_OPTIONS.length !== 8 || new Set(TRACK_TRANSITION_OPTIONS.map(item => item.id)).size !== 8) throw Error("Transition collection must contain eight unique options");
const variants = TRACK_TRANSITION_OPTIONS.map(item => JSON.stringify(transitionVariants(item.id, "left", "standard")));
if (new Set(variants).size !== 8) throw Error("Transition animations must be distinct");
for (const [oldStyle, expected] of [["zoom-depth", "focus"], ["push", "glide"], ["flip-3d", "orbit"], ["slide-up", "glide"]]) {
  const mapped = normalizeTransitionConfig({transitionStyle: oldStyle, transitionIntensity: "dramatic"});
  if (mapped.style !== expected || mapped.intensity !== "dramatic") throw Error("Saved transition mapping failed for " + oldStyle);
}
const timingHtml = renderToStaticMarkup(React.createElement(TransitionTimingFields, {config:{...DEFAULT_THEME_CONFIG, transitionDurationMs:50000, transitionDelayMs:25000}, onConfigChange:()=>{}}));
if (!timingHtml.includes('value="50000"') || !timingHtml.includes('value="25000"') || timingHtml.includes('max=')) throw Error("Timing fields must allow values beyond old limits");
console.log("Eight transitions, saved-style mapping and unrestricted timing fields OK");
for (const surface of ["obs", "tiktok", "desktop"]) {
  const collection = Object.values(THEME_REGISTRY).filter(theme => theme.surface === surface);
  if (collection.length !== 10) throw Error(surface + " must have 10 designs, got " + collection.length);
  if (new Set(collection.map(theme => theme.name)).size !== 10) throw Error(surface + " contains duplicate design names");
}
const visibilityKeys = ["showTitle", "showArtist", "showAlbum", "showArt", "showBadge", "showProgress", "showTimestamps", "showPlaybackStatus", "showVisualizer"];
for (const key of visibilityKeys) {
  const before = {...DEFAULT_THEME_CONFIG, showTimestamps:true, showPlaybackStatus:false};
  const after = setVisibility(before, key, !before[key]);
  for (const other of Object.keys(before)) if (other !== key && before[other] !== after[other]) throw Error(key + " altered " + other);
}
const legacyDesktop = {...DEFAULT_THEME_CONFIG, useSeparateDesktopSize:true, scale:1, customWidth:500, customHeight:160, desktopScale:.8, desktopCustomWidth:360, desktopCustomHeight:100};
if (desktopEditorConfig(legacyDesktop).customWidth !== 360) throw Error("desktop override not displayed");
const editedDesktop = applyDesktopEdit(legacyDesktop, c => ({...c, customWidth:400}));
if (editedDesktop.desktopCustomWidth !== 400 || editedDesktop.customWidth !== 500 || editedDesktop.desktopScale !== .8) throw Error("desktop width edit changed unrelated values");
const disabledOverride = applyDesktopEdit(legacyDesktop, c => ({...c, useSeparateDesktopSize:false}));
if (disabledOverride.useSeparateDesktopSize || disabledOverride.customWidth !== 500 || disabledOverride.desktopCustomWidth !== 360) throw Error("desktop override toggle changed sizes");
const media = {title:"Track test",artist:"Artist test",album_title:"Album test",status:"Playing",position_ms:1000,duration_ms:120000,app_name:"Player test",has_art:false,art_timestamp:0,updated_at:0};
const desktopHtml = renderToStaticMarkup(React.createElement(DesktopHudStudio, {
  desktopLayer: DEFAULT_DESKTOP_LAYERS[0], desktopLayers: DEFAULT_DESKTOP_LAYERS,
  activeDesktopLayerId: DEFAULT_DESKTOP_LAYERS[0].id, updateDesktopLayer: () => {}, media, artUrl: "", extractedColor: null
}));
for (const expected of ["Desktop Overlay", "Visible elements", "Track title", "Playback status", "Preview", "Arrange"]) {
  if (!desktopHtml.includes(expected)) throw Error("Desktop studio missing shared control: " + expected);
}
if (desktopHtml.includes("Fit Size")) throw Error("Desktop studio still has manual fit control");
if (desktopHtml.includes(">My themes<")) throw Error("Obsolete layer-based theme library is visible");
console.log("Desktop studio: shared workspace and independent switches OK");
for (const [name, Theme] of Object.entries(THEME_COMPONENTS)) {
  for (const format of ["horizontal", "vertical"]) {
    const config = {...DEFAULT_THEME_CONFIG, showTitle:true, showArtist:true, showAlbum:true, showArt:true, showBadge:true, showVisualizer:true, showProgress:true, visualizerCount:5, visualizerHeight:32, autoAlbumColor:false};
    const render = (c) => renderToStaticMarkup(React.createElement(Theme, {media, artUrl:"", config:c, format}));
    const html = render(config);
    if (THEME_REGISTRY[name]?.surface && render({...config, showThemeLabel:false}).includes("collection-kicker")) throw Error(name + " theme text did not hide");
    const typeCss = generateEffectiveThemeCss({...config, showThemeLabel:false, typography:{album:{color:"#123456",size:24,weight:700,italic:true,transform:"uppercase"}}}, format);
    for (const rule of [".mpo-theme-label { display: none", "font-size: 24px", "font-weight: 700", "font-style: italic", "text-transform: uppercase", "color: #123456"]) if (!typeCss.includes(rule)) throw Error(name + " missing typography control: " + rule);
    const customTextHtml = render({...config, themeLabel:"MY CUSTOM LABEL", showPlaybackStatus:true, themePlayingLabel:"MY PLAYING STATUS"});
    if (!customTextHtml.includes("MY CUSTOM LABEL") || !customTextHtml.includes("MY PLAYING STATUS")) throw Error(name + " does not render custom theme labels in " + format);
    if (!html.includes("Album test") || !html.includes("Animated playback indicator")) throw Error(name + " missing album or indicator in " + format);
    const vis = html.match(/class="mpo-universal-visualizer[^>]*>(.*?)<\\/div>/)?.[1] || "";
    if ((vis.match(/<span/g)||[]).length !== 5) throw Error(name + " indicator count in " + format);
    if (render({...config, showVisualizer:false}).includes("mpo-universal-visualizer")) throw Error(name + " indicator did not hide");
    if (render({...config, showAlbum:false}).includes("Album test")) throw Error(name + " album did not hide");
    if (!render({...config, showProgress:false, showTimestamps:true}).includes("mpo-universal-timestamps")) throw Error(name + " timestamps tied to progress");
    if (render({...config, showProgress:true, showTimestamps:false}).includes("mpo-universal-timestamps")) throw Error(name + " timestamps did not hide");
    if (!render({...config, showBadge:false, showVisualizer:false, showPlaybackStatus:true}).includes("mpo-playback-status")) throw Error(name + " status tied to badge or indicator");
    const css = generateEffectiveThemeCss({...config, artistWeight:700, artBorder:0, showTimestamps:false, frameBorderWidth:3, frameBorderColor:"#123456"}, format);
    const sizedArtCss = generateEffectiveThemeCss({...config, artSize:90}, format);
    if (!sizedArtCss.includes("--collection-art-size: 90px") || !sizedArtCss.includes("width: min(90px, 100%)")) throw Error(name + " missing artwork grid sizing");
    for (const expected of [".mpo-album", ".mpo-art", ".mpo-feed-wrapper", ".desktop-overlay-container", ".preview-canvas-scope", "font-weight: 700", "border: 0px", "border-width: 3px", "border-color: #123456", ".apple-timestamps-row"]) if (!css.includes(expected)) throw Error(name + " missing style: " + expected);
  }
  console.log(name + ": horizontal and vertical OK");
}
`;
(async () => {
  const fs = require("fs");
  const cssVariants = new Set();
  for (const surface of ["obs", "tiktok", "desktop"]) {
    const root = path.resolve(__dirname, "../src/themes/collection");
    const designs = fs.readdirSync(root).filter(name => name.startsWith(surface + "-") && fs.statSync(path.join(root, name)).isDirectory());
    if (designs.length !== 10) throw Error(surface + " must have ten separate design directories");
    for (const design of designs) {
      for (const file of ["index.tsx", "style.css"]) if (!fs.existsSync(path.join(root, design, file))) throw Error(design + " missing " + file);
      const css = fs.readFileSync(path.join(root, design, "style.css"), "utf8").replaceAll(`.design-${design}`, ".design");
      if (cssVariants.has(css)) throw Error(design + " duplicates another design stylesheet");
      cssVariants.add(css);
    }
  }
  const output = await esbuild.build({ stdin: { contents: source, resolveDir: path.resolve(__dirname, ".."), sourcefile: "theme-parity.tsx", loader: "tsx" }, bundle: true, platform: "node", format: "cjs", write: false, packages: "external", loader: { ".css": "empty", ".md": "text" } });
  const mod = { exports: {} };
  new Function("require", "module", "exports", output.outputFiles[0].text)(require, mod, mod.exports);
})().catch(error => { console.error(error); process.exitCode = 1; });
