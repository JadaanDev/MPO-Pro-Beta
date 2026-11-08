import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Sparkles,
  Folder,
  Copy,
  Check,
  Eye,
  EyeOff,
  Code2,
  AlertCircle,
  Download,
  Upload,
  Plus,
  Trash2,
  Edit2,
  Palette,
  Smartphone,
  AppWindow,
  Monitor,
  Laptop,
  Wand2,
} from "lucide-react";
import type { ThemeDefinition, ThemeSurface } from "../schema";
import type { ThemeBundle } from "../compiler/types";
import { compileThemeBundle } from "../compiler/themeCompiler";
import { generateBundleFromDeclarative } from "../templates/bundleGenerator";
import { downloadThemePackage, readThemeFromFile } from "../templates/bundleStorage";
import { STARTER_BUNDLES, bundleToThemeDefinition } from "../templates/starterBundles";
import { ThemeRenderer } from "../ThemeRenderer";
import { ThemeEffectBoundary } from "../../components/common/ThemeEffectBoundary";
import {
  listAllThemes,
  saveTheme,
  deleteTheme,
  openThemeFolderInExplorer,
  openThemeInIde,
  discoverIdes,
  locateIde,
  KNOWN_IDES,
  type KnownIde,
  getThemesWorkspacePath,
  type FileChangeEvent,
} from "../themeStore";
import type { MediaState } from "../../types/media";

export interface MyThemesPageProps {
  media: MediaState;
  artUrl: string;
  routedStudios?: Partial<Record<ThemeSurface, string | undefined>>;
  onRouteToStudio: (theme: ThemeDefinition, surface: ThemeSurface, openStudio?: boolean) => void;
  onOpenBuilder?: (themeId: string) => void;
  initialThemes?: ThemeDefinition[];
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

const DEFAULT_STARTER_THEMES: ThemeDefinition[] = STARTER_BUNDLES.map(bundleToThemeDefinition);

export const MyThemesPage: React.FC<MyThemesPageProps> = ({
  media,
  artUrl,
  routedStudios = {},
  onRouteToStudio,
  onOpenBuilder,
  initialThemes,
}) => {
  const [themes, setThemes] = useState<ThemeDefinition[]>(() => {
    if (initialThemes && initialThemes.length > 0) return initialThemes;
    return DEFAULT_STARTER_THEMES;
  });
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(() => {
    return initialThemes?.[0]?.id || DEFAULT_STARTER_THEMES[0]?.id || null;
  });
  const [previewSurface, setPreviewSurface] = useState<ThemeSurface>("obs");
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(true);
  const [ides, setIdes] = useState<KnownIde[]>(() => KNOWN_IDES);
  const refreshIdes = () => discoverIdes().then(setIdes).catch(e => alert(`Could not discover editors: ${e}`));
  useEffect(() => { refreshIdes(); }, []);
  const handleLocateIde = async () => { try { const ide = await locateIde(); if (ide) await refreshIdes(); } catch (e) { alert(`Could not use editor: ${e}`); } };
  const [workspacePath, setWorkspacePath] = useState<string>("");
  const [notice, setNotice] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<"logs" | "changelog" | "errors">("logs");
  const [logs, setLogs] = useState<Array<{ id: string; time: string; level: string; message: string; detail?: string }>>([]);
  const [recentlyChangedFiles, setRecentlyChangedFiles] = useState<Record<string, number>>({});
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const [editingThemeName, setEditingThemeName] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Load themes & workspace path
  const refreshThemes = async () => {
    try {
      const list = await listAllThemes();
      setThemes(list);
      if (!selectedThemeId && list.length > 0) {
        setSelectedThemeId(list[0].id);
      }
    } catch {}
  };

  useEffect(() => {
    refreshThemes();
    getThemesWorkspacePath().then(setWorkspacePath).catch(() => {});
  }, []);

  const activeTheme = useMemo(() => {
    return themes.find((t) => t.id === selectedThemeId) || themes[0] || null;
  }, [themes, selectedThemeId]);

  const bundle: ThemeBundle = useMemo(() => {
    if (!activeTheme) {
      return {
        schemaVersion: 2,
        manifest: { schemaVersion: 2, id: "untitled", name: "Untitled", entryPoint: "Theme.tsx" },
        files: {},
      };
    }
    return activeTheme.bundle || generateBundleFromDeclarative(activeTheme);
  }, [activeTheme]);

  // Live compilation
  const compileResult = useMemo(() => {
    const start = performance.now();
    const res = compileThemeBundle(bundle);
    const timeMs = Math.round((performance.now() - start) * 10) / 10;
    return { ...res, timeMs };
  }, [bundle]);

  // Log on compile
  useEffect(() => {
    if (!activeTheme) return;
    if (compileResult.success) {
      setLogs((prev) => [
        ...prev.slice(-100),
        {
          id: `comp-${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          level: "success",
          message: `✓ Transpiled "${activeTheme.name}" in ${compileResult.timeMs}ms (0 errors)`,
        },
      ]);
    } else {
      setLogs((prev) => [
        ...prev.slice(-100),
        {
          id: `err-${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          level: "error",
          message: `⚠ Transpilation error in "${activeTheme.name}"`,
          detail: compileResult.diagnostics.map((d) => `${d.file || "unknown"}:${d.line || 1} - ${d.message}`).join("\n"),
        },
      ]);
      setRightTab("errors");
    }
  }, [compileResult, activeTheme?.id]);

  // Watcher event listener
  useEffect(() => {
    const handleDiskChange = (e: Event) => {
      const customEv = e as CustomEvent<FileChangeEvent>;
      if (!customEv.detail) return;
      const { path: changedPath, themeId } = customEv.detail;
      if (themeId && activeTheme && themeId !== activeTheme.id) return;

      const fileName = changedPath.split(/[/\\]/).pop() || changedPath;
      setRecentlyChangedFiles((prev) => ({ ...prev, [fileName]: Date.now() }));

      setLogs((prev) => [
        ...prev.slice(-100),
        {
          id: `disk-${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          level: "info",
          message: `Disk Watcher: ${fileName} modified externally`,
        },
      ]);

      refreshThemes();
    };

    window.addEventListener("mpo_theme_disk_changed", handleDiskChange);
    return () => window.removeEventListener("mpo_theme_disk_changed", handleDiskChange);
  }, [activeTheme?.id]);

  // Auto-scroll logs
  useEffect(() => {
    if (rightTab === "logs") {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, rightTab]);

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2800);
  };

  const handleLaunchIde = async (cmd: string, name: string) => {
    if (!activeTheme) return;
    try {
      await openThemeInIde(activeTheme.id, cmd);
      showToast(`Launch requested: ${name}`);
    } catch (e: any) {
      alert(`Could not launch ${name}: ${e?.message || e}`);
    }
  };

  const handleOpenFolder = async () => {
    if (!activeTheme) return;
    try {
      await openThemeFolderInExplorer(activeTheme.id);
      showToast("Opened in File Explorer");
    } catch (e: any) {
      alert(`Could not open folder: ${e?.message || e}`);
    }
  };

  const handleCopyPath = () => {
    if (!activeTheme) return;
    const full = workspacePath ? `${workspacePath}\\${activeTheme.id}` : `%APPDATA%\\MPO-pro-beta\\themes\\${activeTheme.id}`;
    navigator.clipboard.writeText(full);
    showToast("Workspace path copied");
  };

  const handleCreateTheme = async () => {
    const nextNum = themes.length + 1;
    const newTheme: ThemeDefinition = {
      schemaVersion: 1,
      id: `custom-theme-${Date.now()}`,
      name: `Custom Theme ${nextNum}`,
      elements: [],
      bundle: {
        schemaVersion: 2,
        manifest: {
          schemaVersion: 2,
          id: `custom-theme-${Date.now()}`,
          name: `Custom Theme ${nextNum}`,
          entryPoint: "Theme.tsx",
        },
        files: {
          "Theme.tsx": `import React from "react";\nimport type { MpoThemeProps } from "./types";\n\nexport default function Theme({ media, artUrl }: MpoThemeProps) {\n  return (\n    <div className="mpo-card custom-theme-card">\n      {artUrl && <img src={artUrl} alt="Art" className="card-art" />}\n      <div className="card-info">\n        <div className="card-title">{media.title || "No Track"}</div>\n        <div className="card-artist">{media.artist || "Unknown Artist"}</div>\n      </div>\n    </div>\n  );\n}\n`,
          "style.css": `.custom-theme-card {\n  display: flex;\n  align-items: center;\n  gap: 16px;\n  padding: 16px;\n  background: rgba(15, 23, 42, 0.85);\n  border-radius: 16px;\n  color: #ffffff;\n}\n.card-art { width: 64px; height: 64px; border-radius: 8px; object-fit: cover; }\n.card-title { font-weight: 700; font-size: 16px; }\n.card-artist { font-size: 13px; color: #94a3b8; }\n`,
        },
      },
    };
    await saveTheme(newTheme);
    setThemes((prev) => [newTheme, ...prev]);
    setSelectedThemeId(newTheme.id);
    showToast(`Created "${newTheme.name}"`);
  };

  const handleDeleteTheme = async (themeId: string) => {
    if (!confirm("Are you sure you want to delete this theme?")) return;
    await deleteTheme(themeId);
    setThemes((prev) => prev.filter((t) => t.id !== themeId));
    if (selectedThemeId === themeId) {
      setSelectedThemeId(themes.find((t) => t.id !== themeId)?.id || null);
    }
    showToast("Theme moved to trash");
  };

  const handleFinishRename = async (themeId: string) => {
    const trimmed = editingThemeName.trim();
    if (trimmed) {
      const updated = themes.map((t) => (t.id === themeId ? { ...t, name: trimmed } : t));
      setThemes(updated);
      const target = updated.find((t) => t.id === themeId);
      if (target) await saveTheme(target);
      showToast("Theme renamed");
    }
    setEditingThemeId(null);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await readThemeFromFile(file);
      await saveTheme(imported);
      setThemes((prev) => [imported, ...prev]);
      setSelectedThemeId(imported.id);
      showToast(`Imported "${file.name}"`);
    } catch (err: any) {
      alert(`Import failed: ${err.message || err}`);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const filesList = useMemo(() => {
    return Object.entries(bundle.files || {}).map(([name, content]) => {
      const lineCount = content.split("\n").length;
      const byteSize = new Blob([content]).size;
      const kbSize = (byteSize / 1024).toFixed(1);
      const isRecent = Boolean(recentlyChangedFiles[name] && Date.now() - recentlyChangedFiles[name] < 8000);
      return { name, lineCount, kbSize, isRecent };
    });
  }, [bundle.files, recentlyChangedFiles]);

  return (
    <div
      className="mpo-my-themes-page"
      style={{
        display: "flex",
        height: "100%",
        minHeight: 0,
        background: "#080b13",
        color: "#f8fafc",
        overflow: "hidden",
      }}
    >
      {/* =====================================================================
          SIDEBAR: THEMES DIRECTORY
         ===================================================================== */}
      <aside
        style={{
          width: 280,
          borderRight: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          flexDirection: "column",
          padding: 16,
          gap: 12,
          background: "rgba(13, 17, 28, 0.95)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              <Sparkles size={16} color="#38bdf8" />
              <span>My Themes</span>
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
              {themes.length} custom project{themes.length === 1 ? "" : "s"} on disk
            </div>
          </div>
          <button
            type="button"
            onClick={handleCreateTheme}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid rgba(56, 189, 248, 0.4)",
              background: "rgba(56, 189, 248, 0.14)",
              color: "#38bdf8",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Plus size={14} /> New
          </button>
        </div>

        {/* Action strip */}
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            onClick={handleOpenFolder}
            style={{
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              padding: "6px 8px",
              borderRadius: 7,
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#cbd5e1",
              fontSize: 11,
              cursor: "pointer",
            }}
            title="Open themes directory in File Explorer"
          >
            <Folder size={12} />
            <span>Workspace</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              padding: "6px 8px",
              borderRadius: 7,
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#cbd5e1",
              fontSize: 11,
              cursor: "pointer",
            }}
            title="Import .mpotheme.json file"
          >
            <Upload size={12} />
            <span>Import</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.mpotheme,.mpotheme.json"
            style={{ display: "none" }}
            onChange={handleImportFile}
          />
        </div>

        {/* Theme List */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          {themes.map((theme) => {
            const isSelected = theme.id === selectedThemeId;
            const activeIn = (["obs", "tiktok", "desktop", "big"] as ThemeSurface[]).filter(
              (s) => routedStudios[s] === theme.id
            );

            return (
              <div
                key={theme.id}
                onClick={() => setSelectedThemeId(theme.id)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: isSelected
                    ? "1px solid rgba(56, 189, 248, 0.6)"
                    : "1px solid rgba(255, 255, 255, 0.08)",
                  background: isSelected ? "rgba(56, 189, 248, 0.12)" : "rgba(255, 255, 255, 0.03)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  {editingThemeId === theme.id ? (
                    <input
                      type="text"
                      autoFocus
                      value={editingThemeName}
                      onChange={(e) => setEditingThemeName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleFinishRename(theme.id);
                        if (e.key === "Escape") setEditingThemeId(null);
                      }}
                      onBlur={() => handleFinishRename(theme.id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: "#0f172a",
                        border: "1px solid #38bdf8",
                        color: "#ffffff",
                        fontSize: 12,
                        fontWeight: 700,
                        outline: "none",
                      }}
                    />
                  ) : (
                    <strong style={{ fontSize: 13, color: isSelected ? "#38bdf8" : "#f8fafc" }}>
                      {theme.name}
                    </strong>
                  )}

                  <div style={{ display: "flex", gap: 2 }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingThemeId(theme.id);
                        setEditingThemeName(theme.name);
                      }}
                      style={{
                        padding: 3,
                        background: "none",
                        border: "none",
                        color: "#94a3b8",
                        cursor: "pointer",
                      }}
                      title="Rename"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTheme(theme.id);
                      }}
                      style={{
                        padding: 3,
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                      }}
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {activeIn.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {activeIn.map((s) => (
                      <span
                        key={s}
                        style={{
                          fontSize: 9.5,
                          padding: "1px 6px",
                          borderRadius: 999,
                          background: "rgba(16, 185, 129, 0.18)",
                          color: "#34d399",
                          border: "1px solid rgba(16, 185, 129, 0.35)",
                          fontWeight: 600,
                        }}
                      >
                        Active in {SURFACE_META[s].shortLabel}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* =====================================================================
          MAIN DEV HUB WORKSPACE
         ===================================================================== */}
      {activeTheme ? (
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            overflowY: "auto",
          }}
        >
          {/* Top Bar: Theme Identity & Preview Toggle */}
          <header
            style={{
              padding: "12px 20px",
              background: "rgba(15, 23, 42, 0.8)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#f8fafc" }}>
                  {activeTheme.name}
                </h1>
                <div style={{ fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                  <span>Folder: <code>{activeTheme.id}</code></span>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={handleCopyPath}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#38bdf8",
                      fontSize: 11,
                      cursor: "pointer",
                      padding: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <Copy size={11} /> Copy Path
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Optional Preview Toggle (Opened by default) */}
              <button
                type="button"
                onClick={() => setIsPreviewOpen((v) => !v)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: isPreviewOpen ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.15)",
                  background: isPreviewOpen ? "rgba(56, 189, 248, 0.16)" : "rgba(255, 255, 255, 0.04)",
                  color: isPreviewOpen ? "#38bdf8" : "#cbd5e1",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {isPreviewOpen ? <Eye size={14} /> : <EyeOff size={14} />}
                <span>Live Preview: {isPreviewOpen ? "ON" : "OFF"}</span>
              </button>

              {onOpenBuilder && (
                <button
                  type="button"
                  onClick={() => onOpenBuilder(activeTheme.id)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid rgba(168, 85, 247, 0.4)",
                    background: "rgba(168, 85, 247, 0.14)",
                    color: "#c084fc",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  title="Open Theme Builder canvas"
                >
                  <Wand2 size={14} />
                  <span>Builder</span>
                </button>
              )}

              {/* Route to Studio Dropdown / Buttons */}
              {(["obs", "tiktok", "desktop", "big"] as ThemeSurface[]).map((surface) => {
                const isRouted = routedStudios[surface] === activeTheme.id;
                const meta = SURFACE_META[surface];
                return (
                  <button
                    key={surface}
                    type="button"
                    onClick={() => onRouteToStudio(activeTheme, surface, false)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "6px 10px",
                      borderRadius: 8,
                      background: isRouted ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.04)",
                      border: isRouted ? "1px solid rgba(16, 185, 129, 0.45)" : "1px solid rgba(255, 255, 255, 0.1)",
                      color: isRouted ? "#34d399" : "#94a3b8",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                    title={`Route to ${meta.label}`}
                  >
                    <span>{meta.shortLabel}</span>
                    {isRouted && <Check size={11} color="#10b981" />}
                  </button>
                );
              })}

              {/* Export Theme Package */}
              <button
                type="button"
                onClick={() => downloadThemePackage(activeTheme)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "6px 10px",
                  borderRadius: 8,
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#cbd5e1",
                  fontSize: 11.5,
                  cursor: "pointer",
                }}
                title="Export as .mpotheme.json"
              >
                <Download size={13} />
                <span>Export</span>
              </button>
            </div>
          </header>

          {/* Toast Notice */}
          {notice && (
            <div
              style={{
                padding: "6px 20px",
                background: "rgba(16, 185, 129, 0.2)",
                borderBottom: "1px solid rgba(16, 185, 129, 0.35)",
                color: "#34d399",
                fontSize: 11.5,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Check size={13} />
              <span>{notice}</span>
            </div>
          )}

          {/* Collapsible Live Preview Panel (Opened by default) */}
          {isPreviewOpen && (
            <div
              style={{
                background: "radial-gradient(circle at center, rgba(30, 41, 59, 0.6) 0%, rgba(9, 13, 22, 0.95) 100%)",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                padding: "16px 20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                flexShrink: 0,
              }}
            >
              {/* Surface Format Switcher */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {(["obs", "tiktok", "desktop", "big"] as ThemeSurface[]).map((surface) => {
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
                        gap: 5,
                        padding: "5px 10px",
                        borderRadius: 7,
                        border: active ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.1)",
                        background: active ? "rgba(56, 189, 248, 0.18)" : "rgba(255, 255, 255, 0.03)",
                        color: active ? "#38bdf8" : "#cbd5e1",
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      <Icon size={12} />
                      <span>{meta.shortLabel}</span>
                    </button>
                  );
                })}
              </div>

              {/* Responsive Live Canvas Frame */}
              <ThemeEffectBoundary>
                <div
                  style={{
                    width: SURFACE_META[previewSurface].width,
                    height: SURFACE_META[previewSurface].height,
                    maxWidth: "100%",
                    overflow: "visible",
                  }}
                >
                  <ThemeRenderer
                    theme={activeTheme}
                    surface={previewSurface}
                    media={media}
                    artUrl={artUrl}
                  />
                </div>
              </ThemeEffectBoundary>
            </div>
          )}

          {/* ===================================================================
              SPLIT 50% / 50%: LEFT (OPEN IN IDE) | RIGHT (LOGS & CHANGELOG)
             =================================================================== */}
          <div
            style={{
              flex: 1,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              minHeight: 380,
              overflow: "hidden",
            }}
          >
            {/* ---------------------------------------------------------------
                LEFT HALF: OPEN IN IDE WITH REAL ICONS & 1-CLICK LAUNCH
               --------------------------------------------------------------- */}
            <section
              style={{
                borderRight: "1px solid rgba(255, 255, 255, 0.08)",
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 16,
                overflowY: "auto",
                background: "rgba(10, 14, 24, 0.95)",
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 7, color: "#f8fafc" }}>
                  <Code2 size={17} color="#38bdf8" />
                  <span>Open in Your Favorite IDE</span>
                </div>
                <p style={{ margin: "4px 0 0 0", fontSize: 11.5, color: "#94a3b8", lineHeight: 1.5 }}>
                  One click launches your project folder directly in your preferred editor with full TypeScript IntelliSense and scoped CSS support.
                </p>
              </div>

              <div><button type="button" onClick={handleLocateIde}>Locate IDE…</button> <button type="button" onClick={refreshIdes}>Refresh</button></div>
              {/* IDE Grid Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {ides.length === 0 && <span>No editors detected. Locate an IDE or open the folder in Explorer.</span>}
                {ides.map((ide) => (
                  <div
                    key={ide.id}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 10,
                      background: "rgba(15, 23, 42, 0.7)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      transition: "border-color 0.2s ease, background 0.2s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: `${"#38bdf8"}22`,
                          border: `1px solid ${"#38bdf8"}44`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#38bdf8",
                          flexShrink: 0,
                        }}
                      >
                        <Laptop size={16} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <strong style={{ fontSize: 13, color: "#f8fafc" }}>{ide.name}</strong>
                          {false && (
                            <span
                              style={{
                                fontSize: 9,
                                padding: "1px 5px",
                                borderRadius: 4,
                                background: "rgba(56, 189, 248, 0.16)",
                                color: "#38bdf8",
                                fontWeight: 700,
                              }}
                            >
                              {false}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 10.5, color: "#64748b", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          {ide.source}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleLaunchIde(ide.executable, ide.name)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 6,
                        background: `${"#38bdf8"}20`,
                        border: `1px solid ${"#38bdf8"}55`,
                        color: "#ffffff",
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: "pointer",
                        flexShrink: 0,
                        transition: "all 0.15s ease",
                      }}
                      title={`Open workspace in ${ide.name}`}
                    >
                      Open
                    </button>
                  </div>
                ))}
              </div>

              {/* Workspace Location Info */}
              <div
                style={{
                  marginTop: "auto",
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                    Workspace Directory
                  </div>
                  <code style={{ fontSize: 11, color: "#38bdf8", wordBreak: "break-all" }}>
                    {workspacePath ? `${workspacePath}\\${activeTheme.id}` : `%APPDATA%\\MPO-pro-beta\\themes\\${activeTheme.id}`}
                  </code>
                </div>

                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={handleCopyPath}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#cbd5e1",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                    title="Copy path to clipboard"
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenFolder}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#cbd5e1",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                    title="Open folder in File Explorer"
                  >
                    Reveal
                  </button>
                </div>
              </div>
            </section>

            {/* ---------------------------------------------------------------
                RIGHT HALF: COMPILER STATUS, WATCHER LOGS & CHANGELOG
               --------------------------------------------------------------- */}
            <section
              style={{
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 14,
                overflowY: "auto",
                background: "rgba(10, 14, 24, 0.98)",
              }}
            >
              {/* Status Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 10px",
                      borderRadius: 7,
                      background: compileResult.success ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                      border: compileResult.success ? "1px solid rgba(16, 185, 129, 0.35)" : "1px solid rgba(239, 68, 68, 0.4)",
                      color: compileResult.success ? "#34d399" : "#f87171",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {compileResult.success ? <Check size={13} /> : <AlertCircle size={13} />}
                    <span>
                      {compileResult.success
                        ? `Transpiled in ${compileResult.timeMs}ms (0 errors)`
                        : `Transpilation Error (${compileResult.diagnostics.length})`}
                    </span>
                  </div>

                  <span style={{ fontSize: 11, color: "#64748b" }}>● Live Watcher Active</span>
                </div>

                <button
                  type="button"
                  onClick={() => setLogs([])}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#64748b",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  Clear Logs
                </button>
              </div>

              {/* Sub-tabs: Terminal Logs | Files & Changelog */}
              <div style={{ display: "flex", gap: 4, borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: 8 }}>
                <button
                  type="button"
                  onClick={() => setRightTab("logs")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "none",
                    background: rightTab === "logs" ? "rgba(56, 189, 248, 0.16)" : "transparent",
                    color: rightTab === "logs" ? "#38bdf8" : "#94a3b8",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Terminal Log ({logs.length})
                </button>

                <button
                  type="button"
                  onClick={() => setRightTab("changelog")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "none",
                    background: rightTab === "changelog" ? "rgba(56, 189, 248, 0.16)" : "transparent",
                    color: rightTab === "changelog" ? "#38bdf8" : "#94a3b8",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Files &amp; Changelog ({filesList.length})
                </button>

                {!compileResult.success && (
                  <button
                    type="button"
                    onClick={() => setRightTab("errors")}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "none",
                      background: "rgba(239, 68, 68, 0.2)",
                      color: "#f87171",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Errors ({compileResult.diagnostics.length})
                  </button>
                )}
              </div>

              {/* Right Tab Content */}
              <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                {rightTab === "logs" && (
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: 11.5,
                      background: "#080c16",
                      borderRadius: 8,
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      padding: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      minHeight: 200,
                    }}
                  >
                    {logs.map((log) => {
                      const col =
                        log.level === "success"
                          ? "#34d399"
                          : log.level === "error"
                          ? "#f87171"
                          : log.level === "warn"
                          ? "#fbbf24"
                          : "#94a3b8";
                      return (
                        <div key={log.id} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <span style={{ color: "#475569" }}>[{log.time}]</span>
                            <span style={{ color: col }}>{log.message}</span>
                          </div>
                          {log.detail && (
                            <pre
                              style={{
                                margin: "2px 0 4px 18px",
                                padding: 6,
                                background: "rgba(239, 68, 68, 0.1)",
                                color: "#fca5a5",
                                fontSize: 10.5,
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {log.detail}
                            </pre>
                          )}
                        </div>
                      );
                    })}
                    <div ref={logsEndRef} />
                  </div>
                )}

                {rightTab === "changelog" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 90px 80px 90px",
                        padding: "6px 10px",
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: "#64748b",
                        textTransform: "uppercase",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                      }}
                    >
                      <span>File</span>
                      <span>Lines</span>
                      <span>Size</span>
                      <span style={{ textAlign: "right" }}>Status</span>
                    </div>

                    {filesList.map((file) => (
                      <div
                        key={file.name}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 90px 80px 90px",
                          alignItems: "center",
                          padding: "8px 10px",
                          borderRadius: 7,
                          background: file.isRecent ? "rgba(16, 185, 129, 0.12)" : "rgba(255, 255, 255, 0.02)",
                          border: file.isRecent ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(255, 255, 255, 0.04)",
                          fontSize: 12,
                        }}
                      >
                        <strong style={{ color: file.isRecent ? "#34d399" : "#f1f5f9" }}>{file.name}</strong>
                        <span style={{ color: "#94a3b8", fontSize: 11 }}>{file.lineCount} lines</span>
                        <span style={{ color: "#94a3b8", fontSize: 11 }}>{file.kbSize} KB</span>
                        <div style={{ textAlign: "right" }}>
                          {file.isRecent ? (
                            <span
                              style={{
                                padding: "1px 6px",
                                borderRadius: 999,
                                background: "rgba(16, 185, 129, 0.25)",
                                color: "#34d399",
                                fontSize: 9.5,
                                fontWeight: 700,
                              }}
                            >
                              Updated
                            </span>
                          ) : (
                            <span style={{ color: "#64748b", fontSize: 10 }}>Synced</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {rightTab === "errors" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {compileResult.diagnostics.map((diag, i) => (
                      <div
                        key={i}
                        style={{
                          padding: 10,
                          borderRadius: 8,
                          background: "rgba(239, 68, 68, 0.12)",
                          border: "1px solid rgba(239, 68, 68, 0.35)",
                          fontFamily: "monospace",
                          fontSize: 11,
                        }}
                      >
                        <div style={{ color: "#f87171", fontWeight: 700 }}>
                          {diag.file || "Theme.tsx"}:{diag.line || 1}:{diag.column || 1}
                        </div>
                        <div style={{ color: "#fca5a5", marginTop: 4 }}>{diag.message}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
          Select or create a theme to begin.
        </div>
      )}
    </div>
  );
};
