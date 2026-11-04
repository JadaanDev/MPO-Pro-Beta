import React from "react";
import { DEFAULT_THEME_CONFIG, ThemeMeta, ThemeProps } from "../../../types/themes";
import { CollectionTheme } from "../CollectionTheme";
import "./style.css";

export const meta: ThemeMeta = { id: "desktop-frost", name: "Frost", tagline: "Glass / gentle", description: "Frost: glass / gentle design for Desktop.", surface: "desktop", category: "minimal", badgeColor: "#aeddf2", previewBg: "linear-gradient(135deg, #aeddf255, #12131b)", defaultConfig: { ...DEFAULT_THEME_CONFIG, accentColor: "#aeddf2" }, defaultCustomCss: "" };

export const Theme: React.FC<ThemeProps> = (props) => <CollectionTheme {...props} surface="desktop" design="desktop-frost" kicker="MUSIC" />;
