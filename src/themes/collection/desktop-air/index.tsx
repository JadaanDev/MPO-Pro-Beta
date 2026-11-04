import React from "react";
import { DEFAULT_THEME_CONFIG, ThemeMeta, ThemeProps } from "../../../types/themes";
import { CollectionTheme } from "../CollectionTheme";
import "./style.css";

export const meta: ThemeMeta = { id: "desktop-air", name: "Air", tagline: "Quiet / everyday", description: "Air: quiet / everyday design for Desktop.", surface: "desktop", category: "minimal", badgeColor: "#b9c8ff", previewBg: "linear-gradient(135deg, #b9c8ff55, #12131b)", defaultConfig: { ...DEFAULT_THEME_CONFIG, accentColor: "#b9c8ff" }, defaultCustomCss: "" };

export const Theme: React.FC<ThemeProps> = (props) => <CollectionTheme {...props} surface="desktop" design="desktop-air" kicker="NOW PLAYING" />;
