const esbuild=require('esbuild'),path=require('path'),assert=require('node:assert/strict');
const source=`
import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {DEFAULT_THEME_CONFIG} from './src/types/themes';
import {themeCanvasSize,migrateThemeCanvases,setThemeCanvasSize,DEFAULT_THEME_CANVAS_SIZES} from './src/theme-sdk/canvasSizes';
import {builtThemeSize} from './src/theme-sdk/BuiltThemeMount';
import {generateBundleFromDeclarative} from './src/theme-sdk/templates/bundleGenerator';
import {visualThemeFromBundle} from './src/theme-sdk/visualProject';
import {resizedDesktopConfig,desktopEditorConfig} from './src/utils/desktopEditorConfig';
import {pointerDelta,proportionalResize,constrainedDelta,contentWidth,restoreGesture,resizeHudScale} from './src/utils/arrangeGeometry';
import {generateEffectiveThemeCss} from './src/utils/ThemeStyleEngine';
import {LayoutSizingControls,studioSizePresets} from './src/components/dashboard/LayoutSizingControls';
import {TypographyControls} from './src/components/dashboard/TypographyControls';
import {BigStyleInspector} from './src/big-studio/BigStyleInspector';
import {SharedStyleInspector} from './src/components/dashboard/SharedStyleInspector';
const check=(v,m)=>{if(!v)throw Error(m)};
const theme={schemaVersion:1,id:'visual',name:'Visual',elements:[{id:'title',type:'title',x:10,y:20,width:70,height:25,visible:true,fontSize:26}],canvas:{borderRadius:20}};
const old=JSON.stringify(theme),migrated=migrateThemeCanvases(theme);
for(const surface of ['obs','tiktok','desktop','big']){
 const size=themeCanvasSize(migrated,surface);check(JSON.stringify(size)===JSON.stringify(DEFAULT_THEME_CANVAS_SIZES[surface]),'legacy live canvas migration '+surface);
 check(JSON.stringify(builtThemeSize(migrated,surface,{customWidth:0,customHeight:0}))===JSON.stringify(size),'Builder and studio share nominal dimensions '+surface);
}
check(JSON.stringify(theme)===old,'size migration must not mutate the source');check(migrateThemeCanvases(migrated)===migrated,'migration idempotence');
const resized=setThemeCanvasSize(migrated,'desktop',{width:825,height:270});
const generated=generateBundleFromDeclarative(resized);check(generated.manifest.canvasSizes.desktop.width===825,'custom design size survives Builder source export');
const restored=visualThemeFromBundle(generated);check(restored && !restored.bundle && restored.elements[0].fontSize===26,'saved visual project remains editable after disk reload');
check(themeCanvasSize(restored,'desktop').height===270,'restored canvas size');
const renamed={...generated,manifest:{...generated.manifest,name:'Renamed visual',author:'Creator'}};const rebuilt=generateBundleFromDeclarative(visualThemeFromBundle(renamed));check(rebuilt.manifest.name==='Renamed visual'&&rebuilt.manifest.author==='Creator','visual saves preserve edited manifest metadata');check(!visualThemeFromBundle({...generated,manifest:{...generated.manifest,entryPoint:'Custom.tsx'}}),'visual mode must not overwrite a custom entry point');
const withExtras={...generated,files:{...generated.files,'custom-note.txt':'retain this'}};
check(generateBundleFromDeclarative(visualThemeFromBundle(withExtras)).files['custom-note.txt']==='retain this','visual edits retain custom source extras');
check(!visualThemeFromBundle({...generated,files:{...generated.files,'Theme.tsx':generated.files['Theme.tsx']+'\\n// external edit'}}),'stale visual geometry must not overwrite external source edits');
check(pointerDelta({x:0,y:0},{x:50,y:25},.5).x===100,'preview inverse scale');
check(pointerDelta({x:0,y:0},{x:50,y:25},2).x===25,'high scale pointer coordinates');
check(Math.abs(resizeHudScale(.5,314,154,250,90)-1)<.0001,'HUD sizing compensates fixed gutters below 100%');check(Math.abs(resizeHudScale(1,564,244,1128,488)-3)<.0001,'HUD sizing supports scales above 200%');
const original={elementPositions:{title:{x:0,y:0,scale:1}},titleColor:'#111111'},after={...original,elementPositions:{title:{x:20,y:10,scale:1}}};
const undone=restoreGesture({...after,titleColor:'#abcdef'},original,after);check(undone.titleColor==='#abcdef'&&undone.elementPositions.title.x===0,'gesture undo preserves later independent edits');
const later=restoreGesture({...after,elementPositions:{title:{x:99,y:10,scale:1}}},original,after);check(later.elementPositions.title.x===99&&later.elementPositions.title.y===0,'gesture undo preserves later conflicting leaves');
const limited=constrainedDelta({x:20,y:10,width:100,height:40},{x:0,y:0,width:200,height:100},{x:500,y:-50});check(limited.x===80&&limited.y===-10,'constrained dragging');
check(proportionalResize(100,50,100,50)===2,'uniform proportional resize');
check(contentWidth(900,320,600).width===600&&contentWidth(10,320,600).width===320,'bounded text sizing');
for(const scale of [.15,3.5]){const original={...DEFAULT_THEME_CONFIG,scale:.9,customWidth:620,customHeight:200};const next=resizedDesktopConfig(original,scale);check(next.scale===.9&&next.customWidth===620&&next.customHeight===200,'HUD grip preserves browser output dimensions');check(desktopEditorConfig(next).scale===scale,'HUD scale is not limited to 50–200%');}
const controls=renderToStaticMarkup(React.createElement(LayoutSizingControls,{config:{...DEFAULT_THEME_CONFIG,widthMode:'content'},onChange:()=>{}}));for(const text of ['Element boundaries','Theme default (preserve existing layout)','Hug content','Minimum content width','Maximum content width'])check(controls.includes(text),'missing sizing control '+text);
const typography=renderToStaticMarkup(React.createElement(TypographyControls,{config:{...DEFAULT_THEME_CONFIG,typography:{title:{overflow:'shrink',minSize:14}}},onConfigChange:()=>{},selected:'title'}));for(const text of ['Text overflow','Auto-shrink','Minimum readable font'])check(typography.includes(text),'missing text fitting '+text);
const big=renderToStaticMarkup(React.createElement(BigStyleInspector,{config:{...DEFAULT_THEME_CONFIG,scale:.8},stageScale:.5,onStageScaleChange:()=>{},onChange:()=>{}}));for(const text of ['Stage content scale (all layers)','Selected layer scale','40%','Reset stage scale','Reset selected layer scale'])check(big.includes(text),'explicit Big scale relationship '+text);
const advanced=renderToStaticMarkup(React.createElement(SharedStyleInspector,{presentationMode:true,hideScaleControl:true,config:DEFAULT_THEME_CONFIG,extractedColor:null,customCss:'',onConfigChange:()=>{},onCustomCssChange:()=>{}}));check(!advanced.includes('Selected layer scale'),'advanced Big inspector must not duplicate layer scale');
for(const [surface,label]of [['obs','Lower Third'],['tiktok','Story Card'],['desktop','Compact Island']])check(studioSizePresets(surface).some(p=>p.label===label),'studio tailored presets '+surface);
const css=generateEffectiveThemeCss({...DEFAULT_THEME_CONFIG,widthMode:'content',customWidth:900,layoutBoundary:'grow',typography:{title:{overflow:'shrink'}}},'horizontal',null,'.mpo-title {letter-spacing:3px;}');check(css.includes('--mpo-content-width')&&!css.includes('width: 900px !important'),'bounded width takes priority over fixed width');check(css.includes('data-mpo-grow-frame')&&css.includes('data-mpo-constrained')&&css.includes('prefers-reduced-motion'),'shared renderer policy hooks');
console.log('Beta 14 sizing: shared canvases and migration, portable editable visual projects, inverse gesture coordinates, boundary math, independent HUD scale, text fitting, presets and explicit Big scales OK');
`;
const build=esbuild.buildSync({stdin:{contents:source,resolveDir:path.resolve(__dirname,'..'),loader:'tsx'},bundle:true,jsx:'automatic',loader:{'.css':'empty'},platform:'node',format:'cjs',write:false,packages:'external'});
new Function('require','module','exports',build.outputFiles[0].text)(require,{exports:{}},{});

// Exercise the actual interaction handlers without starting a browser or app.
const output=esbuild.buildSync({stdin:{contents:'export {ArrangeCanvas} from "./src/components/dashboard/ArrangeCanvas";',resolveDir:path.resolve(__dirname,'..'),loader:'tsx'},bundle:true,jsx:'automatic',loader:{'.css':'empty'},platform:'node',format:'cjs',write:false,packages:'external'});
const saved=new Map(['window','document','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'].map(k=>[k,global[k]]));
try {
 const listeners=new Map(),frames=new Map();let frame=0,current,histories,refs,states,ri,si,selected,captures,writes;
 const rect=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});
 const node=(role,box,w,h)=>({role,offsetWidth:w,offsetHeight:h,getAttribute:key=>key==='data-theme-role'?role:null,matches:()=>false,contains:()=>false,getBoundingClientRect:()=>box,closest:()=>null,parentElement:null});
 const title=node('title',rect(50,20,100,20),200,40),card=node('frame',rect(0,0,250,100),500,200),layout=node('host',rect(0,0,250,100),500,200);
 const host={focus(){},contains(target){for(let node=target;node;node=node.parentElement)if(node===this)return true;return false;},closest:()=>null,querySelector:()=>layout,querySelectorAll:selector=>selector.includes('"title"')?[title]:selector.includes('"frame"')?[card]:[],setPointerCapture(){captures++},hasPointerCapture:()=>true,releasePointerCapture(){}};
 title.parentElement=host;card.parentElement=host;
 global.window={innerWidth:1000,addEventListener:(key,fn)=>{if(!listeners.has(key))listeners.set(key,new Set());listeners.get(key).add(fn)},removeEventListener:(key,fn)=>listeners.get(key)?.delete(fn)};
 global.document={body:{}};global.getComputedStyle=()=>({visibility:'visible',fontSize:'20px'});
 global.requestAnimationFrame=fn=>{frames.set(++frame,fn);return frame};global.cancelAnimationFrame=id=>frames.delete(id);
 const dispatch=(key,value)=>{for(const fn of [...(listeners.get(key)||[])])fn(value)};
 const flush=()=>{const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn());};
 const runtime={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
 const mod={exports:{}};
 const fakeRequire=name=>name==='react'?{useRef:initial=>{const i=ri++;return refs[i]||(refs[i]={current:i===0?host:initial});},useState:initial=>{const i=si++;if(!(i in states))states[i]=initial;return [states[i],value=>states[i]=typeof value==='function'?value(states[i]):value]},useEffect(){},useLayoutEffect(){}}:name==='react/jsx-runtime'?runtime:name==='react-dom'?{createPortal:child=>child}:require(name);
 new Function('require','module','exports',output.outputFiles[0].text)(fakeRequire,mod,mod.exports);
 const render=(role='title')=>{ri=si=0;return mod.exports.ArrangeCanvas({enabled:true,selected:role,onSelect:role=>{selected=role},onClick:()=>{selected=null},config:current,onConfigChange:fn=>{writes++;current=fn(current)},onCommitHistory:()=>histories++,layerKey:'layer',children:null});};
 const reset=()=>{refs=[];states=[];listeners.clear();frames.clear();histories=0;selected='title';captures=writes=0;current={scale:1,customWidth:500,customHeight:200,elementPositions:{title:{x:0,y:0,scale:1}}};};
 let view;
 const event=(x,y)=>({pointerId:1,button:0,clientX:x,clientY:y,target:title,currentTarget:host,preventDefault(){},stopPropagation(){}});
 // A real quick click must survive the synthetic click that follows pointerup.
 for(const zoom of [.25,.5,1,2]) {
  reset();layout.getBoundingClientRect=()=>rect(0,0,500*zoom,200*zoom);view=render();
  for(let i=0;i<12;i++){view.props.onPointerDownCapture(event(100,50));dispatch('pointermove',event(103,51));flush();dispatch('pointerup',event(103,51));view.props.onClickCapture(event(103,51));view.props.onClick?.(event(103,51));flush();assert.equal(selected,'title');}
  assert.equal(writes,0,'click jitter must never edit layout at zoom '+zoom);assert.equal(captures,0,'pending clicks never capture the pointer');assert.equal(histories,0,'selection has no history');
 }
 layout.getBoundingClientRect=()=>rect(0,0,250,100);
 reset();view=render();const ui={...event(0,0),target:{closest:()=>({}),parentElement:host}};view.props.onPointerDownCapture(ui);view.props.onClickCapture(ui);assert.equal(selected,'title');assert.equal(writes,0,'toolbar/editor controls preserve selection');
 const portal={...event(0,0),target:{closest:()=>null,parentElement:null}};view.props.onPointerDownCapture(portal);view.props.onClickCapture(portal);assert.equal(selected,'title','React portal events do not clear selection');
 view.props.onPointerDownCapture({...event(0,0),target:host});assert.equal(selected,null,'only a deliberate background press clears selection');
 reset();view=render();view.props.onPointerDownCapture(event(100,50));dispatch('pointermove',event(105,50));flush();assert.equal(current.elementPositions.title.x,10,'drag threshold is measured in screen pixels');assert.equal(captures,1);view.props.onLostPointerCapture();assert.equal(current.elementPositions.title.x,0);assert.equal(histories,0);
 reset();view=render();view.props.onPointerDownCapture({...event(100,50),pointerType:'touch'});dispatch('pointermove',event(106,50));flush();assert.equal(writes,0,'touch uses a larger movement tolerance');dispatch('pointerup',event(106,50));flush();assert.equal(histories,0);
 reset();view=render();view.props.onPointerDownCapture(event(100,50));dispatch('pointermove',event(150,75));flush();assert.deepEqual(current.elementPositions.title,{x:100,y:50,scale:1});dispatch('pointerup',event(150,75));flush();assert.equal(histories,1,'a gesture creates one history entry');assert.equal(listeners.get('pointermove').size,0,'gesture cleanup');
 reset();view=render();view.props.onPointerDownCapture(event(100,50));dispatch('pointermove',event(150,75));flush();dispatch('keydown',{key:'Escape',preventDefault(){},stopPropagation(){}});assert.deepEqual(current.elementPositions.title,{x:0,y:0,scale:1});assert.equal(histories,0,'cancelled gesture has no undo entry');
 reset();view=render();view.props.onKeyDown({key:'ArrowRight',shiftKey:true,target:{closest:()=>null},preventDefault(){}});assert.equal(current.elementPositions.title.x,10,'Shift arrow nudges 10 design pixels');
 reset();view=render();const nudge={key:'ArrowRight',target:{closest:()=>null},preventDefault(){}};view.props.onKeyDown(nudge);view.props.onKeyDown(nudge);flush();assert.equal(current.elementPositions.title.x,2);assert.equal(histories,2);const undo={key:'z',ctrlKey:true,target:{closest:()=>null},preventDefault(){}};render().props.onKeyDown(undo);assert.equal(current.elementPositions.title.x,1);render().props.onKeyDown(undo);assert.equal(current.elementPositions.title.x,0,'rapid nudges keep distinct undo snapshots');render().props.onKeyDown({...undo,shiftKey:true});assert.equal(current.elementPositions.title.x,1,'redo restores the specific nudge');
 reset();view=render();view.props.onPointerDownCapture({...event(100,50),isPrimary:false});dispatch('pointerup',event(120,60));flush();assert.equal(writes,0,'secondary touch pointers do not replace the active gesture');
 const find=(tree,predicate)=>{if(!tree||typeof tree!=='object')return null;if(Array.isArray(tree)){for(const child of tree){const value=find(child,predicate);if(value)return value;}return null;}if(predicate(tree))return tree;return find(tree.props?.children,predicate);};
 reset();states[0]=rect(50,20,100,20);states[1]='scale';view=render();find(view,node=>node.props?.className==='arrange-resize-grip').props.onPointerDown(event(100,50));dispatch('pointermove',event(200,70));flush();dispatch('pointerup',event(200,70));flush();assert.equal(current.elementPositions.title.scale,2,'resize handle scales proportionally');assert.equal(histories,1);
 reset();states[0]=rect(50,20,100,20);states[1]='size';view=render();find(view,node=>node.props?.className==='arrange-resize-grip').props.onPointerDown(event(100,50));dispatch('pointerup',event(200,70));flush();assert.equal(current.typography.title.size,40,'dimension mode changes font size instead of placement scale');assert.equal(current.elementPositions.title.scale,1);
 reset();states[0]=rect(0,0,250,100);states[1]='size';view=render('frame');find(view,node=>node.props?.className==='arrange-resize-grip').props.onPointerDown(event(0,0));dispatch('pointerup',event(50,0));flush();assert.equal(current.customWidth,600,'frame dimension resize compensates preview scale');assert.equal(current.customHeight,200);assert.equal(current.widthMode,'fixed');
 console.log('Arrange handlers: quick clicks and jitter at 0.25–2x zoom, portal/control isolation, movement thresholds, touch tolerance, capture-loss rollback, real drag reconciliation under 0.5x preview zoom, single gesture history, Escape rollback, listener cleanup, keyboard nudging, proportional handles and font/frame dimension resizing OK');
} finally {for(const [key,value]of saved){if(value===undefined)delete global[key];else global[key]=value;}}
