import React from "react";
import { DEFAULT_THEME_CONFIG, ThemeMeta, ThemeProps } from "../../../types/themes";
import { CollectionTheme } from "../CollectionTheme";
import "./style.css";

export const meta: ThemeMeta = { id: "desktop-island", name: "Island", tagline: "Pill / compact", description: "Island: pill / compact design for Desktop.", surface: "desktop", category: "minimal", badgeColor: "#b9c1f5", previewBg: "linear-gradient(135deg, #b9c1f555, #12131b)", defaultConfig: { ...DEFAULT_THEME_CONFIG, accentColor: "#b9c1f5" }, defaultCustomCss: "" };

export const Theme: React.FC<ThemeProps> = (props) => <CollectionTheme {...props} surface="desktop" design="desktop-island" kicker="LISTENING" />;
