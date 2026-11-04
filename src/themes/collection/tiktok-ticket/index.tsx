import React from "react";
import { DEFAULT_THEME_CONFIG, ThemeMeta, ThemeProps } from "../../../types/themes";
import { CollectionTheme } from "../CollectionTheme";
import "./style.css";

export const meta: ThemeMeta = { id: "tiktok-ticket", name: "Ticket", tagline: "Retro / tactile", description: "Ticket: retro / tactile design for TikTok.", surface: "tiktok", category: "vertical", badgeColor: "#ffce82", previewBg: "linear-gradient(135deg, #ffce8255, #12131b)", defaultConfig: { ...DEFAULT_THEME_CONFIG, accentColor: "#ffce82" }, defaultCustomCss: "" };

export const Theme: React.FC<ThemeProps> = (props) => <CollectionTheme {...props} surface="tiktok" design="tiktok-ticket" kicker="ADMIT ONE / AUDIO" />;
