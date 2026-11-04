import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  FileCode,
  FileText,
  Download,
  Upload,
  Check,
  AlertCircle,
  Folder,
  Code2,
  Terminal,
  History,
  Copy,
  ChevronDown,
  Trash2,
} from "lucide-react";
import type { ThemeDefinition, ThemeSurface } from "./schema";
import type { ThemeBundle, CompilationDiagnostic } from "./compiler/types";
import { compileThemeBundle } from "./compiler/themeCompiler";
import { generateBundleFromDeclarative } from "./templates/bundleGenerator";
import { downloadThemePackage, readThemeFromFile } from "./templates/bundleStorage";
import {
  openThemeFolderInExplorer,
  openThemeInIde,
  KNOWN_IDES,
  getPreferredIde,
  setPreferredIde,
  getThemesWorkspacePath,
  type FileChangeEvent,
} from "./themeStore";

export interface LogEntry {
  id: string;
  time: string;
  level: "success" | "info" | "warn" | "error";
  message: string;
  detail?: string;
}

export interface ThemeCompilerMonitorProps {
  theme: ThemeDefinition;
  onUpdateTheme: (updated: ThemeDefinition) => void;
  previewSurface?: ThemeSurface;
  className?: string;
}

export const ThemeCompilerMonitor: React.FC<ThemeCompilerMonitorProps> = ({
  theme,
  onUpdateTheme,
  className = "",
}) => {
  const bundle: ThemeBundle = useMemo(() => {
    return theme.bundle || generateBundleFromDeclarative(theme);
  }, [theme]);

  const [activeTab, setActiveTab] = useState<"changelog" | "logs" | "errors">("changelog");
  const [selectedIde, setSelectedIde] = useState<string>(() => getPreferredIde());
  const [ideDropdownOpen, setIdeDropdownOpen] = useState(false);
  const [workspacePath, setWorkspacePath] = useState<string>("");
  const [recentlyChangedFiles, setRecentlyChangedFiles] = useState<Record<string, number>>({});
  const [compileStatus, setCompileStatus] = useState<{
    success: boolean;
    timeMs: number;
    diagnostics: CompilationDiagnostic[];
  }>({ success: true, timeMs: 0, diagnostics: [] });
  const [logs, setLogs] = useState<LogEntry[]>(() => [
    {
      id: "init",
      time: new Date().toLocaleTimeString(),
      level: "info",
      message: `Initialized compiler monitor for "${theme.name}"`,
    },
  ]);
  const [notice, setNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Load workspace path on mount
  useEffect(() => {
    getThemesWorkspacePath().then((p) => setWorkspacePath(p)).catch(() => {});
  }, []);

  // Run live compilation whenever bundle updates
  useEffect(() => {
    const start = performance.now();
    const result = compileThemeBundle(bundle);
    const timeMs = Math.round((performance.now() - start) * 10) / 10;

    setCompileStatus({
      success: result.success,
      timeMs,
      diagnostics: result.diagnostics,
    });

    if (result.success) {
      setLogs((prev) => [
        ...prev.slice(-100),
        {
          id: `comp-${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          level: "success",
          message: `✓ Transpiled "${theme.name}" in ${timeMs}ms — 0 errors`,
        },
      ]);
    } else {
      const errCount = result.diagnostics.filter((d) => d.severity === "error").length;
      setLogs((prev) => [
        ...prev.slice(-100),
        {
          id: `err-${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          level: "error",
          message: `⚠ Transpilation failed (${errCount} error${errCount > 1 ? "s" : ""})`,
          detail: result.diagnostics.map((d) => `${d.file || "unknown"}${d.line ? `:${d.line}` : ""}: ${d.message}`).join("\n"),
        },
      ]);
      setActiveTab("errors");
    }
  }, [bundle, theme.name]);

  // Listen to disk watcher file changes
  useEffect(() => {
    const handleDiskChange = (e: Event) => {
      const customEv = e as CustomEvent<FileChangeEvent>;
      if (!customEv.detail) return;
      const { path: changedPath, themeId } = customEv.detail;
      if (themeId && themeId !== theme.id) return;

      const fileName = changedPath.split(/[/\\]/).pop() || changedPath;
      setRecentlyChangedFiles((prev) => ({ ...prev, [fileName]: Date.now() }));

      setLogs((prev) => [
        ...prev.slice(-100),
        {
          id: `disk-${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          level: "info",
          message: `Watcher detected disk update: ${fileName}`,
        },
      ]);
    };

    window.addEventListener("mpo_theme_disk_changed", handleDiskChange);
    return () => window.removeEventListener("mpo_theme_disk_changed", handleDiskChange);
  }, [theme.id]);

  // Auto-scroll logs
  useEffect(() => {
    if (activeTab === "logs") {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, activeTab]);

  const handleSelectIde = (ideId: string) => {
    setSelectedIde(ideId);
    setPreferredIde(ideId);
    setIdeDropdownOpen(false);
  };

  const handleLaunchIde = async () => {
    const ide = KNOWN_IDES.find((i) => i.id === selectedIde) || KNOWN_IDES[0];
    try {
      await openThemeInIde(theme.id, ide.cmd);
      setNotice(`Launched ${ide.name}`);
      setTimeout(() => setNotice(null), 2500);
    } catch (e: any) {
      alert(`Could not launch ${ide.name}: ${e?.message || e}`);
    }
  };

  const handleOpenExplorer = async () => {
    try {
      await openThemeFolderInExplorer(theme.id);
      setNotice("Opened in File Explorer");
      setTimeout(() => setNotice(null), 2500);
    } catch (e: any) {
      alert(`Could not open explorer: ${e?.message || e}`);
    }
  };

  const handleCopyPath = () => {
    const full = workspacePath ? `${workspacePath}\\${theme.id}` : `%APPDATA%\\MPO-pro-beta\\themes\\${theme.id}`;
    navigator.clipboard.writeText(full);
    setNotice("Workspace path copied to clipboard");
    setTimeout(() => setNotice(null), 2500);
  };

  const handleExport = () => {
    downloadThemePackage(theme);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await readThemeFromFile(file);
      onUpdateTheme(imported);
      setNotice(`Imported "${file.name}"`);
      setTimeout(() => setNotice(null), 3000);
    } catch (err: any) {
      alert(`Failed to import theme: ${err.message || err}`);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const filesList = useMemo(() => {
    return Object.entries(bundle.files || {}).map(([name, content]) => {
      const lineCount = content.split("\n").length;
      const byteSize = new Blob([content]).size;
      const kbSize = (byteSize / 1024).toFixed(1);
      const isRecent = Boolean(recentlyChangedFiles[name] && Date.now() - recentlyChangedFiles[name] < 8000);
      return {
        name,
        lineCount,
        kbSize,
        isRecent,
        extension: name.split(".").pop() || "",
      };
    });
  }, [bundle.files, recentlyChangedFiles]);

  const activeIdeObj = KNOWN_IDES.find((i) => i.id === selectedIde) || KNOWN_IDES[0];

  return (
    <div
      className={`mpo-compiler-monitor ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        background: "rgba(10, 14, 24, 0.96)",
        color: "#f8fafc",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        overflow: "hidden",
      }}
    >
      {/* =====================================================================
          TOP ACTION BAR: COMPILER STATUS & IDE LAUNCHER
         ===================================================================== */}
      <div
        style={{
          padding: "8px 14px",
          background: "rgba(15, 23, 42, 0.8)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        {/* Left: Compiler Status Badge & Watcher */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 7,
              background: compileStatus.success ? "rgba(16, 185, 129, 0.14)" : "rgba(239, 68, 68, 0.16)",
              border: compileStatus.success ? "1px solid rgba(16, 185, 129, 0.35)" : "1px solid rgba(239, 68, 68, 0.4)",
              color: compileStatus.success ? "#34d399" : "#f87171",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {compileStatus.success ? <Check size={13} /> : <AlertCircle size={13} />}
            <span>
              {compileStatus.success
                ? `Transpiled in ${compileStatus.timeMs}ms (0 errors)`
                : `Compilation Error (${compileStatus.diagnostics.filter((d) => d.severity === "error").length} errors)`}
            </span>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              color: "#94a3b8",
            }}
            title="Filesystem watcher actively recompiles on disk edits"
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#10b981",
                boxShadow: "0 0 6px #10b981",
              }}
            />
            <span>Live Sync Active</span>
          </div>
        </div>

        {/* Right: Workspace Open At (Known IDEs) & Export/Import */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Quick Open in IDE with dropdown */}
          <div style={{ position: "relative", display: "inline-flex" }}>
            <button
              type="button"
              onClick={handleLaunchIde}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: "7px 0 0 7px",
                background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                border: "1px solid #60a5fa",
                borderRight: "none",
                color: "#ffffff",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
              title={`Open workspace in ${activeIdeObj.name}`}
            >
              <Code2 size={14} />
              <span>Open in {activeIdeObj.name}</span>
            </button>

            <button
              type="button"
              onClick={() => setIdeDropdownOpen((v) => !v)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "6px 8px",
                borderRadius: "0 7px 7px 0",
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                border: "1px solid #60a5fa",
                color: "#ffffff",
                cursor: "pointer",
              }}
              title="Select your preferred code editor"
            >
              <ChevronDown size={14} />
            </button>

            {/* IDE Dropdown Menu */}
            {ideDropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  right: 0,
                  zIndex: 100,
                  minWidth: 200,
                  background: "#0f172a",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: 8,
                  padding: "4px",
                  boxShadow: "0 12px 28px rgba(0,0,0,0.6)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <div style={{ padding: "6px 8px", fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                  Select Editor
                </div>
                {KNOWN_IDES.map((ide) => {
                  const isSelected = ide.id === selectedIde;
                  return (
                    <button
                      key={ide.id}
                      type="button"
                      onClick={() => handleSelectIde(ide.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 8px",
                        borderRadius: 5,
                        background: isSelected ? "rgba(56, 189, 248, 0.15)" : "transparent",
                        border: "none",
                        color: isSelected ? "#38bdf8" : "#cbd5e1",
                        fontSize: 11.5,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <span>{ide.name}</span>
                      {isSelected && <Check size={12} color="#38bdf8" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reveal in Explorer */}
          <button
            type="button"
            onClick={handleOpenExplorer}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 10px",
              borderRadius: 7,
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#cbd5e1",
              fontSize: 11.5,
              cursor: "pointer",
            }}
            title="Open folder in File Explorer / Finder"
          >
            <Folder size={13} />
            <span>Folder</span>
          </button>

          {/* Copy Workspace Path */}
          <button
            type="button"
            onClick={handleCopyPath}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 8px",
              borderRadius: 7,
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#cbd5e1",
              fontSize: 11,
              cursor: "pointer",
            }}
            title="Copy theme folder path"
          >
            <Copy size={12} />
          </button>

          {/* Export / Import Package */}
          <button
            type="button"
            onClick={handleExport}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 9px",
              borderRadius: 7,
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#cbd5e1",
              fontSize: 11,
              cursor: "pointer",
            }}
            title="Export as .mpotheme.json file"
          >
            <Download size={12} />
            <span>Export</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 9px",
              borderRadius: 7,
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
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
      </div>

      {/* Notice Toast */}
      {notice && (
        <div
          style={{
            padding: "4px 14px",
            background: "rgba(16, 185, 129, 0.2)",
            borderBottom: "1px solid rgba(16, 185, 129, 0.35)",
            color: "#34d399",
            fontSize: 11,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Check size={12} />
          <span>{notice}</span>
        </div>
      )}

      {/* =====================================================================
          SUB-NAVIGATION TABS: FILE CHANGELOG · COMPILER LOGS · DIAGNOSTICS
         ===================================================================== */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 14px",
          background: "rgba(15, 23, 42, 0.6)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div style={{ display: "flex", gap: 4 }}>
          <button
            type="button"
            onClick={() => setActiveTab("changelog")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 12px",
              border: "none",
              background: "transparent",
              borderBottom: activeTab === "changelog" ? "2px solid #38bdf8" : "2px solid transparent",
              color: activeTab === "changelog" ? "#38bdf8" : "#94a3b8",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <History size={13} />
            <span>Files &amp; Changelog ({filesList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 12px",
              border: "none",
              background: "transparent",
              borderBottom: activeTab === "logs" ? "2px solid #38bdf8" : "2px solid transparent",
              color: activeTab === "logs" ? "#38bdf8" : "#94a3b8",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Terminal size={13} />
            <span>Compiler Log ({logs.length})</span>
          </button>

          {!compileStatus.success && (
            <button
              type="button"
              onClick={() => setActiveTab("errors")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                border: "none",
                background: "transparent",
                borderBottom: activeTab === "errors" ? "2px solid #ef4444" : "2px solid transparent",
                color: activeTab === "errors" ? "#f87171" : "#ef4444",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <AlertCircle size={13} />
              <span>Errors ({compileStatus.diagnostics.length})</span>
            </button>
          )}
        </div>

        {activeTab === "logs" && (
          <button
            type="button"
            onClick={() => setLogs([])}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 8px",
              borderRadius: 5,
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#94a3b8",
              fontSize: 10.5,
              cursor: "pointer",
            }}
          >
            <Trash2 size={11} />
            <span>Clear Log</span>
          </button>
        )}
      </div>

      {/* =====================================================================
          TAB CONTENT AREA
         ===================================================================== */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 12 }}>
        {/* Tab 1: Files & Changelog */}
        {activeTab === "changelog" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 100px 90px 110px",
                padding: "6px 12px",
                fontSize: 11,
                fontWeight: 700,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <span>File Name</span>
              <span>Lines</span>
              <span>Size</span>
              <span style={{ textAlign: "right" }}>Disk Status</span>
            </div>

            {filesList.map((file) => (
              <div
                key={file.name}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 100px 90px 110px",
                  alignItems: "center",
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: file.isRecent ? "rgba(16, 185, 129, 0.12)" : "rgba(255, 255, 255, 0.02)",
                  border: file.isRecent ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(255, 255, 255, 0.04)",
                  fontSize: 12,
                  transition: "all 0.3s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {file.extension === "tsx" || file.extension === "ts" ? (
                    <FileCode size={15} color="#38bdf8" />
                  ) : file.extension === "css" ? (
                    <FileText size={15} color="#a855f7" />
                  ) : (
                    <FileText size={15} color="#94a3b8" />
                  )}
                  <strong style={{ color: file.isRecent ? "#34d399" : "#f1f5f9" }}>{file.name}</strong>
                </div>

                <span style={{ color: "#94a3b8", fontSize: 11 }}>{file.lineCount} lines</span>
                <span style={{ color: "#94a3b8", fontSize: 11 }}>{file.kbSize} KB</span>

                <div style={{ textAlign: "right" }}>
                  {file.isRecent ? (
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 7px",
                        borderRadius: 999,
                        background: "rgba(16, 185, 129, 0.25)",
                        color: "#34d399",
                        fontSize: 10,
                        fontWeight: 700,
                        border: "1px solid rgba(16, 185, 129, 0.45)",
                      }}
                    >
                      Updated
                    </span>
                  ) : (
                    <span
                      style={{
                        padding: "2px 7px",
                        borderRadius: 999,
                        background: "rgba(255, 255, 255, 0.05)",
                        color: "#64748b",
                        fontSize: 10,
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                      }}
                    >
                      Synced
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Compiler Terminal Logs */}
        {activeTab === "logs" && (
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 11.5,
              background: "#090d16",
              borderRadius: 8,
              border: "1px solid rgba(255, 255, 255, 0.08)",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              minHeight: 180,
            }}
          >
            {logs.map((log) => {
              const color =
                log.level === "success"
                  ? "#34d399"
                  : log.level === "error"
                  ? "#f87171"
                  : log.level === "warn"
                  ? "#fbbf24"
                  : "#94a3b8";

              return (
                <div key={log.id} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: "#475569", flexShrink: 0 }}>[{log.time}]</span>
                    <span style={{ color, wordBreak: "break-word" }}>{log.message}</span>
                  </div>
                  {log.detail && (
                    <pre
                      style={{
                        margin: "2px 0 6px 20px",
                        padding: "6px 8px",
                        borderRadius: 4,
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

        {/* Tab 3: Detailed Diagnostics Errors */}
        {activeTab === "errors" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                color: "#fca5a5",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>Found {compileStatus.diagnostics.length} issue(s) while compiling "{theme.name}".</span>
              <button
                type="button"
                onClick={() => {
                  const text = compileStatus.diagnostics
                    .map((d) => `${d.file || "theme"}:${d.line || 1}:${d.column || 1} - ${d.message}`)
                    .join("\n");
                  navigator.clipboard.writeText(text);
                  setNotice("Errors copied to clipboard");
                  setTimeout(() => setNotice(null), 2500);
                }}
                style={{
                  padding: "4px 8px",
                  borderRadius: 5,
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#ffffff",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                Copy Errors
              </button>
            </div>

            {compileStatus.diagnostics.map((diag, i) => (
              <div
                key={i}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  background: "rgba(15, 23, 42, 0.7)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  fontFamily: "monospace",
                  fontSize: 11,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div style={{ color: "#f87171", fontWeight: 700 }}>
                  {diag.file || "Theme.tsx"}:{diag.line || 1}:{diag.column || 1}
                </div>
                <div style={{ color: "#e2e8f0" }}>{diag.message}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
