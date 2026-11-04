import React from "react";
import { DEFAULT_THEME_CONFIG, ThemeMeta, ThemeProps } from "../../../types/themes";
import { CollectionTheme } from "../CollectionTheme";
import "./style.css";

export const meta: ThemeMeta = { id: "tiktok-neon-story", name: "Neon Story", tagline: "Night / electric", description: "Neon Story: night / electric design for TikTok.", surface: "tiktok", category: "vertical", badgeColor: "#6af4e6", previewBg: "linear-gradient(135deg, #6af4e655, #12131b)", defaultConfig: { ...DEFAULT_THEME_CONFIG, accentColor: "#6af4e6" }, defaultCustomCss: "" };

export const Theme: React.FC<ThemeProps> = (props) => <CollectionTheme {...props} surface="tiktok" design="tiktok-neon-story" kicker="LIVE_SIGNAL" />;
