import React from "react";
import { DEFAULT_THEME_CONFIG, ThemeMeta, ThemeProps } from "../../../types/themes";
import { CollectionTheme } from "../CollectionTheme";
import "./style.css";

export const meta: ThemeMeta = { id: "obs-tape-room", name: "Tape Room", tagline: "Analog / warm", description: "Tape Room: analog / warm design for OBS.", surface: "obs", category: "broadcast", badgeColor: "#e6ad6b", previewBg: "linear-gradient(135deg, #e6ad6b55, #12131b)", defaultConfig: { ...DEFAULT_THEME_CONFIG, accentColor: "#e6ad6b" }, defaultCustomCss: "" };

export const Theme: React.FC<ThemeProps> = (props) => <CollectionTheme {...props} surface="obs" design="obs-tape-room" kicker="TAPE / SIDE A" />;
