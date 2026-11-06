import type { ThemeBundle } from "../compiler/types";
import type { ThemeDefinition } from "../schema";
import { withBundleAuthoringFiles } from "./bundleAuthoring";

export function bundleToThemeDefinition(bundle: ThemeBundle): ThemeDefinition {
  return {
    schemaVersion: 1,
    id: bundle.manifest.id,
    name: bundle.manifest.name,
    elements: [
      { id: "artwork", type: "artwork", x: 3, y: 10, width: 22, height: 80, visible: true },
      { id: "title", type: "title", x: 28, y: 14, width: 68, height: 24, visible: true, color: "#ffffff", fontSize: 22 },
      { id: "artist", type: "artist", x: 28, y: 42, width: 68, height: 18, visible: true, color: "#94a3b8", fontSize: 15 },
      { id: "album", type: "album", x: 28, y: 62, width: 46, height: 14, visible: true, color: "#64748b", fontSize: 12 },
      { id: "progress", type: "progress", x: 28, y: 82, width: 68, height: 6, visible: true, color: "#6366f1" },
      { id: "source", type: "source", x: 76, y: 62, width: 20, height: 14, visible: true, color: "#38bdf8", fontSize: 11 },
      { id: "status", type: "status", x: 76, y: 14, width: 20, height: 14, visible: true, color: "#10b981", fontSize: 11 },
    ],
    bundle,
  };
}

const starterBundles: ThemeBundle[] = [
  {
    schemaVersion: 2,
    manifest: {
      schemaVersion: 2,
      id: "neon-pulse-react",
      name: "Neon Pulse React",
      version: "1.0.0",
      author: "Jadaan.Dev",
      description: "Modern cyberpunk HUD overlay with animated visualizer and responsive layout.",
      targetStudios: ["obs", "tiktok", "desktop", "big"],
      entryPoint: "Theme.tsx",
    },
    files: {
      "manifest.json": JSON.stringify(
        {
          schemaVersion: 2,
          id: "neon-pulse-react",
          name: "Neon Pulse React",
          version: "1.0.0",
          author: "Jadaan.Dev",
          description: "Modern cyberpunk HUD overlay with animated visualizer and responsive layout.",
          targetStudios: ["obs", "tiktok", "desktop", "big"],
        },
        null,
        2
      ),
      "Theme.tsx": `import React from "react";
import { Disc, Play, Pause, Music } from "lucide-react";
import { Visualizer } from "./Visualizer";
import type { MpoThemeProps } from "./types";

export default function NeonPulseTheme({
  media,
  artUrl,
  colors,
  surface,
  progress,
  formattedTime,
  timeline,
}: MpoThemeProps) {
  const isPlaying = media.status === "Playing";
  const isVertical = surface === "tiktok";

  return (
    <div
      className={\`mpo-card neon-card \${isVertical ? "is-vertical" : "is-horizontal"}\`}
      data-theme-role="frame"
      style={{
        "--theme-accent": colors.dominant || "#00f0ff",
      } as React.CSSProperties}
    >
      <div className="art-wrapper" data-theme-role="artwork">
        {artUrl ? (
          <img src={artUrl} alt="Album Art" className="art-image" data-theme-role="artwork-image" />
        ) : (
          <div className="art-placeholder">
            <Music size={28} color="var(--theme-accent)" />
          </div>
        )}
        <div className={\`status-ring \${isPlaying ? "pulsing" : ""}\`} />
      </div>

      <div className="content-body">
        <div className="meta-row">
          <div className="badge-group">
            <span className="app-badge" data-theme-role="badge">{media.app_name || "Media"}</span>
            <span className="status-pill" data-theme-role="status">
              {isPlaying ? <Play size={10} /> : <Pause size={10} />}
              <span>{media.status}</span>
            </span>
          </div>
          <span className="time-badge" data-theme-role="timestamps">
            {formattedTime.current}{timeline?.durationKnown ? " / " + formattedTime.duration : ""}
          </span>
        </div>

        <h1 className="track-title" data-theme-role="title" title={media.title}>
          {media.title || "No Track Active"}
        </h1>
        <h2 className="track-artist" data-theme-role="artist">{media.artist || "Unknown Artist"}</h2>
        {media.album_title && <p className="track-album" data-theme-role="album">{media.album_title}</p>}

        <div className="visualizer-row" data-theme-role="indicator">
          <Visualizer isPlaying={isPlaying} accent={colors.dominant} />
        </div>

        <div className="progress-track" data-theme-role="progress" data-theme-part="progress-track">
          <div
            className="progress-fill"
            data-theme-role="progress-fill"
            style={{ width: timeline?.state === "determinate" ? \`\${Math.round(progress * 100)}%\` : "25%", opacity: timeline?.state === "determinate" ? 1 : .35 }}
          />
        </div>
      </div>
    </div>
  );
}
`,
      "Visualizer.tsx": `import React from "react";

interface VisualizerProps {
  isPlaying: boolean;
  accent?: string;
}

export function Visualizer({ isPlaying, accent = "#00f0ff" }: VisualizerProps) {
  const bars = [40, 75, 55, 90, 60, 85, 45, 95, 70, 50, 80, 65];

  return (
    <div className="visualizer-bars">
      {bars.map((height, i) => (
        <span
          key={i}
          className={\`vis-bar \${isPlaying ? "animate" : ""}\`}
          data-theme-role="indicator-bar"
          style={{
            height: isPlaying ? \`\${height}%\` : "20%",
            animationDelay: \`\${(i * 0.08).toFixed(2)}s\`,
            background: accent,
          }}
        />
      ))}
    </div>
  );
}
`,
      "style.css": `.neon-card {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: var(--mpo-frame-padding, 16px);
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(9, 13, 24, 0.96));
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--mpo-card-radius, 16px);
  backdrop-filter: blur(var(--mpo-card-blur, 0px));
  -webkit-backdrop-filter: blur(var(--mpo-card-blur, 0px));
  box-shadow: var(--mpo-frame-shadow, 0 7px 18px -7px rgba(0, 0, 0, 0.36));
  box-sizing: border-box;
  overflow: visible;
  font-family: var(--mpo-font-family, system-ui, -apple-system, sans-serif);
  color: var(--mpo-text-color, #ffffff);
}

.neon-card.is-vertical {
  flex-direction: column;
  justify-content: center;
  text-align: center;
  padding: var(--mpo-frame-padding, 24px);
}

.art-wrapper {
  position: relative;
  width: 76px;
  height: 76px;
  flex-shrink: 0;
  border-radius: 12px;
  overflow: hidden;
}

.neon-card.is-vertical .art-wrapper {
  width: 160px;
  height: 160px;
  margin-bottom: 8px;
}

.art-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 12px;
}

.art-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 240, 255, 0.1);
  border-radius: 12px;
}

.status-ring {
  position: absolute;
  inset: 0;
  border-radius: 12px;
  border: 1.5px solid var(--theme-accent);
  opacity: 0.4;
  pointer-events: none;
}

.status-ring.pulsing {
  animation: neonRingPulse 2s infinite ease-in-out;
}

@keyframes neonRingPulse {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.02); }
}

.content-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justifyContent: center;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  margin-bottom: 4px;
}

.badge-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.app-badge {
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--theme-accent);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  font-size: 10px;
  opacity: 0.85;
}

.time-badge {
  font-size: 10px;
  opacity: 0.6;
  font-variant-numeric: tabular-nums;
}

.track-title {
  margin: 0;
  font-size: var(--mpo-title-size, 17px);
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.01em;
}

.track-artist {
  margin: 2px 0 0 0;
  font-size: var(--mpo-artist-size, 13px);
  font-weight: 500;
  opacity: 0.8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-album {
  margin: 2px 0 0 0;
  font-size: 11px;
  opacity: 0.55;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.visualizer-row {
  margin-top: 8px;
  height: 16px;
}

.visualizer-bars {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 100%;
}

.vis-bar {
  width: 3px;
  border-radius: 999px;
  transition: height 0.15s ease;
}

.vis-bar.animate {
  animation: visBounce 0.8s infinite alternate ease-in-out;
}

@keyframes visBounce {
  0% { transform: scaleY(0.3); }
  100% { transform: scaleY(1); }
}

.progress-track {
  margin-top: 8px;
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--theme-accent);
  border-radius: 999px;
  transition: width 0.3s ease;
}
`,
    },
  },
  {
    schemaVersion: 2,
    manifest: {
      schemaVersion: 2,
      id: "glassmorphism-clean",
      name: "Glassmorphism Clean",
      version: "1.0.0",
      author: "Jadaan.Dev",
      description: "Frosted glass aesthetic with translucent backdrop blur and vinyl spin.",
      targetStudios: ["obs", "tiktok", "desktop", "big"],
      entryPoint: "Theme.tsx",
    },
    files: {
      "manifest.json": JSON.stringify(
        {
          schemaVersion: 2,
          id: "glassmorphism-clean",
          name: "Glassmorphism Clean",
          version: "1.0.0",
          author: "Jadaan.Dev",
          description: "Frosted glass aesthetic with translucent backdrop blur and vinyl spin.",
          targetStudios: ["obs", "tiktok", "desktop", "big"],
        },
        null,
        2
      ),
      "Theme.tsx": `import React from "react";
import { Disc3 } from "lucide-react";
import type { MpoThemeProps } from "./types";

export default function GlassmorphismTheme({
  media,
  artUrl,
  colors,
  surface,
  progress,
  formattedTime,
  timeline,
}: MpoThemeProps) {
  const isPlaying = media.status === "Playing";

  return (
    <div className={\`mpo-card glass-card \${surface === "tiktok" ? "is-vertical" : ""}\`} data-theme-role="frame">
      <div className="glass-artwork" data-theme-role="artwork">
      <div className={\`glass-vinyl-wrapper \${isPlaying ? "spinning" : ""}\`}>
        {artUrl ? (
          <img src={artUrl} alt="Vinyl Artwork" className="glass-art" data-theme-role="artwork-image" />
        ) : (
          <div className="glass-placeholder">
            <Disc3 size={32} color="#ffffff" />
          </div>
        )}
      </div>
      </div>

      <div className="glass-info">
        <div className="glass-top">
          <span className="glass-badge" data-theme-role="badge">{media.app_name || "Spotify"}</span>
          <span className="glass-time" data-theme-role="timestamps">{formattedTime.current}</span>
        </div>
        <h1 className="glass-title" data-theme-role="title">{media.title || "Nothing Playing"}</h1>
        <h2 className="glass-artist" data-theme-role="artist">{media.artist || "Idle"}</h2>

        <div className="glass-progress-wrap" data-theme-role="progress" data-theme-part="progress-track">
          <div
            className="glass-progress-bar"
            data-theme-role="progress-fill"
            style={{
              width: timeline?.state === "determinate" ? \`\${Math.round(progress * 100)}%\` : "25%",
              opacity: timeline?.state === "determinate" ? 1 : .35,
              background: colors.dominant || "#ffffff",
            }}
          />
        </div>
      </div>
    </div>
  );
}
`,
      "style.css": `.glass-card {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: var(--mpo-frame-padding, 16px) 20px;
  background: rgba(255, 255, 255, var(--mpo-card-opacity, 0.07));
  backdrop-filter: blur(var(--mpo-card-blur, 28px)) saturate(180%);
  -webkit-backdrop-filter: blur(var(--mpo-card-blur, 28px)) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: var(--mpo-card-radius, 20px);
  box-shadow: var(--mpo-frame-shadow, 0 7px 18px -7px rgba(0, 0, 0, 0.36));
  box-sizing: border-box;
  overflow: visible;
  color: var(--mpo-text-color, #ffffff);
  font-family: var(--mpo-font-family, system-ui, -apple-system, sans-serif);
}

.glass-artwork {
  width: 78px;
  height: 78px;
  flex-shrink: 0;
  border-radius: 50%;
}

.glass-vinyl-wrapper {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.25);
}

.glass-vinyl-wrapper.spinning {
  animation: glassSpin 14s linear infinite;
}

@keyframes glassSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.glass-art {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.glass-placeholder {
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.glass-info {
  flex: 1;
  min-width: 0;
}

.glass-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  opacity: 0.7;
  margin-bottom: 4px;
}

.glass-badge {
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.glass-title {
  margin: 0;
  font-size: var(--mpo-title-size, 18px);
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.glass-artist {
  margin: 2px 0 0 0;
  font-size: var(--mpo-artist-size, 13px);
  font-weight: 500;
  opacity: 0.75;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.glass-progress-wrap {
  margin-top: 10px;
  height: 4px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 999px;
  overflow: hidden;
}

.glass-progress-bar {
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s ease;
}

.glass-card.is-vertical { flex-direction: column; justify-content: center; text-align: center; }
.glass-card.is-vertical .glass-artwork { width: 160px; height: 160px; }
.glass-card.is-vertical .glass-info { flex: none; width: 100%; }
`,
    },
  },
];

export const STARTER_BUNDLES = starterBundles.map(withBundleAuthoringFiles);
