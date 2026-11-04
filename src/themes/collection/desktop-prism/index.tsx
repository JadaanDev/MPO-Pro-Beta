import React from "react";
import { DEFAULT_THEME_CONFIG, ThemeMeta, ThemeProps } from "../../../types/themes";
import { CollectionTheme } from "../CollectionTheme";
import "./style.css";

export const meta: ThemeMeta = { id: "desktop-prism", name: "Prism", tagline: "Color / soft", description: "Prism: color / soft design for Desktop.", surface: "desktop", category: "minimal", badgeColor: "#d3b1ff", previewBg: "linear-gradient(135deg, #d3b1ff55, #12131b)", defaultConfig: { ...DEFAULT_THEME_CONFIG, accentColor: "#d3b1ff" }, defaultCustomCss: "" };

export const Theme: React.FC<ThemeProps> = (props) => <CollectionTheme {...props} surface="desktop" design="desktop-prism" kicker="IN THE MIX" />;
