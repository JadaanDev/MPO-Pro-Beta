import type { CSSProperties } from "react";
import type { MediaState } from "../types/media";
import type { ThemeConfig } from "../types/themes";
import type { ThemeDefinition, ThemeSurface } from "./schema";
import { ThemeRenderer } from "./ThemeRenderer";
import { themeCanvasSize } from './canvasSizes';

/** Layer dimensions take priority over the theme's per-studio design canvas. */
export function builtThemeSize(theme: ThemeDefinition, surface: ThemeSurface, config: Pick<ThemeConfig, "customWidth" | "customHeight" | "widthMode" | "contentMinWidth" | "contentMaxWidth">) {
  const design = themeCanvasSize(theme, surface);
  const dimension = (custom: number, authored: number | undefined, fallback: number) =>
    Number.isFinite(custom) && custom > 0 ? custom : Number.isFinite(authored) && authored! > 0 ? authored! : fallback;
  return {
    width: config.widthMode==='content' ? Math.max(config.contentMinWidth || 320,config.contentMaxWidth || 600) : dimension(config.customWidth, design.width, design.width),
    height: dimension(config.customHeight, design.height, design.height),
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
