/** Versioned, declarative theme definitions shared by the editor and renderers. */
export const THEME_SURFACES = ["obs", "tiktok", "desktop", "big"] as const;
export type ThemeSurface = typeof THEME_SURFACES[number];
export const ELEMENT_TYPES = ["artwork", "title", "artist", "album", "progress", "badge", "status"] as const;
export type ThemeElementType = typeof ELEMENT_TYPES[number];

export interface ThemeElement {
  id: string;
  type: ThemeElementType;
  /** Percentages of the theme canvas. */
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  color?: string;
  fontSize?: number;
}
export interface ThemeDefinition {
  schemaVersion: 1;
  id: string;
  name: string;
  elements: ThemeElement[];
  /** A complete layout replaces the default for that surface. */
  layouts?: Partial<Record<ThemeSurface, ThemeElement[]>>;
}

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const isElement = (value: unknown): value is ThemeElement => {
  if (!isRecord(value) || typeof value.id !== "string" || !value.id.trim() ||
      !ELEMENT_TYPES.includes(value.type as ThemeElementType) || typeof value.visible !== "boolean") return false;
  if (![value.x, value.y, value.width, value.height].every(n => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 100)) return false;
  if ((value.x as number) + (value.width as number) > 100 || (value.y as number) + (value.height as number) > 100) return false;
  if (value.color !== undefined && (typeof value.color !== "string" || !/^#[0-9a-f]{6}$/i.test(value.color))) return false;
  return value.fontSize === undefined || (typeof value.fontSize === "number" && Number.isFinite(value.fontSize) && value.fontSize >= 1 && value.fontSize <= 200);
};
const isLayout = (value: unknown): value is ThemeElement[] => Array.isArray(value) && value.length <= 50 && value.every(isElement) && new Set(value.map(e => e.id)).size === value.length;

/** Reject malformed definitions instead of silently discarding user data. */
export function isThemeDefinition(value: unknown): value is ThemeDefinition {
  if (!isRecord(value) || value.schemaVersion !== 1 || typeof value.id !== "string" || !value.id.trim() ||
      typeof value.name !== "string" || !value.name.trim() || !isLayout(value.elements)) return false;
  if (value.layouts === undefined) return true;
  if (!isRecord(value.layouts)) return false;
  return Object.entries(value.layouts).every(([surface, layout]) => THEME_SURFACES.includes(surface as ThemeSurface) && isLayout(layout));
}

export function layoutForSurface(theme: ThemeDefinition, surface: ThemeSurface): ThemeElement[] {
  return theme.layouts?.[surface] ?? theme.elements;
}
