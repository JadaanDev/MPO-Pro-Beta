import { validateThemeDefinition, type ThemeDefinition } from "./schema";
import { migrateThemeCanvases } from './canvasSizes';
export const LIBRARY_KEY = "mpo_theme_library_v1";
export const LIBRARY_EVENT = "mpo-theme-library";
export function readThemeLibrary(): ThemeDefinition[] {
  const raw: unknown = JSON.parse(localStorage.getItem(LIBRARY_KEY) || "[]");
  if (!Array.isArray(raw) || raw.some(theme => validateThemeDefinition(theme).length) || new Set(raw.map(t=>t.id)).size !== raw.length) throw Error("The saved theme library is invalid. Export or repair the saved data before replacing it.");
  return raw.map(migrateThemeCanvases);
}
export function writeThemeLibrary(themes: ThemeDefinition[]) {
  if (themes.some(theme => validateThemeDefinition(theme).length) || new Set(themes.map(t=>t.id)).size !== themes.length) throw Error("Invalid theme library.");
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(themes));
  window.dispatchEvent(new Event(LIBRARY_EVENT));
}
export function receiveThemeLibrary(value: unknown) {
  if (!Array.isArray(value) || value.some(theme => validateThemeDefinition(theme).length) || new Set(value.map(t=>t.id)).size !== value.length) return;
  if (JSON.stringify(value) !== localStorage.getItem(LIBRARY_KEY)) writeThemeLibrary(value);
}
export function libraryForSync(): ThemeDefinition[] | undefined { try { return readThemeLibrary(); } catch { return undefined; } }
export function refreshBuiltTheme<T extends {builtTheme?: ThemeDefinition}>(layer: T, themes: ThemeDefinition[]): T {
  const saved = themes.find(theme=>theme.id === layer.builtTheme?.id);
  return saved ? {...layer,builtTheme:saved} : layer;
}
