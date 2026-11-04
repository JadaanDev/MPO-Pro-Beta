import React from "react";
import { DEFAULT_THEME_CONFIG, ThemeMeta, ThemeProps } from "../../../types/themes";
import { CollectionTheme } from "../CollectionTheme";
import "./style.css";

export const meta: ThemeMeta = { id: "tiktok-minimal", name: "Quiet Type", tagline: "Minimal / focus", description: "Quiet Type: minimal / focus design for TikTok.", surface: "tiktok", category: "vertical", badgeColor: "#c1d7c2", previewBg: "linear-gradient(135deg, #c1d7c255, #12131b)", defaultConfig: { ...DEFAULT_THEME_CONFIG, accentColor: "#c1d7c2" }, defaultCustomCss: "" };

export const Theme: React.FC<ThemeProps> = (props) => <CollectionTheme {...props} surface="tiktok" design="tiktok-minimal" kicker="ON REPEAT" />;
