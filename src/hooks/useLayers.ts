import { useState, useEffect, useCallback, useRef } from "react";
import { 
  Layer, 
  HistoryEntry, 
  DEFAULT_LAYERS, 
  DEFAULT_DESKTOP_LAYERS, 
  sanitizeLayers, 
  sanitizeDesktopLayers 
} from "../types/layers";
import { ThemeId } from "../types/themes";
import {LIBRARY_EVENT,libraryForSync,receiveThemeLibrary,refreshBuiltTheme,resolveLayerThemes} from "../theme-sdk/library";
import { useThemeWorkspaceSync } from "../theme-sdk/useThemeWorkspaceSync";
import {receiveBigProject} from "../big-studio/layers";

const LAYERS_STORAGE_KEY = "mpo_layers_v2";
const ACTIVE_LAYER_STORAGE_KEY = "mpo_active_layer_id_v2";
const ACTIVE_HORIZONTAL_LAYER_STORAGE_KEY = "mpo_active_horizontal_layer_id_v1";
const ACTIVE_VERTICAL_LAYER_STORAGE_KEY = "mpo_active_vertical_layer_id_v1";
const DESKTOP_LAYERS_STORAGE_KEY = "mpo_desktop_layers_v1";
const ACTIVE_DESKTOP_LAYER_STORAGE_KEY = "mpo_active_desktop_layer_id_v1";
const HISTORY_STORAGE_KEY = "mpo_history_v2";
const MAX_HISTORY = 40;

export function useLayers() {
  const [libraryRevision,setLibraryRevision]=useState(0);
  // Load initial layers
  const [layers, setLayers] = useState<Layer[]>(() => {
    try {
      const saved = localStorage.getItem(LAYERS_STORAGE_KEY);
      if (saved) return sanitizeLayers(JSON.parse(saved));
    } catch {}
    return DEFAULT_LAYERS;
  });

  // Active layer ID
  const [activeLayerId, setActiveLayerIdState] = useState<string>(() => {
    const saved = localStorage.getItem(ACTIVE_LAYER_STORAGE_KEY);
    return saved || DEFAULT_LAYERS[0].id;
  });

  // Per-format active layer IDs so switching between OBS and TikTok studios preserves each studio's active layer
  const [activeHorizontalLayerId, setActiveHorizontalLayerId] = useState<string>(() => {
    const saved = localStorage.getItem(ACTIVE_HORIZONTAL_LAYER_STORAGE_KEY);
    return saved || DEFAULT_LAYERS.find((l) => l.format === "horizontal")?.id || DEFAULT_LAYERS[0].id;
  });

  const [activeVerticalLayerId, setActiveVerticalLayerId] = useState<string>(() => {
    const saved = localStorage.getItem(ACTIVE_VERTICAL_LAYER_STORAGE_KEY);
    return saved || DEFAULT_LAYERS.find((l) => l.format === "vertical")?.id || "tiktok-vertical";
  });

  // Load initial dedicated desktop overlay layers (Desktop Presets)
  const [desktopLayers, setDesktopLayers] = useState<Layer[]>(() => {
    try {
      const saved = localStorage.getItem(DESKTOP_LAYERS_STORAGE_KEY);
      if (saved) return sanitizeDesktopLayers(JSON.parse(saved));
    } catch {}
    try {
      const savedMain = localStorage.getItem(LAYERS_STORAGE_KEY);
      if (savedMain) {
        const parsed = JSON.parse(savedMain);
        const existingHud = Array.isArray(parsed) && parsed.find((l: any) => l.id === "desktop-hud");
        if (existingHud) {
          return sanitizeDesktopLayers([existingHud, ...DEFAULT_DESKTOP_LAYERS.slice(1)]);
        }
      }
    } catch {}
    return DEFAULT_DESKTOP_LAYERS;
  });

  const [activeDesktopLayerId, setActiveDesktopLayerIdState] = useState<string>(() => {
    const saved = localStorage.getItem(ACTIVE_DESKTOP_LAYER_STORAGE_KEY);
    return saved || DEFAULT_DESKTOP_LAYERS[0].id;
  });

  const setActiveLayerId = useCallback((nextIdOrUpdater: string | ((prev: string) => string)) => {
    isRemoteSync.current = false;
    setActiveLayerIdState((prev) => {
      const resolved = typeof nextIdOrUpdater === "function" ? nextIdOrUpdater(prev) : nextIdOrUpdater;
      return resolved;
    });
  }, []);

  const setActiveDesktopLayerId = useCallback((nextIdOrUpdater: string | ((prev: string) => string)) => {
    isRemoteSync.current = false;
    setActiveDesktopLayerIdState((prev) => {
      const resolved = typeof nextIdOrUpdater === "function" ? nextIdOrUpdater(prev) : nextIdOrUpdater;
      return resolved;
    });
  }, []);

  // Keep per-format active layer IDs synced whenever activeLayerId or layers change
  useEffect(() => {
    const current = layers.find((l) => l.id === activeLayerId);
    if (current?.format === "horizontal" && activeHorizontalLayerId !== current.id) {
      setActiveHorizontalLayerId(current.id);
    } else if (current?.format === "vertical" && activeVerticalLayerId !== current.id) {
      setActiveVerticalLayerId(current.id);
    }
  }, [activeLayerId, layers, activeHorizontalLayerId, activeVerticalLayerId]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_HORIZONTAL_LAYER_STORAGE_KEY, activeHorizontalLayerId);
  }, [activeHorizontalLayerId]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_VERTICAL_LAYER_STORAGE_KEY, activeVerticalLayerId);
  }, [activeVerticalLayerId]);

  // History stack
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: "initial",
        timestamp: Date.now(),
        description: "Initial workspace state",
        layers: DEFAULT_LAYERS,
        activeLayerId: DEFAULT_LAYERS[0].id,
      },
    ];
  });

  const [historyIndex, setHistoryIndex] = useState<number>(() => {
    return Math.max(history.length - 1, 0);
  });

  const isRemoteSync = useRef(false);
  const clientId = useRef<string>(Math.random().toString(36).substring(2) + Date.now().toString(36));

  const getApiEndpoint = useCallback(() => {
    if (typeof window === "undefined") return "http://127.0.0.1:4849";
    if (window.location.port === "4849" || window.location.hostname === "mpobeta.local") {
      return `${window.location.protocol}//${window.location.host}`;
    }
    return "http://127.0.0.1:4849";
  }, []);

  // 1. Sync to localStorage
  useEffect(() => {
    localStorage.setItem(LAYERS_STORAGE_KEY, JSON.stringify(layers));
  }, [layers]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_LAYER_STORAGE_KEY, activeLayerId);
  }, [activeLayerId]);

  useEffect(() => {
    localStorage.setItem(DESKTOP_LAYERS_STORAGE_KEY, JSON.stringify(desktopLayers));
  }, [desktopLayers]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_DESKTOP_LAYER_STORAGE_KEY, activeDesktopLayerId);
  }, [activeDesktopLayerId]);

  useEffect(() => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const [serverLoaded, setServerLoaded] = useState(false);
  useThemeWorkspaceSync(serverLoaded);
  useEffect(()=>{const sync=()=>{const themes=libraryForSync();if(!themes)return;isRemoteSync.current=false;setLayers(old=>old.map(layer=>refreshBuiltTheme(layer,themes)));setDesktopLayers(old=>old.map(layer=>refreshBuiltTheme(layer,themes)));setLibraryRevision(old=>old+1)};window.addEventListener(LIBRARY_EVENT,sync);return()=>window.removeEventListener(LIBRARY_EVENT,sync)},[]);

  // 2. Fetch saved layers from Axum API server on mount
  useEffect(() => {
    let cancelled = false;
    const base = getApiEndpoint();
    fetch(`${base}/api/layers`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        receiveThemeLibrary(data?.themeLibrary);
        receiveBigProject(data?.bigProject);
        if (data && Array.isArray(data.desktopLayers) && data.desktopLayers.length > 0) {
          const clean = resolveLayerThemes(sanitizeDesktopLayers(data.desktopLayers), data.themeLibrary);
          if (JSON.stringify(clean) !== localStorage.getItem(DESKTOP_LAYERS_STORAGE_KEY)) {
            isRemoteSync.current = true;
            setDesktopLayers(clean);
            if (clean.some(layer => layer.id === data.activeDesktopLayerId)) setActiveDesktopLayerIdState(data.activeDesktopLayerId);
          }
        }
        if (data && Array.isArray(data.layers) && data.layers.length > 0) {
          const cleanLayers = resolveLayerThemes(sanitizeLayers(data.layers), data.themeLibrary);
          const localJson = localStorage.getItem(LAYERS_STORAGE_KEY);
          if (!localJson || JSON.stringify(cleanLayers) !== localJson) {
            isRemoteSync.current = true;
            setLayers(cleanLayers);
            if (data.activeLayerId && cleanLayers.some((l) => l.id === data.activeLayerId)) {
              setActiveLayerIdState(data.activeLayerId);
            } else if (cleanLayers[0]) {
              setActiveLayerIdState(cleanLayers[0].id);
            }
          }
          if (data.activeHorizontalLayerId && cleanLayers.some((l) => l.id === data.activeHorizontalLayerId && l.format === "horizontal")) {
            setActiveHorizontalLayerId(data.activeHorizontalLayerId);
          }
          if (data.activeVerticalLayerId && cleanLayers.some((l) => l.id === data.activeVerticalLayerId && l.format === "vertical")) {
            setActiveVerticalLayerId(data.activeVerticalLayerId);
          }
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) { isRemoteSync.current = false; setServerLoaded(true); } });
    return () => { cancelled = true; };
  }, [getApiEndpoint]);

  // 3. Listen to live server layers updates broadcast from WebSocket
  useEffect(() => {
    const handleServerLayers = (e: Event) => {
      const customEv = e as CustomEvent;
      const data = customEv.detail;
      receiveThemeLibrary(data?.themeLibrary);
      receiveBigProject(data?.bigProject);
      if (data?.clientId && data.clientId === clientId.current) return;
      if (data && Array.isArray(data.desktopLayers) && data.desktopLayers.length > 0) {
        const clean = resolveLayerThemes(sanitizeDesktopLayers(data.desktopLayers), data.themeLibrary);
        setDesktopLayers(prev => { if (JSON.stringify(prev) === JSON.stringify(clean)) return prev; isRemoteSync.current = true; return clean; });
        if (data.activeDesktopLayerId) setActiveDesktopLayerIdState(data.activeDesktopLayerId);
      }
      if (data && Array.isArray(data.layers) && data.layers.length > 0) {
        // Skip self-broadcasts to prevent wiping pending local state
        if (data.clientId && data.clientId === clientId.current) {
          return;
        }
        const cleanLayers = resolveLayerThemes(sanitizeLayers(data.layers), data.themeLibrary);
        setLayers((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(cleanLayers)) {
            return prev;
          }
          isRemoteSync.current = true;
          return cleanLayers;
        });
        if (data.activeLayerId) {
          setActiveLayerIdState((prev) => (prev === data.activeLayerId ? prev : data.activeLayerId));
        }
        if (data.activeHorizontalLayerId && cleanLayers.some((l) => l.id === data.activeHorizontalLayerId && l.format === "horizontal")) {
          setActiveHorizontalLayerId(data.activeHorizontalLayerId);
        }
        if (data.activeVerticalLayerId && cleanLayers.some((l) => l.id === data.activeVerticalLayerId && l.format === "vertical")) {
          setActiveVerticalLayerId(data.activeVerticalLayerId);
        }
      }
    };

    window.addEventListener("mpo_server_layers_updated", handleServerLayers);
    return () => {
      window.removeEventListener("mpo_server_layers_updated", handleServerLayers);
    };
  }, []);

  // 4. Debounced push of layer changes to Axum server to sync with OBS/external browser endpoints
  useEffect(() => {
    if (!serverLoaded) return;
    if (isRemoteSync.current) {
      isRemoteSync.current = false;
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const base = getApiEndpoint();
      let bigProject: unknown = undefined;
      try {
        const rawBig = localStorage.getItem("mpo_big_layers_v1");
        if (rawBig) bigProject = JSON.parse(rawBig);
      } catch {}
      fetch(`${base}/api/layers`, {
        signal: controller.signal,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          layers,
          activeLayerId,
          activeHorizontalLayerId,
          activeVerticalLayerId,
          desktopLayers,
          activeDesktopLayerId,
          bigProject,
          themeLibrary: libraryForSync(),
          clientId: clientId.current,
        }),
      }).then((response) => {
        if (!response.ok) throw new Error(`Save failed (${response.status})`);
        if (!cancelled) window.dispatchEvent(new CustomEvent("mpo_save_status", { detail: "saved" }));
      }).catch(() => { if (!cancelled) window.dispatchEvent(new CustomEvent("mpo_save_status", { detail: "error" })); });
    }, 120);

    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, [layers, activeLayerId, activeHorizontalLayerId, activeVerticalLayerId, desktopLayers, activeDesktopLayerId, getApiEndpoint, serverLoaded, libraryRevision]);

  // Push new history state
  const pushHistory = useCallback(
    (newLayers: Layer[], currentLayerId: string, desc: string) => {
      const entry: HistoryEntry = {
        id: `h_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: Date.now(),
        description: desc,
        layers: newLayers,
        activeLayerId: currentLayerId,
      };

      setHistory((prev) => {
        // Cut off any redo branches
        const sliced = prev.slice(0, historyIndex + 1);
        const updated = [...sliced, entry];
        if (updated.length > MAX_HISTORY) {
          return updated.slice(updated.length - MAX_HISTORY);
        }
        return updated;
      });

      setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY - 1));
    },
    [historyIndex]
  );

  // Update active layer with automated history preservation
  const updateActiveLayer = useCallback(
    (updater: (prev: Layer) => Layer, desc = "Updated layer properties", commitHistory = true) => {
      isRemoteSync.current = false;
      setLayers((prevLayers) => {
        const nextLayers = prevLayers.map((l) =>
          l.id === activeLayerId ? { ...updater(l), updatedAt: Date.now() } : l
        );
        if (commitHistory) {
          pushHistory(nextLayers, activeLayerId, desc);
        }
        return nextLayers;
      });
    },
    [activeLayerId, pushHistory]
  );

  const updateLayerById = useCallback(
    (targetId: string, updater: (prev: Layer) => Layer, desc = "Updated layer properties") => {
      isRemoteSync.current = false;
      setLayers((prevLayers) => {
        const nextLayers = prevLayers.map((l) =>
          l.id === targetId ? { ...updater(l), updatedAt: Date.now() } : l
        );
        pushHistory(nextLayers, targetId, desc);
        return nextLayers;
      });
    },
    [pushHistory]
  );

  // Commit current layer state to history on release (e.g. un-hold slider)
  const commitActiveLayer = useCallback(
    (desc = "Modified overlay settings") => {
      isRemoteSync.current = false;
      setLayers((currentLayers) => {
        pushHistory(currentLayers, activeLayerId, desc);
        return currentLayers;
      });
    },
    [activeLayerId, pushHistory]
  );

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      isRemoteSync.current = false;
      const targetIndex = historyIndex - 1;
      const snapshot = history[targetIndex];
      setLayers(sanitizeLayers(snapshot.layers));
      setActiveLayerId(snapshot.activeLayerId);
      setHistoryIndex(targetIndex);
    }
  }, [history, historyIndex]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isRemoteSync.current = false;
      const targetIndex = historyIndex + 1;
      const snapshot = history[targetIndex];
      setLayers(sanitizeLayers(snapshot.layers));
      setActiveLayerId(snapshot.activeLayerId);
      setHistoryIndex(targetIndex);
    }
  }, [history, historyIndex]);

  // Jump to specific history entry
  const revertToHistory = useCallback(
    (entryId: string) => {
      const idx = history.findIndex((h) => h.id === entryId);
      if (idx !== -1) {
        isRemoteSync.current = false;
        const snapshot = history[idx];
        setLayers(sanitizeLayers(snapshot.layers));
        setActiveLayerId(snapshot.activeLayerId);
        setHistoryIndex(idx);
      }
    },
    [history, setActiveLayerId]
  );

  const renameLayer = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    isRemoteSync.current = false;
    setLayers(previous => { const next = previous.map(layer => layer.id === id ? {...layer, name: trimmed, updatedAt: Date.now()} : layer); pushHistory(next, activeLayerId, "Renamed layer"); return next; });
  }, [activeLayerId, pushHistory]);

  // Create new layer
  const createLayer = useCallback(
    (name = "New Overlay Layer", format: "horizontal" | "vertical" = "horizontal") => {
      isRemoteSync.current = false;
      const newId = `layer-${Date.now().toString(36)}`;
      const newLayer: Layer = {
        id: newId,
        name,
        format,
        themeId: format === "vertical" ? "tiktok-aurora" : "obs-signal-desk",
        config: {
          ...DEFAULT_LAYERS[0].config,
          customWidth: 0,
        },
        customCss: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setLayers((prev) => {
        const next = [...prev, newLayer];
        pushHistory(next, newId, `Created layer "${name}"`);
        return next;
      });
      setActiveLayerId(newId);
    },
    [pushHistory, setActiveLayerId]
  );

  // Duplicate layer
  const duplicateLayer = useCallback(
    (id: string) => {
      const source = layers.find((l) => l.id === id);
      if (!source) return;
      isRemoteSync.current = false;

      const dupId = `${source.id}-copy-${Date.now().toString(36).substring(2, 5)}`;
      const dupLayer: Layer = {
        ...source,
        id: dupId,
        name: `${source.name} (Copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setLayers((prev) => {
        const next = [...prev, dupLayer];
        pushHistory(next, dupId, `Duplicated layer "${source.name}"`);
        return next;
      });
      setActiveLayerId(dupId);
    },
    [layers, pushHistory, setActiveLayerId]
  );

  // Copy a design to the other studio without modifying its original layer.
  const copyLayerToFormat = useCallback((id: string, format: "horizontal" | "vertical") => {
    const source = layers.find((layer) => layer.id === id);
    if (!source) return;
    isRemoteSync.current = false;
    const newId = `layer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const copy: Layer = { ...source, id: newId, name: `${source.name} (${format === "vertical" ? "TikTok" : "Horizontal"})`, format,
      config: { ...source.config, customWidth: format === "vertical" ? 360 : 0, customHeight: 0 }, createdAt: Date.now(), updatedAt: Date.now() };
    setLayers((prev) => { const next = [...prev, copy]; pushHistory(next, newId, `Copied "${source.name}" to ${format}`); return next; });
    setActiveLayerId(newId);
  }, [layers, pushHistory, setActiveLayerId]);

  // Delete layer
  const deleteLayer = useCallback(
    (id: string) => {
      if (layers.length <= 1) return; // Keep at least one layer
      isRemoteSync.current = false;
      const toDelete = layers.find((l) => l.id === id);
      setLayers((prev) => {
        const next = prev.filter((l) => l.id !== id);
        const nextActive = next[0].id;
        pushHistory(next, nextActive, `Deleted layer "${toDelete?.name || id}"`);
        setActiveLayerId(nextActive);
        return next;
      });
    },
    [layers, pushHistory, setActiveLayerId]
  );

  // Export layers to JSON string
  const exportLayersJson = useCallback(() => {
    return JSON.stringify(
      {
        version: "2.0.0",
        exportedAt: Date.now(),
        layers,
        activeLayerId,
        desktopLayers,
        activeDesktopLayerId,
      },
      null,
      2
    );
  }, [layers, activeLayerId, desktopLayers, activeDesktopLayerId]);

  // Import layers from JSON string
  const importLayersJson = useCallback(
    (jsonStr: string): boolean => {
      try {
        const parsed = JSON.parse(jsonStr);
        isRemoteSync.current = false;
        if (parsed.singleLayer === true) {
          const isDesktop = Array.isArray(parsed.desktopLayers) && parsed.desktopLayers.length === 1;
          const incoming = isDesktop ? parsed.desktopLayers[0] : Array.isArray(parsed.layers) && parsed.layers.length === 1 ? parsed.layers[0] : null;
          if (!incoming || typeof incoming !== "object") return false;
          const id = (isDesktop ? "desktop-import-" : "layer-import-") + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
          if (isDesktop) { const clean = sanitizeDesktopLayers([{...incoming,id}])[0]; setDesktopLayers(current => [...current, clean]); setActiveDesktopLayerId(id); }
          else { const clean = sanitizeLayers([{...incoming,id}]).find(layer => layer.id === id); if (!clean) return false; setLayers(current => {const next=[...current,clean]; pushHistory(next,id,"Imported layer");return next;}); setActiveLayerId(id); }
          return true;
        }
        if (Array.isArray(parsed.layers) && parsed.layers.length > 0) {
          const clean = sanitizeLayers(parsed.layers);
          const importedActive = clean.some(layer => layer.id === parsed.activeLayerId) ? parsed.activeLayerId : clean[0].id;
          setLayers(clean);
          setActiveLayerId(importedActive);
          if (Array.isArray(parsed.desktopLayers) && parsed.desktopLayers.length > 0) {
            const desktop = sanitizeDesktopLayers(parsed.desktopLayers);
            setDesktopLayers(desktop);
            setActiveDesktopLayerId(desktop.some(layer => layer.id === parsed.activeDesktopLayerId) ? parsed.activeDesktopLayerId : desktop[0].id);
          }
          pushHistory(clean, importedActive, "Imported layers from JSON");
          return true;
        }
      } catch (e) {
        console.error("Failed to import layers JSON:", e);
      }
      return false;
    },
    [pushHistory, setActiveLayerId, setActiveDesktopLayerId]
  );

  const activeLayer = layers.find((l) => l.id === activeLayerId) || layers[0] || DEFAULT_LAYERS[0];
  
  // Dedicated Desktop Overlay Layer lookup
  const activeDesktopLayer =
    desktopLayers.find((l) => l.id === activeDesktopLayerId) ||
    desktopLayers[0] ||
    DEFAULT_DESKTOP_LAYERS[0];

  const desktopLayer = activeDesktopLayer;

  // Update the active desktop preset without modifying stream layers.
  const updateActiveDesktopLayer = useCallback(
    (updater: (prev: Layer) => Layer) => {
      isRemoteSync.current = false;
      setDesktopLayers((prev) => {
        const next = prev.map((l) =>
          l.id === activeDesktopLayerId ? { ...updater(l), updatedAt: Date.now() } : l
        );
        return next;
      });
    },
    [activeDesktopLayerId]
  );

  const updateDesktopLayer = updateActiveDesktopLayer;

  // Create new Desktop Overlay Layer Preset
  const createDesktopLayer = useCallback(
    (name = "New Desktop Preset", themeId: ThemeId = "desktop-air") => {
      isRemoteSync.current = false;
      const newId = `desktop-preset-${Date.now().toString(36)}`;
      const newLayer: Layer = {
        id: newId,
        name,
        format: "horizontal",
        themeId,
        isDesktop: true,
        config: {
          ...DEFAULT_DESKTOP_LAYERS[0].config,
        },
        customCss: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setDesktopLayers((prev) => [...prev, newLayer]);
      setActiveDesktopLayerId(newId);
    },
    [setActiveDesktopLayerId]
  );

  // Duplicate Desktop Layer Preset
  const duplicateDesktopLayer = useCallback(
    (id: string) => {
      const source = desktopLayers.find((l) => l.id === id);
      if (!source) return;
      isRemoteSync.current = false;
      const dupId = `${source.id}-copy-${Date.now().toString(36).substring(2, 5)}`;
      const dupLayer: Layer = {
        ...source,
        id: dupId,
        name: `${source.name} (Copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setDesktopLayers((prev) => [...prev, dupLayer]);
      setActiveDesktopLayerId(dupId);
    },
    [desktopLayers, setActiveDesktopLayerId]
  );

  // Rename Desktop Layer Preset
  const renameDesktopLayer = useCallback((id: string, name: string) => {
    isRemoteSync.current = false;
    setDesktopLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, name, updatedAt: Date.now() } : l))
    );
  }, []);

  // Delete Desktop Layer Preset
  const deleteDesktopLayer = useCallback(
    (id: string) => {
      if (desktopLayers.length <= 1) return; // Keep at least one desktop preset
      isRemoteSync.current = false;
      setDesktopLayers((prev) => {
        const next = prev.filter((l) => l.id !== id);
        if (activeDesktopLayerId === id) {
          setActiveDesktopLayerId(next[0].id);
        }
        return next;
      });
    },
    [desktopLayers.length, activeDesktopLayerId, setActiveDesktopLayerId]
  );

  return {
    layers,
    activeLayerId,
    activeHorizontalLayerId,
    activeVerticalLayerId,
    activeLayer,
    desktopLayer,
    desktopLayers,
    activeDesktopLayerId,
    activeDesktopLayer,
    setActiveLayerId,
    setActiveDesktopLayerId,
    updateActiveLayer,
    updateLayerById,
    updateDesktopLayer,
    updateActiveDesktopLayer,
    createDesktopLayer,
    duplicateDesktopLayer,
    renameDesktopLayer,
    deleteDesktopLayer,
    commitActiveLayer,
    createLayer,
    duplicateLayer,
    copyLayerToFormat,
    renameLayer,
    deleteLayer,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    history,
    historyIndex,
    revertToHistory,
    exportLayersJson,
    importLayersJson,
  };
}

