import React, { useState } from "react";
import {
  BookOpen,
  Bot,
  Copy,
  Check,
  Code2,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { STARTER_BUNDLES } from "./templates/starterBundles";
import type { ThemeBundle } from "./compiler/types";

export interface SdkDocsExplorerProps {
  onUseTemplate?: (bundle: ThemeBundle) => void;
  onBack?: () => void;
}

export const SdkDocsExplorer: React.FC<SdkDocsExplorerProps> = ({ onUseTemplate, onBack }) => {
  const [activeTab, setActiveTab] = useState<"llm" | "guide" | "templates">("llm");
  const [copied, setCopied] = useState(false);

  const llmDocContent = `You are an expert React theme designer for MPO-pro (Media Player Overlay Studio v7.0.0-beta.11).
Themes are written in modern React (TSX/JSX) and scoped CSS, transpiled via an in-app compiler (< 2ms).

=== TypeScript Interface ===
export interface MpoThemeProps {
  media: {
    title: string;
    artist: string;
    album_title: string;
    status: "Playing" | "Paused" | "Stopped";
    position_ms: number;
    duration_ms: number;
    app_name: string;
    has_art: boolean;
  };
  artUrl: string;
  colors: {
    dominant: string;
    contrastText: string;
    accent: string;
    vibrant?: string;
  };
  surface: "desktop" | "obs" | "tiktok" | "big";
  format: "horizontal" | "vertical";
  progress: number; // 0.0 to 1.0
  formattedTime: {
    current: string; // e.g. "01:23"
    duration: string; // e.g. "03:45"
  };
  config?: Record<string, any>;
}

=== Semantic Roles & Arrange Mode (v7.0.0-beta.9) ===
Add data-theme-role to JSX elements so users can style and rearrange them via the dashboard Arrange Mode:
- <div data-theme-role="artwork">
- <div data-theme-role="title">
- <div data-theme-role="artist">
- <div data-theme-role="album">
- <div data-theme-role="progress"> (scrubber)
- <div data-theme-role="timestamps">
- <div data-theme-role="status"> (playback status)
- <div data-theme-role="indicator"> (equalizer / visualizer)
- <div data-theme-role="badge"> (audio destination / app route)

=== Dashboard CSS Variables Injected at Root ===
- var(--mpo-card-radius): Layer card border-radius slider
- var(--mpo-card-blur): Layer card backdrop blur
- var(--mpo-card-opacity): Layer card background opacity
- var(--mpo-frame-shadow): Shared bounded card shadow
- var(--mpo-font-family): Selected custom typography font
- var(--mpo-title-size): Custom title font size
- var(--mpo-artist-size): Custom artist font size

=== Allowed Imports ===
- React: { useState, useEffect, useRef, useMemo, useCallback } from "react"
- Lucide Icons: { Play, Pause, Disc, Music, Sparkles, Volume2 } from "lucide-react"
- Framer Motion: { motion, AnimatePresence } from "motion/react"
- External ESM: import confetti from "https://esm.sh/canvas-confetti"

=== Rules ===
1. Export default function Theme(props: MpoThemeProps).
2. Adapt to surface: surface === "tiktok" (9:16 vertical stack), surface === "desktop" (compact translucent HUD), surface === "obs" (16:9 widescreen broadcast).
3. Provide style.css with modern scoped styles.
4. Put .mpo-card on the visible inner card and use box-shadow: var(--mpo-frame-shadow). All four studios and SDK previews already reserve a 32px transparent effect gutter, letting the bounded shadow fall naturally to transparent. Keep positioning wrappers transparent with overflow: visible; keep background, border, radius, and content clipping on the card. Do not add another gutter, shadow the rectangular host, or fade/mask text and artwork. Do not mask/filter the outer host or give it an opacity layer: that can block glass backdrop sampling.`;

  const handleCopyLlm = () => {
    navigator.clipboard.writeText(llmDocContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#080b13",
        color: "#e2e8f0",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header Tabs */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 20px",
          background: "#0c101d",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.14)",
                color: "#e2e8f0",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
              title="Return to Theme Studio workspace"
            >
              <ArrowLeft size={14} />
              <span>Back to Studio</span>
            </button>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <BookOpen size={18} color="#38bdf8" />
            <span style={{ fontWeight: 700, fontSize: 14 }}>
              Theme SDK Documentation &amp; API Explorer
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          {[
            ["llm", "For LLMs (llms.txt)", Bot],
            ["guide", "Developer Guide", Code2],
            ["templates", "Starter Templates", Sparkles],
          ].map(([id, label, Icon]: any) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                background: activeTab === id ? "rgba(56, 189, 248, 0.15)" : "rgba(255, 255, 255, 0.03)",
                border: activeTab === id ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.08)",
                color: activeTab === id ? "#38bdf8" : "#94a3b8",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>
        {activeTab === "llm" && (
          <div style={{ width: "100%", maxWidth: "1400px", margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#f8fafc" }}>
                  Machine-Readable Context for AI Coding Assistants
                </h2>
                <p style={{ margin: "4px 0 0 0", fontSize: 12.5, color: "#94a3b8" }}>
                  Copy this context and paste it directly into ChatGPT, Claude, Antigravity, or Cursor to have it write custom MPO themes.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyLlm}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: 8,
                  background: copied ? "#10b981" : "#38bdf8",
                  color: "#0f172a",
                  fontWeight: 700,
                  fontSize: 12,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? "Copied Context!" : "Copy LLM Context"}</span>
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 360px) 1fr", gap: 18 }}>
              {/* Left Column: Quick Reference Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ background: "#0c101d", padding: 16, borderRadius: 12, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <h3 style={{ margin: "0 0 8px 0", fontSize: 13, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.05em" }}>SDK Overview</h3>
                  <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
                    Themes are authored as standard React TSX components with scoped CSS. Any modern CSS animations, SVG effects, or layout systems work out-of-the-box.
                  </p>
                </div>

                <div style={{ background: "#0c101d", padding: 16, borderRadius: 12, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <h3 style={{ margin: "0 0 8px 0", fontSize: 13, color: "#a855f7", textTransform: "uppercase", letterSpacing: "0.05em" }}>Allowed Imports</h3>
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, color: "#cbd5e1", lineHeight: 1.7 }}>
                    <li><code>react</code>: hooks &amp; components</li>
                    <li><code>lucide-react</code>: 1000+ modern SVG icons</li>
                    <li><code>motion/react</code>: animations &amp; transitions</li>
                    <li><code>https://esm.sh/*</code>: external npm modules</li>
                  </ul>
                </div>

                <div style={{ background: "#0c101d", padding: 16, borderRadius: 12, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <h3 style={{ margin: "0 0 8px 0", fontSize: 13, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.05em" }}>Studio Surfaces</h3>
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, color: "#cbd5e1", lineHeight: 1.7 }}>
                    <li><code>"obs"</code>: 16:9 widescreen stream overlay</li>
                    <li><code>"tiktok"</code>: 9:16 vertical stream overlay</li>
                    <li><code>"desktop"</code>: compact translucent HUD</li>
                    <li><code>"big"</code>: fullscreen stage &amp; presentation</li>
                  </ul>
                </div>

                <div style={{ background: "#0c101d", padding: 16, borderRadius: 12, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <h3 style={{ margin: "0 0 8px 0", fontSize: 13, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Arrange &amp; Styling (v7.0.0-beta.9)</h3>
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, color: "#cbd5e1", lineHeight: 1.7 }}>
                    <li><code>data-theme-role</code>: unlocks drag &amp; drop Arrange</li>
                    <li><code>var(--mpo-card-radius)</code>: layer border radius</li>
                    <li><code>var(--mpo-card-blur)</code>: glassmorphic blur</li>
                    <li><code>var(--mpo-title-size)</code>: custom typography</li>
                    <li><code>var(--mpo-frame-shadow)</code>: shared soft card shadow</li>
                    <li>Use <code>.mpo-card</code> for the visible card; the host reserves a 32px transparent effect gutter.</li>
                  </ul>
                </div>
              </div>

              {/* Right Column: Pre-formatted Machine-Readable Prompt */}
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <pre
                  style={{
                    margin: 0,
                    flex: 1,
                    background: "#050811",
                    padding: "20px",
                    borderRadius: 12,
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    fontSize: 12,
                    fontFamily: "monospace",
                    lineHeight: 1.6,
                    color: "#e2e8f0",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {llmDocContent}
                </pre>
              </div>
            </div>
          </div>
        )}

        {activeTab === "guide" && (
          <div style={{ width: "100%", maxWidth: "1400px", margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>MPO-pro React Theme SDK Guide</h2>
              <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
                Author broadcast-ready media overlay themes using modern React and CSS.
              </p>
            </div>

            <div style={{ background: "#0c101d", padding: 20, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
              <h3 style={{ margin: "0 0 10px 0", fontSize: 15, color: "#38bdf8" }}>Core Theme Interface</h3>
              <p style={{ fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.6 }}>
                Every custom theme receives a standard <code>props: MpoThemeProps</code> object:
              </p>
              <ul style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7, paddingLeft: 20 }}>
                <li><code>props.media</code>: Live metadata (title, artist, album, status, position_ms, duration_ms, app_name).</li>
                <li><code>props.artUrl</code>: URL string of the album cover art.</li>
                <li><code>props.colors</code>: Extracted album colors (<code>colors.dominant</code>, <code>colors.contrastText</code>).</li>
                <li><code>props.surface</code>: Current studio environment (<code>"desktop"</code>, <code>"obs"</code>, <code>"tiktok"</code>, <code>"big"</code>).</li>
                <li><code>props.progress</code>: 0.0 to 1.0 track progress percentage.</li>
              </ul>
            </div>

            <div style={{ background: "#0c101d", padding: 20, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
              <h3 style={{ margin: "0 0 10px 0", fontSize: 15, color: "#f59e0b" }}>Arrange Mode &amp; Overlay Styling (v7.0.0-beta.9)</h3>
              <p style={{ fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.6 }}>
                To enable live drag-and-drop repositioning and allow dashboard sliders to control your theme, add <code>data-theme-role</code> attributes to your markup:
              </p>
              <ul style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7, paddingLeft: 20 }}>
                <li><code>data-theme-role="artwork"</code>: Album cover artwork box</li>
                <li><code>data-theme-role="title"</code>: Track title header</li>
                <li><code>data-theme-role="artist"</code>: Artist name subtitle</li>
                <li><code>data-theme-role="album"</code>: Album title element</li>
                <li><code>data-theme-role="progress"</code>: Scrubber timeline or progress bar</li>
                <li><code>data-theme-role="timestamps"</code>: Current / total time labels</li>
                <li><code>data-theme-role="status"</code>: Playing / paused status badge</li>
                <li><code>data-theme-role="indicator"</code>: Animated audio equalizer / visualizer</li>
                <li><code>data-theme-role="badge"</code>: Media source destination pill</li>
              </ul>
              <p style={{ fontSize: 12, color: "#38bdf8", marginTop: 10 }}>
                <strong>Injected CSS Custom Properties</strong>: <code>var(--mpo-card-radius)</code>, <code>var(--mpo-card-blur)</code>, <code>var(--mpo-card-opacity)</code>, <code>var(--mpo-font-family)</code>, <code>var(--mpo-title-size)</code>, <code>var(--mpo-artist-size)</code>.
              </p>
            </div>

            <div style={{ background: "#0c101d", padding: 20, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
              <h3 style={{ margin: "0 0 10px 0", fontSize: 15, color: "#38bdf8" }}>External Libraries &amp; Fonts</h3>
              <p style={{ fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.6 }}>
                You have unrestricted freedom to import any external library or stylesheet:
              </p>
              <ul style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7, paddingLeft: 20 }}>
                <li><b>Google Fonts</b>: In <code>style.css</code>, use <code>@import url("https://fonts.googleapis.com/css2?family=Orbitron:wght@700&amp;display=swap");</code></li>
                <li><b>NPM Modules via ESM</b>: In <code>Theme.tsx</code>, write <code>import confetti from "https://esm.sh/canvas-confetti";</code></li>
                <li><b>Lucide Icons</b>: <code>import &#123; Play, Pause, Music &#125; from "lucide-react";</code></li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === "templates" && (
          <div style={{ width: "100%", maxWidth: "1400px", margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Starter React Templates</h2>
            <p style={{ margin: 0, fontSize: 12.5, color: "#94a3b8" }}>
              Select a starter template to immediately start building your custom theme:
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginTop: 8 }}>
              {STARTER_BUNDLES.map((starter) => (
                <div
                  key={starter.manifest.id}
                  style={{
                    background: "#0c101d",
                    padding: 20,
                    borderRadius: 14,
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 14,
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#f8fafc" }}>
                      {starter.manifest.name}
                    </h3>
                    <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>
                      {starter.manifest.description}
                    </p>
                    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                      <span style={{ fontSize: 10, padding: "2px 6px", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", borderRadius: 4 }}>
                        React TSX
                      </span>
                      <span style={{ fontSize: 10, padding: "2px 6px", background: "rgba(168, 85, 247, 0.15)", color: "#c084fc", borderRadius: 4 }}>
                        Scoped CSS
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onUseTemplate?.(starter)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "8px 14px",
                      borderRadius: 8,
                      background: "rgba(56, 189, 248, 0.12)",
                      border: "1px solid #38bdf8",
                      color: "#38bdf8",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <Sparkles size={13} />
                    <span>Use This Template</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
