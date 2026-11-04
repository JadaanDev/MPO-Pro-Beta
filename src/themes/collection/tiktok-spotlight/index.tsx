import React from "react";
import { DEFAULT_THEME_CONFIG, ThemeMeta, ThemeProps } from "../../../types/themes";
import { CollectionTheme } from "../CollectionTheme";
import "./style.css";

export const meta: ThemeMeta = { id: "tiktok-spotlight", name: "Spotlight", tagline: "Circular / bold", description: "Spotlight: circular / bold design for TikTok.", surface: "tiktok", category: "vertical", badgeColor: "#f8a8d8", previewBg: "linear-gradient(135deg, #f8a8d855, #12131b)", defaultConfig: { ...DEFAULT_THEME_CONFIG, accentColor: "#f8a8d8" }, defaultCustomCss: "" };

export const Theme: React.FC<ThemeProps> = (props) => <CollectionTheme {...props} surface="tiktok" design="tiktok-spotlight" kicker="IN THE SPOTLIGHT" />;
