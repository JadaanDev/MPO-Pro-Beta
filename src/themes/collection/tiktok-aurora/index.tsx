import React from "react";
import { DEFAULT_THEME_CONFIG, ThemeMeta, ThemeProps } from "../../../types/themes";
import { CollectionTheme } from "../CollectionTheme";
import "./style.css";

export const meta: ThemeMeta = { id: "tiktok-aurora", name: "Aurora", tagline: "Portrait / luminous", description: "Aurora: portrait / luminous design for TikTok.", surface: "tiktok", category: "vertical", badgeColor: "#b9a2ff", previewBg: "linear-gradient(135deg, #b9a2ff55, #12131b)", defaultConfig: { ...DEFAULT_THEME_CONFIG, accentColor: "#b9a2ff" }, defaultCustomCss: "" };

export const Theme: React.FC<ThemeProps> = (props) => <CollectionTheme {...props} surface="tiktok" design="tiktok-aurora" kicker="NOW PLAYING" />;
