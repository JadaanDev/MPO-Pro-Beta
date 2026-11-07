import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ArrangeCanvas} from '../../src/components/dashboard/ArrangeCanvas';
import {LayoutSizingControls} from '../../src/components/dashboard/LayoutSizingControls';
import {TypographyControls} from '../../src/components/dashboard/TypographyControls';
import {AutoFitPreview} from '../../src/components/dashboard/AutoFitPreview';
import {BuiltThemeMount} from '../../src/theme-sdk/BuiltThemeMount';
import {ThemeBuilderPage} from '../../src/theme-sdk/pages/ThemeBuilderPage';
import {AeroGlass} from '../../src/themes/AeroGlass';
import {BigStage} from '../../src/big-studio/BigStage';
import {BigPreview} from '../../src/big-studio/BigPreview';
import {DesktopOverlayWidget} from '../../src/components/overlay/DesktopOverlayWidget';
import {generateEffectiveThemeCss} from '../../src/utils/ThemeStyleEngine';
import {MOCK_MEDIA_STATE} from '../../src/types/media';
import {DEFAULT_THEME_CONFIG} from '../../src/types/themes';
import type {ThemeDefinition,ThemeSurface} from '../../src/theme-sdk/schema';
import type {ArrangeRole} from '../../src/utils/themeRoles';
import '../../src/styles/themes.css';
import '../../src/styles/dashboard/overlay/desktop-hud.css';
const visual:ThemeDefinition={schemaVersion:1,id:'visual-fixture',name:'Visual fixture',elements:[{id:'artwork',type:'artwork',x:4,y:20,width:18,height:55,visible:true},{id:'title',type:'title',x:27,y:20,width:65,height:25,visible:true,fontSize:24},{id:'artist',type:'artist',x:27,y:48,width:65,height:20,visible:true,fontSize:16}]};
const compiled:ThemeDefinition={...visual,id:'compiled-fixture',name:'Compiled fixture',bundle:{schemaVersion:2,manifest:{schemaVersion:2,id:'compiled-fixture',name:'Compiled fixture'},files:{'Theme.tsx':'export default function Theme({media}){return <div data-theme-role="frame" style={{width:"100%",height:"100%",position:"relative",background:"rgba(40,48,70,.9)",border:"1px solid #aaa",borderRadius:20,boxSizing:"border-box"}}><div data-theme-role="artwork" style={{position:"absolute",left:"4%",top:"20%",width:"18%",height:"55%",background:"#8874cc",borderRadius:12}}/><div data-theme-role="title" style={{position:"absolute",left:"27%",top:"20%",width:"65%",height:"25%",fontSize:24,whiteSpace:"nowrap",overflow:"hidden"}}>{media.title}</div><div data-theme-role="artist" style={{position:"absolute",left:"27%",top:"48%",width:"65%",fontSize:16}}>{media.artist}</div></div>}'}}};
localStorage.setItem('mpo_theme_library_v1',JSON.stringify([visual]));
const fetchOriginal=window.fetch.bind(window);window.fetch=(...args)=>String(args[0]).includes(':4849/api/themes')?Promise.resolve(new Response('[]',{headers:{'Content-Type':'application/json'}})):fetchOriginal(...args);
function App(){
 const [kind,setKind]=useState('compiled'),[surface,setSurface]=useState<ThemeSurface>('desktop'),[selected,setSelected]=useState<ArrangeRole|null>('title');
 const [config,setConfig]=useState({...DEFAULT_THEME_CONFIG,customWidth:500,customHeight:180,titleSize:24,layoutBoundary:'legacy' as const});
 const [title,setTitle]=useState('A long song title with enough words to overflow the available track title area'),[commits,setCommits]=useState(0),[sourceSize,setSourceSize]=useState({width:0,height:0}),[hudSaved,setHudSaved]=useState(1);
 const media={...MOCK_MEDIA_STATE,title,status:'Paused' as const};
 const content=kind==='native'?<AeroGlass media={media} artUrl="" config={config}/>:<BuiltThemeMount theme={kind==='compiled'?compiled:visual} surface={surface} media={media} artUrl="" config={config}/>;
 if(kind==='builder')return <><button onClick={()=>setKind('compiled')}>Back to sizing checks</button><div style={{height:650}}><ThemeBuilderPage media={media} artUrl="" onRouteToStudio={()=>setKind('declarative')}/></div></>;
 return <main className="fixture-main"><h1>Beta 14 sizing and Arrange check</h1><div className="fixture-toolbar"><label>Renderer <select aria-label="Renderer" value={kind} onChange={e=>setKind(e.target.value)}>{['native','compiled','declarative','big','hud','builder'].map(k=><option key={k}>{k}</option>)}</select></label><label>Studio <select aria-label="Studio" value={surface} onChange={e=>setSurface(e.target.value as ThemeSurface)}>{['obs','tiktok','desktop','big'].map(k=><option key={k}>{k}</option>)}</select></label><button onClick={()=>setTitle('Stay')}>Short title</button><button onClick={()=>setTitle('A very long song title with enough words to overflow every practical overlay card width')}>Long title</button><button onClick={()=>setTitle('أغنية طويلة جداً لاختبار اتجاه النص والحركة وتغيير حجم الخط العربي')}>RTL title</button><button onClick={()=>setConfig(c=>({...c,elementPositions:{title:{x:-180,y:110,scale:1}}}))}>Move beyond frame</button><button onClick={()=>setConfig(c=>({...c,elementPositions:{}}))}>Reset placement</button></div>
 <div className="fixture-workspace"><aside><LayoutSizingControls config={config} onChange={setConfig}/><TypographyControls selected="title" config={config} onConfigChange={setConfig}/><label>Selected element <select aria-label="Selected element" value={selected||'title'} onChange={e=>setSelected(e.target.value as ArrangeRole)}>{['title','artwork','frame','artist'].map(v=><option key={v}>{v}</option>)}</select></label></aside>
 <section><output>Capture: {sourceSize.width} × {sourceSize.height}; completed gestures: {commits}; HUD saved scale: {hudSaved}</output>
 <ArrangeCanvas enabled selected={selected} onSelect={setSelected} config={config} onConfigChange={setConfig} onCommitHistory={()=>setCommits(c=>c+1)} layerKey={kind+surface} className="fixture-canvas arrange-mode">
 {kind==='big'?<BigPreview><BigStage media={media} artUrl="" config={config}/></BigPreview>:<AutoFitPreview config={config} configScale={config.scale} contentKey={JSON.stringify(config)} onContentSize={setSourceSize}><div className="single-preview-mount preview-canvas-scope"><style>{generateEffectiveThemeCss(config,'horizontal')}</style>{kind==='hud'?<DesktopOverlayWidget scale={config.scale} onScaleCancel={()=>setConfig(c=>({...c,scale:hudSaved}))} onScaleChange={(scale,persist)=>{setConfig(c=>({...c,scale}));if(persist)setHudSaved(scale);}}>{content}</DesktopOverlayWidget>:content}</div></AutoFitPreview>}
 </ArrangeCanvas><pre data-testid="config">{JSON.stringify(config,null,2)}</pre></section></div></main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
