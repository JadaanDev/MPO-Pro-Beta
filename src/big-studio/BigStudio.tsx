import { useArrangeMovementLock } from "../hooks/useArrangeMovementLock";
import { ArrangeMovementLock } from "../components/dashboard/ArrangeMovementLock";
import React, { useEffect, useRef, useState } from "react";
import {
  MonitorPlay,
  Plus,
  Upload,
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
} from "lucide-react";
import type { Layer } from "../types/layers";
import { MediaState } from "../types/media";
import { isTauriEnvironment } from "../hooks/useMediaState";
import { SharedStyleInspector } from "../components/dashboard/SharedStyleInspector";
import { ContextualThemeEditor, findThemeElement, type ThemeElement } from "../components/dashboard/ContextualThemeEditor";
import { ArrangeCanvas } from "../components/dashboard/ArrangeCanvas";
import { ArrangeElementPicker } from "../components/dashboard/ArrangeElementPicker";
import { LayerContextMenu } from "../components/dashboard/LayerContextMenu";
import { LayerCard } from "../components/dashboard/LayerCard";
import { extractDominantColor } from "../utils/colorExtractor";
import { loadGoogleFont } from "../utils/fontLoader";
import { presentationEditorConfig, applyPresentationEdit } from "../utils/presentationEditorConfig";
import { BIG_THEMES } from "./themes";
import { readBigSettings, writeBigSettings } from "./settings";
import { useBigLayers, exportBigLayer } from "./useBigLayers";
import type { BigLayer } from "./types";
import { BigStage } from "./BigStage";
import { BigPreview } from "./BigPreview";
import { BigStyleInspector } from "./BigStyleInspector";
import "./big-ui.css";

export function BigStudio({
  media,
  artUrl,
  extractedColor: extractedColorProp,
  onOpenCssReference,
}: {
  media: MediaState;
  artUrl: string;
  extractedColor?: string | null;
  onOpenCssReference?: () => void;
}) {
  const [settings, setSettings] = useState(readBigSettings);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"themes" | "layers">("themes");
  const [searchQuery, setSearchQuery] = useState("");
  const [menu, setMenu] = useState<{ layer: BigLayer; x: number; y: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [copiedLayerId,setCopiedLayerId] = useState<string | null>(null);
  const [replay, setReplay] = useState(0);
  const [movementLocked, setMovementLocked] = useArrangeMovementLock();
  const [arrangeMode,setArrangeMode] = useState(() => {try {return localStorage.getItem("mpo_always_arrange") === "true";} catch {return false;}});
  const [selectedElement,setSelectedElement] = useState<ThemeElement | null>(null);
  const [hoveredElement,setHoveredElement] = useState<ThemeElement | null>(null);
  const [localExtractedColor, setLocalExtractedColor] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [showLeftPanel, setShowLeftPanel] = useState<boolean>(() => {
    try {
      return localStorage.getItem("mpo_big_left_panel_visible") !== "false";
    } catch {
      return true;
    }
  });

  const [showPreview, setShowPreview] = useState<boolean>(() => {
    try {
      return localStorage.getItem("mpo_big_preview_visible") !== "false";
    } catch {
      return true;
    }
  });

  const [showInspector, setShowInspector] = useState<boolean>(() => {
    try {
      return localStorage.getItem("mpo_big_inspector_visible") !== "false";
    } catch {
      return true;
    }
  });

  const [layoutWidths, setLayoutWidths] = useState<{ left: number; center: number; right: number }>(() => {
    try {
      const saved = localStorage.getItem("mpo_big_layout_widths_v1");
      if (saved) return JSON.parse(saved);
    } catch {}
    return { left: 20, center: 48, right: 32 };
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingSplitter = useRef<"left" | "right" | null>(null);

  const { project, active, update, select, create, duplicate, rename, remove, chooseTheme, importLayer } = useBigLayers();
  useEffect(() => { setSelectedElement(null); setHoveredElement(null); }, [active.id, active.themeId]);

  useEffect(() => {
    const sync = () => setSettings(readBigSettings());
    window.addEventListener("storage", sync);
    window.addEventListener("mpo-big-settings", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("mpo-big-settings", sync);
    };
  }, []);

  useEffect(() => {
    if (extractedColorProp !== undefined) return;
    let cancelled = false;
    setLocalExtractedColor(null);
    if (artUrl) extractDominantColor(artUrl).then(color => { if (!cancelled) setLocalExtractedColor(color); });
    return () => { cancelled = true; };
  }, [artUrl, extractedColorProp]);

  const effectiveExtractedColor = extractedColorProp !== undefined ? extractedColorProp : localExtractedColor;

  useEffect(() => {
    const fonts = [
      active.config.titleFont,
      ...Object.values(active.config.typography || {}).map((t) => t?.font),
    ];
    fonts.forEach((font) => {
      if (font) loadGoogleFont(font);
    });
  }, [active.config]);

  const handleToggleLeftPanel = () => {
    setShowLeftPanel((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("mpo_big_left_panel_visible", String(next));
      } catch {}
      return next;
    });
  };

  const handleTogglePreview = () => {
    setShowPreview((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("mpo_big_preview_visible", String(next));
      } catch {}
      return next;
    });
  };

  const handleToggleInspector = () => {
    setShowInspector((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("mpo_big_inspector_visible", String(next));
      } catch {}
      return next;
    });
  };

  const toggleArrange = () => {
    if (arrangeMode) { setArrangeMode(false); setSelectedElement(null); return; }
    setArrangeMode(true);
    if (!showPreview) handleTogglePreview();
    let keepPanels = false; try { keepPanels = localStorage.getItem("mpo_always_arrange") === "true"; } catch {}
    if (!keepPanels) { if (showLeftPanel) handleToggleLeftPanel(); if (showInspector) handleToggleInspector(); }
  };

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
      setLayoutWidths((prev) => ({
        left: Math.round(newLeft * 10) / 10,
        center: Math.round(newCenter * 10) / 10,
        right: prev.right,
      }));
    };

    const handlePointerUp = () => {
      isDraggingSplitter.current = null;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      setLayoutWidths((curr) => {
        localStorage.setItem("mpo_big_layout_widths_v1", JSON.stringify(curr));
        return curr;
      });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const startResizeRight = (e: React.PointerEvent) => {
    e.preventDefault();
    isDraggingSplitter.current = "right";
    const startX = e.clientX;
    const startCenter = layoutWidths.center;
    const startRight = layoutWidths.right;

    const handlePointerMove = (moveEv: PointerEvent) => {
      if (isDraggingSplitter.current !== "right" || !containerRef.current) return;
      const totalWidth = containerRef.current.clientWidth;
      const deltaPercent = ((moveEv.clientX - startX) / totalWidth) * 100;
      const newCenter = Math.min(Math.max(startCenter + deltaPercent, 20), 65);
      const newRight = Math.min(Math.max(startRight - (newCenter - startCenter), 25), 55);
      setLayoutWidths((prev) => ({
        left: prev.left,
        center: Math.round(newCenter * 10) / 10,
        right: Math.round(newRight * 10) / 10,
      }));
    };

    const handlePointerUp = () => {
      isDraggingSplitter.current = null;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      setLayoutWidths((curr) => {
        localStorage.setItem("mpo_big_layout_widths_v1", JSON.stringify(curr));
        return curr;
      });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const theme = BIG_THEMES.find((t) => t.id === active.themeId) || BIG_THEMES[0];
  const filteredThemes = BIG_THEMES.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return [item.name, item.description, item.label].some((v) => v.toLowerCase().includes(q));
  });

  const open = async () => {
    try {
      setError("");
      if (isTauriEnvironment()) {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("open_big_studio");
      } else {
        const popup = window.open("/?mode=big", "mpo-big-studio", "width=1280,height=720");
        if (!popup) throw Error("Allow pop-ups to open the presentation window.");
      }
    } catch (e) {
      setError(String(e));
    }
  };

  const importFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.type !== "mpo-big-layer" || data.version !== 1 || !importLayer(data.layer)) {
        throw Error("Choose a valid Big Studio layer export.");
      }
      setError("");
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="overlay-studio-root big-studio-root">
      {/* TOP SUB-HEADER: Identical Studio Controls Strip */}
      <div className="studio-top-controls-strip">
        <div className="left-panel-toggle-wrapper" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <button
            onClick={handleToggleLeftPanel}
            className={`themes-panel-toggle-btn ${showLeftPanel ? "active" : ""}`}
            title={showLeftPanel ? "Hide Themes & Layers Browser" : "Show Themes & Layers Browser"}
          >
            {showLeftPanel ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
            <span>Themes & Layers</span>
            <span className="panel-state-pill">{showLeftPanel ? "ON" : "OFF"}</span>
          </button>

          <button
            onClick={handleTogglePreview}
            className={`themes-panel-toggle-btn ${showPreview ? "active" : ""}`}
            title={showPreview ? "Turn Preview Canvas OFF" : "Turn Preview Canvas ON"}
          >
            {showPreview ? <Eye size={14} /> : <EyeOff size={14} />}
            <span>Preview</span>
            <span className="panel-state-pill">{showPreview ? "ON" : "OFF"}</span>
          </button>

          <button
            onClick={handleToggleInspector}
            className={`themes-panel-toggle-btn ${showInspector ? "active" : ""}`}
            title={showInspector ? "Hide Styling Inspector" : "Show Styling Inspector"}
          >
            {showInspector ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
            <span>Styling</span>
            <span className="panel-state-pill">{showInspector ? "ON" : "OFF"}</span>
          </button>
        </div>

        <div className="beta-studio-heading" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div>
            <strong>Big Studio</strong>
            <span>Presentation · 16:9</span>
          </div>
          <ArrangeMovementLock locked={movementLocked} onChange={setMovementLocked}/>
          <button type="button" className={`themes-panel-toggle-btn arrange-toggle ${arrangeMode ? "active" : ""}`} onClick={toggleArrange} aria-pressed={arrangeMode}><MousePointer2 size={14}/> Arrange <span className="panel-state-pill">{arrangeMode ? "ON" : "OFF"}</span></button>
          <button className="big-launch" onClick={open} style={{ padding: "7px 14px", fontSize: "12px" }}>
            <MonitorPlay size={15} /> Open presentation
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="big-error" style={{ margin: "8px 16px 0" }}>
          {error}
        </p>
      )}

      {/* MAIN 3-PANE RESIZABLE BODY */}
      <div className="studio-columns-resizable-container" ref={containerRef}>
        {/* COLUMN 1: Themes & Layers Browser */}
        {showLeftPanel && (
          <>
            <aside className="studio-left-column" style={{ width: `${layoutWidths.left}%` }}>
              <div className="panel-tab-header">
                <button
                  aria-pressed={tab === "themes"}
                  onClick={() => setTab("themes")}
                  className={`panel-tab-btn ${tab === "themes" ? "active" : ""}`}
                >
                  <Palette size={13} />
                  <span>Themes ({BIG_THEMES.length})</span>
                </button>
                <button
                  aria-pressed={tab === "layers"}
                  onClick={() => setTab("layers")}
                  className={`panel-tab-btn ${tab === "layers" ? "active" : ""}`}
                >
                  <Layers size={13} />
                  <span>Layers ({project.layers.length})</span>
                </button>
              </div>

              {tab === "themes" ? (
                <div className="themes-browser-body">
                  <div className="search-box-row">
                    <Search size={14} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search stage themes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="theme-search-input"
                    />
                  </div>
                  <div className="themes-picker-scroll big-theme-list">
                    {filteredThemes.length === 0 && <p className="theme-empty">No themes match your search.</p>}
                    {filteredThemes.map((item) => (
                      <button
                        key={item.id}
                        aria-pressed={item.id === theme.id}
                        className={`big-choice ${item.id === theme.id ? "selected" : ""}`}
                        onClick={() => chooseTheme(item.id)}
                      >
                        <span className={`big-choice-swatch big-theme-${item.id}`} style={{ "--big-accent": item.accent } as React.CSSProperties}>
                          <span className="big-choice-art" /><span className="big-choice-lines"><i /><i /><i /></span>
                        </span>
                        <span>
                          <strong>{item.name}</strong>
                          <small>{item.description}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="themes-browser-body" style={{ padding: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                    <strong style={{ fontSize: "12px", color: "#e2e8f0" }}>Presentation layers</strong>
                    <button className="big-small-button" onClick={create}>
                      <Plus size={13} /> New
                    </button>
                  </div>
                  <div className="big-theme-list">
                    {project.layers.map(layer => <LayerCard key={layer.id} layer={layer} presentation themeName={BIG_THEMES.find(item=>item.id===layer.themeId)?.name} active={layer.id===active.id} copied={copiedLayerId===layer.id} canDelete={project.layers.length>1} editing={editingId===layer.id} editName={editName} onEditName={setEditName} onSelect={()=>select(layer.id)} onRename={()=>{setEditingId(layer.id);setEditName(layer.name);}} onSaveRename={()=>{rename(layer.id,editName);setEditingId(null);}} onCancelRename={()=>setEditingId(null)} onCopy={()=>{navigator.clipboard.writeText("http://127.0.0.1:4849/?layer="+encodeURIComponent(layer.id)).then(()=>{setCopiedLayerId(layer.id);setTimeout(()=>setCopiedLayerId(null),2000);}).catch(()=>setError("Could not copy the layer URL."));}} onDuplicate={()=>duplicate(layer.id)} onExport={()=>exportBigLayer(layer)} onDelete={()=>remove(layer.id)} onMenu={event=>{event.preventDefault();event.stopPropagation();setMenu({layer,x:event.clientX,y:event.clientY});}} />)}
                  </div>
                  <button className="big-import" onClick={() => fileRef.current?.click()}>
                    <Upload size={13} /> Import Big layer
                  </button>
                  <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importFile} />
                </div>
              )}
              {menu && (
                <LayerContextMenu
                  layer={menu.layer as unknown as Layer}
                  x={menu.x}
                  y={menu.y}
                  canDelete={project.layers.length > 1}
                  onClose={() => setMenu(null)}
                  onRename={() => {
                    setEditingId(menu.layer.id);
                    setEditName(menu.layer.name);
                  }}
                  onDuplicate={() => duplicate(menu.layer.id)}
                  onDelete={() => remove(menu.layer.id)}
                  onExport={() => exportBigLayer(menu.layer)}
                />
              )}
            </aside>

            <div
              className="studio-resizer"
              onPointerDown={startResizeLeft}
              title="Drag to resize Left and Center panels"
            />
          </>
        )}

        {/* COLUMN 2: Center Live Preview Canvas */}
        {showPreview && (
          <main
            className="studio-center-column"
            style={{
              width:
                !showLeftPanel && !showInspector
                  ? "100%"
                  : !showLeftPanel
                  ? `${layoutWidths.center + layoutWidths.left}%`
                  : !showInspector
                  ? `${layoutWidths.center + layoutWidths.right}%`
                  : `${layoutWidths.center}%`,
            }}
          >
            <div className="canvas-frame-v4">
              <div className="canvas-header-v4">
                <div className="canvas-title-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                  <span className="canvas-title">Live preview · {active.name} ({theme.name})</span>
                  <span style={{ fontSize: "11px", opacity: 0.7 }}>16:9 Stage</span>
                </div>
              </div>
              <div className="canvas-viewport-v4 auto-fit-viewport" style={{ padding: "16px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "14px" }}>
                <div className="checkerboard-bg" />
                <ArrangeCanvas movementLocked={movementLocked} enabled={arrangeMode} selected={selectedElement} onSelect={setSelectedElement} config={presentationEditorConfig(active.config)} onConfigChange={fn=>update(layer=>({...layer,config:applyPresentationEdit(layer.config,fn)}))} layerKey={active.id} className={`big-preview-stage ${arrangeMode ? "arrange-mode" : ""}`} data-arrange-selected={arrangeMode ? selectedElement || undefined : undefined} data-arrange-hovered={arrangeMode ? hoveredElement || undefined : undefined} onPointerMove={event => {if(arrangeMode)setHoveredElement(findThemeElement(event.target as Element));}} onPointerLeave={()=>setHoveredElement(null)}>
                <BigPreview>
                  <BigStage
                    theme={theme}
                    layer={active}
                    media={media}
                    artUrl={artUrl}
                    scale={settings.scale}
                    config={active.config}
                    customCss={active.customCss}
                    extractedColor={effectiveExtractedColor}
                    replay={replay}
                  />
                </BigPreview>
                </ArrangeCanvas>
                <span className="big-preview-hint">Live presentation preview · press F11 in the presentation window for full screen</span>
              </div>
              {arrangeMode && <div className="arrange-accessible-tools"><ArrangeElementPicker selected={selectedElement} onSelect={setSelectedElement}/><small>Choose any element, including one that is currently hidden.</small></div>}
              {arrangeMode && selectedElement && <ContextualThemeEditor movementLocked={movementLocked} key={`${active.id}-${selectedElement}`} presentationMode selected={selectedElement} config={presentationEditorConfig(active.config)} extractedColor={effectiveExtractedColor} customCss={active.customCss} builtTheme={active.builtTheme} surface="big" onUpdateBuiltTheme={fn=>update(layer=>({...layer,builtTheme:layer.builtTheme ? fn(layer.builtTheme) : undefined}))} onCustomCssChange={css=>update(layer=>({...layer,customCss:css}))} onConfigChange={fn=>update(layer=>({...layer,config:applyPresentationEdit(layer.config,fn)}))} onClose={()=>setSelectedElement(null)} />}
            </div>
          </main>
        )}

        {/* Draggable Splitter between Column 2 and 3 */}
        {showPreview && showInspector && (
          <div
            className="studio-resizer"
            onPointerDown={startResizeRight}
            title="Drag to resize preview and styling panels"
          />
        )}

        {/* COLUMN 3: Dedicated Overlay Styling Accordion (100% Card Customizer Options) */}
        {showInspector && (
          <div className="big-inspector-column" style={{ width: !showPreview && !showLeftPanel ? "100%" : !showPreview ? `${layoutWidths.right + layoutWidths.center}%` : `${layoutWidths.right}%` }}>
          <BigStyleInspector movementLocked={arrangeMode && movementLocked} stageScale={settings.scale} onStageScaleChange={scale => {if(arrangeMode && movementLocked)return;const next={...settings,scale};setSettings(next);writeBigSettings(next);}} config={active.config} onChange={(fn) => update((layer) => ({ ...layer, config: fn(layer.config) }))} />
          <details><summary>Advanced styling</summary><SharedStyleInspector movementLocked={arrangeMode && movementLocked}
            presentationMode
            hideScaleControl
            config={presentationEditorConfig(active.config)}
            extractedColor={effectiveExtractedColor}
            customCss={active.customCss}
            onConfigChange={(fn) => update((layer) => ({ ...layer, config: applyPresentationEdit(layer.config,fn) }))}
            onCustomCssChange={(css) => update((layer) => ({ ...layer, customCss: css }))}
            onReplay={() => setReplay((n) => n + 1)}
            onOpenCssReference={onOpenCssReference}
            width="100%"
          /></details></div>
        )}
      </div>
    </div>
  );
}
