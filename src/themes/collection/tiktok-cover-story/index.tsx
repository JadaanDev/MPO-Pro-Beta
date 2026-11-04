import React from "react";
import { DEFAULT_THEME_CONFIG, ThemeMeta, ThemeProps } from "../../../types/themes";
import { CollectionTheme } from "../CollectionTheme";
import "./style.css";

export const meta: ThemeMeta = { id: "tiktok-cover-story", name: "Cover Story", tagline: "Editorial / stacked", description: "Cover Story: editorial / stacked design for TikTok.", surface: "tiktok", category: "vertical", badgeColor: "#eacaa8", previewBg: "linear-gradient(135deg, #eacaa855, #12131b)", defaultConfig: { ...DEFAULT_THEME_CONFIG, accentColor: "#eacaa8" }, defaultCustomCss: "" };

export const Theme: React.FC<ThemeProps> = (props) => <CollectionTheme {...props} surface="tiktok" design="tiktok-cover-story" kicker="THE COVER STORY" />;
