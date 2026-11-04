import {useCallback,useEffect,useRef,useState} from "react";
import {readBigProject,writeBigProject,makeBigLayer,sanitizeBigLayer} from "./layers";
import {BIG_THEMES} from "./themes";
import type {BigLayer,BigProject} from "./types";
import {LIBRARY_EVENT,libraryForSync,refreshBuiltTheme} from "../theme-sdk/library";
export function useBigLayers() {
 const [project,setProject]=useState(readBigProject); const projectRef=useRef(project);
 useEffect(()=>{try{if(!localStorage.getItem("mpo_big_layers_v1")) writeBigProject(projectRef.current)}catch{}},[]);
 useEffect(()=>{const sync=()=>{const next=readBigProject();projectRef.current=next;setProject(next)};window.addEventListener("storage",sync);window.addEventListener("mpo-big-layers",sync);return()=>{window.removeEventListener("storage",sync);window.removeEventListener("mpo-big-layers",sync)}},[]);
 const pushToServer=useCallback((proj:BigProject)=>{
  try {
   const base = typeof window !== "undefined" && (window.location.port === "4849" || window.location.hostname === "mpobeta.local") ? `${window.location.protocol}//${window.location.host}` : "http://127.0.0.1:4849";
   const layersRaw = localStorage.getItem("mpo_layers_v2");
   const desktopRaw = localStorage.getItem("mpo_desktop_layers_v1");
   fetch(`${base}/api/layers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
     layers: layersRaw ? JSON.parse(layersRaw) : undefined,
     activeLayerId: localStorage.getItem("mpo_active_layer_id_v2") || undefined,
     activeHorizontalLayerId: localStorage.getItem("mpo_active_horizontal_layer_id_v1") || undefined,
     activeVerticalLayerId: localStorage.getItem("mpo_active_vertical_layer_id_v1") || undefined,
     desktopLayers: desktopRaw ? JSON.parse(desktopRaw) : undefined,
     activeDesktopLayerId: localStorage.getItem("mpo_active_desktop_layer_id_v1") || undefined,
     bigProject: proj,
     themeLibrary: libraryForSync(),
    }),
   }).catch(() => {});
  } catch {}
 },[]);
 const change=useCallback((updater:(current:BigProject)=>BigProject)=>{const next=updater(projectRef.current);projectRef.current=next;setProject(next);writeBigProject(next);pushToServer(next)},[pushToServer]);
 useEffect(()=>{const sync=()=>{const themes=libraryForSync();if(!themes)return;const next={...projectRef.current,layers:projectRef.current.layers.map(layer=>refreshBuiltTheme(layer,themes))};projectRef.current=next;setProject(next);writeBigProject(next)};window.addEventListener(LIBRARY_EVENT,sync);return()=>window.removeEventListener(LIBRARY_EVENT,sync)},[]);
 const active=project.layers.find(l=>l.id===project.activeLayerId) || project.layers[0];
 const update=(fn:(old:BigLayer)=>BigLayer)=>change(p=>({...p,layers:p.layers.map(l=>l.id===p.activeLayerId?fn(l):l)}));
 const select=(id:string)=>change(p=>p.layers.some(l=>l.id===id)?{...p,activeLayerId:id}:p);
 const create=()=>change(p=>{const l=makeBigLayer("Presentation " +(p.layers.length+1));return {layers:[...p.layers,l],activeLayerId:l.id}});
 const duplicate=(id:string)=>change(p=>{const source=p.layers.find(l=>l.id===id);if(!source)return p;const next={...source,id:makeBigLayer().id,name:source.name+" (Copy)"};return {layers:[...p.layers,next],activeLayerId:next.id}});
 const rename=(id:string,name:string)=>{if(name.trim())change(p=>({...p,layers:p.layers.map(l=>l.id===id?{...l,name:name.trim()}:l)}))};
 const remove=(id:string)=>change(p=>{if(p.layers.length<=1)return p;const layers=p.layers.filter(l=>l.id!==id);return {layers,activeLayerId:p.activeLayerId===id?layers[0].id:p.activeLayerId}});
 const chooseTheme=(id:string)=>{const theme=BIG_THEMES.find(t=>t.id===id);if(theme)update(l=>{const previous=BIG_THEMES.find(t=>t.id===l.themeId);const usingThemeAccent=!l.config.accentColor || l.config.accentColor === previous?.accent;return {...l,themeId:id,builtTheme:undefined,config:{...l.config,accentColor:usingThemeAccent ? theme.accent : l.config.accentColor}}})};
 const importLayer=(value:unknown)=>{const parsed=sanitizeBigLayer(value);if(!parsed)return false;const imported={...parsed,id:makeBigLayer().id};change(p=>({layers:[...p.layers,imported],activeLayerId:imported.id}));return true};
 return {project,active,update,select,create,duplicate,rename,remove,chooseTheme,importLayer};
}
export function exportBigLayer(layer:BigLayer){const url=URL.createObjectURL(new Blob([JSON.stringify({type:"mpo-big-layer",version:1,layer},null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download=(layer.name.replace(/[^a-z0-9_-]+/gi,"-")||"big-layer")+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
