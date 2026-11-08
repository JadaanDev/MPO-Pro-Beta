const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const path = require('path');
const React = require('react');
const globals = ['window','localStorage','setTimeout','clearTimeout','fetch'].map(key => [key,global[key]]);
const bundle = source => ({schemaVersion:2,manifest:{schemaVersion:2,id:'linked',name:'Linked'},files:{'Theme.tsx':source}});
const good = bundle('export default function Theme(){return <div data-theme-role="frame">Updated</div>}');
const stale = {schemaVersion:1,id:'linked',name:'Linked',elements:[],bundle:bundle('export default function Theme(){return <div>Old</div>}')};
const diskTheme = {...stale,bundle:good};
const build = esbuild.buildSync({stdin:{contents:`export {useThemeWorkspaceSync} from './src/theme-sdk/useThemeWorkspaceSync';export {resolveLayerThemes} from './src/theme-sdk/library';export {themeText} from './src/utils/themeText';export {listAllThemes,setupThemeWatcher} from './src/theme-sdk/themeStore';`,resolveDir:path.resolve(__dirname,'..'),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.md':'text'},packages:'external'});
(async () => {
 try {
  const values=new Map([['mpo_theme_library_v1',JSON.stringify([stale])]]),events=[],timers=new Map();
  let effect,listener,stops=0,reads=0,nextBundle=good,timer=0;
  global.localStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
  global.window={__TAURI_INTERNALS__:{},location:{port:'4849',hostname:'mpobeta.local',origin:'http://mpobeta.local:4849'},dispatchEvent:event=>events.push(event.type)};
  const mod={exports:{}};
  const invoke=async command=>{if(command==='list_disk_themes')return [{id:'linked',name:'Linked',folder:'linked'}];if(command==='read_disk_theme'){reads++;return nextBundle;}throw Error(command)};
  new Function('require','module','exports',build.outputFiles[0].text)(name=>name==='react'?{...React,useEffect:fn=>{effect=fn}}:name==='@tauri-apps/api/core'?{invoke}:name==='@tauri-apps/api/event'?{listen:async(_,fn)=>{listener=fn;return()=>{stops++}}}:require(name),mod,mod.exports);
  const {useThemeWorkspaceSync,resolveLayerThemes,themeText,setupThemeWatcher}=mod.exports;
  const layer={id:'layer',config:{scale:1.5,typography:{title:{size:24}}},builtTheme:stale};
  for(const surface of ['obs','tiktok','desktop','big']){
   const updated=resolveLayerThemes([{...layer,surface}],[diskTheme])[0];
   assert.equal(updated.builtTheme,diskTheme);assert.equal(updated.config,layer.config);
  }
  assert.equal(resolveLayerThemes([layer],[])[0],layer,'deleted theme retains embedded fallback');
  assert.equal(resolveLayerThemes([layer],[{}])[0],layer,'invalid library cannot override source');
  assert.equal(resolveLayerThemes([layer],[diskTheme,diskTheme])[0],layer,'ambiguous IDs rejected');
  assert.equal(resolveLayerThemes([layer],[JSON.parse(JSON.stringify(stale))])[0],layer,'identical publications preserve layer identity');
  const text=value=>({nodeType:3,textContent:value});
  const element=(children,attrs={},tagName='SPAN')=>({nodeType:1,tagName,childNodes:children,hasAttribute:key=>key in attrs,getAttribute:key=>attrs[key]??null});
  const title=element([element([text('Stay '),element([text('Forever')])]),element([text('Stay Forever')],{'aria-hidden':'true'}),element([text('decoration')],{hidden:''}),element([text('css')],{},'STYLE')]);
  assert.equal(themeText(title),'Stay Forever','fitting ignores marquee copies without losing rich text');
  global.setTimeout=fn=>{timers.set(++timer,fn);return timer};global.clearTimeout=id=>timers.delete(id);
  const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve()};
  useThemeWorkspaceSync(true);const cleanup=effect();await settle();
  assert.equal(JSON.parse(values.get('mpo_theme_library_v1'))[0].bundle.files['Theme.tsx'],good.files['Theme.tsx']);
  assert.equal(events.filter(e=>e==='mpo-theme-library').length,1,'validated startup refresh published once');
  const flush=async()=>{const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn());await settle()};
  nextBundle=bundle('export default function (');
  listener({payload:{themeId:'linked',path:'Theme.tsx',kind:'modify'}});await flush();
  assert.equal(events.filter(e=>e==='mpo-theme-library').length,1,'partial external edit retains last working source');
  nextBundle=bundle('export default function Theme(){return <div>Third revision</div>}');
  for(let i=0;i<4;i++)listener({payload:{themeId:'linked',path:'Theme.tsx',kind:'modify'}});
  const before=reads;await flush();assert.equal(reads,before+1,'external writes coalesce');
  assert.equal(JSON.parse(values.get('mpo_theme_library_v1'))[0].bundle.files['Theme.tsx'],nextBundle.files['Theme.tsx']);
  listener({payload:{themeId:'linked'}});cleanup();await flush();assert.equal(stops,1);assert.equal(timers.size,0);
  const stop=setupThemeWatcher(()=>{throw Error('disposed watcher called')});stop();await settle();assert.equal(stops,2,'late listener registration cleans up after StrictMode unmount');
  delete window.__TAURI_INTERNALS__;
  const requested=[];
  global.fetch=async url=>{requested.push(url);return {ok:true,json:async()=>url.endsWith('/api/themes')?[{id:'linked',name:'Linked',folder:'linked folder'}]:good}};
  const web={exports:{}};new Function('require','module','exports',build.outputFiles[0].text)(require,web,web.exports);
  assert.equal((await web.exports.listAllThemes())[0].bundle.files['Theme.tsx'],good.files['Theme.tsx']);
  assert.deepEqual(requested,['http://mpobeta.local:4849/api/themes','http://mpobeta.local:4849/api/themes/linked%20folder/bundle'],'browser SDK reads the beta server, not the obsolete port');
  console.log('SDK linked source refresh: four surfaces, fallback retention, stable identity, validated disk edits, debounce, watcher cleanup, beta HTTP source and single-copy text fitting OK');
 } finally {for(const [key,value] of globals)if(value===undefined)delete global[key];else global[key]=value;}
})().catch(error=>{console.error(error);process.exitCode=1});
