import type { ThemeDefinition, ThemeSurface } from './schema';
export const DEFAULT_THEME_CANVAS_SIZES = {
    obs: { width: 640, height: 180 }, tiktok: { width: 360, height: 640 },
    desktop: { width: 490, height: 180 }, big: { width: 1280, height: 720 },
};
export type CanvasSize = {
    width: number;
    height: number;
};
export function validCanvasSize(size: CanvasSize | undefined): size is CanvasSize {
    return !!size && Number.isFinite(size.width) && size.width > 0 && Number.isFinite(size.height) && size.height > 0;
}
/** Manifest values win for compiled themes; legacy defaults preserve live output. */
export function themeCanvasSize(theme: ThemeDefinition | null, surface: ThemeSurface): CanvasSize {
    const authored = theme?.bundle?.manifest.canvasSizes?.[surface] || theme?.canvasSizes?.[surface];
    return validCanvasSize(authored) ? authored : DEFAULT_THEME_CANVAS_SIZES[surface];
}
export function migrateThemeCanvases(theme: ThemeDefinition): ThemeDefinition {
    if (theme.sizingVersion === 1)
        return theme;
    const canvasSizes = Object.fromEntries(Object.keys(DEFAULT_THEME_CANVAS_SIZES).map(surface => [surface, themeCanvasSize(theme, surface as ThemeSurface)]));
    return { ...theme, sizingVersion: 1, canvasSizes };
}
export function setThemeCanvasSize(theme: ThemeDefinition, surface: ThemeSurface, size: CanvasSize): ThemeDefinition {
    if (!validCanvasSize(size))
        return theme;
    const next = migrateThemeCanvases(theme);
    const canvasSizes = { ...next.canvasSizes, [surface]: size };
    if (!next.bundle)
        return { ...next, canvasSizes };
    const manifest = { ...next.bundle.manifest, canvasSizes: { ...next.bundle.manifest.canvasSizes, [surface]: size } };
    return { ...next, canvasSizes, bundle: { ...next.bundle, manifest, files: { ...next.bundle.files, 'manifest.json': JSON.stringify(manifest, null, 2) } } };
}
