import { useEffect, useLayoutEffect, useState } from "react";
import { SlidersHorizontal, X, Sparkles } from "lucide-react";
import { ThemeConfig, TextElement } from "../../types/themes";
import { TypographyControls } from "./TypographyControls";
import { SharedStyleInspector } from "./SharedStyleInspector";
import { Toggle } from "../common/Toggle";
import { EditableValueBadge } from "./EditableValueBadge";
import { setVisibility, type VisibilityKey } from "../../utils/visibility";
import type { ThemeDefinition, ThemeSurface, ThemeElement as SdkElement } from "../../theme-sdk/schema";
import "./contextual-theme-editor.css";
import { ARRANGE_ROLE_LABELS, ROLE_SELECTORS as selectors, roleFromTarget } from "../../utils/themeRoles";

export type ThemeElement = keyof typeof selectors;
export const THEME_ELEMENT_LABELS = ARRANGE_ROLE_LABELS;
const labels = THEME_ELEMENT_LABELS;

export function findThemeElement(target: Element): ThemeElement | null {
  const mount = target.closest(".single-preview-mount, .big-preview-frame");
  if (!mount) return null;
  return roleFromTarget(target, mount);
}

const textElements: ThemeElement[] = ["title", "artist", "album", "themeLabel", "badge", "timestamps", "status"];
const visibilityKeys: Partial<Record<ThemeElement, VisibilityKey>> = { title: "showTitle", artist: "showArtist", album: "showAlbum", themeLabel: "showThemeLabel", badge: "showBadge", timestamps: "showTimestamps", status: "showPlaybackStatus", artwork: "showArt", progress: "showProgress", indicator: "showVisualizer" };
const useClientLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

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
  const builtEl = surfaceElements.find(el => (el.type === "source" ? "badge" : el.type === "text" ? "themeLabel" : el.type) === selected);
  const nativeCssTargets: Record<ThemeElement, string> = { title: ".mpo-title", artist: ".mpo-artist", album: ".mpo-album", themeLabel: ".mpo-theme-label", badge: ".mpo-badge", timestamps: ".mpo-universal-timestamps", status: ".mpo-playback-status", artwork: ".mpo-art", progress: ".mpo-progress", indicator: ".mpo-universal-visualizer", frame: ".mpo-card" };
  const cssTarget = builtTheme ? `[data-theme-role="${selected}"]` : nativeCssTargets[selected];
  const [renderedVisible, setRenderedVisible] = useState<boolean | undefined>();
  useClientLayoutEffect(() => {
    const mount = document.querySelector(presentationMode ? ".big-preview-frame" : ".single-preview-mount");
    if (!mount) { setRenderedVisible(undefined); return; }
    const canonical = `[data-theme-role="${selected}"]` + (selected === "artwork" ? ', [data-theme-role="artwork-image"]:not([data-theme-role="artwork"] *)' : "");
    const nodes = Array.from(mount.querySelectorAll(builtTheme ? canonical : selectors[selected] + `, ${canonical}`));
    // A hidden or missing slot must show an unchecked switch, so one explicit
    // enable can restore it without first toggling an already-checked control.
    const visible = nodes.some(node => {
      for (let parent: Element | null = node; parent && parent !== mount; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        if (style.display === "none" || style.visibility === "hidden") return false;
      }
      return true;
    });
    setRenderedVisible(visible);
  }, [selected, config, builtTheme, presentationMode]);
  const visibilityKey = visibilityKeys[selected];
  const inspectorConfig = visibilityKey && renderedVisible !== undefined ? { ...config, [visibilityKey]: renderedVisible } : config;
  const placement = config.elementPositions?.[selected] || { x: 0, y: 0, scale: 1 };
  const updatePlacement = (patch: Partial<typeof placement>) => { onConfigChange(previous => ({
    ...previous, elementPositions: { ...previous.elementPositions, [selected]: { ...(previous.elementPositions?.[selected] || { x: 0, y: 0, scale: 1 }), ...patch } },
  })); onCommitHistory?.(`Adjusted ${labels[selected]} placement`); };

  const authoredEditor = builtTheme && !builtTheme.bundle && onUpdateBuiltTheme && builtEl ? (() => {
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

    return <details className="sdk-authored-layout"><summary>SDK layout geometry · {labels[selected]} &lt;{builtEl.type}&gt;</summary>
        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Visible in SDK layout</span>
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

    </details>;
  })() : null;

  return (
    <section className="context-editor" data-arrange-ui aria-label={`${labels[selected]} styling`}>
      <div className="context-editor-header">
        <div className="context-editor-heading">
          <span className="context-editor-icon"><SlidersHorizontal size={15} aria-hidden="true" /></span>
          <span><small>{builtEl && !builtTheme?.bundle ? "BUILT SDK ELEMENT" : "SELECTED ELEMENT"}</small><strong>{labels[selected]}{builtEl && !builtTheme?.bundle ? ` <${builtEl.type}>` : ""}</strong></span>
        </div>
        <button type="button" onClick={onClose} aria-label="Close element styling" title="Close element styling">
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      {visibilityKey && !textElements.includes(selected) && <div className="context-editor-section" style={{ padding: "12px 14px" }}><Toggle label={`Show ${labels[selected]}`} checked={Boolean(inspectorConfig[visibilityKey])} onChange={checked => { onConfigChange(previous => setVisibility(previous,visibilityKey,checked)); onCommitHistory?.(`Changed ${labels[selected]} visibility`); }}/></div>}
      {builtTheme?.bundle && onOpenBuilder && <button type="button" className="context-builder-btn" onClick={onOpenBuilder}><Sparkles size={13}/> Open Code Studio</button>}
      <div className="context-editor-section arrange-placement">
        <strong>Arrange placement</strong>
        {([ ["x", "Horizontal offset", "px"], ["y", "Vertical offset", "px"], ["scale", "Element scale", "×"] ] as const).map(([key, name, unit]) => <div key={key} className="arrange-placement-row"><span>{name}</span><EditableValueBadge tooltip={`Edit ${name.toLowerCase()}`} value={placement[key] ?? (key === "scale" ? 1 : 0)} min={key === "scale" ? 0 : undefined} step={key === "scale" ? .05 : 1} unit={unit} onChange={value => updatePlacement({ [key]: value })}/></div>)}
        <button type="button" onClick={() => { onConfigChange(previous => { const positions = { ...previous.elementPositions }; delete positions[selected]; return { ...previous, elementPositions: positions }; }); onCommitHistory?.("Reset element placement"); }}>Reset placement</button>
      </div>

      {/* Theme Text Content Editor in Arrange Mode */}
      {selected === "themeLabel" && (
        <div className="context-editor-section" style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(15, 23, 42, 0.5)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <strong style={{ fontSize: 12, color: "#38bdf8" }}>Theme Text Content</strong>
            <Toggle
              size="sm"
              checked={inspectorConfig.showThemeLabel !== false}
              onChange={(checked) => {
                onConfigChange((c) => setVisibility(c, "showThemeLabel", checked));
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
              checked={Boolean(inspectorConfig.showPlaybackStatus)}
              onChange={(checked) => {
                onConfigChange((c) => setVisibility(c, "showPlaybackStatus", checked));
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
          unboundedSizes
          selected={selected as TextElement}
          config={inspectorConfig}
          onConfigChange={onConfigChange}
          onCommitHistory={onCommitHistory}
        />
      )}
      {selected === "title" && <div className="context-editor-section" style={{padding:"12px 14px"}}><Toggle label="Title glow" checked={Boolean(config.titleGlow)} onChange={checked=>{onConfigChange(previous=>({...previous,titleGlow:checked}));onCommitHistory?.("Changed title glow");}}/></div>}
      {!textElements.includes(selected) && (
        <SharedStyleInspector
          presentationMode={presentationMode}
          arrangePlacement
          focusedElement={selected}
          config={inspectorConfig}
          extractedColor={extractedColor}
          customCss={customCss}
          onCustomCssChange={onCustomCssChange}
          onConfigChange={onConfigChange}
          onCommitHistory={onCommitHistory}
        />
      )}
      {authoredEditor}
      <details className="arrange-element-css"><summary>Element CSS</summary><p>Rules apply only inside this layer. Target the selected element with <code>{cssTarget}</code>.</p><textarea aria-label="Arrange CSS for this layer" value={customCss} onChange={event => onCustomCssChange(event.target.value)} onBlur={() => onCommitHistory?.("Updated Arrange element CSS")} rows={6} spellCheck={false} placeholder={`${cssTarget} {\n  /* Custom styling */\n}`}/></details>
      <div className="context-editor-footer">Changes apply to this layer.</div>
    </section>
  );
}
