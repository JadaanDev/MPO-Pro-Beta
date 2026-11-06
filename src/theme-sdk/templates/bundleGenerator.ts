import { THEME_SURFACES, type ThemeDefinition, type ThemeElement } from "../schema";
import type { ThemeBundle } from "../compiler/types";
import { withBundleAuthoringFiles } from "./bundleAuthoring";

function renderElement(element: ThemeElement): string {
  const role = element.type === "source" ? "badge" : element.type === "text" ? "themeLabel" : element.type;
  const radius = element.borderRadius ?? (element.type === "artwork" ? 10 : element.type === "progress" ? 999 : 6);
  const style = {
    left: `${element.x}%`, top: `${element.y}%`, width: `${element.width}%`, height: `${element.height}%`,
    display: element.visible ? undefined : "none",
    color: element.color || ({ artist: "#94a3b8", album: "#64748b", source: "#38bdf8", status: "#10b981" } as Record<string, string>)[element.type],
    fontSize: element.fontSize, fontFamily: element.fontFamily,
    fontWeight: element.fontWeight, textAlign: element.textAlign, textTransform: element.textTransform,
    letterSpacing: element.letterSpacing, opacity: element.opacity, borderRadius: radius,
    backgroundColor: element.backgroundColor,
    border: element.borderColor ? `${element.borderWidth ?? 1}px solid ${element.borderColor}` : undefined,
    justifyContent: element.textAlign === "center" ? "center" : element.textAlign === "right" ? "flex-end" : undefined,
    textShadow: element.glow && element.color ? `0 0 10px ${element.color}, 0 0 20px ${element.color}88` : undefined,
    boxShadow: element.glow && element.color && (element.type === "artwork" || element.type === "progress" || element.backgroundColor)
      ? `0 0 18px ${element.color}55` : undefined,
  };
  const attrs = `data-theme-role=${JSON.stringify(role)} data-theme-element-id={${JSON.stringify(element.id)}}${element.visible ? "" : ' data-theme-default-hidden="true" data-theme-display="flex"'} className="theme-element elem-${element.type}" style={${JSON.stringify(style)}}`;
  let content: string;
  switch (element.type) {
    case "artwork":
      content = `<div className="art-motion" style={{ animation: ${element.spinning ? '"mpoGeneratedSpin 10s linear infinite"' : '"none"'} }}>{artUrl ? <img src={artUrl} alt="Album artwork" className="art-img" data-theme-role="artwork-image" /> : <div className="art-ph" />}</div>`;
      break;
    case "title": content = '{media.title || "Track Title"}'; break;
    case "artist": content = '{media.artist || "Artist"}'; break;
    case "album": content = '{media.album_title || "Album"}'; break;
    case "source": content = '{media.app_name || "Source"}'; break;
    case "status":
      content = `{media.status === "Playing" ? ${JSON.stringify(element.playingText || "Playing")} : ${JSON.stringify(element.pausedText || "Paused")}}`;
      break;
    case "progress":
      content = `<div data-theme-role="progress-fill" className="progress-bar" style={{ width: timeline?.state === "determinate" ? \`\${Math.round(progress * 100)}%\` : "25%", opacity: timeline?.state === "determinate" ? 1 : .35, background: ${JSON.stringify(element.color || "#6366f1")} }} />`;
      break;
    case "text": content = `{${JSON.stringify(element.customText || "Text")}}`; break;
  }
  return `          <div ${attrs}${element.type === "progress" ? ' data-theme-part="progress-track"' : ""}>${content}</div>`;
}

export function generateBundleFromDeclarative(theme: ThemeDefinition): ThemeBundle {
  const manifest = {
    schemaVersion: 2 as const,
    id: theme.id,
    name: theme.name,
    version: "1.0.0",
    author: "MPO Studio Creator",
    description: `React theme compiled from ${theme.name}`,
    targetStudios: [...THEME_SURFACES],
    entryPoint: "Theme.tsx",
  };
  // Keep every surface layout and hidden element in the portable source export.
  const surfaceLayouts = THEME_SURFACES.map(surface => `      {surface === ${JSON.stringify(surface)} && (<>
${(theme.layouts?.[surface] ?? theme.elements).map(renderElement).join("\n")}
      </>)}`).join("\n");
  const tsx = `import React from "react";
import type { MpoThemeProps } from "./types";

export default function CustomTheme({ media, artUrl, surface, progress, timeline }: MpoThemeProps) {
  return (
    <div className="mpo-card custom-theme-canvas" data-theme-role="frame">
${surfaceLayouts}
    </div>
  );
}
`;
  const canvas = theme.canvas;
  const canvasBg = canvas?.background || "linear-gradient(145deg, rgba(15, 23, 42, 0.92), rgba(9, 13, 24, 0.96))";
  const canvasBorder = canvas?.borderColor
    ? `${canvas.borderWidth ?? 1}px solid ${canvas.borderColor}` : "1px solid rgba(255, 255, 255, 0.12)";
  const css = `.custom-theme-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  background: ${canvasBg};
  border-radius: var(--mpo-card-radius, ${canvas?.borderRadius ?? 16}px);
  border: ${canvasBorder};
  box-shadow: var(--mpo-frame-shadow, ${canvas?.boxShadow || "0 7px 18px -7px rgba(0, 0, 0, 0.36)"});
  backdrop-filter: blur(var(--mpo-card-blur, ${canvas?.backdropBlur ?? 0}px));
  -webkit-backdrop-filter: blur(var(--mpo-card-blur, ${canvas?.backdropBlur ?? 0}px));
  overflow: visible;
  box-sizing: border-box;
  color: var(--mpo-text-color, #ffffff);
  font-family: var(--mpo-font-family, system-ui, -apple-system, sans-serif);
}
.theme-element {
  position: absolute;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.art-motion, .art-img, .art-ph { width: 100%; height: 100%; border-radius: inherit; }
.art-img { display: block; object-fit: cover; }
.art-ph { background: rgba(99, 102, 241, 0.2); }
.elem-title { font-weight: 700; font-size: var(--mpo-title-size, 20px); }
.elem-artist { font-weight: 500; font-size: var(--mpo-artist-size, 15px); }
.elem-album { font-size: 12px; }
.elem-source, .elem-status { font-size: 11px; }
.elem-text { font-size: 14px; }
.elem-source, .elem-status { text-transform: uppercase; font-weight: 600; letter-spacing: 0.04em; }
.elem-progress { background: rgba(255, 255, 255, 0.15); }
.progress-bar { height: 100%; border-radius: inherit; transition: width 0.3s ease; }
@keyframes mpoGeneratedSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
`;
  return withBundleAuthoringFiles({ schemaVersion: 2, manifest, files: { "Theme.tsx": tsx, "style.css": css } });
}
