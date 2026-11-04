import React from "react";
import { DEFAULT_THEME_CONFIG, ThemeMeta, ThemeProps } from "../../../types/themes";
import { CollectionTheme } from "../CollectionTheme";
import "./style.css";

export const meta: ThemeMeta = { id: "desktop-edge", name: "Edge", tagline: "Reverse / crisp", description: "Edge: reverse / crisp design for Desktop.", surface: "desktop", category: "minimal", badgeColor: "#f1b8bf", previewBg: "linear-gradient(135deg, #f1b8bf55, #12131b)", defaultConfig: { ...DEFAULT_THEME_CONFIG, accentColor: "#f1b8bf" }, defaultCustomCss: "" };

export const Theme: React.FC<ThemeProps> = (props) => <CollectionTheme {...props} surface="desktop" design="desktop-edge" kicker="ON THE DECK" />;
