import { StudioSelect } from "../common/StudioSelect";
import { preserveArrangeGeometry } from '../../utils/arrangeLock';
import { LayoutSizingControls, studioSizePresets } from "./LayoutSizingControls";
import { TypographyControls } from "./TypographyControls";
import { ArtworkColorControls } from "./ArtworkColorControls";
import { artworkSurface, bestContrastColor, parseHex, readableArtworkColor } from "../../utils/artworkColors";
import { BigNumberInput } from "../../big-studio/BigNumberInput";
import { TransitionTimingFields } from "./TransitionTimingFields";
import React, { useState, useEffect } from "react";
import { ThemeConfig } from "../../types/themes";
import { setVisibility } from "../../utils/visibility";
import { EditableValueBadge } from "./EditableValueBadge";
import { Toggle } from "../common/Toggle";
import { HexColorPicker } from "../common/HexColorPicker";
import { loadGoogleFont, POPULAR_GOOGLE_FONTS } from "../../utils/fontLoader";
import { TRACK_TRANSITION_OPTIONS, TRACK_TRANSITION_DIRECTIONS, TRACK_TRANSITION_INTENSITIES, normalizeTransitionConfig } from "../common/TrackTransitionWrapper";
import { Sliders, Monitor, Type, Image as ImageIcon, Code2, ChevronDown, BookOpen, Music2, BarChart3, Check, Radio, Sparkles, Play, Palette } from "lucide-react";

interface Props {
  movementLocked?: boolean;
  config: ThemeConfig; extractedColor: string | null; customCss: string;
  onConfigChange: (updater: (prev: ThemeConfig) => ThemeConfig) => void;
  onCustomCssChange: (css: string) => void;
  onCommitHistory?: (desc?: string) => void; onOpenCssReference?: () => void;
  onReplay?: () => void; width?: string; presentationMode?: boolean; arrangePlacement?: boolean; focusedElement?: string; hideScaleControl?: boolean; studioSurface?: "obs" | "tiktok" | "desktop" | "big";
}
const PRESET_COLORS = ["#6366f1", "#00f0ff", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#38bdf8", "#ffffff"];
export const SharedStyleInspector: React.FC<Props> = ({ config, extractedColor, customCss, onConfigChange: changeConfig, onCustomCssChange, onCommitHistory, onOpenCssReference, onReplay, width, presentationMode = false, arrangePlacement = false, focusedElement, hideScaleControl = false, studioSurface, movementLocked = false }) => {
  const onConfigChange: Props['onConfigChange'] = updater => changeConfig(before => movementLocked ? preserveArrangeGeometry(before, updater(before)) : updater(before));
  // Custom Google Font input
  const [customFontInput, setCustomFontInput] = useState("");
  const [fontLoadedNotice, setFontLoadedNotice] = useState<string | null>(null);

  // Accordion open/close states (Persisted in localStorage)
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>(() => {
    if (focusedElement) return { [focusedElement === "indicator" ? "visualizer" : focusedElement]: true };
    try {
      const saved = localStorage.getItem("mpo_styling_accordions_v4");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      frame: true,
      badge: false,
      title: true,
      artist: false,
      album: false,
      artwork: true,
      progress: true,
      status: false,
      visualizer: true,
      transitions: false,
      palette: false,
      elementCss: false,
    };
  });

  // Sync accordion changes to localStorage
  useEffect(() => {
    if (focusedElement) return;
    try {
      localStorage.setItem("mpo_styling_accordions_v4", JSON.stringify(openAccordions));
    } catch {}
  }, [openAccordions, focusedElement]);

  // Load custom font when titleFont changes
  useEffect(() => {
    if (config.titleFont) {
      loadGoogleFont(config.titleFont);
    }
  }, [config.titleFont]);

  useEffect(() => {
    Object.values(config.typography || {}).forEach(style => { if (style?.font) loadGoogleFont(style.font); });
  }, [config.typography]);

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleExpandAll = () => {
    setOpenAccordions({
      frame: true,
      badge: true,
      title: true,
      artist: true,
      album: true,
      artwork: true,
      progress: true,
      status: true,
      visualizer: true,
      transitions: true,
      palette: true,
      elementCss: true,
    });
  };

  const handleCollapseAll = () => {
    setOpenAccordions({
      frame: false,
      badge: false,
      title: false,
      artist: false,
      album: false,
      artwork: false,
      progress: false,
      status: false,
      visualizer: false,
      transitions: false,
      palette: false,
      elementCss: false,
    });
  };

  const handleApplyCustomFont = () => {
    if (!customFontInput.trim()) return;
    const fontName = customFontInput.trim();
    loadGoogleFont(fontName);
    onConfigChange((c) => ({ ...c, titleFont: fontName }));
    onCommitHistory?.(`Loaded Google Font "${fontName}"`);
    setFontLoadedNotice(fontName);
    setTimeout(() => setFontLoadedNotice(null), 3000);
  };


  const artwork = parseHex(extractedColor);
  const surfaceMode = config.artworkColors?.surface;
  const reference = artwork && surfaceMode && surfaceMode !== "manual" ? parseHex(artworkSurface(artwork, surfaceMode === "contrast"))! : [18, 19, 27];
  const accentMode = config.artworkColors?.accent;
  const activeColor = artwork && accentMode === "artwork" ? readableArtworkColor(artwork, reference, 3) : artwork && accentMode === "contrast" ? bestContrastColor(reference) : config.autoAlbumColor && extractedColor ? extractedColor : config.accentColor;
  return (
        <aside
          data-arrange-movement-locked={movementLocked || undefined}
          className={`studio-right-column ${arrangePlacement ? "arrange-sidebar" : ""} ${focusedElement ? `focused-inspector focus-${focusedElement}` : ""}`}
          style={width ? { width } : undefined}
        >
          {/* Accordion Controls Header */}
          <div className="styling-accordion-header-bar">
            <div className="styling-title-group">
              <Sliders size={14} color="var(--accent-primary)" />
              <span className="styling-title">Overlay Styling</span>
            </div>

            <div className="accordion-bulk-actions">
              <button
                onClick={handleExpandAll}
                className="bulk-action-btn"
                title="Expand all styling sections"
              >
                Expand All
              </button>
              <button
                onClick={handleCollapseAll}
                className="bulk-action-btn"
                title="Collapse all styling sections"
              >
                Collapse
              </button>
            </div>
          </div>

          <div className="styling-accordions-scroll">
            <section className="independent-visibility" aria-label="Visible overlay elements"><div className="independent-visibility-title">Visible elements</div><p>Each switch controls one element in this layer.</p><div className="independent-toggle-grid">
              {([
                ["showTitle", "Track title"], ["showArtist", "Artist"], ["showAlbum", "Album"], ["showArt", "Artwork"], ["showBadge", "Source badge"], ["showProgress", "Progress bar"], ["showTimestamps", "Timestamps"], ["showPlaybackStatus", "Playback status"], ["showVisualizer", "Playback indicator"]
              ] as const).map(([key, label]) => <Toggle key={key} label={label} title={label} size="sm" checked={key === "showTimestamps" ? config.showTimestamps !== false : Boolean(config[key])} onChange={(checked) => { onConfigChange(c => setVisibility(c, key, checked)); onCommitHistory?.(`${label} ${checked ? "shown" : "hidden"}`); }} />)}
            </div></section>
            {!arrangePlacement && <TypographyControls unboundedSizes config={config} onConfigChange={onConfigChange} onCommitHistory={onCommitHistory} />}<section className="independent-visibility" aria-label="Theme text"><Toggle label="Show theme text" checked={config.showThemeLabel !== false} onChange={checked => onConfigChange(c => setVisibility(c,"showThemeLabel",checked))}/><div className="independent-visibility-title">Theme text</div><p>Leave a field empty to use the theme default. Text is saved with this layer.</p>{([ ["themeLabel", "Theme label"], ["themePlayingLabel", "Playing status"], ["themePausedLabel", "Paused or stopped status"] ] as const).map(([key, label]) => <label key={key} style={{display:"flex", flexDirection:"column", gap:5, marginTop:10, fontSize:11}}>{label}<input type="text" value={config[key] ?? ""} placeholder="Theme default" onChange={event => { const value = event.target.value; onConfigChange(current => ({...current, [key]: value})); }} onBlur={() => onCommitHistory?.("Updated theme text")} style={{width:"100%", boxSizing:"border-box", padding:"7px 9px", border:"1px solid #ffffff30", borderRadius:6, color:"inherit", background:"#111725"}} /></label>)}</section>
            {/* -------------------------------------------------------------
                ACCORDION 1: FRAME & CANVAS
               ------------------------------------------------------------- */}
            <div className={`style-accordion-item element-section-frame ${openAccordions.frame ? "expanded" : ""}`}>
              <div
                className="style-accordion-header"
                onClick={() => toggleAccordion("frame")}
              >
                <div className="acc-header-left">
                  <Sliders size={14} className="acc-icon" />
                  <span className="acc-title">Frame & Canvas Dimensions</span>
                </div>
                <div className="acc-header-right">
                  <span className="acc-chevron-btn"><ChevronDown size={14} className={`acc-chevron ${openAccordions.frame ? "open" : ""}`} /></span>
                </div>
              </div>

              {openAccordions.frame && (
                <div className="style-accordion-body">
                  {!movementLocked && <LayoutSizingControls config={config} onChange={onConfigChange} onCommit={onCommitHistory}/>}<div className="beta-frame-controls"><div><strong>Fine styling</strong><small>Refine the frame for this layer</small></div>
                    <label>Border width <output>{config.frameBorderWidth === undefined ? "Theme default" : `${config.frameBorderWidth}px`}</output><input type="range" min="0" max="12" step="1" value={config.frameBorderWidth ?? 0} onChange={(e) => onConfigChange(c => ({...c, frameBorderWidth: Number(e.target.value)}))} onPointerUp={() => onCommitHistory?.("Changed frame border")} /></label>
                    <BigNumberInput label="Exact border width" unit="px" value={config.frameBorderWidth} onCommit={value => onConfigChange(c => ({ ...c, frameBorderWidth: value }))} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}><span style={{ fontSize: 11, color: "inherit" }}>Border color</span><HexColorPicker value={config.frameBorderColor || "#FFFFFF"} onChange={(color) => onConfigChange(c => ({...c, frameBorderColor: color}))} onBlur={() => onCommitHistory?.("Changed frame border color")} /></div>
                    <label>Shadow strength <output>{config.frameShadow ?? 55}%</output><input type="range" min="0" max="100" step="5" value={config.frameShadow ?? 55} onChange={(e) => onConfigChange(c => ({...c, frameShadow: Number(e.target.value)}))} onPointerUp={() => onCommitHistory?.("Changed frame shadow")} /></label>
                    <div className="independent-reset-row">
                      <button type="button" onClick={() => { onConfigChange(c => ({...c, frameBorderWidth:undefined})); onCommitHistory?.("Reset border width"); }}>Reset width</button>
                      <button type="button" onClick={() => { onConfigChange(c => ({...c, frameBorderColor:undefined})); onCommitHistory?.("Reset border color"); }}>Reset color</button>
                      <button type="button" onClick={() => { onConfigChange(c => ({...c, frameShadow:undefined})); onCommitHistory?.("Reset shadow"); }}>Reset shadow</button>
                    </div>
                  </div>
                  {!movementLocked && !presentationMode && <div data-arrange-geometry className="style-control-group"><span>Size presets (changes scale, width and height)</span><div className="shared-size-presets">{studioSizePresets(studioSurface).map(preset => <button type="button" key={preset.label} onClick={() => { onConfigChange(c => ({...c, customWidth:preset.width, customHeight:preset.height, scale:preset.scale, widthMode:"fixed"})); onCommitHistory?.(`Applied ${preset.label} size`); }}>{preset.label}</button>)}</div></div>}
                  {/* Card Scale */}
                  {!hideScaleControl && <div data-arrange-geometry className="style-control-group">
                    <div className="group-label-row">
                      <span>{presentationMode ? "Selected layer scale" : "Card Scale"}</span>
                      <EditableValueBadge
                        value={config.scale}
                        min={0.01}
                        step={0.05}
                        unit="%"
                        displayMultiplier={100}
                        onChange={(newVal) => {
                          onConfigChange((c) => ({ ...c, scale: newVal }));
                          onCommitHistory?.(`Scale set to ${Math.round(newVal * 100)}%`);
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.05"
                      value={config.scale}
                      onChange={(e) => onConfigChange((c) => ({ ...c, scale: parseFloat(e.target.value) }))}
                      onPointerUp={() => onCommitHistory?.(`Scale adjusted to ${Math.round(config.scale * 100)}%`)}
                    />
                  </div>

                  }
                  {/* Dimensions: Width & Height */}
                  {!presentationMode && <>
                  <div data-arrange-geometry className="style-control-group">
                    <div className="group-label-row">
                      <span>Custom Width</span>
                      <EditableValueBadge
                        value={config.customWidth}
                        min={presentationMode ? 0 : 0}
                        step={10}
                        unit={config.customWidth > 0 ? "px" : " (Auto)"}
                        onChange={(newVal) => {
                          onConfigChange((c) => ({ ...c, customWidth: Math.round(newVal) }));
                          onCommitHistory?.(`Width set to ${Math.round(newVal)}px`);
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="800"
                      step="10"
                      value={config.customWidth}
                      onChange={(e) => onConfigChange((c) => ({ ...c, customWidth: parseInt(e.target.value) }))}
                      onPointerUp={() => onCommitHistory?.(`Width adjusted to ${config.customWidth}px`)}
                    />
                  </div>

                  <div data-arrange-geometry className="style-control-group">
                    <div className="group-label-row">
                      <span>Custom Height</span>
                      <EditableValueBadge
                        value={config.customHeight}
                        min={presentationMode ? 0 : 0}
                        step={10}
                        unit={config.customHeight > 0 ? "px" : " (Auto)"}
                        onChange={(newVal) => {
                          onConfigChange((c) => ({ ...c, customHeight: Math.round(newVal) }));
                          onCommitHistory?.(`Height set to ${Math.round(newVal)}px`);
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="700"
                      step="10"
                      value={config.customHeight}
                      onChange={(e) => onConfigChange((c) => ({ ...c, customHeight: parseInt(e.target.value) }))}
                      onPointerUp={() => onCommitHistory?.(`Height adjusted to ${config.customHeight}px`)}
                    />
                  </div>

                  {/* Frame Padding */}
                  </>}
                  <div data-arrange-geometry className="style-control-group">
                    <div className="group-label-row">
                      <span>Inner Frame Padding (0 = theme default)</span>
                      <EditableValueBadge
                        value={config.framePadding || 0}
                        min={presentationMode ? 0 : 0}
                        step={2}
                        unit="px"
                        onChange={(newVal) => {
                          onConfigChange((c) => ({ ...c, framePadding: Math.round(newVal) }));
                          onCommitHistory?.(`Padding set to ${Math.round(newVal)}px`);
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="2"
                      value={config.framePadding || 0}
                      onChange={(e) => onConfigChange((c) => ({ ...c, framePadding: parseInt(e.target.value) }))}
                      onPointerUp={() => onCommitHistory?.(`Padding adjusted to ${config.framePadding || 0}px`)}
                    />
                  </div>

                  {/* Opacity & Blur */}
                  <div className="style-control-group">
                    <div className="group-label-row">
                      <span>Background Opacity</span>
                      <EditableValueBadge
                        value={config.opacity}
                        min={0.1}
                        max={1.0}
                        step={0.02}
                        unit="%"
                        displayMultiplier={100}
                        onChange={(newVal) => {
                          onConfigChange((c) => ({ ...c, opacity: newVal }));
                          onCommitHistory?.(`Opacity set to ${Math.round(newVal * 100)}%`);
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.02"
                      value={config.opacity}
                      onChange={(e) => onConfigChange((c) => ({ ...c, opacity: parseFloat(e.target.value) }))}
                      onPointerUp={() => onCommitHistory?.(`Opacity adjusted to ${Math.round(config.opacity * 100)}%`)}
                    />
                  </div>

                  <div className="style-control-group">
                    <div className="group-label-row">
                      <span>Backdrop Blur</span>
                      <EditableValueBadge
                        value={config.blur}
                        min={presentationMode ? 0 : 0}
                        step={2}
                        unit="px"
                        onChange={(newVal) => {
                          onConfigChange((c) => ({ ...c, blur: Math.round(newVal) }));
                          onCommitHistory?.(`Blur set to ${Math.round(newVal)}px`);
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="2"
                      value={config.blur}
                      onChange={(e) => onConfigChange((c) => ({ ...c, blur: parseInt(e.target.value) }))}
                      onPointerUp={() => onCommitHistory?.(`Blur adjusted to ${config.blur}px`)}
                    />
                  </div>

                  {/* Corner Radius */}
                  <div className="style-control-group">
                    <div className="group-label-row">
                      <span>Corner Radius</span>
                      <EditableValueBadge
                        value={config.borderRadius}
                        min={presentationMode ? 0 : 0}
                        step={1}
                        unit="px"
                        onChange={(newVal) => {
                          onConfigChange((c) => ({ ...c, borderRadius: Math.round(newVal) }));
                          onCommitHistory?.(`Radius set to ${Math.round(newVal)}px`);
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      step="1"
                      value={config.borderRadius}
                      onChange={(e) => onConfigChange((c) => ({ ...c, borderRadius: parseInt(e.target.value) }))}
                      onPointerUp={() => onCommitHistory?.(`Corner radius adjusted to ${config.borderRadius}px`)}
                    />
                  </div>

                  {/* High Contrast Mode Toggle (Untitled UI Style) */}
                  <div className="style-toggle-card">
                    <Toggle
                      checked={config.highContrast}
                      onChange={(checked) => {
                        onConfigChange((c) => ({ ...c, highContrast: checked }));
                        onCommitHistory?.(`High contrast ${checked ? "enabled" : "disabled"}`);
                      }}
                      label="Darker frame background"
                      sublabel="Use the darker background without changing other options"
                      size="md"
                    />
                  </div>

                  {/* Independent Desktop Overlay Sizing */}
                  {!presentationMode && <>
                  <div className="style-divider" style={{ margin: "14px 0 10px 0", borderTop: "1px dashed rgba(255, 255, 255, 0.1)" }} />

                  <div data-arrange-geometry className="style-toggle-card">
                    <Toggle
                      checked={Boolean(config.useSeparateDesktopSize)}
                      onChange={(checked) => {
                        onConfigChange((c) => ({ ...c, useSeparateDesktopSize: checked }));
                        onCommitHistory?.(checked ? "Enabled independent desktop overlay sizing" : "Disabled independent desktop overlay sizing");
                      }}
                      label="Independent Desktop Overlay Sizing"
                      sublabel="When on, the desktop values below take priority over the base size without changing it."
                      size="md"
                    />
                  </div>

                  {config.useSeparateDesktopSize && (
                    <div data-arrange-geometry className="desktop-size-subcontrols" style={{ background: "rgba(56, 189, 248, 0.05)", border: "1px solid rgba(56, 189, 248, 0.18)", borderRadius: 12, padding: "14px 16px", marginTop: 8, display: "flex", flexDirection: "column", gap: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#38bdf8", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        <Monitor size={14} />
                        <span>Desktop HUD Dimensions</span>
                      </div>

                      {/* Desktop Card Scale */}
                      <div data-arrange-geometry className="style-control-group">
                        <div className="group-label-row">
                          <span>Desktop Card Scale</span>
                          <EditableValueBadge
                            value={config.desktopScale || config.scale}
                            min={presentationMode ? 0 : 0.4}
                            step={0.05}
                            unit="%"
                            displayMultiplier={100}
                            onChange={(newVal) => {
                              onConfigChange((c) => ({ ...c, desktopScale: newVal }));
                              onCommitHistory?.(`Desktop scale set to ${Math.round(newVal * 100)}%`);
                            }}
                          />
                        </div>
                        <input
                          type="range"
                          min="0.4"
                          max="2.0"
                          step="0.05"
                          value={config.desktopScale || config.scale}
                          onChange={(e) => onConfigChange((c) => ({ ...c, desktopScale: parseFloat(e.target.value) }))}
                          onPointerUp={() => onCommitHistory?.(`Desktop scale adjusted to ${Math.round((config.desktopScale || config.scale) * 100)}%`)}
                        />
                      </div>

                      {/* Desktop Custom Width */}
                      <div data-arrange-geometry className="style-control-group">
                        <div className="group-label-row">
                          <span>Desktop Custom Width</span>
                          <EditableValueBadge
                            value={config.desktopCustomWidth ?? config.customWidth}
                            min={presentationMode ? 0 : 0}
                            step={10}
                            unit={(config.desktopCustomWidth ?? config.customWidth) > 0 ? "px" : " (Auto)"}
                            onChange={(newVal) => {
                              onConfigChange((c) => ({ ...c, desktopCustomWidth: Math.round(newVal) }));
                              onCommitHistory?.(`Desktop width set to ${Math.round(newVal)}px`);
                            }}
                          />
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="800"
                          step="10"
                          value={config.desktopCustomWidth ?? config.customWidth}
                          onChange={(e) => onConfigChange((c) => ({ ...c, desktopCustomWidth: parseInt(e.target.value) }))}
                          onPointerUp={() => onCommitHistory?.(`Desktop width adjusted to ${config.desktopCustomWidth ?? config.customWidth}px`)}
                        />
                      </div>

                      {/* Desktop Custom Height */}
                      <div data-arrange-geometry className="style-control-group">
                        <div className="group-label-row">
                          <span>Desktop Custom Height</span>
                          <EditableValueBadge
                            value={config.desktopCustomHeight ?? config.customHeight}
                            min={presentationMode ? 0 : 0}
                            step={10}
                            unit={(config.desktopCustomHeight ?? config.customHeight) > 0 ? "px" : " (Auto)"}
                            onChange={(newVal) => {
                              onConfigChange((c) => ({ ...c, desktopCustomHeight: Math.round(newVal) }));
                              onCommitHistory?.(`Desktop height set to ${Math.round(newVal)}px`);
                            }}
                          />
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="700"
                          step="10"
                          value={config.desktopCustomHeight ?? config.customHeight}
                          onChange={(e) => onConfigChange((c) => ({ ...c, desktopCustomHeight: parseInt(e.target.value) }))}
                          onPointerUp={() => onCommitHistory?.(`Desktop height adjusted to ${config.desktopCustomHeight ?? config.customHeight}px`)}
                        />
                      </div>
                    </div>
                  )}
                  </>}
                </div>
              )}
            </div>

            {/* -------------------------------------------------------------
                ACCORDION: PLAYER & SOURCE BADGE
               ------------------------------------------------------------- */}
            <div className={`style-accordion-item element-section-badge ${openAccordions.badge ? "expanded" : ""}`}>
              <div
                className="style-accordion-header"
                onClick={() => toggleAccordion("badge")}
              >
                <div className="acc-header-left">
                  <Radio size={14} className="acc-icon" />
                  <span className="acc-title">Player & Source Badge</span>
                </div>
                <div className="acc-header-right" onClick={(e) => e.stopPropagation()}>
                  <span className="acc-chevron-btn"><ChevronDown size={14} className={`acc-chevron ${openAccordions.badge ? "open" : ""}`} /></span>
                </div>
              </div>

              {openAccordions.badge && (
                <div className="style-accordion-body">
                  <p className="acc-body-desc">
                    Displays the media source pill (e.g. Spotify, YouTube, Apple Music) with real-time playback state indicator.
                  </p>
                </div>
              )}
            </div>

            {/* -------------------------------------------------------------
                ACCORDION 2: TRACK TITLE & TYPOGRAPHY
               ------------------------------------------------------------- */}
            <div className={`style-accordion-item element-section-title ${openAccordions.title ? "expanded" : ""}`}>
              <div
                className="style-accordion-header"
                onClick={() => toggleAccordion("title")}
              >
                <div className="acc-header-left">
                  <Type size={14} className="acc-icon" />
                  <span className="acc-title">Track Title & Typography</span>
                </div>
                <div className="acc-header-right" onClick={(e) => e.stopPropagation()}>
                  <span className="acc-chevron-btn"><ChevronDown size={14} className={`acc-chevron ${openAccordions.title ? "open" : ""}`} /></span>
                </div>
              </div>

              {openAccordions.title && (
                <div className="style-accordion-body">
                  {/* Google Fonts Selector */}
                  <div className="style-control-group">
                    <div className="group-label-row">
                      <span>Title Font Family (Google Fonts)</span>
                      <span className="val-badge">{config.titleFont || "Inter"}</span>
                    </div>

                    <div className="font-selector-row">
                      <StudioSelect
                        value={config.titleFont || "Inter"}
                        onChange={(e) => {
                          const font = e.target.value;
                          loadGoogleFont(font);
                          onConfigChange((c) => ({ ...c, titleFont: font }));
                          onCommitHistory?.(`Changed font to ${font}`);
                        }}
                        className="font-select-dropdown"
                      >
                        {POPULAR_GOOGLE_FONTS.map((font) => (
                          <option key={font} value={font}>
                            {font}
                          </option>
                        ))}
                      </StudioSelect>
                    </div>

                    {/* Custom Google Font input */}
                    <div className="custom-font-input-row">
                      <input
                        type="text"
                        placeholder="Or type any Google Font name..."
                        value={customFontInput}
                        onChange={(e) => setCustomFontInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleApplyCustomFont()}
                        className="custom-font-input"
                      />
                      <button
                        onClick={handleApplyCustomFont}
                        className="load-font-btn"
                        title="Fetch and apply Google Font"
                      >
                        Load
                      </button>
                    </div>
                    {fontLoadedNotice && (
                      <span className="font-loaded-tag">
                        <Check size={11} color="#10b981" /> Loaded "{fontLoadedNotice}"
                      </span>
                    )}
                  </div>

                  {/* Title Font Size */}
                  <div className="style-control-group">
                    <div className="group-label-row">
                      <span>Title Font Size</span>
                      <EditableValueBadge
                        value={config.titleSize || 16}
                        min={presentationMode ? 0 : 10}
                        step={1}
                        unit="px"
                        onChange={(newVal) => {
                          onConfigChange((c) => ({ ...c, titleSize: Math.round(newVal) }));
                          onCommitHistory?.(`Title font size set to ${Math.round(newVal)}px`);
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="36"
                      step="1"
                      value={config.titleSize || 16}
                      onChange={(e) => onConfigChange((c) => ({ ...c, titleSize: parseInt(e.target.value) }))}
                      onPointerUp={() => onCommitHistory?.(`Title font size adjusted to ${config.titleSize || 16}px`)}
                    />
                  </div>

                  {/* Title Weight */}
                  <div className="style-control-group">
                    <div className="group-label-row">
                      <span>Title Font Weight</span>
                      <EditableValueBadge
                        value={config.titleWeight || 700}
                        min={300}
                        max={900}
                        step={100}
                        onChange={(newVal) => {
                          onConfigChange((c) => ({ ...c, titleWeight: Math.round(newVal) }));
                          onCommitHistory?.(`Title weight set to ${Math.round(newVal)}`);
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min="300"
                      max="900"
                      step="100"
                      value={config.titleWeight || 700}
                      onChange={(e) => onConfigChange((c) => ({ ...c, titleWeight: parseInt(e.target.value) }))}
                      onPointerUp={() => onCommitHistory?.(`Title weight adjusted to ${config.titleWeight || 700}`)}
                    />
                  </div>

                  {/* Title Color */}
                  <div className="style-control-group">
                    <div className="group-label-row">
                      <span>Title Color</span>
                      <span className="val-badge">{config.titleColor || "Theme Default"}</span>
                    </div>
                    <div className="color-swatch-row">
                      {["", "#ffffff", "#00f0ff", "#fbbf24", "#f43f5e", "#a855f7"].map((col) => (
                        <button
                          key={col}
                          onClick={() => {
                            onConfigChange((c) => ({ ...c, titleColor: col }));
                            onCommitHistory?.(`Title color set to ${col || "default"}`);
                          }}
                          className={`color-swatch-btn ${config.titleColor === col ? "active" : ""}`}
                          style={{ backgroundColor: col || "#94a3b8" }}
                          title={col ? col : "Default Color"}
                        />
                      ))}
                      <HexColorPicker
                        value={config.titleColor || "#FFFFFF"}
                        onChange={(color) => onConfigChange((c) => ({ ...c, titleColor: color }))}
                        onBlur={() => onCommitHistory?.(`Title color set to ${config.titleColor}`)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* -------------------------------------------------------------
                ACCORDION 3: ARTIST NAME
               ------------------------------------------------------------- */}
            <div className={`style-accordion-item element-section-artist ${openAccordions.artist ? "expanded" : ""}`}>
              <div
                className="style-accordion-header"
                onClick={() => toggleAccordion("artist")}
              >
                <div className="acc-header-left">
                  <Music2 size={14} className="acc-icon" />
                  <span className="acc-title">Artist Name</span>
                </div>
                <div className="acc-header-right" onClick={(e) => e.stopPropagation()}>
                  <span className="acc-chevron-btn"><ChevronDown size={14} className={`acc-chevron ${openAccordions.artist ? "open" : ""}`} /></span>
                </div>
              </div>

              {openAccordions.artist && (
                <div className="style-accordion-body">
                  <div className="style-control-group"><label>Artist weight <StudioSelect value={config.artistWeight ?? 500} onChange={(e) => { onConfigChange(c => ({...c, artistWeight:Number(e.target.value)})); onCommitHistory?.("Changed artist weight"); }}><option value={400}>Regular</option><option value={500}>Medium</option><option value={700}>Bold</option></StudioSelect></label></div>
                  <div className="style-control-group"><label>Artist case <StudioSelect value={config.artistTransform ?? "none"} onChange={(e) => { const value=e.target.value as "none"|"uppercase"|"lowercase"|"capitalize"; onConfigChange(c => ({...c, artistTransform:value})); onCommitHistory?.("Changed artist case"); }}><option value="none">Original</option><option value="uppercase">Uppercase</option><option value="lowercase">Lowercase</option><option value="capitalize">Capitalize</option></StudioSelect></label></div>
                  <div className="style-control-group">
                    <div className="group-label-row">
                      <span>Artist Font Size</span>
                      <EditableValueBadge
                        value={config.artistSize || 13}
                        min={presentationMode ? 0 : 9}
                        step={1}
                        unit="px"
                        onChange={(newVal) => {
                          onConfigChange((c) => ({ ...c, artistSize: Math.round(newVal) }));
                          onCommitHistory?.(`Artist font size set to ${Math.round(newVal)}px`);
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min="9"
                      max="24"
                      step="1"
                      value={config.artistSize || 13}
                      onChange={(e) => onConfigChange((c) => ({ ...c, artistSize: parseInt(e.target.value) }))}
                      onPointerUp={() => onCommitHistory?.(`Artist font size adjusted to ${config.artistSize || 13}px`)}
                    />
                  </div>

                  <div className="style-control-group">
                    <div className="group-label-row">
                      <span>Artist Text Color</span>
                      <span className="val-badge">{config.artistColor || "Default"}</span>
                    </div>
                    <div className="color-swatch-row">
                      {["", "#94a3b8", "#cbd5e1", "#00f0ff", "#38bdf8", "#ffffff"].map((col) => (
                        <button
                          key={col}
                          onClick={() => {
                            onConfigChange((c) => ({ ...c, artistColor: col }));
                            onCommitHistory?.(`Artist color set to ${col || "default"}`);
                          }}
                          className={`color-swatch-btn ${config.artistColor === col ? "active" : ""}`}
                          style={{ backgroundColor: col || "#64748b" }}
                          title={col ? col : "Default Color"}
                        />
                      ))}
                      <HexColorPicker
                        value={config.artistColor || "#94A3B8"}
                        onChange={(color) => onConfigChange((c) => ({ ...c, artistColor: color }))}
                        onBlur={() => onCommitHistory?.(`Artist color set to ${config.artistColor}`)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* -------------------------------------------------------------
                ACCORDION 4: ALBUM SUBTITLE
               ------------------------------------------------------------- */}
            <div className={`style-accordion-item element-section-album ${openAccordions.album ? "expanded" : ""}`}>
              <div
                className="style-accordion-header"
                onClick={() => toggleAccordion("album")}
              >
                <div className="acc-header-left">
                  <ImageIcon size={14} className="acc-icon" />
                  <span className="acc-title">Album Subtitle</span>
                </div>
                <div className="acc-header-right" onClick={(e) => e.stopPropagation()}>
                  <span className="acc-chevron-btn"><ChevronDown size={14} className={`acc-chevron ${openAccordions.album ? "open" : ""}`} /></span>
                </div>
              </div>

              {openAccordions.album && (
                <div className="style-accordion-body">
                  <div className="style-control-group">
                    <div className="group-label-row">
                      <span>Album Font Size</span>
                      <EditableValueBadge
                        value={config.albumSize || 11}
                        min={presentationMode ? 0 : 8}
                        step={1}
                        unit="px"
                        onChange={(newVal) => {
                          onConfigChange((c) => ({ ...c, albumSize: Math.round(newVal) }));
                          onCommitHistory?.(`Album font size set to ${Math.round(newVal)}px`);
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min="8"
                      max="20"
                      step="1"
                      value={config.albumSize || 11}
                      onChange={(e) => onConfigChange((c) => ({ ...c, albumSize: parseInt(e.target.value) }))}
                      onPointerUp={() => onCommitHistory?.(`Album font size adjusted to ${config.albumSize || 11}px`)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* -------------------------------------------------------------
                ACCORDION 5: ALBUM ARTWORK
               ------------------------------------------------------------- */}
            <div className={`style-accordion-item element-section-artwork ${openAccordions.artwork ? "expanded" : ""}`}>
              <div
                className="style-accordion-header"
                onClick={() => toggleAccordion("artwork")}
              >
                <div className="acc-header-left">
                  <ImageIcon size={14} className="acc-icon" />
                  <span className="acc-title">Album Artwork</span>
                </div>
                <div className="acc-header-right" onClick={(e) => e.stopPropagation()}>
                  <span className="acc-chevron-btn"><ChevronDown size={14} className={`acc-chevron ${openAccordions.artwork ? "open" : ""}`} /></span>
                </div>
              </div>

              {openAccordions.artwork && (
                <div className="style-accordion-body">
                  <div className="style-toggle-card"><Toggle checked={config.artGlow !== false} onChange={(value) => { onConfigChange(c => ({...c, artGlow:value})); onCommitHistory?.("Changed artwork glow"); }} label="Artwork glow" size="md" /></div>
                  <div className="style-toggle-card"><Toggle checked={Boolean(config.spinningVinyl)} onChange={(value) => { onConfigChange(c => ({...c, spinningVinyl:value})); onCommitHistory?.("Changed artwork rotation"); }} label="Rotate artwork" size="md" /></div>
                  {/* Art Size */}
                  <div data-arrange-geometry className="style-control-group">
                    <div className="group-label-row">
                      <span>Artwork Size</span>
                      <EditableValueBadge
                        value={config.artSize || 0}
                        min={presentationMode ? 0 : 0}
                        step={4}
                        unit={(config.artSize ?? 0) > 0 ? "px" : " (Auto)"}
                        onChange={(newVal) => {
                          onConfigChange((c) => ({ ...c, artSize: Math.round(newVal) }));
                          onCommitHistory?.(`Artwork size set to ${Math.round(newVal)}px`);
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      step="4"
                      value={config.artSize || 0}
                      onChange={(e) => onConfigChange((c) => ({ ...c, artSize: parseInt(e.target.value) }))}
                      onPointerUp={() => onCommitHistory?.(`Artwork size adjusted to ${config.artSize || 0}px`)}
                    />
                  </div>

                  {/* Art Radius */}
                  <div className="style-control-group">
                    <div className="group-label-row">
                      <span>Corner Radius</span>
                      <EditableValueBadge
                        value={config.artRadius !== undefined ? config.artRadius : 10}
                        min={presentationMode ? 0 : 0}
                        step={2}
                        unit="px"
                        onChange={(newVal) => {
                          onConfigChange((c) => ({ ...c, artRadius: Math.round(newVal) }));
                          onCommitHistory?.(`Artwork radius set to ${Math.round(newVal)}px`);
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="2"
                      value={config.artRadius !== undefined ? config.artRadius : 10}
                      onChange={(e) => onConfigChange((c) => ({ ...c, artRadius: parseInt(e.target.value) }))}
                      onPointerUp={() => onCommitHistory?.(`Artwork radius adjusted to ${config.artRadius ?? 10}px`)}
                    />
                  </div>

                  {/* Art Border Width */}
                  <div className="style-control-group">
                    <div className="group-label-row">
                      <span>Border Width</span>
                      <EditableValueBadge
                        value={config.artBorder || 0}
                        min={presentationMode ? 0 : 0}
                        step={1}
                        unit="px"
                        onChange={(newVal) => {
                          onConfigChange((c) => ({ ...c, artBorder: Math.round(newVal) }));
                          onCommitHistory?.(`Artwork border set to ${Math.round(newVal)}px`);
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="6"
                      step="1"
                      value={config.artBorder || 0}
                      onChange={(e) => onConfigChange((c) => ({ ...c, artBorder: parseInt(e.target.value) }))}
                      onPointerUp={() => onCommitHistory?.(`Artwork border adjusted to ${config.artBorder || 0}px`)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* -------------------------------------------------------------
                ACCORDION 6: PLAYBACK PROGRESS BAR
               ------------------------------------------------------------- */}
            <div className={`style-accordion-item element-section-progress ${openAccordions.progress ? "expanded" : ""}`}>
              <div
                className="style-accordion-header"
                onClick={() => toggleAccordion("progress")}
              >
                <div className="acc-header-left">
                  <BarChart3 size={14} className="acc-icon" />
                  <span className="acc-title">Playback Progress</span>
                </div>
                <div className="acc-header-right" onClick={(e) => e.stopPropagation()}>
                  <span className="acc-chevron-btn"><ChevronDown size={14} className={`acc-chevron ${openAccordions.progress ? "open" : ""}`} /></span>
                </div>
              </div>

              {openAccordions.progress && (
                <div className="style-accordion-body">
                  <div data-arrange-geometry className="style-control-group"><label>Progress thickness · {config.progressHeight ?? 4}px<input type="range" min="2" max="16" step="1" value={config.progressHeight ?? 4} onChange={(e) => onConfigChange(c => ({...c, progressHeight:Number(e.target.value)}))} onPointerUp={() => onCommitHistory?.("Changed progress thickness")} /></label>{presentationMode && <BigNumberInput label="Exact progress thickness" unit="px" value={config.progressHeight} onCommit={value => onConfigChange(c => ({ ...c, progressHeight: value }))} />}</div>

                  <div className="style-control-group">
                    <label>Progress shape <StudioSelect value={config.progressShape ?? "theme"} onChange={event => { const shape = event.target.value as NonNullable<ThemeConfig["progressShape"]>; onConfigChange(c => ({ ...c, progressShape: shape })); onCommitHistory?.("Changed progress shape"); }}><option value="theme">Theme default</option><option value="square">Square</option><option value="rounded">Rounded</option><option value="pill">Pill</option></StudioSelect></label>
                  </div>
                  <div className="style-control-group">
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ fontSize: 11, color: "inherit" }}>Fill color</span>
                      <HexColorPicker
                        value={/^#[0-9a-f]{6}$/i.test(config.progressFillColor || "") ? config.progressFillColor! : /^#[0-9a-f]{6}$/i.test(config.accentColor) ? config.accentColor : "#6366F1"}
                        onChange={color => onConfigChange(c => ({ ...c, progressFillColor: color, artworkColors: { ...c.artworkColors, progress: "manual" } }))}
                        onBlur={() => onCommitHistory?.("Changed progress fill color")}
                      />
                    </div>
                    <button type="button" onClick={() => { onConfigChange(c => ({ ...c, progressFillColor: undefined, artworkColors: { ...c.artworkColors, progress: "manual" } })); onCommitHistory?.("Reset progress fill color"); }}>Use theme fill</button>
                    <small>Artwork color matching can also control the fill from the color settings.</small>
                  </div>
                  <div className="style-control-group">
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ fontSize: 11, color: "inherit" }}>Track color</span>
                      <HexColorPicker
                        value={/^#[0-9a-f]{6}$/i.test(config.progressTrackColor || "") ? config.progressTrackColor! : "#555555"}
                        onChange={color => onConfigChange(c => ({ ...c, progressTrackColor: color }))}
                        onBlur={() => onCommitHistory?.("Changed progress track color")}
                      />
                    </div>
                    <button type="button" onClick={() => { onConfigChange(c => ({ ...c, progressTrackColor: undefined })); onCommitHistory?.("Reset progress track color"); }}>Use theme track</button>
                  </div>

                  <p className="acc-body-desc">
                    Controls the playback timeline bar showing track duration and progress fill.
                  </p>
                </div>
              )}
            </div>

            {/* -------------------------------------------------------------
                ACCORDION 7: AUDIO EQUALIZER VISUALIZER
               ------------------------------------------------------------- */}
            <div className={`style-accordion-item element-section-visualizer ${openAccordions.visualizer ? "expanded" : ""}`}>
              <div
                className="style-accordion-header"
                onClick={() => toggleAccordion("visualizer")}
              >
                <div className="acc-header-left">
                  <BarChart3 size={14} className="acc-icon" />
                  <span className="acc-title">Playback Indicator</span>
                </div>
                <div className="acc-header-right" onClick={(e) => e.stopPropagation()}>
                  <span className="acc-chevron-btn"><ChevronDown size={14} className={`acc-chevron ${openAccordions.visualizer ? "open" : ""}`} /></span>
                </div>
              </div>

              {openAccordions.visualizer && (
                <div className="style-accordion-body">
                  <div className="style-control-group"><label>Indicator style <StudioSelect value={config.visualizerType ?? "bars"} onChange={(e) => { const value=e.target.value as "bars"|"wave"|"pulse"|"dots"; onConfigChange(c => ({...c, visualizerType:value})); onCommitHistory?.("Changed playback indicator"); }}><option value="bars">Bars</option><option value="wave">Wave</option><option value="pulse">Pulse</option><option value="dots">Dots</option></StudioSelect></label><small>Animated playback indicator; not an audio spectrum.</small></div>
                  {/* Bar Count */}
                  <div className="style-control-group">
                    <div className="group-label-row">
                      <span>Indicator count</span>
                      <EditableValueBadge
                        value={config.visualizerCount ?? config.visualizerBars ?? 8}
                        min={presentationMode ? 0 : 3}
                        step={1}
                        onChange={(newVal) => {
                          onConfigChange((c) => ({ ...c, visualizerCount: Math.round(newVal) }));
                          onCommitHistory?.(`Bar count set to ${Math.round(newVal)}`);
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="24"
                      step="1"
                      value={config.visualizerCount ?? config.visualizerBars ?? 8}
                      onChange={(e) => onConfigChange((c) => ({ ...c, visualizerCount: parseInt(e.target.value) }))}
                      onPointerUp={() => onCommitHistory?.(`Bar count adjusted to ${config.visualizerCount ?? config.visualizerBars ?? 8}`)}
                    />
                  </div>

                  {/* Max Height */}
                  <div data-arrange-geometry className="style-control-group">
                    <div className="group-label-row">
                      <span>Indicator height</span>
                      <EditableValueBadge
                        value={config.visualizerHeight || 24}
                        min={presentationMode ? 0 : 8}
                        step={2}
                        unit="px"
                        onChange={(newVal) => {
                          onConfigChange((c) => ({ ...c, visualizerHeight: Math.round(newVal) }));
                          onCommitHistory?.(`Visualizer height set to ${Math.round(newVal)}px`);
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min="8"
                      max="60"
                      step="2"
                      value={config.visualizerHeight || 24}
                      onChange={(e) => onConfigChange((c) => ({ ...c, visualizerHeight: parseInt(e.target.value) }))}
                      onPointerUp={() => onCommitHistory?.(`Visualizer height adjusted to ${config.visualizerHeight || 24}px`)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* -------------------------------------------------------------
                ACCORDION 8: TRACK TRANSITIONS & ANIMATION TIMING
               ------------------------------------------------------------- */}
            <div className={`style-accordion-item ${openAccordions.transitions ? "expanded" : ""}`}>
              <div
                className="style-accordion-header"
                onClick={() => toggleAccordion("transitions")}
              >
                <div className="acc-header-left">
                  <Sparkles size={14} className="acc-icon" />
                  <span className="acc-title">Track Transitions & Speed</span>
                </div>
                <div className="acc-header-right">
                  <span className="val-badge" style={{ textTransform: "capitalize", fontSize: "10.5px" }}>
                    {TRACK_TRANSITION_OPTIONS.find(option => option.id === normalizeTransitionConfig(config).style)?.label}
                  </span>
                  <span className="acc-chevron-btn"><ChevronDown size={14} className={`acc-chevron ${openAccordions.transitions ? "open" : ""}`} /></span>
                </div>
              </div>

              {openAccordions.transitions && (
                <div className="style-accordion-body">
                  <p className="acc-body-desc">
                    Choose from 8 distinct animation styles triggered on song changes, with custom speed and delay controls.
                  </p>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "8px 0 10px 0" }}>
                    <button
                      type="button"
                      onClick={() => onReplay?.()}
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        padding: "7px 12px",
                        background: "rgba(99, 102, 241, 0.22)",
                        border: "1px solid rgba(99, 102, 241, 0.45)",
                        borderRadius: "8px",
                        color: "#c7d2fe",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Play size={12} fill="currentColor" />
                      <span>Test / Replay Track Transition</span>
                    </button>
                  </div>

                  {/* 16 Pro Transition Style Grid */}
                  <div className="style-control-group">
                    <div className="group-label-row">
                      <span>Transition style (8 designs)</span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "6px" }}>
                      {TRACK_TRANSITION_OPTIONS.map((opt) => {
                        const isSelected = normalizeTransitionConfig(config).style === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              onConfigChange((c) => ({ ...c, transitionStyle: opt.id }));
                              onCommitHistory?.(`Transition set to ${opt.label}`);
                              onReplay?.();
                            }}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-start",
                              padding: "9px 10px",
                              borderRadius: "8px",
                              background: isSelected ? "rgba(99, 102, 241, 0.18)" : "rgba(255, 255, 255, 0.04)",
                              border: isSelected ? "1px solid #6366f1" : "1px solid rgba(255, 255, 255, 0.08)",
                              color: isSelected ? "#fff" : "rgba(255, 255, 255, 0.75)",
                              cursor: "pointer",
                              textAlign: "left",
                              transition: "all 0.15s ease",
                              position: "relative",
                              boxShadow: isSelected ? "0 0 12px rgba(99, 102, 241, 0.25)" : "none",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 4 }}>
                              <span style={{ fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                                {isSelected && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", boxShadow: "0 0 6px #6366f1" }} />}
                                {opt.label}
                              </span>
                              <span
                                style={{
                                  fontSize: "8.5px",
                                  fontWeight: 600,
                                  padding: "1px 5px",
                                  borderRadius: "4px",
                                  background: isSelected ? "rgba(99, 102, 241, 0.4)" : "rgba(255, 255, 255, 0.08)",
                                  color: isSelected ? "#c7d2fe" : "rgba(255, 255, 255, 0.5)",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.4px",
                                }}
                              >
                                {opt.badge}
                              </span>
                            </div>
                            <span style={{ fontSize: "9.5px", color: "rgba(255, 255, 255, 0.45)", marginTop: "3px", lineHeight: 1.25 }}>
                              {opt.description}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 5-Way Direction Compass */}
                  <div className="style-control-group" style={{ marginTop: 14 }}>
                    <div className="group-label-row">
                      <span>Motion & Vector Direction</span>
                      <span style={{ fontSize: "10.5px", color: "#818cf8", fontWeight: 600, textTransform: "capitalize" }}>
                        {config.transitionDirection || "left"}
                      </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "6px", marginTop: "6px" }}>
                      {TRACK_TRANSITION_DIRECTIONS.map((dir) => {
                        const isDirSelected = (config.transitionDirection || "left") === dir.id;
                        return (
                          <button
                            key={dir.id}
                            type="button"
                            onClick={() => {
                              onConfigChange((c) => ({ ...c, transitionDirection: dir.id }));
                              onCommitHistory?.(`Transition direction set to ${dir.label}`);
                              onReplay?.();
                            }}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "7px 4px",
                              borderRadius: "7px",
                              background: isDirSelected ? "rgba(99, 102, 241, 0.22)" : "rgba(255, 255, 255, 0.04)",
                              border: isDirSelected ? "1px solid #6366f1" : "1px solid rgba(255, 255, 255, 0.08)",
                              color: isDirSelected ? "#fff" : "rgba(255, 255, 255, 0.7)",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <span style={{ fontSize: "14px", fontWeight: 800, lineHeight: 1 }}>{dir.symbol}</span>
                            <span style={{ fontSize: "9px", marginTop: 3, fontWeight: 600 }}>{dir.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 4-Tier Intensity & Physics Matrix */}
                  <div className="style-control-group" style={{ marginTop: 14 }}>
                    <div className="group-label-row">
                      <span>Intensity, FX & Physics</span>
                      <span style={{ fontSize: "10.5px", color: "#a78bfa", fontWeight: 600, textTransform: "capitalize" }}>
                        {config.transitionIntensity || "standard"}
                      </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px", marginTop: "6px" }}>
                      {TRACK_TRANSITION_INTENSITIES.map((tier) => {
                        const isTierSelected = (config.transitionIntensity || "standard") === tier.id;
                        return (
                          <button
                            key={tier.id}
                            type="button"
                            onClick={() => {
                              onConfigChange((c) => ({ ...c, transitionIntensity: tier.id }));
                              onCommitHistory?.(`Transition intensity set to ${tier.label}`);
                              onReplay?.();
                            }}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              padding: "8px 4px",
                              borderRadius: "7px",
                              background: isTierSelected ? `${tier.color}24` : "rgba(255, 255, 255, 0.04)",
                              border: isTierSelected ? `1px solid ${tier.color}` : "1px solid rgba(255, 255, 255, 0.08)",
                              color: isTierSelected ? "#fff" : "rgba(255, 255, 255, 0.7)",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                              boxShadow: isTierSelected ? `0 0 10px ${tier.color}33` : "none",
                            }}
                          >
                            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "10.5px", fontWeight: 700 }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: tier.color }} />
                              {tier.label}
                            </span>
                            <span style={{ fontSize: "8.5px", color: "rgba(255, 255, 255, 0.45)", marginTop: 2, textAlign: "center" }}>
                              {tier.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <TransitionTimingFields config={config} onConfigChange={onConfigChange} onCommitHistory={onCommitHistory} />
                </div>
              )}
            </div>

            {/* -------------------------------------------------------------
                ACCORDION 9: COLORS & MASTER ACCENT
               ------------------------------------------------------------- */}
            <div className={`style-accordion-item ${openAccordions.palette ? "expanded" : ""}`}>
              <div
                className="style-accordion-header"
                onClick={() => toggleAccordion("palette")}
              >
                <div className="acc-header-left">
                  <Palette size={14} className="acc-icon" />
                  <span className="acc-title">Colors & Master Accent</span>
                </div>
                <div className="acc-header-right">
                  <span className="color-preview-pill" style={{ backgroundColor: activeColor }} />
                  <span className="acc-chevron-btn"><ChevronDown size={14} className={`acc-chevron ${openAccordions.palette ? "open" : ""}`} /></span>
                </div>
              </div>

              {openAccordions.palette && (
                <div className="style-accordion-body">
                  <ArtworkColorControls config={config} onConfigChange={onConfigChange} onCommitHistory={onCommitHistory} extractedColor={extractedColor} />
                  <div className="style-control-group">
                    <div className="group-label-row">
                      <span>Manual accent color</span>
                      <span className="val-badge" style={{ color: config.accentColor }}>
                        {config.accentColor}
                      </span>
                    </div>

                    {/* Mimic Album Art Toggle (Untitled UI Style) */}
                    <div className="style-toggle-card">
                      <Toggle
                        checked={config.autoAlbumColor}
                        onChange={(checked) => {
                          onConfigChange((c) => ({ ...c, autoAlbumColor: checked }));
                          onCommitHistory?.(`Mimic Album Art ${checked ? "enabled" : "disabled"}`);
                        }}
                        label="Mimic Album Art Color"
                        sublabel="Accent only. The color source above takes priority when set to artwork or contrast."
                        size="md"
                      />
                    </div>

                    {/* Palette Swatches */}
                    <div className="palette-grid">
                      {PRESET_COLORS.map((col) => (
                        <button
                          key={col}
                          onClick={() => {
                            onConfigChange((c) => ({ ...c, accentColor: col }));
                            onCommitHistory?.(`Accent set to ${col}`);
                          }}
                          className={`palette-swatch ${config.accentColor === col ? "active" : ""}`}
                          style={{ backgroundColor: col }}
                          title={col}
                        />
                      ))}
                      <HexColorPicker
                        value={config.accentColor || "#38BDF8"}
                        onChange={(color) => onConfigChange((c) => ({ ...c, accentColor: color }))}
                        onBlur={() => onCommitHistory?.(`Custom accent set to ${config.accentColor}`)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* -------------------------------------------------------------
                ACCORDION 9: ELEMENT-LEVEL SCOPED CSS
               ------------------------------------------------------------- */}
            {!focusedElement && <div className={`style-accordion-item ${openAccordions.elementCss ? "expanded" : ""}`}>
              <div
                className="style-accordion-header"
                onClick={() => toggleAccordion("elementCss")}
              >
                <div className="acc-header-left">
                  <Code2 size={14} className="acc-icon" />
                  <span className="acc-title">Element CSS</span>
                </div>
                <div className="acc-header-right">
                  <span className="acc-chevron-btn"><ChevronDown size={14} className={`acc-chevron ${openAccordions.elementCss ? "open" : ""}`} /></span>
                </div>
              </div>

              {openAccordions.elementCss && (
                <div className="style-accordion-body">
                  <div className="element-css-header-row">
                    <div className="target-classes-summary">
                      <span className="classes-lead-label">Targets:</span>
                      <code>.mpo-title</code>
                      <code>.mpo-artist</code>
                      <code>.mpo-art</code>
                      <code>.mpo-progress-fill</code>
                    </div>

                    <button
                      onClick={onOpenCssReference}
                      className="open-reference-btn"
                      title="Open complete CSS class reference & documentation"
                    >
                      <BookOpen size={13} />
                      <span>CSS Reference Docs</span>
                    </button>
                  </div>

                  <p>Rules apply within this layer. Global rules, imports and keyframes are not applied.</p>
                  <textarea
                    aria-label="Element CSS for this layer"
                    value={customCss}
                    onChange={(e) => onCustomCssChange(e.target.value)}
                    onBlur={() => onCommitHistory?.("Updated custom element CSS")}
                    placeholder={`/* Scoped CSS overrides for this layer */\n.mpo-title {\n  letter-spacing: 1px;\n  text-transform: uppercase;\n}`}
                    className="element-css-textarea"
                    rows={6}
                    spellCheck={false}
                  />
                </div>
              )}
            </div>}
          </div>
        </aside>
  );
};
