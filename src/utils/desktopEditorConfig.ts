import { ThemeConfig } from "../types/themes";

/** Present the values actually used by the desktop layer, including legacy overrides. */
export function desktopEditorConfig(config: ThemeConfig): ThemeConfig {
  if (!config.useSeparateDesktopSize) return config;
  return { ...config, scale: config.desktopScale ?? config.scale, customWidth: config.desktopCustomWidth ?? config.customWidth, customHeight: config.desktopCustomHeight ?? config.customHeight };
}

/** Route edits of displayed desktop dimensions to their active fields, preserving base dimensions. */
export function applyDesktopEdit(config: ThemeConfig, updater: (view: ThemeConfig) => ThemeConfig): ThemeConfig {
  const view = desktopEditorConfig(config);
  const next = updater(view);
  if (!config.useSeparateDesktopSize) return next;
  return {
    ...next,
    scale: config.scale,
    customWidth: config.customWidth,
    customHeight: config.customHeight,
    desktopScale: next.scale !== view.scale ? next.scale : next.desktopScale,
    desktopCustomWidth: next.customWidth !== view.customWidth ? next.customWidth : next.desktopCustomWidth,
    desktopCustomHeight: next.customHeight !== view.customHeight ? next.customHeight : next.desktopCustomHeight,
  };
}

/** A HUD grip preserves stream sizes by enabling independent desktop scale. */
export function resizedDesktopConfig(config:ThemeConfig,scale:number):ThemeConfig {
  if(!Number.isFinite(scale)||scale<=0)return config;
  return {...config,useSeparateDesktopSize:true,desktopScale:scale,desktopCustomWidth:config.useSeparateDesktopSize?config.desktopCustomWidth??config.customWidth:config.customWidth,desktopCustomHeight:config.useSeparateDesktopSize?config.desktopCustomHeight??config.customHeight:config.customHeight};
}
