import React from "react";
import { DEFAULT_THEME_CONFIG, ThemeMeta, ThemeProps } from "../../../types/themes";
import { CollectionTheme } from "../CollectionTheme";
import "./style.css";

export const meta: ThemeMeta = { id: "desktop-focus", name: "Focus", tagline: "Type / minimal", description: "Focus: type / minimal design for Desktop.", surface: "desktop", category: "minimal", badgeColor: "#e6e8ec", previewBg: "linear-gradient(135deg, #e6e8ec55, #12131b)", defaultConfig: { ...DEFAULT_THEME_CONFIG, accentColor: "#e6e8ec" }, defaultCustomCss: "" };

export const Theme: React.FC<ThemeProps> = (props) => <CollectionTheme {...props} surface="desktop" design="desktop-focus" kicker="IN FOCUS" />;
