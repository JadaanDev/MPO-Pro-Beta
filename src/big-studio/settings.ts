import { BIG_THEMES } from "./themes";
import type { BigSettings } from "./types";
export const BIG_SETTINGS_KEY = "mpo_big_studio_v1";
export function readBigSettings(): BigSettings { try { const raw=JSON.parse(localStorage.getItem(BIG_SETTINGS_KEY) || "{}"); return {themeId:BIG_THEMES.some(t=>t.id===raw.themeId)?raw.themeId:BIG_THEMES[0].id, scale:Number.isFinite(raw.scale)&&raw.scale>=0?raw.scale:1}; } catch {return {themeId:BIG_THEMES[0].id,scale:1};} }
export function writeBigSettings(value:BigSettings) { localStorage.setItem(BIG_SETTINGS_KEY, JSON.stringify(value)); window.dispatchEvent(new Event("mpo-big-settings")); }
