import React from "react";
import { DEFAULT_THEME_CONFIG, ThemeMeta, ThemeProps } from "../../../types/themes";
import { CollectionTheme } from "../CollectionTheme";
import "./style.css";

export const meta: ThemeMeta = { id: "desktop-slate", name: "Slate", tagline: "Dark / focused", description: "Slate: dark / focused design for Desktop.", surface: "desktop", category: "minimal", badgeColor: "#9dafff", previewBg: "linear-gradient(135deg, #9dafff55, #12131b)", defaultConfig: { ...DEFAULT_THEME_CONFIG, accentColor: "#9dafff" }, defaultCustomCss: "" };

export const Theme: React.FC<ThemeProps> = (props) => <CollectionTheme {...props} surface="desktop" design="desktop-slate" kicker="CURRENT TRACK" />;
