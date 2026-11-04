import React from "react";
import { DEFAULT_THEME_CONFIG, ThemeMeta, ThemeProps } from "../../../types/themes";
import { CollectionTheme } from "../CollectionTheme";
import "./style.css";

export const meta: ThemeMeta = { id: "obs-circuit", name: "Circuit", tagline: "Cyber / technical", description: "Circuit: cyber / technical design for OBS.", surface: "obs", category: "broadcast", badgeColor: "#63e8f1", previewBg: "linear-gradient(135deg, #63e8f155, #12131b)", defaultConfig: { ...DEFAULT_THEME_CONFIG, accentColor: "#63e8f1" }, defaultCustomCss: "" };

export const Theme: React.FC<ThemeProps> = (props) => <CollectionTheme {...props} surface="obs" design="obs-circuit" kicker="SIGNAL_01" />;
