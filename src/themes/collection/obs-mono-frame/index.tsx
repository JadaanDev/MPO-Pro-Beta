import React from "react";
import { DEFAULT_THEME_CONFIG, ThemeMeta, ThemeProps } from "../../../types/themes";
import { CollectionTheme } from "../CollectionTheme";
import "./style.css";

export const meta: ThemeMeta = { id: "obs-mono-frame", name: "Mono Frame", tagline: "Type / minimal", description: "Mono Frame: type / minimal design for OBS.", surface: "obs", category: "broadcast", badgeColor: "#e5e7eb", previewBg: "linear-gradient(135deg, #e5e7eb55, #12131b)", defaultConfig: { ...DEFAULT_THEME_CONFIG, accentColor: "#e5e7eb" }, defaultCustomCss: "" };

export const Theme: React.FC<ThemeProps> = (props) => <CollectionTheme {...props} surface="obs" design="obs-mono-frame" kicker="CURRENT AUDIO" />;
