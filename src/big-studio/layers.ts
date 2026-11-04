import { mergeLegacyCss } from "../utils/elementCss";
import { DEFAULT_THEME_CONFIG } from "../types/themes";
import { BIG_THEMES } from "./themes";
import { readBigSettings } from "./settings";
import type { BigLayer, BigProject } from "./types";
export const BIG_PROJECT_KEY = "mpo_big_layers_v1";
export function makeBigLayer(name="Presentation", themeId=BIG_THEMES[0].id):BigLayer {
 const theme=BIG_THEMES.find(t=>t.id===themeId) || BIG_THEMES[0];
 return {id:"big-"+Date.now().toString(36)+Math.random().toString(36).slice(2,7),name,themeId:theme.id,config:{...DEFAULT_THEME_CONFIG,scale:1,customWidth:0,customHeight:0,accentColor:theme.accent,titleFont:undefined,titleSize:undefined,titleWeight:undefined,artistSize:undefined,artistWeight:undefined,albumSize:undefined,showVisualizer:false,showPlaybackStatus:true},customCss:""};
}
export function sanitizeBigLayer(value:unknown):BigLayer | null {
 if(!value || typeof value!=="object") return null;
 const raw=value as Partial<BigLayer>;
 if(typeof raw.id!=="string" || typeof raw.name!=="string" || typeof raw.themeId!=="string") return null;
 const base=makeBigLayer(raw.name,raw.themeId);
 const config={...base.config,...(raw.config && typeof raw.config==="object" ? raw.config : {})};
 const customCss=mergeLegacyCss(typeof raw.customCss==="string"?raw.customCss:"",config.elementCss);
 config.elementCss="";
 return {...base,id:raw.id,name:raw.name,config,customCss,builtTheme:raw.builtTheme};
}
export function readBigProject():BigProject {
 try {const raw=JSON.parse(localStorage.getItem(BIG_PROJECT_KEY)||"null");if(raw && Array.isArray(raw.layers)) { const layers=raw.layers.map(sanitizeBigLayer).filter((v:BigLayer|null):v is BigLayer=>v!==null);if(layers.length) return {layers,activeLayerId:layers.some((layer:BigLayer)=>layer.id===raw.activeLayerId)?raw.activeLayerId:layers[0].id}; }}catch{}
 const old=readBigSettings();const layer=makeBigLayer("Presentation",old.themeId);return {layers:[layer],activeLayerId:layer.id};
}
export function writeBigProject(project:BigProject):void {localStorage.setItem(BIG_PROJECT_KEY,JSON.stringify(project));window.dispatchEvent(new Event("mpo-big-layers"));}
export function receiveBigProject(value:unknown):void {
 if(!value || typeof value!=="object" || !Array.isArray((value as BigProject).layers))return;
 const raw=value as BigProject;
 const layers=raw.layers.map(sanitizeBigLayer).filter((layer):layer is BigLayer=>layer!==null);
 if(!layers.length)return;
 const project={layers,activeLayerId:layers.some(layer=>layer.id===raw.activeLayerId)?raw.activeLayerId:layers[0].id};
 if(JSON.stringify(project)!==localStorage.getItem(BIG_PROJECT_KEY))writeBigProject(project);
}
