import type { ThemeDefinition } from "../schema";
import type { ThemeBundle } from "../compiler/types";

export function generateBundleFromDeclarative(theme: ThemeDefinition): ThemeBundle {
  const elements = theme.elements || [];
  const manifest = {
    schemaVersion: 2 as const,
    id: theme.id,
    name: theme.name,
    version: "1.0.0",
    author: "MPO Studio Creator",
    description: `React theme compiled from ${theme.name}`,
    targetStudios: ["obs", "tiktok", "desktop", "big"] as any,
    entryPoint: "Theme.tsx",
  };

  const tsxElements = elements
    .filter((e) => e.visible)
    .map((e) => {
      switch (e.type) {
        case "artwork":
          return `        <div className="elem-artwork" style={{ left: "${e.x}%", top: "${e.y}%", width: "${e.width}%", height: "${e.height}%" }}>
          {artUrl ? <img src={artUrl} alt="Album Art" className="art-img" /> : <div className="art-ph" />}
        </div>`;
        case "title":
          return `        <div className="elem-title" style={{ left: "${e.x}%", top: "${e.y}%", width: "${e.width}%", height: "${e.height}%", color: "${e.color || '#ffffff'}", fontSize: ${e.fontSize || 20} }}>
          {media.title || "Track Title"}
        </div>`;
        case "artist":
          return `        <div className="elem-artist" style={{ left: "${e.x}%", top: "${e.y}%", width: "${e.width}%", height: "${e.height}%", color: "${e.color || '#94a3b8'}", fontSize: ${e.fontSize || 15} }}>
          {media.artist || "Artist"}
        </div>`;
        case "album":
          return `        <div className="elem-album" style={{ left: "${e.x}%", top: "${e.y}%", width: "${e.width}%", height: "${e.height}%", color: "${e.color || '#64748b'}", fontSize: ${e.fontSize || 12} }}>
          {media.album_title || "Album"}
        </div>`;
        case "source":
          return `        <div className="elem-source" style={{ left: "${e.x}%", top: "${e.y}%", width: "${e.width}%", height: "${e.height}%", color: "${e.color || '#38bdf8'}", fontSize: ${e.fontSize || 11} }}>
          {media.app_name || "Source"}
        </div>`;
        case "status":
          return `        <div className="elem-status" style={{ left: "${e.x}%", top: "${e.y}%", width: "${e.width}%", height: "${e.height}%", color: "${e.color || '#10b981'}", fontSize: ${e.fontSize || 11} }}>
          {media.status === "Playing" ? "${e.playingText || 'Playing'}" : "${e.pausedText || 'Paused'}"}
        </div>`;
        case "progress":
          return `        <div className="elem-progress" style={{ left: "${e.x}%", top: "${e.y}%", width: "${e.width}%", height: "${e.height}%" }}>
          <div className="progress-bar" style={{ width: \`\${Math.round(progress * 100)}%\`, background: "${e.color || '#6366f1'}" }} />
        </div>`;
        case "text":
          return `        <div className="elem-custom-text" style={{ left: "${e.x}%", top: "${e.y}%", width: "${e.width}%", height: "${e.height}%", color: "${e.color || '#ffffff'}", fontSize: ${e.fontSize || 14} }}>
          ${e.customText || "Text"}
        </div>`;
        default:
          return "";
      }
    })
    .join("\n");

  const tsx = `import React from "react";
import type { MpoThemeProps } from "./types";

export default function ${theme.name.replace(/[^a-zA-Z0-9]/g, "") || "Custom"}Theme({
  media,
  artUrl,
  colors,
  surface,
  progress,
  formattedTime,
}: MpoThemeProps) {
  return (
    <div className="mpo-card custom-theme-canvas">
${tsxElements}
    </div>
  );
}
`;

  const canvasBg = theme.canvas?.background || "linear-gradient(145deg, rgba(15, 23, 42, 0.92), rgba(9, 13, 24, 0.96))";
  const canvasRadius = theme.canvas?.borderRadius ?? 16;
  const canvasBorder = theme.canvas?.borderColor
    ? `${theme.canvas.borderWidth || 1}px solid ${theme.canvas.borderColor}`
    : "1px solid rgba(255, 255, 255, 0.12)";

  const css = `.custom-theme-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  background: ${canvasBg};
  border-radius: ${canvasRadius}px;
  border: ${canvasBorder};
  box-shadow: var(--mpo-frame-shadow, 0 7px 18px -7px rgba(0, 0, 0, 0.36));
  overflow: hidden;
  box-sizing: border-box;
  font-family: system-ui, -apple-system, sans-serif;
}

.elem-artwork, .elem-title, .elem-artist, .elem-album, .elem-source, .elem-status, .elem-progress, .elem-custom-text {
  position: absolute;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.art-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 10px;
}

.art-ph {
  width: 100%;
  height: 100%;
  background: rgba(99, 102, 241, 0.2);
  border-radius: 10px;
}

.elem-title {
  font-weight: 700;
}

.elem-artist {
  font-weight: 500;
}

.elem-source, .elem-status {
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.elem-progress {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 999px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s ease;
}
`;

  return {
    schemaVersion: 2,
    manifest,
    files: {
      "manifest.json": JSON.stringify(manifest, null, 2),
      "Theme.tsx": tsx,
      "style.css": css,
    },
  };
}
