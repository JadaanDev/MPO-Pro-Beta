const esbuild = require('esbuild');
const path = require('path');
const source = `
import {validateThemeDefinition} from './src/theme-sdk/schema';
import {sanitizeLayers, sanitizeDesktopLayers} from './src/types/layers';
import {sanitizeBigLayer} from './src/big-studio/layers';
import {ThemeRenderer} from './src/theme-sdk/ThemeRenderer';
import {createStarterTheme, serializeThemeMarkup, parseThemeMarkup} from './src/theme-sdk/markup';
import {ThemeBuilderPage} from './src/theme-sdk/pages/ThemeBuilderPage';
import {MyThemesPage} from './src/theme-sdk/pages/MyThemesPage';
import {renderToStaticMarkup} from 'react-dom/server';
import {MOCK_MEDIA_STATE} from './src/types/media';
import {refreshBuiltTheme} from './src/theme-sdk/library';
const theme={schemaVersion:1,id:'test',name:'Test',elements:[{id:'title',type:'title',x:0,y:0,width:100,height:20,visible:true}]};
if(validateThemeDefinition(theme).length) throw Error('Valid theme rejected');
for(const invalid of [{...theme,schemaVersion:2},{...theme,elements:[{...theme.elements[0],x:NaN}]},{...theme,elements:[theme.elements[0],theme.elements[0]]},{...theme,layouts:{unknown:[]}}]) if(!validateThemeDefinition(invalid).length) throw Error('Invalid theme accepted');
const starter=createStarterTheme('Custom SDK','custom-sdk');
const markup=serializeThemeMarkup(starter);
if(!markup.includes('<mpo-theme id="custom-sdk"') || !markup.includes('<surface name="tiktok">')) throw Error('Markup serialization incomplete');
const parsed=parseThemeMarkup(markup);
if(parsed.errors.length || JSON.stringify(parsed.theme)!==JSON.stringify(starter)) throw Error('Markup round-trip failed');
if(!parseThemeMarkup('<mpo-theme id="x" name="X"><unknown x="0" y="0" width="10" height="10" visible="true" /></mpo-theme>').errors.length) throw Error('Invalid markup tag accepted');
const layer={id:'one',name:'One',themeId:'glass-modern',builtTheme:theme};
for(const result of [sanitizeLayers([layer])[0],sanitizeDesktopLayers([layer])[0],sanitizeBigLayer(layer)]) if(JSON.stringify(result?.builtTheme)!==JSON.stringify(theme)) throw Error('Layer lost its built theme');
const updated={...theme,name:'Updated'};
if(refreshBuiltTheme(layer,[updated]).builtTheme.name !== 'Updated') throw Error('Linked theme did not update');
if(refreshBuiltTheme(layer,[]).builtTheme !== theme) throw Error('Deleted theme lost its retained layout');
for(const surface of ['obs','tiktok','desktop','big']) {
 const fixture={...theme,layouts:{[surface]:[{...theme.elements[0],type:'artist'}]}};
 const html=renderToStaticMarkup(React.createElement(ThemeRenderer,{theme:fixture,surface,media:MOCK_MEDIA_STATE,artUrl:''}));
 if(!html.includes('M83') || html.includes('Midnight City')) throw Error('Surface override not rendered: '+surface);
 if(!html.includes('mpo-sdk-host mpo-theme-container') || !html.includes('class="mpo-sdk-surface mpo-card"')) throw Error('SDK host must be separate from its visible card: '+surface);
}
const builderHtml=renderToStaticMarkup(React.createElement(ThemeBuilderPage,{media:MOCK_MEDIA_STATE,artUrl:'',onRouteToStudio:()=>{}}));
for(const expected of ['OBS 16:9','TikTok 9:16','Desktop HUD','Big Stage']) {
 if(!builderHtml.includes(expected)) throw Error('Builder page missing: '+expected);
}
const myThemesHtml=renderToStaticMarkup(React.createElement(MyThemesPage,{media:MOCK_MEDIA_STATE,artUrl:'',onRouteToStudio:()=>{}}));
for(const expected of ['My Themes','Open in Your Favorite IDE','VS Code','Claude Code','Antigravity']) {
 if(!myThemesHtml.includes(expected)) throw Error('My Themes dev hub missing: '+expected);
}
import { ContextualThemeEditor, findThemeElement } from './src/components/dashboard/ContextualThemeEditor';
const mount = {};
const fakeBuiltTitle = {closest:()=>mount, matches:(selector)=>selector === '[data-theme-element="title"]', parentElement:mount};
if (findThemeElement(fakeBuiltTitle as any) !== 'title') throw Error('Arrange mode did not recognize built theme element');
const arrangeHtml = renderToStaticMarkup(React.createElement(ContextualThemeEditor, {
  selected: 'title',
  config: {} as any,
  onConfigChange: () => {},
  onClose: () => {},
  extractedColor: null,
  customCss: '',
  onCustomCssChange: () => {},
  builtTheme: starter,
  onUpdateBuiltTheme: () => {},
  surface: 'obs',
}));
for(const expected of ['BUILT SDK ELEMENT', 'Track title &lt;title&gt;', 'X Position (%)', 'Y Position (%)', 'Width (%)', 'Height (%)']) {
 if(!arrangeHtml.includes(expected)) throw Error('Arrange contextual editor missing built theme controls: ' + expected);
}
import { compileThemeBundle } from './src/theme-sdk/compiler/themeCompiler';
import { STARTER_BUNDLES, bundleToThemeDefinition } from './src/theme-sdk/templates/starterBundles';
import { exportThemePackageJson, parseThemePackageJson } from './src/theme-sdk/templates/bundleStorage';

for (const bundle of STARTER_BUNDLES) {
  const comp = compileThemeBundle(bundle);
  if (!comp.success || !comp.Component) throw Error('Starter bundle failed compilation: ' + bundle.manifest.name + ' - ' + comp.diagnostics[0]?.message);
  const bundleTheme = bundleToThemeDefinition(bundle);
  const rendered = renderToStaticMarkup(React.createElement(ThemeRenderer, { theme: bundleTheme, surface: 'obs', media: MOCK_MEDIA_STATE, artUrl: '' }));
  if (!rendered.includes('Midnight City') && !rendered.includes('M83')) throw Error('Compiled React theme did not render track metadata');
  const exported = exportThemePackageJson(bundleTheme);
  const reimported = parseThemePackageJson(exported);
  if (reimported.name !== bundle.manifest.name || !reimported.bundle) throw Error('Export/import round-trip failed for ' + bundle.manifest.name);
}
console.log('Theme schema validation, HTML-like SDK markup, unified Builder & My Themes, Arrange mode editing, and 4-studio routing OK');
console.log('React in-app live compiler, multi-file starter bundles, and .mpotheme.json packages OK');
`;
const result=esbuild.buildSync({stdin:{contents:"import React from 'react';\n"+source,resolveDir:path.resolve(__dirname,'..'),sourcefile:'sdk-test.ts',loader:'ts'},bundle:true,jsx:'automatic',loader:{'.css':'empty'},platform:'node',format:'cjs',write:false,packages:'external'});
new Function('require','module','exports',result.outputFiles[0].text)(require,{exports:{}},{});
