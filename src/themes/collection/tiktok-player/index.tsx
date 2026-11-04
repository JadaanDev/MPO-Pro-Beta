import React from "react";
import { DEFAULT_THEME_CONFIG, ThemeMeta, ThemeProps } from "../../../types/themes";
import { CollectionTheme } from "../CollectionTheme";
import "./style.css";

export const meta: ThemeMeta = { id: "tiktok-player", name: "Pocket Player", tagline: "Music / familiar", description: "Pocket Player: music / familiar design for TikTok.", surface: "tiktok", category: "vertical", badgeColor: "#f3a7ad", previewBg: "linear-gradient(135deg, #f3a7ad55, #12131b)", defaultConfig: { ...DEFAULT_THEME_CONFIG, accentColor: "#f3a7ad" }, defaultCustomCss: "" };

export const Theme: React.FC<ThemeProps> = (props) => <CollectionTheme {...props} surface="tiktok" design="tiktok-player" kicker="YOUR SOUNDTRACK" />;
