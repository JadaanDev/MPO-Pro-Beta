import type { CSSProperties } from "react";
import type { MediaState } from "../types/media";
import type { ThemeConfig } from "../types/themes";
import type { ThemeDefinition, ThemeSurface } from "./schema";
import { ThemeRenderer } from "./ThemeRenderer";

const DEFAULT_CANVASES: Record<ThemeSurface, { width: number; height: number }> = {
  obs: { width: 640, height: 180 }, tiktok: { width: 360, height: 640 },
  desktop: { width: 490, height: 180 }, big: { width: 1280, height: 720 },
};

/** Layer dimensions take priority over the theme's per-studio design canvas. */
export function builtThemeSize(theme: ThemeDefinition, surface: ThemeSurface, config: Pick<ThemeConfig, "customWidth" | "customHeight">) {
  const design = theme.bundle?.manifest.canvasSizes?.[surface];
  const dimension = (custom: number, authored: number | undefined, fallback: number) =>
    Number.isFinite(custom) && custom > 0 ? custom : Number.isFinite(authored) && authored! > 0 ? authored! : fallback;
  return {
    width: dimension(config.customWidth, design?.width, DEFAULT_CANVASES[surface].width),
    height: dimension(config.customHeight, design?.height, DEFAULT_CANVASES[surface].height),
  };
}

/** All studios render SDK themes inside an explicit, unscaled layout canvas. */
export function BuiltThemeMount({ theme, surface, media, artUrl, config, extractedColor, customCss, scale = config.scale, fill = false }: {
  theme: ThemeDefinition; surface: ThemeSurface; media: MediaState; artUrl: string;
  config: ThemeConfig; extractedColor?: string | null; customCss?: string; scale?: number; fill?: boolean;
}) {
  const size = builtThemeSize(theme, surface, config);
  return <div className="mpo-theme-container mpo-built-theme-mount" data-theme-layout-root data-theme-surface={surface} style={{
    width: fill && !(config.customWidth > 0) ? "100%" : size.width,
    height: fill && !(config.customHeight > 0) ? "100%" : size.height,
    minWidth: 0, minHeight: 0, maxWidth: "none", maxHeight: "none", flex: "none",
    transform: `scale(${Number.isFinite(scale) ? Math.max(0, scale) : 1})`, transformOrigin: "center",
    overflow: "visible", boxSizing: "border-box",
  } as CSSProperties}>
    <ThemeRenderer theme={theme} surface={surface} media={media} artUrl={artUrl} config={config} extractedColor={extractedColor} customCss={customCss}/>
  </div>;
}
