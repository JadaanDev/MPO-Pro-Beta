import { ThemeConfig } from "../types/themes";
import type { ThemeDefinition } from "../theme-sdk/schema";
export interface BigTheme { id:string; name:string; description:string; label:string; className:string; accent:string }
export interface BigSettings { themeId:string; scale:number }
export interface BigLayer { id:string; name:string; themeId:string; config:ThemeConfig; customCss:string; builtTheme?:ThemeDefinition }
export interface BigProject { layers:BigLayer[]; activeLayerId:string }
