import React from "react";
import { DEFAULT_THEME_CONFIG, ThemeMeta, ThemeProps } from "../../../types/themes";
import { CollectionTheme } from "../CollectionTheme";
import "./style.css";

export const meta: ThemeMeta = { id: "obs-editorial", name: "Editorial", tagline: "Magazine / serif", description: "Editorial: magazine / serif design for OBS.", surface: "obs", category: "broadcast", badgeColor: "#e7c997", previewBg: "linear-gradient(135deg, #e7c99755, #12131b)", defaultConfig: { ...DEFAULT_THEME_CONFIG, accentColor: "#e7c997" }, defaultCustomCss: "" };

export const Theme: React.FC<ThemeProps> = (props) => <CollectionTheme {...props} surface="obs" design="obs-editorial" kicker="THE CURRENT TRACK" />;
