/** Declarative theme data. Coordinates and dimensions are percentages of the canvas. */
export const THEME_SURFACES = ["obs", "tiktok", "desktop", "big"] as const;
export const ELEMENT_TYPES = ["artwork", "title", "artist", "album", "progress", "source", "status", "text"] as const;
export type ThemeSurface = typeof THEME_SURFACES[number];
export type ElementType = typeof ELEMENT_TYPES[number];

export interface ThemeCanvasConfig {
  background?: string;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  backdropBlur?: number;
  boxShadow?: string;
}

export interface ThemeElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number | string;
  textAlign?: "left" | "center" | "right";
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  letterSpacing?: string;
  borderRadius?: number;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  opacity?: number;
  spinning?: boolean;
  glow?: boolean;
  customText?: string;
  playingText?: string;
  pausedText?: string;
}

import type { ThemeBundle } from "./compiler/types";

export interface ThemeDefinition {
  schemaVersion: 1;
  id: string;
  name: string;
  elements: ThemeElement[];
  layouts?: Partial<Record<ThemeSurface, ThemeElement[]>>;
  canvas?: ThemeCanvasConfig;
  sizingVersion?: 1;
  canvasSizes?: Partial<Record<ThemeSurface, { width: number; height: number }>>;
  bundle?: ThemeBundle;
  /** Retained source extras for visual projects; does not switch the renderer. */
  sourceBundle?: ThemeBundle;
}

/** Reject invalid data instead of silently losing a saved theme or layer. */
export function validateThemeDefinition(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return ["Theme must be an object."];
  const theme = value as Record<string, unknown>;
  const errors: string[] = [];
  if (theme.schemaVersion !== 1) errors.push("Unsupported schema version.");
  if (typeof theme.id !== "string" || !theme.id.trim()) errors.push("Theme ID is required.");
  if (typeof theme.name !== "string" || !theme.name.trim()) errors.push("Theme name is required.");
  const checkElements = (value: unknown, path: string) => {
    if (!Array.isArray(value)) { errors.push(`${path} must be an array.`); return; }
    const ids = new Set<string>();
    value.forEach((entry, index) => {
      const location = `${path}[${index}]`;
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) { errors.push(`${location} must be an object.`); return; }
      const element = entry as Record<string, unknown>;
      if (typeof element.id !== "string" || !element.id.trim() || ids.has(element.id)) errors.push(`${location} needs a unique ID.`);
      else ids.add(element.id);
      if (!ELEMENT_TYPES.includes(element.type as ElementType)) errors.push(`${location} has an unsupported type.`);
      for (const key of ["x", "y", "width", "height"]) {
        const number = element[key];
        if (typeof number !== "number" || !Number.isFinite(number) || number < 0 || number > 100) errors.push(`${location}.${key} must be between 0 and 100.`);
      }
      if (typeof element.visible !== "boolean") errors.push(`${location}.visible must be a boolean.`);
      if (element.color !== undefined && (typeof element.color !== "string" || !/^#[0-9a-f]{6}$/i.test(element.color))) errors.push(`${location}.color must be a hex color.`);
      if (element.fontSize !== undefined && (typeof element.fontSize !== "number" || !Number.isFinite(element.fontSize) || element.fontSize <= 0 || element.fontSize > 500)) errors.push(`${location}.fontSize must be between 0 and 500.`);
    });
  };
  checkElements(theme.elements, "elements");
  if (theme.layouts !== undefined) {
    if (!theme.layouts || typeof theme.layouts !== "object" || Array.isArray(theme.layouts)) errors.push("layouts must be an object.");
    else for (const [surface, elements] of Object.entries(theme.layouts)) {
      if (!THEME_SURFACES.includes(surface as ThemeSurface)) errors.push(`Unsupported surface: ${surface}.`);
      else checkElements(elements, `layouts.${surface}`);
    }
  }
  if (theme.bundle !== undefined) {
    if (!theme.bundle || typeof theme.bundle !== "object" || Array.isArray(theme.bundle)) {
      errors.push("bundle must be an object.");
    } else {
      const b = theme.bundle as Record<string, unknown>;
      if (!b.manifest || typeof b.manifest !== "object") errors.push("bundle.manifest is required.");
      if (!b.files || typeof b.files !== "object") errors.push("bundle.files is required.");
    }
  }
  for (const value of [theme.canvasSizes, (theme.bundle as ThemeBundle | undefined)?.manifest?.canvasSizes]) {
    if (value === undefined) continue;
    if (!value || typeof value !== 'object' || Array.isArray(value)) { errors.push('canvasSizes must be an object.'); continue; }
    for (const [surface, size] of Object.entries(value)) {
      if (!THEME_SURFACES.includes(surface as ThemeSurface) || !size || ![size.width, size.height].every(n => typeof n === 'number' && Number.isFinite(n) && n > 0)) errors.push('Canvas dimensions must be positive finite numbers for a supported studio.');
    }
  }
  return errors;
}
