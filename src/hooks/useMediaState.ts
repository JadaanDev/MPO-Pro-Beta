import { useState, useEffect, useCallback, useRef } from "react";
import { MediaState, DEFAULT_MEDIA_STATE, MOCK_MEDIA_STATE } from "../types/media";
import { applyAppSourceFilter } from "../utils/appSources";

// Check if running inside native Tauri container
export function isTauriEnvironment(): boolean {
  return typeof window !== "undefined" && Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

export function useMediaState() {
  const [media, setMedia] = useState<MediaState>(DEFAULT_MEDIA_STATE);
  const [isTauri, setIsTauri] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [artUrl, setArtUrl] = useState<string>("");
  const wsRef = useRef<WebSocket | null>(null);
  const rawMediaRef = useRef<MediaState>(DEFAULT_MEDIA_STATE);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);
  const reconnectAttemptRef = useRef(0);

  // Determine base API server URL
  const getApiBaseUrl = useCallback((): string => {
    if (typeof window === "undefined") return "http://127.0.0.1:4849";
    if (isTauriEnvironment()) {
      return "http://127.0.0.1:4849";
    }
    // Browser source: use current origin or fallback to port 4849
    if (window.location.port === "4849" || window.location.hostname === "mpobeta.local") {
      return `${window.location.protocol}//${window.location.host}`;
    }
    return "http://127.0.0.1:4849";
  }, []);

  // Update art URL with cache-busting timestamp
  const updateArtUrl = useCallback((hasArt: boolean, timestamp: number) => {
    if (!hasArt) {
      setArtUrl("");
      return;
    }
    const base = getApiBaseUrl();
    setArtUrl(`${base}/api/art?t=${timestamp}`);
  }, [getApiBaseUrl]);

  // Handle incoming media update from either Tauri IPC or WebSocket
  const handleMediaUpdate = useCallback((newMedia: MediaState) => {
    rawMediaRef.current = newMedia;
    const { media: filteredMedia, isSuppressed } = applyAppSourceFilter(newMedia);
    setMedia(filteredMedia);
    updateArtUrl(!isSuppressed && filteredMedia.has_art, filteredMedia.art_timestamp);
  }, [updateArtUrl]);

  // Re-apply filter when sources are edited in Settings
  useEffect(() => {
    const handleSourcesChange = () => {
      if (rawMediaRef.current) {
        const { media: filteredMedia, isSuppressed } = applyAppSourceFilter(rawMediaRef.current);
        setMedia(filteredMedia);
        updateArtUrl(!isSuppressed && filteredMedia.has_art, filteredMedia.art_timestamp);
      }
    };
    window.addEventListener("mpo_app_sources_updated", handleSourcesChange);
    return () => {
      window.removeEventListener("mpo_app_sources_updated", handleSourcesChange);
    };
  }, [updateArtUrl]);

  // Connect to WebSocket (OBS / Browser Source mode)
  const connectWebSocket = useCallback(() => {
    if (!activeRef.current) return;
    const scheduleReconnect = () => {
      if (!activeRef.current || reconnectTimerRef.current) return;
      const delay = Math.min(30000, 1000 * 2 ** Math.min(reconnectAttemptRef.current++, 5));
      reconnectTimerRef.current = setTimeout(() => { reconnectTimerRef.current = null; connectWebSocket(); }, delay * (0.8 + Math.random() * 0.4));
    };
    let wsUrl = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws`;
    if (window.location.port !== "4849" && window.location.hostname !== "mpobeta.local") {
      wsUrl = "ws://127.0.0.1:4849/ws";
    }

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!activeRef.current || wsRef.current !== ws) return;
        reconnectAttemptRef.current = 0;
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        if (!activeRef.current || wsRef.current !== ws) return;
        try {
          const raw = JSON.parse(event.data);
          if (raw && raw.type === "layers_updated" && raw.payload) {
            window.dispatchEvent(new CustomEvent("mpo_server_layers_updated", { detail: raw.payload }));
            return;
          }
          handleMediaUpdate(raw as MediaState);
        } catch {
          // Non-JSON message ignored
        }
      };

      ws.onclose = () => {
        if (!activeRef.current || wsRef.current !== ws) return;
        setIsConnected(false);
        if (!isTauriEnvironment()) { setMedia(DEFAULT_MEDIA_STATE); setArtUrl(""); }
        scheduleReconnect();
      };

      ws.onerror = () => {
        if (activeRef.current && wsRef.current === ws) setIsConnected(false);
      };
    } catch {
      setIsConnected(false);
      scheduleReconnect();
    }
  }, [handleMediaUpdate]);

  // Fetch initial state immediately via HTTP to guarantee instant load
  const fetchCurrentState = useCallback(() => {
    const base = getApiBaseUrl();
    fetch(`${base}/api/state`)
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("HTTP state error");
      })
      .then((data: MediaState) => {
        handleMediaUpdate(data);
      })
      .catch(() => {});
  }, [getApiBaseUrl, handleMediaUpdate]);

  useEffect(() => {
    const tauriDetected = isTauriEnvironment();
    activeRef.current = true;
    setIsTauri(tauriDetected);

    // 1. Immediately fetch snapshot via HTTP
    fetchCurrentState();

    // 2. Connect WebSocket stream for real-time telemetry
    connectWebSocket();

    // 3. If running in native Tauri container, also hook into Tauri event bridge
    let cancelled = false;
    let unlistenMediaFn: (() => void) | null = null;
    let unlistenEditFn: (() => void) | null = null;

    if (tauriDetected) {
      import("@tauri-apps/api/event").then(({ listen }) => {
        listen<MediaState>("media-update", (event) => {
          handleMediaUpdate(event.payload);
        }).then((unlisten) => {
          if (cancelled) unlisten(); else unlistenMediaFn = unlisten;
        }).catch(() => {});

        listen<boolean>("edit-mode-changed", (event) => {
          setIsEditMode(event.payload);
        }).then((unlisten) => {
          if (cancelled) unlisten(); else unlistenEditFn = unlisten;
        }).catch(() => {});
      }).catch(() => {});

      import("@tauri-apps/api/core").then(({ invoke }) => {
        invoke<MediaState>("get_media_state")
          .then(handleMediaUpdate)
          .catch(() => {});
      }).catch(() => {});
    }

    // 4. Polling heartbeat every 2.5 seconds to guarantee zero-desync
    const interval = setInterval(() => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        fetchCurrentState();
      }
    }, 2500);

    return () => {
      cancelled = true;
      activeRef.current = false;
      clearInterval(interval);
      if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
      const socket = wsRef.current;
      wsRef.current = null;
      if (socket) socket.close();
      if (unlistenMediaFn) unlistenMediaFn();
      if (unlistenEditFn) unlistenEditFn();
    };
  }, [connectWebSocket, fetchCurrentState, handleMediaUpdate]);

  // Toggle Edit Mode in Tauri
  const toggleEditMode = useCallback(async () => {
    if (isTauri) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const newMode = await invoke<boolean>("toggle_edit_mode");
        setIsEditMode(newMode);
      } catch {
        setIsEditMode((prev) => !prev);
      }
    } else {
      setIsEditMode((prev) => !prev);
    }
  }, [isTauri]);

  // Set mock media for testing/preview
  const toggleMockData = useCallback(() => {
    if (media.title === MOCK_MEDIA_STATE.title) {
      setMedia(DEFAULT_MEDIA_STATE);
      setArtUrl("");
    } else {
      setMedia(MOCK_MEDIA_STATE);
      setArtUrl("https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&h=300&fit=crop");
    }
  }, [media.title]);

  // Media controls (Play/Pause, Next, Previous)
  const sendControl = useCallback(async (action: "PlayPause" | "Next" | "Previous") => {
    if (isTauri) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("media_control", { action });
      } catch {
        // fallback to HTTP
      }
    } else {
      const base = getApiBaseUrl();
      fetch(`${base}/api/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      }).catch(() => {});
    }
  }, [isTauri, getApiBaseUrl]);

  return {
    media,
    artUrl,
    isTauri,
    isEditMode,
    isConnected,
    toggleEditMode,
    toggleMockData,
    sendControl,
    getApiBaseUrl,
  };
}
