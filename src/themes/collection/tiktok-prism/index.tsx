import React from "react";
import { DEFAULT_THEME_CONFIG, ThemeMeta, ThemeProps } from "../../../types/themes";
import { CollectionTheme } from "../CollectionTheme";
import "./style.css";

export const meta: ThemeMeta = { id: "tiktok-prism", name: "Prism", tagline: "Gradient / dimensional", description: "Prism: gradient / dimensional design for TikTok.", surface: "tiktok", category: "vertical", badgeColor: "#94c5ff", previewBg: "linear-gradient(135deg, #94c5ff55, #12131b)", defaultConfig: { ...DEFAULT_THEME_CONFIG, accentColor: "#94c5ff" }, defaultCustomCss: "" };

export const Theme: React.FC<ThemeProps> = (props) => <CollectionTheme {...props} surface="tiktok" design="tiktok-prism" kicker="COLOR IN SOUND" />;
