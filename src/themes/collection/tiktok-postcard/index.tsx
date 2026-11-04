import React from "react";
import { DEFAULT_THEME_CONFIG, ThemeMeta, ThemeProps } from "../../../types/themes";
import { CollectionTheme } from "../CollectionTheme";
import "./style.css";

export const meta: ThemeMeta = { id: "tiktok-postcard", name: "Postcard", tagline: "Soft / scrapbook", description: "Postcard: soft / scrapbook design for TikTok.", surface: "tiktok", category: "vertical", badgeColor: "#f7b8a5", previewBg: "linear-gradient(135deg, #f7b8a555, #12131b)", defaultConfig: { ...DEFAULT_THEME_CONFIG, accentColor: "#f7b8a5" }, defaultCustomCss: "" };

export const Theme: React.FC<ThemeProps> = (props) => <CollectionTheme {...props} surface="tiktok" design="tiktok-postcard" kicker="A NOTE IN SOUND" />;
