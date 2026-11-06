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
export interface MpoTextFit {
    overflow?: "theme" | "ellipsis" | "shrink" | "marquee";
    minSize?: number;
    marqueeSpeed?: number;
}
export interface MpoLayoutControls {
    layoutBoundary?: "legacy" | "constrain" | "overflow" | "grow";
    widthMode?: "fixed" | "content";
    contentMinWidth?: number;
    contentMaxWidth?: number;
    typography?: Partial<Record<"title" | "artist" | "album" | "themeLabel" | "badge" | "status" | "timestamps", MpoTextFit & Record<string, any>>>;
}
export interface MpoThemeProps {
    /** Shared projected position. Do not run another playback timer. */
    media: MediaState;
    /** Backend publication, including timeline.raw_observation when available. */
    rawMedia?: MediaState;
    timeline?: {
        positionKnown: boolean;
        durationKnown: boolean;
        kind: 'finite' | 'live' | 'unknown';
        state: 'determinate' | 'elapsed' | 'unavailable';
    };
    artUrl: string;
    colors: MpoThemeColors;
    surface: ThemeSurface;
    format: "horizontal" | "vertical";
    progress: number;
    formattedTime: MpoThemeTime;
    config?: Record<string, any> & MpoLayoutControls;
}
export interface ThemeManifest {
    schemaVersion: 2;
    id: string;
    name: string;
    version?: string;
    author?: string;
    description?: string;
    targetStudios?: ThemeSurface[];
    canvasSizes?: Partial<Record<ThemeSurface, {
        width: number;
        height: number;
    }>>;
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
