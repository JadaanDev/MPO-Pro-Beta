import React from "react";
import { DEFAULT_THEME_CONFIG, ThemeMeta, ThemeProps } from "../../../types/themes";
import { CollectionTheme } from "../CollectionTheme";
import "./style.css";

export const meta: ThemeMeta = { id: "desktop-record", name: "Record", tagline: "Vinyl / tactile", description: "Record: vinyl / tactile design for Desktop.", surface: "desktop", category: "minimal", badgeColor: "#e5b27e", previewBg: "linear-gradient(135deg, #e5b27e55, #12131b)", defaultConfig: { ...DEFAULT_THEME_CONFIG, accentColor: "#e5b27e" }, defaultCustomCss: "" };

export const Theme: React.FC<ThemeProps> = (props) => <CollectionTheme {...props} surface="desktop" design="desktop-record" kicker="SIDE A" />;
