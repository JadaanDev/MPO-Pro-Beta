import { ThemeConfig } from "../types/themes";

export type VisibilityKey = "showTitle" | "showArtist" | "showAlbum" | "showArt" | "showBadge" | "showProgress" | "showTimestamps" | "showPlaybackStatus" | "showVisualizer" | "showThemeLabel";

/** Changing a visibility switch must never rewrite another customization. */
export function setVisibility(config: ThemeConfig, key: VisibilityKey, value: boolean): ThemeConfig {
  return { ...config, [key]: value, visibilityOverrides: { ...config.visibilityOverrides, [key]: value } };
}
