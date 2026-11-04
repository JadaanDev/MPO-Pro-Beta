import React from "react";
import { DEFAULT_THEME_CONFIG, ThemeMeta, ThemeProps } from "../../../types/themes";
import { CollectionTheme } from "../CollectionTheme";
import "./style.css";

export const meta: ThemeMeta = { id: "desktop-meter", name: "Meter", tagline: "Slim / technical", description: "Meter: slim / technical design for Desktop.", surface: "desktop", category: "minimal", badgeColor: "#83e5d0", previewBg: "linear-gradient(135deg, #83e5d055, #12131b)", defaultConfig: { ...DEFAULT_THEME_CONFIG, accentColor: "#83e5d0" }, defaultCustomCss: "" };

export const Theme: React.FC<ThemeProps> = (props) => <CollectionTheme {...props} surface="desktop" design="desktop-meter" kicker="AUDIO / LIVE" />;
