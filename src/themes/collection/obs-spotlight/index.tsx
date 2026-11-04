import React from "react";
import { DEFAULT_THEME_CONFIG, ThemeMeta, ThemeProps } from "../../../types/themes";
import { CollectionTheme } from "../CollectionTheme";
import "./style.css";

export const meta: ThemeMeta = { id: "obs-spotlight", name: "Spotlight", tagline: "Artwork / focus", description: "Spotlight: artwork / focus design for OBS.", surface: "obs", category: "broadcast", badgeColor: "#ffc19c", previewBg: "linear-gradient(135deg, #ffc19c55, #12131b)", defaultConfig: { ...DEFAULT_THEME_CONFIG, accentColor: "#ffc19c" }, defaultCustomCss: "" };

export const Theme: React.FC<ThemeProps> = (props) => <CollectionTheme {...props} surface="obs" design="obs-spotlight" kicker="IN THE SPOTLIGHT" />;
