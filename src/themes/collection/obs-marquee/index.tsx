import React from "react";
import { DEFAULT_THEME_CONFIG, ThemeMeta, ThemeProps } from "../../../types/themes";
import { CollectionTheme } from "../CollectionTheme";
import "./style.css";

export const meta: ThemeMeta = { id: "obs-marquee", name: "Marquee", tagline: "Stage / bold", description: "Marquee: stage / bold design for OBS.", surface: "obs", category: "broadcast", badgeColor: "#ffc86b", previewBg: "linear-gradient(135deg, #ffc86b55, #12131b)", defaultConfig: { ...DEFAULT_THEME_CONFIG, accentColor: "#ffc86b" }, defaultCustomCss: "" };

export const Theme: React.FC<ThemeProps> = (props) => <CollectionTheme {...props} surface="obs" design="obs-marquee" kicker="ON STAGE" />;
