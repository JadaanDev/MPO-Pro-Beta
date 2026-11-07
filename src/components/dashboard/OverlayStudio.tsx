import React, { useState, useRef, useCallback, useEffect } from "react";
import { ThemeId, ThemeConfig } from "../../types/themes";
import { THEME_REGISTRY, THEME_COMPONENTS } from "../../themes/ThemeRegistry";
import { MediaState } from "../../types/media";
import { Layer, LayerFormat } from "../../types/layers";
import { LayerBrowser } from "./LayerBrowser";
import { SharedStyleInspector } from "./SharedStyleInspector";
import { ContextualThemeEditor, findThemeElement, ThemeElement } from "./ContextualThemeEditor";
import { ArrangeCanvas } from "./ArrangeCanvas";
import { ArrangeElementPicker } from "./ArrangeElementPicker";
import {
  Search,
  Palette,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Eye,
  EyeOff,
  MousePointer2,
  ScanLine
} from "lucide-react";
import { TrackTransitionWrapper } from "../common/TrackTransitionWrapper";
import { AutoFitPreview } from "./AutoFitPreview";
import { generateEffectiveThemeCss } from "../../utils/ThemeStyleEngine";
import { browserSourceUrl } from "../../utils/browserSource";
import { BuiltThemeMount } from "../../theme-sdk/BuiltThemeMount";
import { LIBRARY_EVENT, readThemeLibrary } from "../../theme-sdk/library";
import type { ThemeDefinition } from "../../theme-sdk/schema";

interface OverlayStudioProps {
  currentTheme: ThemeId;
  onThemeSelect: (id: ThemeId) => void;
  config: ThemeConfig;
  onConfigChange: (updater: (prev: ThemeConfig) => ThemeConfig) => void;
  onCommitHistory?: (desc?: string) => void;
  media: MediaState;
  artUrl: string;
  customCss: string;
  format: LayerFormat;
  extractedColor: string | null;
  // Layers for the left browser
  layers: Layer[];
  activeLayerId: string;
  onSelectLayer: (id: string) => void;
  onCreateLayer: (name: string, format: "horizontal" | "vertical") => void;
  onDuplicateLayer: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onRenameLayer?: (id: string, name: string) => void;
  leftPanelTab?: "themes" | "layers";
  onSetLeftPanelTab?: (tab: "themes" | "layers") => void;
  showLeftPanel?: boolean;
  onToggleLeftPanel?: () => void;
  onOpenCssReference?: () => void;
  onCustomCssChange: (css: string) => void;
  studioName?: string;
  previewOverrides?: Partial<ThemeConfig>;
  layerBrowser?: React.ReactNode;
  showInspector?: boolean;
  onToggleInspector?: () => void;
  showPreview?: boolean;
  onTogglePreview?: () => void;
  headerRightActions?: React.ReactNode;
  onUpdateBuiltTheme?: (updater: (prev: ThemeDefinition) => ThemeDefinition) => void;
  onOpenBuilder?: () => void;
}

export function galleryMatchesSurface(surface: "obs" | "tiktok" | "desktop" | undefined, category: "collection" | "built" | "obs" | "tiktok" | "desktop" | "classic" | "all", active: "obs" | "tiktok" | "desktop") {
  if (category === "built") return false;
  return category === "all" || (category === "collection" ? surface === active : category === "classic" ? !surface : surface === category);
}

export const OverlayStudio: React.FC<OverlayStudioProps> = ({
  currentTheme,
  onThemeSelect,
  config,
  onConfigChange,
  onCommitHistory,
  media,
  artUrl,
  customCss,
  format,
  extractedColor,
  layers,
  activeLayerId,
  onSelectLayer,
  onCreateLayer,
  onDuplicateLayer,
  onDeleteLayer,
  onRenameLayer,
  leftPanelTab = "themes",
  onSetLeftPanelTab,
  showLeftPanel = true,
  onToggleLeftPanel,
  onOpenCssReference,
  onCustomCssChange,
  studioName,
  previewOverrides,
  layerBrowser,
  showInspector: showInspectorProp,
  onToggleInspector,
  showPreview: showPreviewProp,
  onTogglePreview,
  headerRightActions,
  onUpdateBuiltTheme,
  onOpenBuilder,
}) => {
  // Search & Category Filters for Left Themes Panel
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedElement, setSelectedElement] = useState<ThemeElement | null>(null);
  const [hoveredElement, setHoveredElement] = useState<ThemeElement | null>(null);
  const [tiktokWidthOverride, setTiktokWidthOverride] = useState<number | null>(null);
  useEffect(() => { setTiktokWidthOverride(null); setSelectedElement(null); setHoveredElement(null); }, [currentTheme, activeLayerId]);
  const [arrangeMode, setArrangeMode] = useState(() => { try { return localStorage.getItem("mpo_always_arrange") === "true"; } catch { return false; } });
  const [sourceCopyStatus, setSourceCopyStatus] = useState("");
  const [sourceSize, setSourceSize] = useState<{ width: number; height: number } | null>(null);
  const receiveSourceSize = useCallback((size: { width: number; height: number }) => {
    setSourceSize(previous => previous?.width === size.width && previous.height === size.height ? previous : size);
  }, []);
  const [selectedCategory, setSelectedCategory] = useState<"collection" | "built" | "obs" | "tiktok" | "desktop" | "classic" | "all">("collection");

  const [internalShowPreview, setInternalShowPreview] = useState<boolean>(() => {
    try {
      return localStorage.getItem("mpo_preview_visible") !== "false";
    } catch {
      return true;
    }
  });

  const [internalShowInspector, setInternalShowInspector] = useState<boolean>(() => {
    try {
      return localStorage.getItem("mpo_inspector_visible") !== "false";
    } catch {
      return true;
    }
  });

  const showPreview = showPreviewProp !== undefined ? showPreviewProp : internalShowPreview;
  const showInspector = showInspectorProp !== undefined ? showInspectorProp : internalShowInspector;

  const handleTogglePreview = () => {
    if (onTogglePreview) {
      onTogglePreview();
      return;
    }
    setInternalShowPreview((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("mpo_preview_visible", String(next));
      } catch {}
      return next;
    });
  };

  const handleToggleInspector = () => {
    if (onToggleInspector) {
      onToggleInspector();
      return;
    }
    setInternalShowInspector((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("mpo_inspector_visible", String(next));
      } catch {}
      return next;
    });
  };

  const toggleArrange = () => {
    if (arrangeMode) { setArrangeMode(false); setSelectedElement(null); return; }
    setArrangeMode(true);
    if (!showPreview) handleTogglePreview();
    let keepPanels = false;
    try { keepPanels = localStorage.getItem("mpo_always_arrange") === "true"; } catch {}
    if (!keepPanels) {
      if (showLeftPanel) onToggleLeftPanel?.();
      if (showInspector) handleToggleInspector();
    }
  };

  // Resizable 3-Pane Layout Widths (Persisted in localStorage)
  const [layoutWidths, setLayoutWidths] = useState<{ left: number; center: number; right: number }>(() => {
    try {
      const saved = localStorage.getItem("mpo_layout_widths_v4");
      if (saved) return JSON.parse(saved);
    } catch {}
    return { left: 20, center: 35, right: 45 };
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingSplitter = useRef<"left" | "right" | null>(null);

  // Resizing logic for Column 1 & 2 Splitter
  const startResizeLeft = (e: React.PointerEvent) => {
    e.preventDefault();
    isDraggingSplitter.current = "left";
    const startX = e.clientX;
    const startLeft = layoutWidths.left;
    const startCenter = layoutWidths.center;

    const handlePointerMove = (moveEv: PointerEvent) => {
      if (isDraggingSplitter.current !== "left" || !containerRef.current) return;
      const totalWidth = containerRef.current.clientWidth;
      const deltaPercent = ((moveEv.clientX - startX) / totalWidth) * 100;
      const newLeft = Math.min(Math.max(startLeft + deltaPercent, 14), 38);
      const newCenter = Math.min(Math.max(startCenter - (newLeft - startLeft), 20), 65);

      setLayoutWidths((prev) => {
        const next = { left: Math.round(newLeft * 10) / 10, center: Math.round(newCenter * 10) / 10, right: prev.right };
        return next;
      });
    };

    const handlePointerUp = () => {
      isDraggingSplitter.current = null;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      setLayoutWidths((curr) => {
        localStorage.setItem("mpo_layout_widths_v4", JSON.stringify(curr));
        return curr;
      });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  // Resizing logic for Column 2 & 3 Splitter
  const startResizeRight = (e: React.PointerEvent) => {
    e.preventDefault();
    isDraggingSplitter.current = "right";
    const startX = e.clientX;
    const startCenter = layoutWidths.center;
    const startRight = activeSurface === "tiktok" ? effectiveRightWidth : layoutWidths.right;

    const handlePointerMove = (moveEv: PointerEvent) => {
      if (isDraggingSplitter.current !== "right" || !containerRef.current) return;
      const totalWidth = containerRef.current.clientWidth;
      const deltaPercent = ((moveEv.clientX - startX) / totalWidth) * 100;
      const newCenter = Math.min(Math.max(startCenter + deltaPercent, 20), 65);
      const newRight = Math.min(Math.max(startRight - deltaPercent, 25), activeSurface === "tiktok" ? 75 : 55);
      if (activeSurface === "tiktok") { setTiktokWidthOverride(Math.round(newRight * 10) / 10); return; }

      setLayoutWidths((prev) => {
        const next = { left: prev.left, center: Math.round(newCenter * 10) / 10, right: Math.round(newRight * 10) / 10 };
        return next;
      });
    };

    const handlePointerUp = () => {
      isDraggingSplitter.current = null;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      setLayoutWidths((curr) => {
        localStorage.setItem("mpo_layout_widths_v4", JSON.stringify(curr));
        return curr;
      });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  // Active theme component for Single Preview
  const ActiveComponent = THEME_COMPONENTS[currentTheme] || THEME_COMPONENTS["glass-modern"];

  const sourceHost = (() => { try { return localStorage.getItem("mpo_preferred_url_host") === "domain" ? "mpobeta.local:4849" : "127.0.0.1:4849"; } catch { return "127.0.0.1:4849"; } })();
  const sourceUrl = browserSourceUrl(sourceHost, format === "vertical" ? "vertical" : "overlay", activeLayerId);
  const copySource = (value: string, label: string) => { if (!navigator.clipboard?.writeText) { setSourceCopyStatus(`Could not copy ${label.toLowerCase()}`); return; } navigator.clipboard.writeText(value).then(() => setSourceCopyStatus(`${label} copied`)).catch(() => setSourceCopyStatus(`Could not copy ${label.toLowerCase()}`)); };
  const activeSurface = studioName === "Desktop studio" ? "desktop" : format === "vertical" ? "tiktok" : "obs";
  const horizontalTheme = sourceSize ? sourceSize.width > sourceSize.height * 1.2 : Boolean(THEME_REGISTRY[currentTheme]?.surface === "obs");
  const effectiveRightWidth = activeSurface === "tiktok" ? (tiktokWidthOverride ?? (horizontalTheme ? 45 : 60)) : layoutWidths.right;
  const [libraryThemes, setLibraryThemes] = useState<ThemeDefinition[]>(() => {
    try { return readThemeLibrary(); } catch { return []; }
  });
  useEffect(() => {
    const onSync = () => {
      try { setLibraryThemes(readThemeLibrary()); } catch {}
    };
    window.addEventListener(LIBRARY_EVENT, onSync);
    return () => window.removeEventListener(LIBRARY_EVENT, onSync);
  }, []);

  const builtThemeCards = libraryThemes.map((bt) => ({
    id: bt.id as ThemeId,
    name: bt.name,
    tagline: "Custom Built SDK Theme",
    description: `Built theme with ${bt.elements.length} elements. Fully editable in Arrange mode.`,
    badgeColor: "#38bdf8",
    category: "built",
    surface: activeSurface,
    previewBg: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
    defaultConfig: config,
  }));

  const availableThemes = [...builtThemeCards, ...Object.values(THEME_REGISTRY)];
  const filteredThemes = availableThemes.filter(theme => {
    const text = searchQuery.trim().toLowerCase();
    const matchesSearch = !text || [theme.name, theme.description, theme.tagline].some(value => value.toLowerCase().includes(text));
    const isBuilt = (theme as any).category === "built";
    if (selectedCategory === "all") return matchesSearch;
    if (selectedCategory === "built") return matchesSearch && isBuilt;
    if (selectedCategory === "collection") return matchesSearch && (isBuilt || theme.surface === activeSurface);
    if (isBuilt) return false;
    const matchesCollection = galleryMatchesSurface(theme.surface as ("obs" | "tiktok" | "desktop" | undefined), selectedCategory, activeSurface);
    return matchesSearch && matchesCollection;
  });

  const [animationTestCounter, setAnimationTestCounter] = useState(0);

  const activeTransitionKey = `${media?.title || "untitled"}-${media?.artist || "unknown"}-${media?.album_title || "none"}-${animationTestCounter}`;

  // Combine layer-level customCss and element-level scoped CSS with ThemeStyleEngine
  const effectivePreviewCss = customCss;
  const previewConfig = { ...config, ...previewOverrides, accentColor: config.autoAlbumColor && extractedColor ? extractedColor : config.accentColor };
  const singlePreviewGeneratedCss = generateEffectiveThemeCss(previewConfig, format, extractedColor, effectivePreviewCss);

  return (
    <div className="overlay-studio-root">
      {/* =========================================================================
          TOP SUB-HEADER: Themes & Layers Toggle, Stream Format, Data Toggles
         ========================================================================= */}
      <div className={`studio-top-controls-strip ${activeSurface === "desktop" ? "desktop-studio-controls" : ""}`}>
        {/* Leftmost Toggle for Themes & Layers panel */}
        <div className="left-panel-toggle-wrapper" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {activeSurface !== "desktop" && <button
            onClick={onToggleLeftPanel}
            className={`themes-panel-toggle-btn ${showLeftPanel ? "active" : ""}`}
            title={showLeftPanel ? "Hide Themes & Layers Browser" : "Show Themes & Layers Browser"}
          >
            {showLeftPanel ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
            <span>Themes & Layers</span>
            <span className="panel-state-pill">{showLeftPanel ? "ON" : "OFF"}</span>
          </button>}

          <button
            onClick={handleTogglePreview}
            className={`themes-panel-toggle-btn ${showPreview ? "active" : ""}`}
            title={showPreview ? "Turn Preview Canvas OFF" : "Turn Preview Canvas ON"}
          >
            {showPreview ? <Eye size={14} /> : <EyeOff size={14} />}
            <span>Preview</span>
            <span className="panel-state-pill">{showPreview ? "ON" : "OFF"}</span>
          </button>

          {activeSurface !== "desktop" && <button
            onClick={handleToggleInspector}
            className={`themes-panel-toggle-btn ${showInspector ? "active" : ""}`}
            title={showInspector ? "Hide Styling Inspector" : "Show Styling Inspector"}
          >
            {showInspector ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
            <span>Styling</span>
            <span className="panel-state-pill">{showInspector ? "ON" : "OFF"}</span>
          </button>}
        </div>

        <div className={activeSurface === "desktop" ? "desktop-studio-heading" : "beta-studio-heading"} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {activeSurface !== "desktop" && <div>
            <strong>{studioName || (format === "vertical" ? "TikTok studio" : "Overlay studio")}</strong>
            <span>{studioName === "Desktop studio" ? "Desktop overlay" : format === "vertical" ? "Portrait · 9:16" : "Landscape · 16:9"}</span>
          </div>}
          {headerRightActions}
        </div>
        <button type="button" className={`themes-panel-toggle-btn arrange-toggle ${arrangeMode ? "active" : ""}`} onClick={toggleArrange} aria-pressed={arrangeMode} title="Select elements to style them"><MousePointer2 size={14} aria-hidden="true" /> Arrange <span className="panel-state-pill">{arrangeMode ? "ON" : "OFF"}</span></button>
      </div>

      {/* =========================================================================
          MAIN 3-PANE RESIZABLE BODY
         ========================================================================= */}
      <div className="studio-columns-resizable-container" ref={containerRef}>
        {/* COLUMN 1: Themes & Layers Browser (Collapsible) */}
        {showLeftPanel && (
          <>
            <aside
              className="studio-left-column"
              style={{ width: `${layoutWidths.left}%` }}
            >
              {/* Tab Selector */}
              <div className="panel-tab-header">
                <button
                  onClick={() => onSetLeftPanelTab?.("themes")}
                  className={`panel-tab-btn ${leftPanelTab === "themes" ? "active" : ""}`}
                >
                  <Palette size={13} />
                  <span>Themes ({availableThemes.length})</span>
                </button>
                <button
                  onClick={() => onSetLeftPanelTab?.("layers")}
                  className={`panel-tab-btn ${leftPanelTab === "layers" ? "active" : ""}`}
                >
                  <Layers size={13} />
                  <span>Layers ({layers.length})</span>
                </button>
              </div>

              {leftPanelTab === "themes" ? (
                <div className="themes-browser-body">
                  {/* Search Bar */}
                  <div className="search-box-row">
                    <Search size={14} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search themes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="theme-search-input"
                    />
                  </div>

                  {/* Category Pills */}
                  <div className="category-filter-pills">
                    {([ ["collection", "This studio"], ["built", "Built (SDK)"], ["obs", "OBS"], ["tiktok", "TikTok"], ["desktop", "Desktop"], ["classic", "Classic"], ["all", "All"] ] as const).map(([cat, label]) => (
                      <button key={cat} type="button" onClick={() => setSelectedCategory(cat)} className={`cat-pill ${selectedCategory === cat ? "active" : ""}`} aria-pressed={selectedCategory === cat}>{label}</button>
                    ))}
                  </div>

                  {THEME_REGISTRY[currentTheme] && THEME_REGISTRY[currentTheme].surface !== activeSurface && selectedCategory === "collection" && <button type="button" className="classic-theme-notice" onClick={() => setSelectedCategory(THEME_REGISTRY[currentTheme].surface || "classic")}>Current theme: {THEME_REGISTRY[currentTheme].name} · View</button>}
                  {/* Themes List */}
                  <div className="themes-picker-scroll">
                    {filteredThemes.length === 0 && <p className="theme-empty">No themes match your search.</p>}
                    {filteredThemes.map((theme) => {
                      const isSelected = currentTheme === theme.id;
                      return (
                        <div
                          key={theme.id}
                          role="button"
                          tabIndex={0}
                          aria-pressed={isSelected}
                          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onThemeSelect(theme.id); onCommitHistory?.(`Switched base theme to ${theme.name}`); } }}
                          onClick={() => {
                            onThemeSelect(theme.id);
                            onCommitHistory?.(`Switched base theme to ${theme.name}`);
                          }}
                          className={`theme-picker-item ${isSelected ? "selected" : ""}`}
                        >
                          <div className="theme-picker-lead">
                            <div className="theme-picker-badge-wrap">
                              <span
                                className="theme-picker-dot"
                                style={{ backgroundColor: theme.badgeColor }}
                              />
                              <span
                                className="theme-picker-cat-pill"
                                style={{ backgroundColor: `${theme.badgeColor}22`, color: theme.badgeColor }}
                              >
                                {theme.category}
                              </span>
                            </div>
                            {isSelected && <span className="active-dot" />}
                          </div>

                          <div className="theme-picker-meta">
                            <div className="theme-picker-name-row">
                              <span className="theme-picker-title">{theme.name}</span>
                            </div>
                            <span className="theme-picker-tagline">{theme.tagline}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                layerBrowser || <LayerBrowser
                  lockedFormat={format}
                  layers={layers}
                  activeLayerId={activeLayerId}
                  onSelectLayer={onSelectLayer}
                  onCreateLayer={onCreateLayer}
                  onDuplicateLayer={onDuplicateLayer}
                  onDeleteLayer={onDeleteLayer}
                  onRenameLayer={onRenameLayer}
                />
              )}
            </aside>

            {/* Draggable Splitter between Column 1 and 2 */}
            <div
              className="studio-resizer"
              onPointerDown={startResizeLeft}
              title="Drag to resize Left and Center panels"
            />
          </>
        )}

        {/* COLUMN 2: Center Live Preview Canvas (Single or Split Dual) */}
        {showPreview && (
          <main
            className="studio-center-column"
            style={{
              width: !showLeftPanel && !showInspector
                ? "100%"
                : !showLeftPanel
                ? `${activeSurface === "tiktok" ? 100 - effectiveRightWidth : layoutWidths.center + layoutWidths.left}%`
                : !showInspector
                ? `${layoutWidths.center + layoutWidths.right}%`
                : `${activeSurface === "tiktok" ? Math.max(0, 100 - layoutWidths.left - effectiveRightWidth) : layoutWidths.center}%`
            }}
          >
            <div className="canvas-frame-v4">
              <div className="canvas-header-v4"><div className="canvas-title-row"><span className="canvas-title">Preview Canvas</span>{arrangeMode && <span className="arrange-mode-badge"><ScanLine size={13} aria-hidden="true" /> Arrange mode</span>}</div></div>
              {activeSurface !== "desktop" && <div className="source-size-guide" aria-live="polite">
                <div className="source-guide-row"><strong>High-quality browser source · 2×</strong>{sourceSize ? <><span>{sourceSize.width} × {sourceSize.height} px</span><button type="button" onClick={() => copySource(`${sourceSize.width} x ${sourceSize.height}`, "Size")}>Copy size</button></> : <span>Measuring…</span>}</div>
                <div className="source-guide-row"><span>URL for this layer</span><code title={sourceUrl}>{sourceUrl}</code><button type="button" onClick={() => copySource(sourceUrl, "URL")}>Copy URL</button>{sourceCopyStatus && <span role="status">{sourceCopyStatus}</span>}</div>
                <small>Set your Browser Source in {activeSurface === "tiktok" ? "TikTok LIVE Studio" : "OBS"} to this exact Width &amp; Height to eliminate dead space. For full-screen canvases (1920×1080 / 1080×1920), add <code>&amp;align=bottom</code> to pin the overlay to the bottom.</small>
              </div>}
              <ArrangeCanvas enabled={arrangeMode} selected={selectedElement} onSelect={setSelectedElement} config={config} onConfigChange={onConfigChange} onCommitHistory={onCommitHistory} layerKey={activeLayerId} className={`canvas-viewport-v4 auto-fit-viewport ${arrangeMode ? "arrange-mode" : ""}`} data-arrange-selected={arrangeMode ? selectedElement || undefined : undefined} data-arrange-hovered={arrangeMode ? hoveredElement || undefined : undefined} onPointerMove={(event) => { if (arrangeMode) setHoveredElement(findThemeElement(event.target as Element)); }} onPointerLeave={() => setHoveredElement(null)}><div className="checkerboard-bg" />
                <AutoFitPreview config={previewConfig} configScale={config.scale} contentKey={currentTheme + JSON.stringify(config)} onContentSize={receiveSourceSize}>
                  <div className={`single-preview-mount preview-canvas-scope ${format === "vertical" ? "vertical-viewport" : ""}`}>
                    {singlePreviewGeneratedCss && <style>{singlePreviewGeneratedCss}</style>}
                    <TrackTransitionWrapper transitionKey={activeTransitionKey} style={config.transitionStyle || "focus"} direction={config.transitionDirection || "left"} intensity={config.transitionIntensity || "standard"} durationMs={config.transitionDurationMs ?? (config.transitionDuration != null ? config.transitionDuration * 1000 : 350)} delayMs={config.transitionDelayMs ?? (config.transitionDelay != null ? config.transitionDelay * 1000 : 0)}>
                      {layers.find(layer=>layer.id===activeLayerId)?.builtTheme ? <BuiltThemeMount theme={layers.find(layer=>layer.id===activeLayerId)!.builtTheme!} surface={activeSurface} media={media} artUrl={artUrl} config={previewConfig} extractedColor={extractedColor} customCss={effectivePreviewCss}/> : <ActiveComponent media={media} artUrl={artUrl} config={previewConfig} format={format} extractedColor={extractedColor} />}
                    </TrackTransitionWrapper>
                  </div>
                </AutoFitPreview>
              </ArrangeCanvas>
              {arrangeMode && <div className="arrange-accessible-tools"><ArrangeElementPicker selected={selectedElement} onSelect={setSelectedElement}/><small>Choose any element, including one that is currently hidden.</small></div>}
              {arrangeMode && (selectedElement ? (
                <ContextualThemeEditor
                  key={`${activeLayerId}-${selectedElement}`}
                  selected={selectedElement}
                  config={config}
                  extractedColor={extractedColor}
                  customCss={customCss}
                  onCustomCssChange={onCustomCssChange}
                  onConfigChange={onConfigChange}
                  onCommitHistory={onCommitHistory}
                  onClose={() => setSelectedElement(null)}
                  builtTheme={layers.find(layer => layer.id === activeLayerId)?.builtTheme}
                  onUpdateBuiltTheme={onUpdateBuiltTheme}
                  surface={activeSurface}
                  onOpenBuilder={onOpenBuilder}
                />
              ) : (
                <div className="context-editor-hint">
                  <span className="arrange-hint-icon"><MousePointer2 size={15} aria-hidden="true" /></span>
                  <span><strong>Select an element</strong><small>Hover over an element, then select it to adjust its style.</small></span>
                </div>
              ))}
            </div>
          </main>
        )}

        {/* Draggable Splitter between Column 2 and 3 */}
        {showPreview && showInspector && <div className="studio-resizer" onPointerDown={startResizeRight} title="Drag to resize preview and styling panels" />}

        {/* COLUMN 3: Dedicated Overlay Styling Accordion */}
        {showInspector && (
          <SharedStyleInspector
            studioSurface={activeSurface}
            arrangePlacement
            config={config}
            extractedColor={extractedColor}
            customCss={customCss}
            onConfigChange={onConfigChange}
            onCustomCssChange={onCustomCssChange}
            onCommitHistory={onCommitHistory}
            onOpenCssReference={onOpenCssReference}
            onReplay={() => setAnimationTestCounter((c) => c + 1)}
            width={!showPreview && !showLeftPanel ? "100%" : !showPreview ? `${layoutWidths.right + layoutWidths.center}%` : `${effectiveRightWidth}%`}
          />
        )}
      </div>
    </div>
  );
};

export default OverlayStudio;
