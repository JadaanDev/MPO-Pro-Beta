import React from "react";
import { DEFAULT_THEME_CONFIG, ThemeMeta, ThemeProps } from "../../../types/themes";
import { CollectionTheme } from "../CollectionTheme";
import "./style.css";

export const meta: ThemeMeta = { id: "obs-on-air", name: "On Air", tagline: "Reverse / live", description: "On Air: reverse / live design for OBS.", surface: "obs", category: "broadcast", badgeColor: "#ff728b", previewBg: "linear-gradient(135deg, #ff728b55, #12131b)", defaultConfig: { ...DEFAULT_THEME_CONFIG, accentColor: "#ff728b" }, defaultCustomCss: "" };

export const Theme: React.FC<ThemeProps> = (props) => <CollectionTheme {...props} surface="obs" design="obs-on-air" kicker="ON AIR" />;
