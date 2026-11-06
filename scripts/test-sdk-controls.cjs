const esbuild = require("esbuild");
const path = require("path");
const source = `
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {inferSdkRole, normalizeSdkTheme, sdkBridgeCss, sdkRoleVisible} from "./src/theme-sdk/compiler/sdkBridge";
import {SdkThemeSupplement} from "./src/theme-sdk/compiler/SdkThemeSupplement";
import {ThemeRenderer} from "./src/theme-sdk/ThemeRenderer";
import {generateEffectiveThemeCss} from "./src/utils/ThemeStyleEngine";
import {DEFAULT_THEME_CONFIG} from "./src/types/themes";
import {MOCK_MEDIA_STATE} from "./src/types/media";
import {generateBundleFromDeclarative} from "./src/theme-sdk/templates/bundleGenerator";
import {compileThemeBundle} from "./src/theme-sdk/compiler/themeCompiler";
import {withBundleAuthoringFiles} from "./src/theme-sdk/templates/bundleAuthoring";
import {exportThemePackageJson, parseThemePackageJson} from "./src/theme-sdk/templates/bundleStorage";
import {BuiltThemeMount, builtThemeSize} from "./src/theme-sdk/BuiltThemeMount";
import {ContextualThemeEditor, findThemeElement} from "./src/components/dashboard/ContextualThemeEditor";

const check = (value, message) => { if (!value) throw Error(message); };
for (const [name, role] of Object.entries({"ios-card":"frame","ios-artwork-container":"artwork","ios-artwork-img":"artwork-image","ios-track-title":"title","ios-track-subtitle":"artist","track-album":"album","ios-scrubber-track":"progress","ios-scrubber-fill":"progress-fill","ios-route-name":"badge","ios-status-badge":"status","ios-timestamps":"timestamps","ios-equalizer":"indicator","ios-eq-bar":"indicator-bar","glass-title":"title","art-wrapper":"artwork","app-badge":"badge","status-pill":"status","track-artist":"artist"})) {
  check(inferSdkRole(name) === role, "Legacy SDK role missing: " + name);
}
check(inferSdkRole("ios-track-title", "album") === "album", "Explicit author role was overridden");
check(inferSdkRole("arbitrary", "card") === "frame", "Card role alias was not normalized");

// Small DOM fixture exercises the actual normalizer against the structure of
// an imported iOS theme, including nested artwork, combined metadata, and a
// route pill that contains an independently controlled status.
class Node {
  tagName = "DIV"; parentElement = null; children = []; attributes = new Map(); text = "";
  constructor(className = "", text = "", children = []) { this.className = className; this.text = text; this.children = children; for (const child of children) child.parentElement = this; }
  get firstElementChild() { return this.children[0] || null; }
  get textContent() { return this.children.length ? this.children.map(child => child.textContent).join("") : this.text; }
  set textContent(value) { this.text = value; this.children = []; }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  hasAttribute(name) { return this.attributes.has(name); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
  matches(selector) { return selector.split(",").some(part => { const s = part.trim(); const match = s.match(/^\\[([^=*]+)(\\*?)=(?:"([^"]*)")\\]$/); if (match) { const value = match[1] === "class" ? this.className : this.getAttribute(match[1]); return match[2] ? value?.includes(match[3]) : value === match[3]; } const presence = s.match(/^\\[([^\\]]+)\\]$/); return presence ? this.hasAttribute(presence[1]) : s === "*"; }); }
  closest(selector) { for (let node = this; node; node = node.parentElement) if (node.matches(selector)) return node; return null; }
  querySelectorAll(selector) { return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}
const image = new Node("ios-artwork-img"); image.tagName = "IMG";
const artFrame = new Node("ios-artwork-frame", "", [image]);
const artwork = new Node("ios-artwork-container", "", [artFrame]);
const artist = new Node("ios-track-subtitle", MOCK_MEDIA_STATE.artist + " • " + MOCK_MEDIA_STATE.album_title);
const badge = new Node("ios-route-name", "Spotify");
const status = new Node("ios-status-badge", "NOW PLAYING");
const routePill = new Node("ios-audio-route-pill", "", [badge, status]);
const fill = new Node("ios-scrubber-fill");
const track = new Node("ios-scrubber-track", "", [fill]);
const timestamps = new Node("ios-timestamps", "0:00");
const scrubber = new Node("ios-scrubber-section", "", [track, timestamps]);
const frame = new Node("ios-card ios-desktop-hud-card", "", [artwork, artist, routePill, scrubber]);
const wrapper = new Node("custom-theme-canvas ios-lockscreen-player", "", [frame]);
const host = new Node("mpo-sdk-host", "", [wrapper]);
const normalized = normalizeSdkTheme(host, MOCK_MEDIA_STATE, {themePlayingLabel:"LIVE"});
check(normalized.frame === frame, "Transparent canvas was mistaken for the visible frame");
check(wrapper.getAttribute("data-theme-sdk-wrapper") === "true", "Imported canvas clip was not normalized");
check(artwork.getAttribute("data-theme-role") === "artwork" && !artFrame.hasAttribute("data-theme-role"), "Nested artwork receives duplicate sizing/offsets");
check(image.getAttribute("data-theme-role") === "artwork-image", "Artwork spinning target was lost");
check(!routePill.hasAttribute("data-theme-role") && badge.getAttribute("data-theme-role") === "badge" && status.getAttribute("data-theme-role") === "status", "Source badge and status cannot be toggled independently");
check(!scrubber.hasAttribute("data-theme-role") && track.getAttribute("data-theme-role") === "progress" && timestamps.getAttribute("data-theme-role") === "timestamps", "Progress and timestamps cannot be toggled independently");
check(track.getAttribute("data-theme-part") === "progress-track", "Track appearance controls cannot find imported progress track");
check(artist.textContent === MOCK_MEDIA_STATE.artist, "Combined artist/album does not have independent controls");
check(status.textContent === "LIVE", "Custom status label was not applied");
normalizeSdkTheme(host, MOCK_MEDIA_STATE, {});
check(status.textContent === "NOW PLAYING", "Clearing a label did not restore the author's original text");
check(!frame.className.includes("mpo-card"), "Compatibility mapping injected legacy card layout classes");
const richIcon = new Node(); richIcon.tagName = "SVG";
const richText = new Node("", "Playing");
const richStatus = new Node("status-pill", "", [richIcon, richText]);
const repeatedTitle = new Node("", "Track"); repeatedTitle.setAttribute("data-theme-role", "title");
const titleGroup = new Node("", "", [repeatedTitle]); titleGroup.setAttribute("data-theme-role", "title");
const richFrame = new Node("custom-theme-card", "", [richStatus, titleGroup]);
const richHost = new Node("", "", [richFrame]);
normalizeSdkTheme(richHost, MOCK_MEDIA_STATE, {themePlayingLabel:"ON AIR"});
check(richStatus.children[0] === richIcon && richText.textContent === "ON AIR", "Rich status label discarded its icon or ignored custom text");
check(!repeatedTitle.hasAttribute("data-theme-role") && repeatedTitle.getAttribute("data-theme-sdk-nested-role") === "title", "Nested explicit roles receive duplicate placement transforms");
normalizeSdkTheme(richHost, MOCK_MEDIA_STATE, {});
check(richText.textContent === "Playing", "Rich status label did not restore its authored text");
titleGroup.removeAttribute("data-theme-role");
normalizeSdkTheme(richHost, MOCK_MEDIA_STATE, {});
check(repeatedTitle.getAttribute("data-theme-role") === "title", "An independent role was not restored after removing its parent role");
const hiddenCard = new Node("ios-card", "", [new Node("track-album", "Hidden album")]);
const activeCard = new Node("ios-card", "", [new Node("track-title", "Active title")]);
activeCard.offsetWidth = 620; activeCard.offsetHeight = 240; activeCard.getClientRects = () => [{}];
const switched = normalizeSdkTheme(new Node("", "", [hiddenCard, activeCard]), MOCK_MEDIA_STATE, {});
check(switched.frame === activeCard && !switched.roles.has("album"), "An inactive surface card absorbed the active card's missing slots");
const fragmentStyle = new Node(); fragmentStyle.tagName = "STYLE";
const fragmentContent = new Node("arbitrary-content");
check(normalizeSdkTheme(new Node("", "", [fragmentStyle, fragmentContent])).frame === fragmentContent, "Fragment style tag was mistaken for the frame");
check(!sdkRoleVisible("title", false, {}) && sdkRoleVisible("title", false, {visibilityOverrides:{showTitle:true}}), "Explicit visibility cannot reveal an authored hidden role");
const revealCss = sdkBridgeCss({visibilityOverrides:{showTitle:true},typography:{title:{weight:850,italic:true}},artRadius:2}, ".sdk-test");
for(const expected of ['data-theme-default-hidden','display: revert !important','data-theme-display="flex"','font-weight: inherit !important','font-style: inherit !important','data-theme-part="artwork-clip"','border-radius: 2px']) check(revealCss.includes(expected),"Full Arrange bridge missing: "+expected);

const config = {...DEFAULT_THEME_CONFIG,customWidth:900,customHeight:360,framePadding:22,frameBorderWidth:7,frameBorderColor:"#112233",frameShadow:0,titleTransform:"uppercase",titleGlow:true,artSize:190,progressHeight:9,progressFillColor:"#22ff44",progressTrackColor:"#332211",progressShape:"square",visualizerCount:17,visualizerType:"dots",visualizerHeight:35,visualizerColor:"#ff4455",showPlaybackStatus:true,showTimestamps:false,themeLabel:"LIVE SET",typography:{title:{color:"#aabbcc",font:"Georgia",size:41,weight:800,italic:true},artist:{color:"#123456",size:21}},elementPositions:{title:{x:20,y:-8,scale:1.4}}};
const css = generateEffectiveThemeCss(config,"horizontal","#445566",undefined,".sdk-test") + sdkBridgeCss(config,".sdk-test");
for (const expected of ['data-theme-role="frame"','data-theme-role="title"','data-theme-role="artist"','data-theme-part="progress-track"','data-theme-role="progress-fill"','data-theme-role="indicator-bar"','font-size: 41px','font-family: "Georgia"','font-weight: 800','font-style: italic','text-transform: uppercase','translate: 20px -8px','scale: 1.4','border-width: 7px','padding: 22px','--mpo-frame-shadow: none','height: 9px','#22ff44','#332211','#ff4455','width: 100% !important; max-width: none','height: 100% !important; max-height: none','overflow: visible !important']) check(css.includes(expected), "Shared SDK control missing: " + expected);
const defaultBridge = sdkBridgeCss({},".sdk-test");
check(!defaultBridge.includes("max-width: none") && !defaultBridge.includes("--mpo-title-size:"), "Unedited SDK bridge overwrites authored defaults");

for (const surface of ["obs","tiktok","desktop","big"]) {
  const definition = {schemaVersion:1,id:"all-controls",name:"All Controls",elements:[{id:"title",type:"title",x:10,y:10,width:70,height:20,visible:true,color:"#ffffff"}]};
  const html = renderToStaticMarkup(React.createElement(ThemeRenderer,{theme:definition,surface,media:MOCK_MEDIA_STATE,artUrl:"",config}));
  for (const expected of ['data-theme-role="frame"','data-theme-role="title"','data-theme-role="album"','data-theme-role="badge"','data-theme-role="status"','data-theme-role="indicator"','style-dots','LIVE SET','font-size: 41px']) check(html.includes(expected),surface + " lost SDK controls: " + expected);
  check((html.match(/data-theme-role="indicator-bar"/g)||[]).length === 17,surface + " visualizer count is not editable");
}
const supplied = new Set(["album","badge","status","timestamps","themeLabel"]);
const supplement = renderToStaticMarkup(React.createElement(SdkThemeSupplement,{roles:supplied,media:MOCK_MEDIA_STATE,config:{...config,showVisualizer:false},currentTime:"0:00",durationTime:"3:00"}));
check(!supplement.includes('data-theme-role="album"') && !supplement.includes('data-theme-role="status"'), "Supplement duplicates author-defined metadata");
const minimalConfig = {...DEFAULT_THEME_CONFIG,showVisualizer:false,showTimestamps:false,showAlbum:false,showBadge:false,showPlaybackStatus:false};
const minimal = renderToStaticMarkup(React.createElement(SdkThemeSupplement,{roles:new Set(),media:MOCK_MEDIA_STATE,config:minimalConfig,currentTime:"0:00",durationTime:"3:00"}));
check(!minimal.includes('data-theme-role="title"') && !minimal.includes('data-theme-role="artwork"'), "Untouched minimal themes gained unwanted base slots");
const enabledMissing = renderToStaticMarkup(React.createElement(SdkThemeSupplement,{roles:new Set(),media:MOCK_MEDIA_STATE,artUrl:"data:image/png;base64,YQ==",config:{...minimalConfig,visibilityOverrides:{showTitle:true,showArtist:true,showArt:true,showProgress:true}},currentTime:"0:00",durationTime:"3:00"}));
for(const role of ["title","artist","artwork","progress"]) check(enabledMissing.includes('data-theme-role="'+role+'"'),"Arrange cannot enable omitted base role: "+role);
const hiddenDefinition = {schemaVersion:1,id:"hidden-arrange",name:"Hidden Arrange",elements:[{id:"hidden-title",type:"title",x:0,y:0,width:90,height:20,visible:false,fontWeight:300}]};
const hiddenHtml = renderToStaticMarkup(React.createElement(ThemeRenderer,{theme:hiddenDefinition,surface:"obs",media:MOCK_MEDIA_STATE,artUrl:"",config:minimalConfig}));
check(!hiddenHtml.includes('data-theme-type="title"'),"Authored hidden title was shown before an explicit edit");
const shownHtml = renderToStaticMarkup(React.createElement(ThemeRenderer,{theme:hiddenDefinition,surface:"obs",media:MOCK_MEDIA_STATE,artUrl:"",config:{...minimalConfig,visibilityOverrides:{showTitle:true},typography:{title:{weight:850}}}}));
check(shownHtml.includes('data-theme-type="title"') && shownHtml.includes('font-weight:inherit'),"Full Arrange cannot reveal and restyle a declarative hidden title");

const styledElement = {id:'literal-"-<title>',type:"text",x:1,y:2,width:80,height:15,visible:false,fontFamily:"Georgia",fontWeight:800,opacity:.42,borderColor:"#abcdef",borderWidth:3,glow:true,color:"#aa33ff",customText:'Literal \\ \\n " <script> & $' + '{media.title}'};
const artElement = {id:"art",type:"artwork",x:2,y:20,width:40,height:55,visible:true,spinning:true};
const generatedTheme = {schemaVersion:1,id:"generator-parity",name:'Literal " Theme',elements:[styledElement,artElement],layouts:{tiktok:[{...styledElement,id:"vertical-text",visible:true,customText:"VERTICAL LAYOUT"}]}};
const generated = generateBundleFromDeclarative(generatedTheme);
const compiled = compileThemeBundle(generated);
check(compiled.success && compiled.Component,"Generator could not compile escaped author text");
for (const surface of ["obs","tiktok","desktop","big"]) {
  const rendered = renderToStaticMarkup(React.createElement(compiled.Component,{media:MOCK_MEDIA_STATE,artUrl:"",surface,format:"horizontal",progress:.5,formattedTime:{current:"0:00",duration:"3:00"},colors:{dominant:"#ffffff",accent:"#ffffff",contrastText:"#ffffff"}}));
  check(rendered.includes('data-theme-role="frame"') && rendered.includes('data-theme-role="themeLabel"'),"Generated semantic roles are incomplete");
  if(surface === "tiktok") check(rendered.includes("VERTICAL LAYOUT") && !rendered.includes("data-theme-default-hidden"),"Generator lost surface override");
  else for (const expected of ['font-family:Georgia','font-weight:800','opacity:0.42','border:3px solid #abcdef','text-shadow:','display:none','data-theme-default-hidden="true"','mpoGeneratedSpin 10s linear infinite','&lt;script&gt;']) check(rendered.includes(expected),"Generator lost authored styling: " + expected);
}
const portable = withBundleAuthoringFiles({...generated,manifest:{...generated.manifest,canvasSizes:{obs:{width:1100,height:260},desktop:{width:600,height:200}}},files:{...generated.files,"custom-note.txt":"keep me"}});
for (const filename of ["manifest.json","types.d.ts","mpo-sdk.d.ts","MPO-SDK.md","README.md"]) check(portable.files[filename],"Portable theme missing " + filename);
const imported = parseThemePackageJson(exportThemePackageJson({...generatedTheme,bundle:portable}));
check(imported.bundle.manifest.canvasSizes.obs.width === 1100 && imported.bundle.files["custom-note.txt"] === "keep me","Theme export/import lost sizing or custom files");
const nominal = {obs:[1100,260],tiktok:[360,640],desktop:[600,200],big:[1280,720]};
for (const surface of ["obs","tiktok","desktop","big"]) {
  const auto = builtThemeSize(imported,surface,{customWidth:0,customHeight:0});
  check(auto.width === nominal[surface][0] && auto.height === nominal[surface][1],surface + " lost its authored or fallback canvas dimensions");
  const exact = builtThemeSize(imported,surface,{customWidth:620,customHeight:240});
  check(exact.width === 620 && exact.height === 240,surface + " cannot override the theme canvas");
  const mounted = renderToStaticMarkup(React.createElement(BuiltThemeMount,{theme:imported,surface,media:MOCK_MEDIA_STATE,artUrl:"",config:{...DEFAULT_THEME_CONFIG,customWidth:620,customHeight:240,scale:1.25}}));
  check(mounted.includes('data-theme-layout-root') && mounted.includes('width:620px;height:240px') && mounted.includes('scale(1.25)'),surface + " lost its nominal canvas or applied scale twice");
}
const hiddenAlbum = renderToStaticMarkup(React.createElement(ThemeRenderer,{theme:{schemaVersion:1,id:"hidden",name:"Hidden",elements:[{id:"album",type:"album",x:0,y:0,width:100,height:20,visible:false}]},surface:"desktop",media:MOCK_MEDIA_STATE,artUrl:"",config:{...DEFAULT_THEME_CONFIG,showAlbum:true}}));
check(!hiddenAlbum.includes('data-theme-role="album"'),"A supplement must not reveal an author-hidden element");
const editor = renderToStaticMarkup(React.createElement(ContextualThemeEditor,{selected:"frame",builtTheme:imported,config:DEFAULT_THEME_CONFIG,onConfigChange:()=>{},onClose:()=>{},customCss:"",onCustomCssChange:()=>{},extractedColor:null}));
check(editor.includes("Arrange placement") && editor.includes("Frame &amp; Canvas Dimensions"),"React SDK frame lost the shared controls or exact placement editor");
const fakeMount={};const semanticTitle={closest:()=>fakeMount,getAttribute:()=>"title",matches:()=>false,parentElement:fakeMount};
check(findThemeElement(semanticTitle) === "title","Arrange must recognize semantic SDK roles without legacy CSS classes");
const dotCss=generateEffectiveThemeCss({...DEFAULT_THEME_CONFIG,showVisualizer:true,visualizerType:"dots",visualizerHeight:31,visualizerColor:"#abcdef"});
check(!dotCss.includes("max-height: 31px !important; height: 31px !important"),"Visualizer height must not force dot and pulse bars to fill their container");
console.log("Legacy SDK role normalization, independent controls, all-studio shared styling, generated layout fidelity, and portable package parity OK");
`;
const result = esbuild.buildSync({stdin:{contents:source,resolveDir:path.resolve(__dirname,".."),sourcefile:"sdk-controls-test.ts",loader:"ts"},bundle:true,jsx:"automatic",loader:{".css":"empty"},platform:"node",format:"cjs",write:false,packages:"external"});
new Function("require","module","exports",result.outputFiles[0].text)(require,{exports:{}},{});
