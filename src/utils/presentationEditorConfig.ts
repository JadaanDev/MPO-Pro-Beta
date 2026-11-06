import type { ThemeConfig } from "../types/themes";

/** The shared frame editor displays the dimensions used by the presentation. */
export function presentationEditorConfig(config: ThemeConfig): ThemeConfig {
  return { ...config, customWidth: config.bigCustomWidth ?? 0, customHeight: config.bigCustomHeight ?? 0 };
}

/** Keep browser-overlay dimensions intact when editing a Big Studio frame. */
export function applyPresentationEdit(config: ThemeConfig, updater: (view: ThemeConfig) => ThemeConfig): ThemeConfig {
  const view = presentationEditorConfig(config);
  const next = updater(view);
  return {
    ...next,
    customWidth: config.customWidth,
    customHeight: config.customHeight,
    bigCustomWidth: next.customWidth !== view.customWidth ? next.customWidth : next.bigCustomWidth,
    bigCustomHeight: next.customHeight !== view.customHeight ? next.customHeight : next.bigCustomHeight,
  };
}
