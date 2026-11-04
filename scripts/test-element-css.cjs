const esbuild = require('esbuild');
const path = require('path');
const source = `
import { mergeLegacyCss, scopeElementCss } from './src/utils/elementCss';
import { sanitizeLayers, sanitizeDesktopLayers } from './src/types/layers';
import { sanitizeBigLayer } from './src/big-studio/layers';
const old={id:'one',name:'One',themeId:'obs-signal-desk',customCss:'.mpo-title { color: red }',config:{elementCss:'.mpo-title { color: blue }'}};
for (const layer of [sanitizeLayers([old])[0],sanitizeDesktopLayers([old])[0],sanitizeBigLayer(old)]) {
  if (!layer || layer.config.elementCss !== '' || layer.customCss !== mergeLegacyCss(old.customCss,old.config.elementCss)) throw Error('CSS migration lost or reordered rules');
}
(globalThis as any).CSSRule={STYLE_RULE:1,MEDIA_RULE:4,SUPPORTS_RULE:12};
(globalThis as any).CSSStyleSheet=class {
  cssRules:any[]=[];
  replaceSync() { this.cssRules=[
    {type:1, selectorText:'.mpo-title, .mpo-art[data-test="a,b"]::before, :is(.mpo-artist, .mpo-album)', style:{cssText:'color: red;'}},
    {type:4, cssText:'@media (max-width: 500px) { }', cssRules:[{type:1,selectorText:'.mpo-title',style:{cssText:'color: blue;'}}]},
    {type:3,cssText:'@import url(example.css);'}
  ]; }
};
const css=scopeElementCss('input','.mount');
for (const expected of ['.mount .mpo-title', '.mount .mpo-art[data-test="a,b"]::before', '.mount :is(.mpo-artist, .mpo-album)', '@media (max-width: 500px)', 'color: blue']) if (!css.includes(expected)) throw Error('Missing scoped CSS: '+expected);
if(css.includes('@import')) throw Error('Global import was retained');
console.log('Legacy CSS migration and element scope OK');
`;
const result=esbuild.buildSync({stdin:{contents:source,resolveDir:path.resolve(__dirname,'..'),sourcefile:'element-css-test.ts',loader:'ts'},bundle:true,loader:{'.css':'empty'},platform:'node',format:'cjs',write:false,packages:'external'});
new Function('require','module','exports',result.outputFiles[0].text)(require,{exports:{}},{});

