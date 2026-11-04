import React from "react";
import { DEFAULT_THEME_CONFIG, ThemeMeta, ThemeProps } from "../../../types/themes";
import { CollectionTheme } from "../CollectionTheme";
import "./style.css";

export const meta: ThemeMeta = { id: "obs-spectrum", name: "Spectrum", tagline: "Glass / vivid", description: "Spectrum: glass / vivid design for OBS.", surface: "obs", category: "broadcast", badgeColor: "#a6a5ff", previewBg: "linear-gradient(135deg, #a6a5ff55, #12131b)", defaultConfig: { ...DEFAULT_THEME_CONFIG, accentColor: "#a6a5ff" }, defaultCustomCss: "" };

export const Theme: React.FC<ThemeProps> = (props) => <CollectionTheme {...props} surface="obs" design="obs-spectrum" kicker="LIVE FREQUENCY" />;
