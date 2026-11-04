import React from "react";
import { DEFAULT_THEME_CONFIG, ThemeMeta, ThemeProps } from "../../../types/themes";
import { CollectionTheme } from "../CollectionTheme";
import "./style.css";

export const meta: ThemeMeta = { id: "obs-lower-third", name: "Lower Third", tagline: "Stream / wide", description: "Lower Third: stream / wide design for OBS.", surface: "obs", category: "broadcast", badgeColor: "#b5a0ff", previewBg: "linear-gradient(135deg, #b5a0ff55, #12131b)", defaultConfig: { ...DEFAULT_THEME_CONFIG, accentColor: "#b5a0ff" }, defaultCustomCss: "" };

export const Theme: React.FC<ThemeProps> = (props) => <CollectionTheme {...props} surface="obs" design="obs-lower-third" kicker="NOW PLAYING" />;
