import React from "react";
import { DEFAULT_THEME_CONFIG, ThemeMeta, ThemeProps } from "../../../types/themes";
import { CollectionTheme } from "../CollectionTheme";
import "./style.css";

export const meta: ThemeMeta = { id: "obs-signal-desk", name: "Signal Desk", tagline: "Broadcast / clean", description: "Signal Desk: broadcast / clean design for OBS.", surface: "obs", category: "broadcast", badgeColor: "#78e0d0", previewBg: "linear-gradient(135deg, #78e0d055, #12131b)", defaultConfig: { ...DEFAULT_THEME_CONFIG, accentColor: "#78e0d0" }, defaultCustomCss: "" };

export const Theme: React.FC<ThemeProps> = (props) => <CollectionTheme {...props} surface="obs" design="obs-signal-desk" kicker="SIGNAL / LIVE" />;
