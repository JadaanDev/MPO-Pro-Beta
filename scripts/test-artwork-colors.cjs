const fs = require('fs'); const esbuild = require('esbuild'); const path = require('path');
const source = `
import { contrastRatio, parseHex, readableArtworkColor, artworkSurface } from './src/utils/artworkColors';
import { generateEffectiveThemeCss } from './src/utils/ThemeStyleEngine';
import { DEFAULT_THEME_CONFIG } from './src/types/themes';
for (const background of ['#000000','#12131b','#777777','#ffffff']) {
  for (const color of ['#000000','#182631','#cc1234','#ffff00','#ffffff']) {
    const bg=parseHex(background), art=parseHex(color);
    const result=parseHex(readableArtworkColor(art,bg,4.5));
    if (contrastRatio(result,bg)<4.5) throw Error('Text contrast failed for '+color+' on '+background);
  }
}
if (!artworkSurface([0,0,0],true).startsWith('#f')) throw Error('Dark artwork should get a light contrasting surface');
const config={...DEFAULT_THEME_CONFIG, accentColor:'#123456', titleColor:'#246810', frameBorderColor:'#abcdef', artworkColors:{surface:'artwork',accent:'artwork',text:'artwork',border:'artwork',progress:'artwork',indicator:'artwork'}};
const css=generateEffectiveThemeCss(config,'horizontal','#d52266');
for(const expected of ['background-color: rgba(','.mpo-title','.mpo-progress-fill','.mpo-vis-bar','border-color:']) if(!css.includes(expected)) throw Error('Missing dynamic rule '+expected);
if(!css.includes('color: #246810')) throw Error('Existing manual value should remain available');
const fallback=generateEffectiveThemeCss(config,'horizontal',null);
if(fallback.includes('background-image: none !important')) throw Error('Missing artwork must leave theme appearance unchanged');
if(!fallback.includes('--accent-primary: #123456')) throw Error('Missing artwork must use manual accent');
const progress=generateEffectiveThemeCss({...DEFAULT_THEME_CONFIG,progressHeight:9,progressFillColor:'#123abc',progressTrackColor:'#456def',progressShape:'pill'},'horizontal',null);
for (const expected of ['.collection-progress-track','.apple-progress-bar-track','.island-track','.big-progress','height: 9px !important','background: #123abc !important','background: #456def !important','border-radius: 9999px !important']) if (!progress.includes(expected)) throw Error('Missing progress control: '+expected);
const matching=generateEffectiveThemeCss({...DEFAULT_THEME_CONFIG, progressFillColor:'#123abc', artworkColors:{progress:'artwork'}},'horizontal','#d52266');
if (matching.lastIndexOf('background: #123abc') > matching.lastIndexOf('background-color:')) throw Error('Artwork matching must take precedence over manual fill');
const invalid=generateEffectiveThemeCss({...DEFAULT_THEME_CONFIG,progressFillColor:'red; } body { display: none'},'horizontal',null);
if (invalid.includes('body { display: none')) throw Error('Invalid progress color must not enter CSS');
console.log('Artwork color contrast, dynamic roles, and missing-artwork fallback OK');
`;
const result=esbuild.buildSync({stdin:{contents:source,resolveDir:path.resolve(__dirname,'..'),sourcefile:'artwork-test.ts',loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,packages:'external'});
new Function('require','module','exports',result.outputFiles[0].text)(require,{exports:{}},{});
