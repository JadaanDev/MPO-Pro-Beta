import React from "react";
import { DEFAULT_THEME_CONFIG, ThemeMeta, ThemeProps } from "../../../types/themes";
import { CollectionTheme } from "../CollectionTheme";
import "./style.css";

export const meta: ThemeMeta = { id: "tiktok-split-note", name: "Split Note", tagline: "Side-by-side / modern", description: "Split Note: side-by-side / modern design for TikTok.", surface: "tiktok", category: "vertical", badgeColor: "#85d4ec", previewBg: "linear-gradient(135deg, #85d4ec55, #12131b)", defaultConfig: { ...DEFAULT_THEME_CONFIG, accentColor: "#85d4ec" }, defaultCustomCss: "" };

export const Theme: React.FC<ThemeProps> = (props) => <CollectionTheme {...props} surface="tiktok" design="tiktok-split-note" kicker="CURRENTLY PLAYING" />;
