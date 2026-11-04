import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Minus, Plus, X } from "lucide-react";
import { MediaState } from "../types/media";
import { isTauriEnvironment } from "../hooks/useMediaState";
import { BIG_THEMES } from "./themes";
import { readBigSettings, writeBigSettings } from "./settings";
import { useBigLayers } from "./useBigLayers";
import { loadGoogleFont } from "../utils/fontLoader";
import { extractDominantColor } from "../utils/colorExtractor";
import { BigStage } from "./BigStage";
import { BigNumberInput } from "./BigNumberInput";
import "./big-ui.css";
export function BigPresentation({media,artUrl}:{media:MediaState;artUrl:string}) {
 const {project,active,select,chooseTheme}=useBigLayers();
 const [settings,setSettings]=useState(readBigSettings); const [full,setFull]=useState(false); const [error,setError]=useState("");
 const [extractedColor,setExtractedColor]=useState<string | null>(null);
 const [controlsVisible,setControlsVisible]=useState(true); const hideTimer=useRef<number | null>(null);
 const revealControls=useCallback(()=>{setControlsVisible(true);if(hideTimer.current !== null) clearTimeout(hideTimer.current);hideTimer.current=window.setTimeout(()=>setControlsVisible(false),3000)},[]);
 useEffect(()=>{revealControls();return()=>{if(hideTimer.current !== null) clearTimeout(hideTimer.current)}},[revealControls]);
 useEffect(()=>{let cancelled=false;setExtractedColor(null);if(artUrl)extractDominantColor(artUrl).then(color=>{if(!cancelled)setExtractedColor(color)});return()=>{cancelled=true}},[artUrl]);
 useEffect(()=>{const sync=()=>setSettings(readBigSettings());window.addEventListener("storage",sync);window.addEventListener("mpo-big-settings",sync);return()=>{window.removeEventListener("storage",sync);window.removeEventListener("mpo-big-settings",sync)}},[]);
 useEffect(()=>{if(isTauriEnvironment()) import("@tauri-apps/api/core").then(({invoke})=>invoke<boolean>("big_studio_is_fullscreen")).then(setFull).catch(()=>{});const sync=()=>setFull(Boolean(document.fullscreenElement));document.addEventListener("fullscreenchange",sync);return()=>document.removeEventListener("fullscreenchange",sync)},[]);
 const update=(patch:Partial<typeof settings>)=>{const next={...settings,...patch};setSettings(next);writeBigSettings(next)};
 const toggleFull=useCallback(async()=>{try{setError("");if(isTauriEnvironment()){const {invoke}=await import("@tauri-apps/api/core");setFull(await invoke<boolean>("toggle_big_studio_fullscreen"));}else if(document.fullscreenElement){await document.exitFullscreen()}else{await document.documentElement.requestFullscreen()}}catch(e){setError(`Unable to change full screen: ${String(e)}`)}},[]);
 useEffect(()=>{const key=(event:KeyboardEvent)=>{if(event.key==="F11"){event.preventDefault();event.stopPropagation();void toggleFull()}};window.addEventListener("keydown",key,true);return()=>window.removeEventListener("keydown",key,true)},[toggleFull]);
 useEffect(()=>{const fonts=[active.config.titleFont,...Object.values(active.config.typography || {}).map(t=>t?.font)];fonts.forEach(font=>{if(font)loadGoogleFont(font)})},[active.config]);
 const theme=BIG_THEMES.find(t=>t.id===active.themeId)||BIG_THEMES[0];
 return <div className="big-presentation" onPointerMove={revealControls} onKeyDown={revealControls}><BigStage layer={active} theme={theme} media={media} artUrl={artUrl} scale={settings.scale} config={active.config} customCss={active.customCss} extractedColor={extractedColor}/><div className={`big-controls ${controlsVisible ? "" : "big-controls-idle"}`} role="toolbar" aria-label="Presentation controls"><label>Layer<select value={active.id} onChange={e=>select(e.target.value)}>{project.layers.map(layer=><option key={layer.id} value={layer.id}>{layer.name}</option>)}</select></label><label>Theme<select value={theme.id} onChange={e=>chooseTheme(e.target.value)}>{BIG_THEMES.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><div className="big-scale-control"><button aria-label="Decrease scale" onClick={()=>update({scale:Math.max(0,Math.round((settings.scale-.1)*100)/100)})}><Minus size={15}/></button><BigNumberInput label="Presentation scale" unit="%" value={Math.round(settings.scale*10000)/100} onCommit={value=>update({scale:(value ?? 100)/100})}/><button aria-label="Increase scale" onClick={()=>update({scale:Math.round((settings.scale+.1)*100)/100})}><Plus size={15}/></button></div><button className="big-fullscreen" onClick={toggleFull} aria-pressed={full}>{full?<Minimize2 size={15}/>:<Maximize2 size={15}/>} {full?"Exit full screen":"Full screen"} <kbd>F11</kbd></button><button aria-label="Close presentation" onClick={async()=>{if(isTauriEnvironment()){const {invoke}=await import("@tauri-apps/api/core");await invoke("close_big_studio")}else window.close()}}><X size={17}/></button></div>{error && <p className="big-control-error" role="alert">{error}</p>}</div>;
}
