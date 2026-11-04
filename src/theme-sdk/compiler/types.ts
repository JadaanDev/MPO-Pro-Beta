import type React from "react";
import type { MediaState } from "../../types/media";
import type { ThemeSurface } from "../schema";

export interface MpoThemeColors {
  dominant: string;
  contrastText: string;
  accent: string;
  vibrant?: string;
  muted?: string;
}

export interface MpoThemeTime {
  current: string;
  duration: string;
}

export interface MpoThemeProps {
  media: MediaState;
  artUrl: string;
  colors: MpoThemeColors;
  surface: ThemeSurface;
  format: "horizontal" | "vertical";
  progress: number;
  formattedTime: MpoThemeTime;
  config?: Record<string, any>;
}

export interface ThemeManifest {
  schemaVersion: 2;
  id: string;
  name: string;
  version?: string;
  author?: string;
  description?: string;
  targetStudios?: ThemeSurface[];
  entryPoint?: string; // default "Theme.tsx"
  dependencies?: Record<string, string>; // e.g. "canvas-confetti": "https://esm.sh/canvas-confetti"
  stylesheets?: string[];
  configSchema?: Record<string, {
    type: "string" | "number" | "boolean" | "color";
    label: string;
    default: any;
  }>;
}

export interface ThemeBundle {
  schemaVersion: 2;
  manifest: ThemeManifest;
  files: Record<string, string>; // filename -> code ("Theme.tsx", "Visualizer.tsx", "style.css", "manifest.json")
}

export interface CompilationDiagnostic {
  file: string;
  line?: number;
  column?: number;
  message: string;
  severity: "error" | "warning";
}

export interface CompilationResult {
  success: boolean;
  Component?: React.ComponentType<MpoThemeProps>;
  scopedCss?: string;
  diagnostics: CompilationDiagnostic[];
  compilationTimeMs: number;
}

