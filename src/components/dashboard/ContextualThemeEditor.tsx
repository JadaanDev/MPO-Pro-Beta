import { SlidersHorizontal, X, Sparkles } from "lucide-react";
import { ThemeConfig, TextElement } from "../../types/themes";
import { TypographyControls } from "./TypographyControls";
import { SharedStyleInspector } from "./SharedStyleInspector";
import { Toggle } from "../common/Toggle";
import { HexColorPicker } from "../common/HexColorPicker";
import type { ThemeDefinition, ThemeSurface, ThemeElement as SdkElement } from "../../theme-sdk/schema";
import "./contextual-theme-editor.css";

const selectors = {
  title: '.mpo-title, [data-theme-element="title"], [data-theme-type="title"], [class*="track-title"], [class*="-title"], [class*="trackTitle"]',
  artist: '.mpo-artist, [data-theme-element="artist"], [data-theme-type="artist"], [class*="track-subtitle"], [class*="track-artist"], [class*="-artist"], [class*="trackArtist"]',
  album: '.mpo-album, [data-theme-element="album"], [data-theme-type="album"], [class*="track-album"], [class*="-album"]',
  themeLabel: '.mpo-theme-label, [data-theme-element="text"], [data-theme-type="text"]',
  badge: '.mpo-badge, [data-theme-element="badge"], [data-theme-element="source"], [data-theme-type="source"], [class*="audio-route"], [class*="route-pill"], [class*="badge"]',
  timestamps: '.mpo-universal-timestamps, .apple-timestamps-row, .cyber-timestamps, .glass-timestamps, .zen-time, [data-theme-element="timestamps"], [class*="timestamps"], [class*="time-current"], [class*="time-end"]',
  status: '.mpo-playback-status, [data-theme-element="status"], [data-theme-type="status"], [class*="status-badge"], [class*="playback-status"]',
  artwork: '.mpo-art, .mpo-art-img, [data-theme-element="artwork"], [data-theme-type="artwork"], [class*="artwork-container"], [class*="artwork-img"], [class*="album-art"]',
  progress: '.mpo-progress, .mpo-progress-fill, .apple-progress-bar-track, [data-theme-element="progress"], [data-theme-type="progress"], [class*="scrubber-track"], [class*="scrubber-section"], [class*="progress-bar"]',
  indicator: '.mpo-universal-visualizer, .mpo-visualizer, [class*="equalizer"], [class*="visualizer"]',
  frame: '.mpo-card, .mpo-sdk-surface, .mpo-theme-container, [class*="-card"], [class*="player"]'
} as const;

export type ThemeElement = keyof typeof selectors;
const labels: Record<ThemeElement, string> = {
  title: "Track title",
  artist: "Artist",
  album: "Album",
  themeLabel: "Theme text",
  badge: "Source badge",
  timestamps: "Timestamps",
  status: "Playback status",
  artwork: "Artwork",
  progress: "Progress bar",
  indicator: "Playback indicator",
  frame: "Frame"
};

export function findThemeElement(target: Element): ThemeElement | null {
  const mount = target.closest(".single-preview-mount, .big-preview-frame");
  if (!mount) return null;
  for (let node: Element | null = target; node && node !== mount; node = node.parentElement) {
    const match = (Object.keys(selectors) as ThemeElement[]).find(key => {
      const parts = selectors[key].split(",").map(s => s.trim());
      return parts.some(sel => {
        try {
          return node!.matches(sel);
        } catch {
          return false;
        }
      });
    });
    if (match) return match;
  }
  return null;
}

const textElements: ThemeElement[] = ["title", "artist", "album", "themeLabel", "badge", "timestamps", "status"];

type Props = {
  selected: ThemeElement;
  config: ThemeConfig;
  onConfigChange: (updater:(prev:ThemeConfig)=>ThemeConfig)=>void;
  onCommitHistory?: (description?:string)=>void;
  onClose:()=>void;
  extractedColor:string | null;
  customCss:string;
  onCustomCssChange:(css:string)=>void;
  presentationMode?: boolean;
  builtTheme?: ThemeDefinition;
  onUpdateBuiltTheme?: (updater: (prev: ThemeDefinition) => ThemeDefinition) => void;
  surface?: ThemeSurface;
  onOpenBuilder?: () => void;
};

export function ContextualThemeEditor({
  selected,
  config,
  onConfigChange,
  onCommitHistory,
  onClose,
  extractedColor,
  customCss,
  onCustomCssChange,
  presentationMode=false,
  builtTheme,
  onUpdateBuiltTheme,
  surface = "obs",
  onOpenBuilder,
}: Props) {
  const surfaceKey = surface;
  const surfaceElements: SdkElement[] = builtTheme
    ? (builtTheme.layouts?.[surfaceKey] ?? builtTheme.elements)
    : [];
  const builtEl = surfaceElements.find(
    (el) => el.id === selected || el.type === selected || (selected === "badge" && el.type === "source") || (selected === "themeLabel" && el.type === "text")
  );

  // Contextual Inspector for React Code Themes in Arrange Mode
  if (builtTheme?.bundle && (!builtEl || !onUpdateBuiltTheme)) {
    const visKeyMap: Partial<Record<ThemeElement, keyof ThemeConfig>> = {
      artwork: "showArt",
      title: "showTitle",
      artist: "showArtist",
      album: "showAlbum",
      badge: "showBadge",
      progress: "showProgress",
      timestamps: "showTimestamps",
      status: "showPlaybackStatus",
      indicator: "showVisualizer",
      themeLabel: "showThemeLabel",
    };

    const visKey = visKeyMap[selected];
    const isVisible = visKey ? (config[visKey] !== false) : true;
    const currentPos = config.elementPositions?.[selected] || { x: 0, y: 0, scale: 1 };

    const handleUpdatePos = (updates: Partial<{ x: number; y: number; scale: number }>) => {
      onConfigChange((prev) => ({
        ...prev,
        elementPositions: {
          ...(prev.elementPositions || {}),
          [selected]: {
            ...(prev.elementPositions?.[selected] || { x: 0, y: 0, scale: 1 }),
            ...updates,
          },
        },
      }));
      onCommitHistory?.(`Adjusted ${labels[selected]} position in Arrange mode`);
    };

    const handleResetPos = () => {
      onConfigChange((prev) => {
        const nextPositions = { ...(prev.elementPositions || {}) };
        delete nextPositions[selected];
        return { ...prev, elementPositions: nextPositions };
      });
      onCommitHistory?.(`Reset ${labels[selected]} position`);
    };

    const isTitle = selected === "title";
    const isArtist = selected === "artist";

    return (
      <section className="context-editor" aria-label={`${labels[selected]} styling`}>
        <div className="context-editor-header">
          <div className="context-editor-heading">
            <span className="context-editor-icon"><SlidersHorizontal size={15} aria-hidden="true" /></span>
            <span>Arrange: <strong>{labels[selected]}</strong></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {onOpenBuilder && (
              <button
                type="button"
                className="context-builder-btn"
                onClick={onOpenBuilder}
                title="Edit this React theme in Code Studio"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  padding: "4px 9px",
                  borderRadius: 6,
                  background: "rgba(56, 189, 248, 0.15)",
                  border: "1px solid rgba(56, 189, 248, 0.35)",
                  color: "#38bdf8",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                <Sparkles size={12} />
                <span>Code Studio</span>
              </button>
            )}
            <button className="context-close-btn" onClick={onClose} aria-label="Close contextual editor">
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="context-editor-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 11.5, color: "#94a3b8" }}>
            Inspecting <strong style={{ color: "#f8fafc" }}>{labels[selected]}</strong> in React code theme <em>"{builtTheme.name}"</em>.
          </div>

          {/* Element Visibility Toggle */}
          {visKey && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: "rgba(15, 23, 42, 0.6)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#f8fafc" }}>Visible on layer</span>
              <Toggle
                size="sm"
                checked={isVisible}
                onChange={(checked) => {
                  onConfigChange((prev) => ({ ...prev, [visKey]: checked }));
                  onCommitHistory?.(`Toggled ${labels[selected]} visibility`);
                }}
              />
            </div>
          )}

          {/* Arrange Mode Positioning: Horizontal & Vertical Offset */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px", background: "rgba(15, 23, 42, 0.6)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#d0bdfb", textTransform: "uppercase" }}>Arrange Placement</span>
              {(currentPos.x !== 0 || currentPos.y !== 0 || (currentPos.scale !== undefined && currentPos.scale !== 1)) && (
                <button
                  type="button"
                  onClick={handleResetPos}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    fontSize: 10.5,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Reset Offset
                </button>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
                <span style={{ color: "#94a3b8" }}>Offset X: {currentPos.x || 0}px</span>
                <input
                  type="range"
                  min={-150}
                  max={150}
                  value={currentPos.x || 0}
                  onChange={(e) => handleUpdatePos({ x: parseInt(e.target.value, 10) || 0 })}
                  style={{ width: "100%", accentColor: "#bca6ed" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
                <span style={{ color: "#94a3b8" }}>Offset Y: {currentPos.y || 0}px</span>
                <input
                  type="range"
                  min={-150}
                  max={150}
                  value={currentPos.y || 0}
                  onChange={(e) => handleUpdatePos({ y: parseInt(e.target.value, 10) || 0 })}
                  style={{ width: "100%", accentColor: "#bca6ed" }}
                />
              </label>
            </div>

            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, marginTop: 4 }}>
              <span style={{ color: "#94a3b8" }}>Scale: {currentPos.scale ?? 1}x</span>
              <input
                type="range"
                min={0.5}
                max={2.0}
                step={0.05}
                value={currentPos.scale ?? 1}
                onChange={(e) => handleUpdatePos({ scale: parseFloat(e.target.value) || 1 })}
                style={{ width: "100%", accentColor: "#bca6ed" }}
              />
            </label>
          </div>

          {/* Typography Overrides (for text elements) */}
          {(isTitle || isArtist) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px", background: "rgba(15, 23, 42, 0.6)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#38bdf8", textTransform: "uppercase" }}>Typography</span>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
                <span style={{ color: "#94a3b8" }}>
                  {isTitle ? `Title Font Size: ${config.titleSize || 18}px` : `Artist Font Size: ${config.artistSize || 13}px`}
                </span>
                <input
                  type="range"
                  min={10}
                  max={48}
                  value={isTitle ? (config.titleSize || 18) : (config.artistSize || 13)}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 16;
                    onConfigChange((prev) => ({
                      ...prev,
                      [isTitle ? "titleSize" : "artistSize"]: val,
                    }));
                  }}
                  style={{ width: "100%", accentColor: "#38bdf8" }}
                />
              </label>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8", textTransform: "uppercase" }}>
              Element Custom CSS Override
            </span>
            <textarea
              value={customCss}
              onChange={(e) => onCustomCssChange(e.target.value)}
              placeholder={`/* Custom CSS override for ${labels[selected]} (e.g. font-size, opacity, filter, transform) */\n`}
              rows={4}
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "#080c16",
                color: "#e2e8f0",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: 6,
                padding: "8px 10px",
                fontSize: 11.5,
                fontFamily: "monospace",
              }}
            />
          </div>
        </div>
      </section>
    );
  }

  if (builtTheme && onUpdateBuiltTheme && builtEl) {
    const handleUpdateElement = (updates: Partial<SdkElement>) => {
      onUpdateBuiltTheme((currTheme) => {
        const hasOverride = Boolean(currTheme.layouts?.[surfaceKey]);
        const targetList = hasOverride ? (currTheme.layouts?.[surfaceKey] || []) : currTheme.elements;
        const nextList = targetList.map((item) => (item.id === builtEl.id ? { ...item, ...updates } : item));
        if (hasOverride) {
          return {
            ...currTheme,
            layouts: {
              ...(currTheme.layouts || {}),
              [surfaceKey]: nextList,
            },
          };
        }
        return {
          ...currTheme,
          elements: nextList,
        };
      });
      onCommitHistory?.(`Adjusted ${labels[selected]} in Arrange mode`);
    };

    const isStatusEl = builtEl.type === "status" || selected === "status";
    const isCustomTextEl = builtEl.type === "text" || selected === "themeLabel";

    return (
      <section className="context-editor" aria-label={`${labels[selected]} styling`}>
        <div className="context-editor-header">
          <div className="context-editor-heading">
            <span className="context-editor-icon"><SlidersHorizontal size={15} aria-hidden="true" /></span>
            <span>
              <small>BUILT SDK ELEMENT</small>
              <strong>{labels[selected]} &lt;{builtEl.type}&gt;</strong>
            </span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close element styling" title="Close element styling">
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Visible on overlay</span>
            <Toggle
              size="sm"
              checked={builtEl.visible}
              onChange={(checked) => handleUpdateElement({ visible: checked })}
            />
          </div>

          {/* Status Content Inputs (Playing Status & Paused Status) */}
          {isStatusEl && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 10px", borderRadius: 8, background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "#38bdf8" }}>Status Content</div>
              <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10.5 }}>
                <span style={{ color: "#10b981", fontWeight: 600 }}>Playing Status Text</span>
                <input
                  type="text"
                  value={builtEl.playingText ?? ""}
                  placeholder="e.g. NOW PLAYING, LIVE, ON AIR"
                  onChange={(e) => handleUpdateElement({ playingText: e.target.value })}
                  style={{
                    padding: "5px 8px",
                    borderRadius: 6,
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "#0f172a",
                    color: "#f8fafc",
                    fontSize: 11.5,
                  }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10.5 }}>
                <span style={{ color: "#f59e0b", fontWeight: 600 }}>Paused / Stopped Status Text</span>
                <input
                  type="text"
                  value={builtEl.pausedText ?? ""}
                  placeholder="e.g. PAUSED, IDLE, STANDBY"
                  onChange={(e) => handleUpdateElement({ pausedText: e.target.value })}
                  style={{
                    padding: "5px 8px",
                    borderRadius: 6,
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "#0f172a",
                    color: "#f8fafc",
                    fontSize: 11.5,
                  }}
                />
              </label>
            </div>
          )}

          {/* Custom Theme Text Content Input */}
          {isCustomTextEl && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 10px", borderRadius: 8, background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "#38bdf8" }}>Theme Text Content</div>
              <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10.5 }}>
                <span>Custom label text</span>
                <input
                  type="text"
                  value={builtEl.customText ?? ""}
                  placeholder="e.g. NOW PLAYING, VIBES, STREAM"
                  onChange={(e) => handleUpdateElement({ customText: e.target.value })}
                  style={{
                    padding: "5px 8px",
                    borderRadius: 6,
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "#0f172a",
                    color: "#f8fafc",
                    fontSize: 11.5,
                  }}
                />
              </label>
            </div>
          )}

          {([
            ["x", "X Position (%)", 0, 100],
            ["y", "Y Position (%)", 0, 100],
            ["width", "Width (%)", 1, 100],
            ["height", "Height (%)", 1, 100],
          ] as const).map(([prop, label, min, max]) => (
            <label key={prop} style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{label}</span>
                <strong>{builtEl[prop]}%</strong>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={1}
                value={builtEl[prop]}
                onChange={(e) => handleUpdateElement({ [prop]: Number(e.target.value) })}
              />
            </label>
          ))}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 11, color: "inherit" }}>Color</span>
              <HexColorPicker
                value={builtEl.color && /^#[0-9a-f]{6}$/i.test(builtEl.color) ? builtEl.color : "#FFFFFF"}
                onChange={(color) => handleUpdateElement({ color })}
              />
            </div>

            {builtEl.type !== "artwork" && builtEl.type !== "progress" && (
              <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 11 }}>
                <span>Font size (px)</span>
                <input
                  type="number"
                  min={8}
                  max={240}
                  value={builtEl.fontSize ?? 16}
                  onChange={(e) => handleUpdateElement({ fontSize: Math.max(1, Math.min(500, Number(e.target.value) || 16)) })}
                  style={{
                    padding: "5px 8px",
                    borderRadius: 6,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "#0f172a",
                    color: "#f8fafc",
                    fontSize: 12,
                  }}
                />
              </label>
            )}
          </div>

          {builtEl.type !== "artwork" && builtEl.type !== "progress" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
              <Toggle
                size="sm"
                label="Luminous Neon Glow"
                checked={Boolean(builtEl.glow)}
                onChange={(checked) => handleUpdateElement({ glow: checked })}
              />
            </div>
          )}

          {onOpenBuilder && (
            <button
              type="button"
              onClick={onOpenBuilder}
              style={{
                marginTop: 6,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "7px 12px",
                borderRadius: 7,
                border: "1px solid rgba(56, 189, 248, 0.4)",
                background: "rgba(56, 189, 248, 0.12)",
                color: "#38bdf8",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Sparkles size={13} />
              <span>Open full Theme Builder &amp; SDK</span>
            </button>
          )}
        </div>

        <div className="context-editor-footer">Arrange changes update this built theme in real-time.</div>
      </section>
    );
  }

  return (
    <section className="context-editor" aria-label={`${labels[selected]} styling`}>
      <div className="context-editor-header">
        <div className="context-editor-heading">
          <span className="context-editor-icon"><SlidersHorizontal size={15} aria-hidden="true" /></span>
          <span><small>SELECTED ELEMENT</small><strong>{labels[selected]}</strong></span>
        </div>
        <button type="button" onClick={onClose} aria-label="Close element styling" title="Close element styling">
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      {/* Theme Text Content Editor in Arrange Mode */}
      {selected === "themeLabel" && (
        <div className="context-editor-section" style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(15, 23, 42, 0.5)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <strong style={{ fontSize: 12, color: "#38bdf8" }}>Theme Text Content</strong>
            <Toggle
              size="sm"
              checked={config.showThemeLabel !== false}
              onChange={(checked) => {
                onConfigChange((c) => ({ ...c, showThemeLabel: checked }));
                onCommitHistory?.("Toggled theme text visibility");
              }}
              label="Visible"
            />
          </div>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
            <span>Custom text content</span>
            <input
              type="text"
              value={config.themeLabel ?? ""}
              placeholder="Theme default (e.g. NOW PLAYING, VIBES)"
              onChange={(e) => {
                const val = e.target.value;
                onConfigChange((c) => ({ ...c, themeLabel: val }));
              }}
              onBlur={() => onCommitHistory?.("Updated theme text content")}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "7px 10px",
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "#0f172a",
                color: "#f8fafc",
                fontSize: 12,
              }}
            />
          </label>
          <p style={{ margin: "6px 0 0", fontSize: 10.5, color: "#94a3b8" }}>
            Text displayed on the banner or header kicker for this theme.
          </p>
        </div>
      )}

      {/* Playback Status Labels Editor in Arrange Mode */}
      {selected === "status" && (
        <div className="context-editor-section" style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(15, 23, 42, 0.5)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <strong style={{ fontSize: 12, color: "#38bdf8" }}>Playback Status Labels</strong>
            <Toggle
              size="sm"
              checked={Boolean(config.showPlaybackStatus)}
              onChange={(checked) => {
                onConfigChange((c) => ({ ...c, showPlaybackStatus: checked }));
                onCommitHistory?.("Toggled playback status visibility");
              }}
              label="Visible"
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5, color: "#10b981", fontWeight: 600 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
                Playing Status Text
              </span>
              <input
                type="text"
                value={config.themePlayingLabel ?? ""}
                placeholder="Theme default (e.g. PLAYING, LIVE, ON AIR)"
                onChange={(e) => {
                  const val = e.target.value;
                  onConfigChange((c) => ({ ...c, themePlayingLabel: val }));
                }}
                onBlur={() => onCommitHistory?.("Updated playing status text")}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "7px 10px",
                  borderRadius: 6,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "#0f172a",
                  color: "#f8fafc",
                  fontSize: 12,
                }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5, color: "#f59e0b", fontWeight: 600 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} />
                Paused or Stopped Status Text
              </span>
              <input
                type="text"
                value={config.themePausedLabel ?? ""}
                placeholder="Theme default (e.g. PAUSED, IDLE, STOPPED)"
                onChange={(e) => {
                  const val = e.target.value;
                  onConfigChange((c) => ({ ...c, themePausedLabel: val }));
                }}
                onBlur={() => onCommitHistory?.("Updated paused status text")}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "7px 10px",
                  borderRadius: 6,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "#0f172a",
                  color: "#f8fafc",
                  fontSize: 12,
                }}
              />
            </label>
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 10.5, color: "#94a3b8" }}>
            Custom labels dynamically displayed when playback is active or paused.
          </p>
        </div>
      )}

      {textElements.includes(selected) && (
        <TypographyControls
          unboundedSizes={presentationMode}
          selected={selected as TextElement}
          config={config}
          onConfigChange={onConfigChange}
          onCommitHistory={onCommitHistory}
        />
      )}
      {!textElements.includes(selected) && (
        <SharedStyleInspector
          presentationMode={presentationMode}
          arrangePlacement
          focusedElement={selected}
          config={config}
          extractedColor={extractedColor}
          customCss={customCss}
          onCustomCssChange={onCustomCssChange}
          onConfigChange={onConfigChange}
          onCommitHistory={onCommitHistory}
        />
      )}
      <div className="context-editor-footer">Changes apply to this layer.</div>
    </section>
  );
}
