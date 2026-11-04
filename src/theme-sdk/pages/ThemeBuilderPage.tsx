import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Palette,
  Smartphone,
  AppWindow,
  Monitor,
  Check,
  Plus,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Send,
  Layers,
} from "lucide-react";
import { Toggle } from "../../components/common/Toggle";
import { ThemeEffectBoundary } from "../../components/common/ThemeEffectBoundary";
import type { MediaState } from "../../types/media";
import {
  ELEMENT_TYPES,
  THEME_SURFACES,
  type ElementType,
  type ThemeDefinition,
  type ThemeElement,
  type ThemeSurface,
} from "../schema";
import { ThemeRenderer } from "../ThemeRenderer";
import { listAllThemes, saveTheme } from "../themeStore";

export interface ThemeBuilderPageProps {
  media: MediaState;
  artUrl: string;
  routedStudios?: Partial<Record<ThemeSurface, string | undefined>>;
  onRouteToStudio: (theme: ThemeDefinition, surface: ThemeSurface, openStudio?: boolean) => void;
}

const SURFACE_META: Record<
  ThemeSurface,
  { label: string; shortLabel: string; aspect: string; width: number; height: number; icon: React.ComponentType<{ size?: string | number }> }
> = {
  obs: { label: "Overlay Studio (OBS)", shortLabel: "OBS 16:9", aspect: "640 × 180", width: 640, height: 180, icon: Palette },
  tiktok: { label: "TikTok Studio", shortLabel: "TikTok 9:16", aspect: "360 × 640", width: 320, height: 568, icon: Smartphone },
  desktop: { label: "Desktop Overlay", shortLabel: "Desktop HUD", aspect: "580 × 170", width: 580, height: 170, icon: AppWindow },
  big: { label: "Big Studio Stage", shortLabel: "Big Stage", aspect: "720 × 405", width: 680, height: 382, icon: Monitor },
};

export const ThemeBuilderPage: React.FC<ThemeBuilderPageProps> = ({
  media,
  artUrl,
  routedStudios = {},
  onRouteToStudio,
}) => {
  const [themes, setThemes] = useState<ThemeDefinition[]>([]);
  const [activeThemeId, setActiveThemeId] = useState<string>("");
  const [previewSurface, setPreviewSurface] = useState<ThemeSurface>("obs");
  const [selectedElementId, setSelectedElementId] = useState<string | null>("title");
  const [inspectorTab, setInspectorTab] = useState<"element" | "canvas">("element");
  const [routedNotice, setRoutedNotice] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listAllThemes().then((list) => {
      setThemes(list);
      if (list.length > 0 && !activeThemeId) {
        setActiveThemeId(list[0].id);
      }
    }).catch(() => {});
  }, []);

  const activeTheme = useMemo(() => {
    return themes.find((t) => t.id === activeThemeId) || themes[0] || null;
  }, [themes, activeThemeId]);

  const updateActiveTheme = (updater: (curr: ThemeDefinition) => ThemeDefinition) => {
    if (!activeTheme) return;
    const next = updater(activeTheme);
    setThemes((prev) => prev.map((t) => (t.id === next.id ? next : t)));
    saveTheme(next).catch(() => {});
  };

  const hasSurfaceOverride = Boolean(
    activeTheme?.layouts && activeTheme.layouts[previewSurface] && activeTheme.layouts[previewSurface]!.length > 0
  );

  const activeElements: ThemeElement[] = useMemo(() => {
    if (!activeTheme) return [];
    if (activeTheme.layouts && activeTheme.layouts[previewSurface] && activeTheme.layouts[previewSurface]!.length > 0) {
      return activeTheme.layouts[previewSurface]!;
    }
    return activeTheme.elements || [];
  }, [activeTheme, previewSurface]);

  const selectedElement = useMemo(() => {
    return activeElements.find((e) => e.id === selectedElementId) || activeElements[0] || null;
  }, [activeElements, selectedElementId]);

  const updateActiveElements = (updater: (list: ThemeElement[]) => ThemeElement[]) => {
    if (!activeTheme) return;
    const nextList = updater(activeElements);
    updateActiveTheme((curr) => {
      if (hasSurfaceOverride) {
        return {
          ...curr,
          layouts: {
            ...(curr.layouts || {}),
            [previewSurface]: nextList,
          },
        };
      }
      return {
        ...curr,
        elements: nextList,
      };
    });
  };

  const handleToggleSurfaceOverride = (enable: boolean) => {
    if (!activeTheme) return;
    if (enable) {
      const cloned = JSON.parse(JSON.stringify(activeTheme.elements || []));
      updateActiveTheme((curr) => ({
        ...curr,
        layouts: {
          ...(curr.layouts || {}),
          [previewSurface]: cloned,
        },
      }));
    } else {
      updateActiveTheme((curr) => {
        const nextLayouts = { ...(curr.layouts || {}) };
        delete nextLayouts[previewSurface];
        return {
          ...curr,
          layouts: nextLayouts,
        };
      });
    }
  };

  const handleRoute = (surface: ThemeSurface) => {
    if (!activeTheme) return;
    onRouteToStudio(activeTheme, surface, false);
    setRoutedNotice(`Routed "${activeTheme.name}" to ${SURFACE_META[surface].label}`);
    setTimeout(() => setRoutedNotice(null), 2500);
  };

  const handleAddElement = (type: ElementType) => {
    const existingIds = new Set(activeElements.map((e) => e.id));
    let id: string = type;
    let suffix = 2;
    while (existingIds.has(id)) {
      id = `${type}-${suffix}`;
      suffix++;
    }
    const newEl: ThemeElement = {
      id,
      type,
      x: 10,
      y: 10,
      width: type === "artwork" ? 25 : type === "progress" ? 70 : 50,
      height: type === "artwork" ? 70 : type === "progress" ? 8 : 16,
      visible: true,
    };
    updateActiveElements((list) => [...list, newEl]);
    setSelectedElementId(id);
  };

  const handleDeleteElement = (id: string) => {
    updateActiveElements((list) => list.filter((e) => e.id !== id));
    if (selectedElementId === id) setSelectedElementId(null);
  };

  const handleAlign = (alignment: "left" | "center" | "right") => {
    if (!selectedElement) return;
    const w = selectedElement.width;
    let nextX = selectedElement.x;
    if (alignment === "left") nextX = 4;
    else if (alignment === "center") nextX = Math.round((100 - w) / 2);
    else if (alignment === "right") nextX = Math.max(0, 100 - w - 4);
    updateActiveElements((list) =>
      list.map((el) => (el.id === selectedElement.id ? { ...el, x: nextX } : el))
    );
  };

  const currentMeta = SURFACE_META[previewSurface];

  return (
    <div
      className="mpo-theme-builder-page"
      style={{
        display: "grid",
        gridTemplateColumns: "250px 1fr 340px",
        height: "100%",
        minHeight: 0,
        background: "#080b13",
        color: "#f8fafc",
        overflow: "hidden",
      }}
    >
      {/* =====================================================================
          COLUMN 1: THEME SELECTOR & ADD ELEMENT PALETTE
         ===================================================================== */}
      <aside
        style={{
          borderRight: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          flexDirection: "column",
          padding: 16,
          gap: 16,
          overflowY: "auto",
          background: "rgba(13, 17, 28, 0.95)",
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <Layers size={16} color="#38bdf8" />
            <span>Theme Builder</span>
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
            Visual canvas &amp; 4-studio layout studio
          </div>
        </div>

        {/* Active Theme Selector */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
            Editing Theme
          </label>
          <select
            value={activeThemeId}
            onChange={(e) => setActiveThemeId(e.target.value)}
            style={{
              padding: "7px 10px",
              borderRadius: 8,
              background: "#0f172a",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#ffffff",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {themes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Add Element Palette */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
            Add SDK Element
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {ELEMENT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleAddElement(type)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "6px 8px",
                  borderRadius: 7,
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  color: "#cbd5e1",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Plus size={11} color="#38bdf8" />
                <span>{type}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Elements Tree in current layout */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: "auto" }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
            Layout Layers ({activeElements.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 220, overflowY: "auto" }}>
            {activeElements.map((el) => {
              const isSelected = el.id === selectedElementId;
              return (
                <div
                  key={el.id}
                  onClick={() => setSelectedElementId(el.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 8px",
                    borderRadius: 6,
                    background: isSelected ? "rgba(56, 189, 248, 0.16)" : "rgba(255, 255, 255, 0.02)",
                    border: isSelected ? "1px solid #38bdf8" : "1px solid transparent",
                    color: isSelected ? "#38bdf8" : "#cbd5e1",
                    fontSize: 11.5,
                    cursor: "pointer",
                  }}
                >
                  <span>{el.id}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteElement(el.id);
                    }}
                    style={{ background: "none", border: "none", color: "#ef4444", padding: 2, cursor: "pointer" }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* =====================================================================
          COLUMN 2: VISUAL CANVAS WORKSPACE
         ===================================================================== */}
      <main style={{ display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
        {/* Top Control Bar: Studio Switcher & Canvas Tools */}
        <div
          style={{
            padding: "10px 16px",
            background: "rgba(15, 23, 42, 0.8)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          {/* Studio Surface Switcher */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {THEME_SURFACES.map((surface) => {
              const meta = SURFACE_META[surface];
              const Icon = meta.icon;
              const active = previewSurface === surface;
              return (
                <button
                  key={surface}
                  type="button"
                  onClick={() => setPreviewSurface(surface)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: active ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.1)",
                    background: active ? "rgba(56, 189, 248, 0.18)" : "rgba(255, 255, 255, 0.03)",
                    color: active ? "#38bdf8" : "#cbd5e1",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <Icon size={13} />
                  <span>{meta.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Alignment Tools */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              type="button"
              onClick={() => handleAlign("left")}
              style={{ padding: "5px 8px", borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#cbd5e1", cursor: "pointer" }}
              title="Align Left"
            >
              <AlignLeft size={13} />
            </button>
            <button
              type="button"
              onClick={() => handleAlign("center")}
              style={{ padding: "5px 8px", borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#cbd5e1", cursor: "pointer" }}
              title="Align Center"
            >
              <AlignCenter size={13} />
            </button>
            <button
              type="button"
              onClick={() => handleAlign("right")}
              style={{ padding: "5px 8px", borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#cbd5e1", cursor: "pointer" }}
              title="Align Right"
            >
              <AlignRight size={13} />
            </button>
          </div>
        </div>

        {/* Studio Override Banner */}
        <div
          style={{
            padding: "8px 16px",
            background: "rgba(10, 14, 24, 0.6)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 11.5,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Toggle
              size="sm"
              checked={hasSurfaceOverride}
              onChange={handleToggleSurfaceOverride}
              label={`Custom layout override for ${currentMeta.label}`}
            />
            <span style={{ color: "#64748b" }}>
              ({currentMeta.aspect} · {hasSurfaceOverride ? "Editing studio-specific layout" : "Inheriting base elements"})
            </span>
          </div>

          {routedNotice && (
            <span style={{ color: "#34d399", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              <Check size={12} /> {routedNotice}
            </span>
          )}
        </div>

        {/* Canvas Area */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "radial-gradient(circle at center, rgba(30, 41, 59, 0.55) 0%, rgba(9, 13, 22, 0.95) 100%)",
            padding: 24,
            overflow: "auto",
          }}
        >
          {activeTheme ? (
            <ThemeEffectBoundary>
              <div
                ref={canvasRef}
                style={{
                  width: currentMeta.width,
                  height: currentMeta.height,
                  maxWidth: "100%",
                  overflow: "visible",
                  position: "relative",
                }}
              >
                <ThemeRenderer
                  theme={activeTheme}
                  surface={previewSurface}
                  media={media}
                  artUrl={artUrl}
                  selectedElementId={selectedElement?.id || null}
                  onSelectElement={(id) => setSelectedElementId(id)}
                />
              </div>
            </ThemeEffectBoundary>
          ) : (
            <div style={{ color: "#64748b" }}>Select a theme to preview</div>
          )}
        </div>
      </main>

      {/* =====================================================================
          COLUMN 3: INSPECTOR & STUDIO ROUTING
         ===================================================================== */}
      <aside
        style={{
          borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          flexDirection: "column",
          padding: 16,
          gap: 14,
          overflowY: "auto",
          background: "rgba(13, 17, 28, 0.95)",
        }}
      >
        {/* Studio Routing Section */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, color: "#f8fafc" }}>
            <Send size={13} color="#38bdf8" />
            <span>Route to Studios</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {THEME_SURFACES.map((surface) => {
              const meta = SURFACE_META[surface];
              const Icon = meta.icon;
              const isRouted = activeTheme && routedStudios[surface] === activeTheme.id;
              return (
                <button
                  key={surface}
                  type="button"
                  onClick={() => handleRoute(surface)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 8px",
                    borderRadius: 7,
                    background: isRouted ? "rgba(16, 185, 129, 0.2)" : "rgba(15, 23, 42, 0.75)",
                    border: isRouted ? "1px solid rgba(16, 185, 129, 0.45)" : "1px solid rgba(255, 255, 255, 0.08)",
                    color: isRouted ? "#34d399" : "#cbd5e1",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Icon size={12} />
                    <span>{meta.shortLabel}</span>
                  </div>
                  {isRouted && <Check size={11} color="#10b981" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Inspector Tabs */}
        <div style={{ display: "flex", gap: 6, borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: 8 }}>
          <button
            type="button"
            onClick={() => setInspectorTab("element")}
            style={{
              padding: "5px 10px",
              borderRadius: 6,
              border: "none",
              background: inspectorTab === "element" ? "rgba(56, 189, 248, 0.16)" : "transparent",
              color: inspectorTab === "element" ? "#38bdf8" : "#94a3b8",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Element
          </button>
          <button
            type="button"
            onClick={() => setInspectorTab("canvas")}
            style={{
              padding: "5px 10px",
              borderRadius: 6,
              border: "none",
              background: inspectorTab === "canvas" ? "rgba(56, 189, 248, 0.16)" : "transparent",
              color: inspectorTab === "canvas" ? "#38bdf8" : "#94a3b8",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Canvas
          </button>
        </div>

        {/* Element Inspector */}
        {inspectorTab === "element" && selectedElement && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 11.5 }}>
            <div style={{ fontWeight: 700, color: "#38bdf8" }}>{selectedElement.id}</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span>X (%)</span>
                <input
                  type="number"
                  value={selectedElement.x}
                  onChange={(e) => {
                    const x = Number(e.target.value);
                    updateActiveElements((list) => list.map((el) => (el.id === selectedElement.id ? { ...el, x } : el)));
                  }}
                  style={{ padding: "4px 8px", borderRadius: 6, background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span>Y (%)</span>
                <input
                  type="number"
                  value={selectedElement.y}
                  onChange={(e) => {
                    const y = Number(e.target.value);
                    updateActiveElements((list) => list.map((el) => (el.id === selectedElement.id ? { ...el, y } : el)));
                  }}
                  style={{ padding: "4px 8px", borderRadius: 6, background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span>Width (%)</span>
                <input
                  type="number"
                  value={selectedElement.width}
                  onChange={(e) => {
                    const width = Number(e.target.value);
                    updateActiveElements((list) => list.map((el) => (el.id === selectedElement.id ? { ...el, width } : el)));
                  }}
                  style={{ padding: "4px 8px", borderRadius: 6, background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span>Height (%)</span>
                <input
                  type="number"
                  value={selectedElement.height}
                  onChange={(e) => {
                    const height = Number(e.target.value);
                    updateActiveElements((list) => list.map((el) => (el.id === selectedElement.id ? { ...el, height } : el)));
                  }}
                  style={{ padding: "4px 8px", borderRadius: 6, background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
                />
              </label>
            </div>
          </div>
        )}

        {/* Canvas Inspector */}
        {inspectorTab === "canvas" && activeTheme && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 11.5 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span>Canvas Border Radius (px)</span>
              <input
                type="number"
                value={activeTheme.canvas?.borderRadius ?? 16}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  updateActiveTheme((curr) => ({
                    ...curr,
                    canvas: { ...(curr.canvas || {}), borderRadius: val },
                  }));
                }}
                style={{ padding: "6px 8px", borderRadius: 6, background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
              />
            </label>
          </div>
        )}
      </aside>
    </div>
  );
};
