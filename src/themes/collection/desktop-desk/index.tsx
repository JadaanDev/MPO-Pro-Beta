import React from "react";
import { DEFAULT_THEME_CONFIG, ThemeMeta, ThemeProps } from "../../../types/themes";
import { CollectionTheme } from "../CollectionTheme";
import "./style.css";

export const meta: ThemeMeta = { id: "desktop-desk", name: "Desk", tagline: "Studio / balanced", description: "Desk: studio / balanced design for Desktop.", surface: "desktop", category: "minimal", badgeColor: "#9bd9c8", previewBg: "linear-gradient(135deg, #9bd9c855, #12131b)", defaultConfig: { ...DEFAULT_THEME_CONFIG, accentColor: "#9bd9c8" }, defaultCustomCss: "" };

export const Theme: React.FC<ThemeProps> = (props) => <CollectionTheme {...props} surface="desktop" design="desktop-desk" kicker="ON YOUR DESK" />;
