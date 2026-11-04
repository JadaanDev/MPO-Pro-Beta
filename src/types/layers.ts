import { mergeLegacyCss } from "../utils/elementCss";
import { ThemeConfig, ThemeId, LayerFormat, DEFAULT_THEME_CONFIG } from "./themes";
import type { ThemeDefinition } from "../theme-sdk/schema";

export type { LayerFormat };

export interface Layer {
  id: string;
  name: string;
  format: LayerFormat;
  themeId: ThemeId;
  builtTheme?: ThemeDefinition;
  config: ThemeConfig;
  formatConfigs?: {
    horizontal?: ThemeConfig;
    vertical?: ThemeConfig;
  };
  customCss: string;
  isDesktop?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  description: string;
  layers: Layer[];
  activeLayerId: string;
}

export const DEFAULT_LAYERS: Layer[] = [
  {
    id: "default-horizontal",
    name: "Twitch / YouTube (16:9)",
    format: "horizontal",
    themeId: "obs-signal-desk",
    config: { ...DEFAULT_THEME_CONFIG },
    customCss: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "tiktok-vertical",
    name: "TikTok Live Studio (9:16)",
    format: "vertical",
    themeId: "tiktok-aurora",
    config: {
      ...DEFAULT_THEME_CONFIG,
      scale: 1.0,
      customWidth: 0,
      customHeight: 0,
      accentColor: "#00f0ff",
      autoAlbumColor: true,
    },
    customCss: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "minimal-zen",
    name: "Zen Gaming Capsule",
    format: "horizontal",
    themeId: "zen-mono",
    config: {
      ...DEFAULT_THEME_CONFIG,
      scale: 0.95,
      accentColor: "#ffffff",
      highContrast: true,
      showAlbum: false,
    },
    customCss: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "desktop-hud",
    name: "Desktop Floating HUD",
    format: "horizontal",
    themeId: "apple-music-live",
    config: {
      ...DEFAULT_THEME_CONFIG,
      scale: 0.95,
      customWidth: 490,
      customHeight: 0,
      accentColor: "#fa2d48",
      autoAlbumColor: true,
      highContrast: false,
    },
    customCss: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

export const DEFAULT_DESKTOP_LAYERS: Layer[] = [
  {
    id: "desktop-hud",
    name: "Air (Default)",
    format: "horizontal",
    themeId: "desktop-air",
    isDesktop: true,
    config: {
      ...DEFAULT_THEME_CONFIG,
      scale: 1.0,
      customWidth: 0,
      customHeight: 0,
      accentColor: "#fa2d48",
      autoAlbumColor: true,
      highContrast: false,
    },
    customCss: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "desktop-cyber",
    name: "Cyberpunk Neon HUD",
    format: "horizontal",
    themeId: "cyber-hud",
    isDesktop: true,
    config: {
      ...DEFAULT_THEME_CONFIG,
      scale: 0.95,
      customWidth: 480,
      customHeight: 0,
      accentColor: "#00f0ff",
      autoAlbumColor: false,
    },
    customCss: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "desktop-minimal",
    name: "Minimalist Floating Card",
    format: "horizontal",
    themeId: "zen-mono",
    isDesktop: true,
    config: {
      ...DEFAULT_THEME_CONFIG,
      scale: 0.9,
      customWidth: 420,
      customHeight: 0,
      accentColor: "#ffffff",
      highContrast: true,
      showAlbum: false,
    },
    customCss: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

export function sanitizeDesktopLayers(raw: unknown): Layer[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_DESKTOP_LAYERS;
  }

  const sanitized: Layer[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const l = item as Record<string, any>;
    const id = typeof l.id === "string" && l.id.trim() ? l.id : `desktop-layer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const fallback = DEFAULT_DESKTOP_LAYERS.find((dl) => dl.id === id) || DEFAULT_DESKTOP_LAYERS[0];
    const name = typeof l.name === "string" && l.name.trim() ? l.name : fallback.name;
    const format: LayerFormat = "horizontal";
    const themeId: ThemeId = typeof l.themeId === "string" && l.themeId ? (l.themeId as ThemeId) : fallback.themeId;

    const rawConfig = typeof l.config === "object" && l.config !== null ? l.config : {};
    const config: ThemeConfig = {
      ...DEFAULT_THEME_CONFIG,
      ...(fallback.config || {}),
      ...rawConfig,
    };

    const legacyElementCss = config.elementCss;
    config.elementCss = "";
    sanitized.push({
      id,
      name,
      format,
      themeId,
      builtTheme: l.builtTheme,
      isDesktop: true,
      config,
      customCss: mergeLegacyCss(typeof l.customCss === "string" ? l.customCss : "", legacyElementCss),
      createdAt: typeof l.createdAt === "number" ? l.createdAt : Date.now(),
      updatedAt: typeof l.updatedAt === "number" ? l.updatedAt : Date.now(),
    });
  }

  return sanitized.length > 0 ? sanitized : DEFAULT_DESKTOP_LAYERS;
}

/**
 * Sanitizes and validates layer data from any source (localStorage, API, WebSocket, JSON import).
 * Fills in missing themeId, format, or config properties with defaults, preventing any crash.
 * Guarantees that the dedicated desktop-hud layer is always present.
 */
export function sanitizeLayers(raw: unknown): Layer[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_LAYERS;
  }

  const sanitized: Layer[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const l = item as Record<string, any>;
    const id = typeof l.id === "string" && l.id.trim() ? l.id : `layer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const fallback = DEFAULT_LAYERS.find((dl) => dl.id === id) || DEFAULT_LAYERS[0];
    const name = typeof l.name === "string" && l.name.trim() ? l.name : fallback.name;
    const format: LayerFormat = l.format === "vertical" ? "vertical" : "horizontal";
    const themeId: ThemeId = typeof l.themeId === "string" && l.themeId ? (l.themeId as ThemeId) : fallback.themeId;

    const rawConfig = typeof l.config === "object" && l.config !== null ? l.config : {};
    const config: ThemeConfig = {
      ...DEFAULT_THEME_CONFIG,
      ...(fallback.config || {}),
      ...rawConfig,
    };

    const legacyElementCss = config.elementCss;
    config.elementCss = "";
    sanitized.push({
      id,
      name,
      format,
      themeId,
      builtTheme: l.builtTheme,
      config,
      customCss: mergeLegacyCss(typeof l.customCss === "string" ? l.customCss : "", legacyElementCss),
      createdAt: typeof l.createdAt === "number" ? l.createdAt : Date.now(),
      updatedAt: typeof l.updatedAt === "number" ? l.updatedAt : Date.now(),
    });
  }

  // Ensure dedicated desktop-hud layer is always present
  if (!sanitized.some((l) => l.id === "desktop-hud")) {
    const defaultDesktopLayer = DEFAULT_LAYERS.find((l) => l.id === "desktop-hud");
    if (defaultDesktopLayer) {
      sanitized.push(defaultDesktopLayer);
    }
  }

  return sanitized.length > 0 ? sanitized : DEFAULT_LAYERS;
}
