import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { ThemeDefinition } from "./schema";
import type { ThemeBundle } from "./compiler/types";
import { LIBRARY_KEY, LIBRARY_EVENT } from "./library";
import { STARTER_BUNDLES, bundleToThemeDefinition } from "./templates/starterBundles";
import { generateBundleFromDeclarative } from "./templates/bundleGenerator";
import { migrateThemeCanvases } from './canvasSizes';

export interface DiskThemeSummary {
  id: string;
  name: string;
  folder: string;
  version?: string;
  author?: string;
  description?: string;
  updatedAt: number;
  fileCount: number;
  isTrash: boolean;
}

export interface FileChangeEvent {
  themeId: string;
  path: string;
  kind: string;
}

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
const themeApiBase = () => typeof window !== "undefined" && (window.location.port === "4849" || window.location.hostname === "mpobeta.local")
  ? window.location.origin : "http://127.0.0.1:4849";

export function setupThemeWatcher(onChanged: (event: FileChangeEvent) => void) {
  if (!isTauri) return () => {};
  let disposed = false;
  let unlisten: (() => void) | undefined;
  listen<FileChangeEvent>("theme-files-changed", (evt) => {
    if (disposed) return;
    onChanged(evt.payload);
    window.dispatchEvent(new CustomEvent("mpo_theme_disk_changed", { detail: evt.payload }));
  }).then(stop => { if (disposed) stop(); else unlisten = stop; }).catch(() => {});
  return () => { disposed = true; unlisten?.(); };
}

export async function getThemesWorkspacePath(): Promise<string> {
  if (isTauri) {
    try {
      return await invoke<string>("get_themes_workspace_path");
    } catch {}
  }
  return "%APPDATA%\\MPO-pro-beta\\themes";
}

export async function setThemesWorkspacePath(path: string): Promise<string> {
  if (isTauri) {
    return await invoke<string>("set_themes_workspace_path", { path });
  }
  return path;
}

export interface KnownIde {
  id: string;
  name: string;
  cmd: string;
  description: string;
}

export const KNOWN_IDES: KnownIde[] = [
  { id: "code", name: "VS Code", cmd: "code", description: "Visual Studio Code" },
  { id: "cursor", name: "Cursor", cmd: "cursor", description: "AI Code Editor" },
  { id: "codex", name: "Codex", cmd: "codex", description: "OpenAI Codex CLI / Editor" },
  { id: "claude", name: "Claude Code", cmd: "claude", description: "Anthropic Claude Code" },
  { id: "antigravity", name: "Antigravity", cmd: "antigravity", description: "Google Antigravity IDE" },
  { id: "windsurf", name: "Windsurf", cmd: "windsurf", description: "Codeium Windsurf IDE" },
  { id: "webstorm", name: "WebStorm", cmd: "webstorm", description: "JetBrains WebStorm" },
  { id: "idea", name: "IntelliJ IDEA", cmd: "idea", description: "JetBrains IntelliJ IDEA" },
  { id: "subl", name: "Sublime Text", cmd: "subl", description: "Sublime Text Editor" },
  { id: "zed", name: "Zed", cmd: "zed", description: "High-performance Rust Editor" },
];

export function getPreferredIde(): string {
  try {
    return localStorage.getItem("mpo_preferred_ide") || "code";
  } catch {
    return "code";
  }
}

export function setPreferredIde(ideId: string): void {
  try {
    localStorage.setItem("mpo_preferred_ide", ideId);
  } catch {}
}

export async function openThemeFolderInExplorer(id?: string): Promise<void> {
  if (isTauri) {
    await invoke("open_theme_in_explorer", { id: id || null });
  } else {
    alert(`Themes workspace directory: %APPDATA%\\MPO-pro-beta\\themes\\${id || ""}`);
  }
}

export async function openThemeInIde(id: string, editor?: string): Promise<void> {
  if (isTauri) {
    await invoke("open_theme_in_ide", { id, editor: editor || null });
  } else {
    alert(`Open theme folder in ${editor || "VS Code"}: %APPDATA%\\MPO-pro-beta\\themes\\${id}`);
  }
}

export async function listAllThemes(): Promise<ThemeDefinition[]> {
  if (isTauri) {
    try {
      const summaries = await invoke<DiskThemeSummary[]>("list_disk_themes");
      // If disk is empty, run one-time migration or initialize starter themes
      if (!summaries || summaries.length === 0) {
        await initializeOrMigrateDiskThemes();
        const recheck = await invoke<DiskThemeSummary[]>("list_disk_themes");
        if (recheck && recheck.length > 0) {
          return await loadThemesFromDisk(recheck);
        }
      } else {
        return await loadThemesFromDisk(summaries);
      }
    } catch (e) {
      console.warn("Could not list themes from disk via Tauri:", e);
    }
  }

  // Fallback: browser / server HTTP / localStorage
  try {
    const res = await fetch(`${themeApiBase()}/api/themes`);
    if (res.ok) {
      const summaries = (await res.json()) as DiskThemeSummary[];
      if (summaries && summaries.length > 0) {
        return await loadThemesFromHttp(summaries);
      }
    }
  } catch {}

  // Fallback to localStorage
  try {
    const raw = JSON.parse(localStorage.getItem(LIBRARY_KEY) || "[]");
    if (Array.isArray(raw) && raw.length > 0) return raw.map(migrateThemeCanvases);
  } catch {}

  // Fallback to starter bundles
  return STARTER_BUNDLES.map(bundleToThemeDefinition);
}

async function loadThemesFromDisk(summaries: DiskThemeSummary[]): Promise<ThemeDefinition[]> {
  const loaded: ThemeDefinition[] = [];
  for (const s of summaries) {
    try {
      const bundle = await invoke<ThemeBundle>("read_disk_theme", { id: s.folder || s.id });
      loaded.push({
        schemaVersion: 1,
        id: s.id,
        name: s.name,
        elements: [],
        bundle,
      });
    } catch {
      loaded.push({
        schemaVersion: 1,
        id: s.id,
        name: s.name,
        elements: [],
      });
    }
  }
  return loaded;
}

async function loadThemesFromHttp(summaries: DiskThemeSummary[]): Promise<ThemeDefinition[]> {
  const loaded: ThemeDefinition[] = [];
  for (const s of summaries) {
    try {
      const res = await fetch(`${themeApiBase()}/api/themes/${encodeURIComponent(s.folder || s.id)}/bundle`);
      if (res.ok) {
        const bundle = (await res.json()) as ThemeBundle;
        loaded.push({
          schemaVersion: 1,
          id: s.id,
          name: s.name,
          elements: [],
          bundle,
        });
        continue;
      }
    } catch {}
    loaded.push({
      schemaVersion: 1,
      id: s.id,
      name: s.name,
      elements: [],
    });
  }
  return loaded;
}

async function initializeOrMigrateDiskThemes() {
  // Check localStorage for old themes to migrate
  let migratedCount = 0;
  try {
    const raw = JSON.parse(localStorage.getItem(LIBRARY_KEY) || "[]");
    if (Array.isArray(raw) && raw.length > 0) {
      migratedCount = await invoke<number>("migrate_localstorage_themes", { themes: raw });
      console.log(`Migrated ${migratedCount} themes from localStorage to user data disk workspace.`);
    }
  } catch {}

  // If still 0, seed starter bundles
  if (migratedCount === 0) {
    for (const starter of STARTER_BUNDLES) {
      try {
        await invoke("save_disk_theme", {
          id: starter.manifest.id,
          bundle: starter,
        });
      } catch (err) {
        console.error("Failed seeding starter theme to disk:", err);
      }
    }
  }
}

export async function saveTheme(theme: ThemeDefinition): Promise<void> {
  const bundle: ThemeBundle = theme.bundle || generateBundleFromDeclarative(theme);
  const themeId = theme.id || bundle.manifest.id;

  if (isTauri) {
    try {
      await invoke("save_disk_theme", {
        id: themeId,
        bundle,
      });
    } catch (err) {
      console.error(`Failed writing theme "${theme.name}" to disk:`, err);
    }
  }

  // Keep localStorage backup in sync for offline web preview
  try {
    const existing = JSON.parse(localStorage.getItem(LIBRARY_KEY) || "[]") as ThemeDefinition[];
    const next = existing.some((t) => t.id === theme.id)
      ? existing.map((t) => (t.id === theme.id ? theme : t))
      : [theme, ...existing];
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(LIBRARY_EVENT));
  } catch {}
}

export async function deleteTheme(id: string): Promise<void> {
  if (isTauri) {
    try {
      await invoke("delete_disk_theme", { id });
    } catch (err) {
      console.error(`Failed deleting theme "${id}" from disk:`, err);
    }
  }

  try {
    const existing = JSON.parse(localStorage.getItem(LIBRARY_KEY) || "[]") as ThemeDefinition[];
    const next = existing.filter((t) => t.id !== id);
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(LIBRARY_EVENT));
  } catch {}
}

