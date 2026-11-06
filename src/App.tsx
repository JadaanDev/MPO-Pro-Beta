import React, { useState, useEffect, useCallback } from "react";
import { BigPresentation } from "./big-studio/BigPresentation";
import { BigStage } from "./big-studio/BigStage";
import { sanitizeBigLayer } from "./big-studio/layers";
import { BuiltThemeMount } from "./theme-sdk/BuiltThemeMount";
import type { BigLayer } from "./big-studio/types";
import { StudioDashboard } from "./components/dashboard/StudioDashboard";
import { AppLaunchScreen } from "./components/common/AppLaunchScreen";
import { THEME_COMPONENTS } from "./themes/ThemeRegistry";
import { Layer, DEFAULT_LAYERS, DEFAULT_DESKTOP_LAYERS, sanitizeLayers, sanitizeDesktopLayers } from "./types/layers";
import { useMediaState } from "./hooks/useMediaState";
import { loadGoogleFont } from "./utils/fontLoader";
import { extractDominantColor } from "./utils/colorExtractor";
import { DesktopOverlayWidget } from "./components/overlay/DesktopOverlayWidget";
import { generateEffectiveThemeCss } from "./utils/ThemeStyleEngine";
import { TrackTransitionWrapper } from "./components/common/TrackTransitionWrapper";
import { sourceResolutionScale } from "./utils/browserSource";
import { ThemeEffectBoundary } from "./components/common/ThemeEffectBoundary";

export const App: React.FC = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const modeParam = searchParams.get("mode");
  const layerParam = searchParams.get("layer");
  const pathname = window.location.pathname;

  // Migrate shortcuts saved by earlier versions, without overwriting native settings.
  useEffect(() => {
    if (modeParam || layerParam || !(window as any).__TAURI_INTERNALS__) return;
    import("@tauri-apps/api/core").then(async ({ invoke }) => {
      const native = await invoke<{ overlay: string; lock: string } | null>("get_saved_global_hotkeys");
      if (native) { localStorage.setItem("mpo_hotkeys", JSON.stringify(native)); return; }
      const stored = localStorage.getItem("mpo_hotkeys");
      if (!stored) return;
      const saved = JSON.parse(stored);
      if (saved.overlay && saved.lock) await invoke("update_global_hotkeys", { overlay: saved.overlay, lock: saved.lock });
    }).catch(error => console.error("Could not restore global shortcuts:", error));
  }, []);

  // Determine if running in overlay mode (OBS Browser source, TikTok Live Studio, or Desktop HUD)
  const isHudFeed = modeParam === "hud" || modeParam === "desktop" || searchParams.get("hud") === "1" || pathname === "/hud" || pathname === "/desktop";
  const isVerticalFeed = modeParam === "vertical" || pathname === "/vertical";
  const isHorizontalFeed = modeParam === "horizontal" || modeParam === "overlay" || pathname === "/horizontal" || pathname === "/overlay";
  const isOverlayMode = isHudFeed || isVerticalFeed || isHorizontalFeed || Boolean(layerParam);

  // Track whether layers have been fetched/loaded so layer URLs stay asleep if not fetched
  const [layersFetched, setLayersFetched] = useState<boolean>(() => {
    try {
      return Boolean(localStorage.getItem("mpo_layers_v2") || localStorage.getItem("mpo_desktop_layers_v1"));
    } catch {
      return false;
    }
  });

  // State to track all layers from storage
  const [layers, setLayers] = useState<Layer[]>(() => {
    try {
      const saved = localStorage.getItem("mpo_layers_v2");
      if (saved) return sanitizeLayers(JSON.parse(saved));
    } catch {}
    return [];
  });

  // State to track active layer IDs
  const [activeLayerId, setActiveLayerId] = useState<string>(() => {
    const saved = localStorage.getItem("mpo_active_layer_id_v2");
    return saved || DEFAULT_LAYERS[0].id;
  });

  const [activeHorizontalLayerId, setActiveHorizontalLayerId] = useState<string>(() => {
    const saved = localStorage.getItem("mpo_active_horizontal_layer_id_v1");
    return saved || DEFAULT_LAYERS.find((l) => l.format === "horizontal")?.id || DEFAULT_LAYERS[0].id;
  });

  const [activeVerticalLayerId, setActiveVerticalLayerId] = useState<string>(() => {
    const saved = localStorage.getItem("mpo_active_vertical_layer_id_v1");
    return saved || DEFAULT_LAYERS.find((l) => l.format === "vertical")?.id || "tiktok-vertical";
  });

  // State to track dedicated desktop overlay layers
  const [desktopLayers, setDesktopLayers] = useState<Layer[]>(() => {
    try {
      const saved = localStorage.getItem("mpo_desktop_layers_v1");
      if (saved) return sanitizeDesktopLayers(JSON.parse(saved));
    } catch {}
    return [];
  });

  const [activeDesktopLayerId, setActiveDesktopLayerId] = useState<string>(() => {
    const saved = localStorage.getItem("mpo_active_desktop_layer_id_v1");
    return saved || DEFAULT_DESKTOP_LAYERS[0].id;
  });

  // State to track Big Studio layers for ?layer=<big-id>
  const [bigLayers, setBigLayers] = useState<BigLayer[]>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("mpo_big_layers_v1") || "null");
      if (raw && Array.isArray(raw.layers)) {
        return raw.layers.map(sanitizeBigLayer).filter((v: BigLayer | null): v is BigLayer => v !== null);
      }
    } catch {}
    return [];
  });

  const { media, artUrl, getApiBaseUrl, isConnected } = useMediaState();

  // Dynamic dominant color extracted from album art
  const [extractedColor, setExtractedColor] = useState<string | null>(null);

  // Track visibility of Desktop Overlay to completely unmount and idle when hidden
  const [isOverlayVisible, setIsOverlayVisible] = useState<boolean>(true);

  useEffect(() => {
    if (!isHudFeed || typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) return;
    let unlisten: (() => void) | null = null;
    import("@tauri-apps/api/core").then(({ invoke }) => {
      invoke<boolean>("is_desktop_overlay_visible")
        .then((vis) => setIsOverlayVisible(Boolean(vis)))
        .catch(() => {});
    });
    import("@tauri-apps/api/event").then(({ listen }) => {
      listen<boolean>("overlay-visibility-changed", (event) => {
        setIsOverlayVisible(Boolean(event.payload));
      }).then((fn) => { unlisten = fn; });
    });
    return () => {
      if (unlisten) unlisten();
    };
  }, [isHudFeed]);

  useEffect(() => {
    let cancelled = false;
    setExtractedColor(null);
    if (artUrl) extractDominantColor(artUrl).then(color => { if (!cancelled) setExtractedColor(color); });
    return () => { cancelled = true; };
  }, [artUrl]);

  useEffect(() => {
    if (!isOverlayMode) return;
    const fonts = new Set([...layers, ...desktopLayers, ...bigLayers].flatMap(layer => [layer.config.titleFont, ...Object.values(layer.config.typography || {}).map(style => style?.font)]).filter((font): font is string => Boolean(font)));
    fonts.forEach(loadGoogleFont);
  }, [isOverlayMode, layers, desktopLayers, bigLayers]);

  const applyLayersPayload = useCallback((data: any) => {
    if (!data || typeof data !== "object") return;
    let hasValidPayload = false;
    if (Array.isArray(data.desktopLayers) && data.desktopLayers.length > 0) {
      hasValidPayload = true;
      const clean = sanitizeDesktopLayers(data.desktopLayers);
      setDesktopLayers(clean);
      if (clean.some(layer => layer.id === data.activeDesktopLayerId)) {
        setActiveDesktopLayerId(data.activeDesktopLayerId);
      }
    }
    if (Array.isArray(data.layers) && data.layers.length > 0) {
      hasValidPayload = true;
      const cleanLayers = sanitizeLayers(data.layers);
      setLayers(cleanLayers);
      if (data.activeLayerId && cleanLayers.some((l) => l.id === data.activeLayerId)) {
        setActiveLayerId(data.activeLayerId);
      } else if (cleanLayers[0]) {
        setActiveLayerId(cleanLayers[0].id);
      }
      if (data.activeHorizontalLayerId && cleanLayers.some((l) => l.id === data.activeHorizontalLayerId && l.format === "horizontal")) {
        setActiveHorizontalLayerId(data.activeHorizontalLayerId);
      }
      if (data.activeVerticalLayerId && cleanLayers.some((l) => l.id === data.activeVerticalLayerId && l.format === "vertical")) {
        setActiveVerticalLayerId(data.activeVerticalLayerId);
      }
    }
    if (data.bigProject && Array.isArray(data.bigProject.layers)) {
      hasValidPayload = true;
      const cleanBig = data.bigProject.layers.map(sanitizeBigLayer).filter((v: BigLayer | null): v is BigLayer => v !== null);
      if (cleanBig.length > 0) setBigLayers(cleanBig);
    }
    if (hasValidPayload) {
      setLayersFetched(true);
    }
  }, []);

  // Sync layers across browser tabs / OBS browser sources via storage events and API
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "mpo_layers_v2" && e.newValue) {
        try {
          setLayers(sanitizeLayers(JSON.parse(e.newValue)));
          setLayersFetched(true);
        } catch {}
      }
      if (e.key === "mpo_active_layer_id_v2" && e.newValue) {
        setActiveLayerId(e.newValue);
      }
      if (e.key === "mpo_active_horizontal_layer_id_v1" && e.newValue) {
        setActiveHorizontalLayerId(e.newValue);
      }
      if (e.key === "mpo_active_vertical_layer_id_v1" && e.newValue) {
        setActiveVerticalLayerId(e.newValue);
      }
      if (e.key === "mpo_desktop_layers_v1" && e.newValue) {
        try {
          setDesktopLayers(sanitizeDesktopLayers(JSON.parse(e.newValue)));
          setLayersFetched(true);
        } catch {}
      }
      if (e.key === "mpo_active_desktop_layer_id_v1" && e.newValue) {
        setActiveDesktopLayerId(e.newValue);
      }
      if (e.key === "mpo_big_layers_v1" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && Array.isArray(parsed.layers)) {
            setBigLayers(parsed.layers.map(sanitizeBigLayer).filter((v: BigLayer | null): v is BigLayer => v !== null));
            setLayersFetched(true);
          }
        } catch {}
      }
    };

    const handleCustomUpdate = () => {
      try {
        const saved = localStorage.getItem("mpo_layers_v2");
        if (saved) {
          setLayers(sanitizeLayers(JSON.parse(saved)));
          setLayersFetched(true);
        }
        const active = localStorage.getItem("mpo_active_layer_id_v2");
        if (active) setActiveLayerId(active);
        const activeHoriz = localStorage.getItem("mpo_active_horizontal_layer_id_v1");
        if (activeHoriz) setActiveHorizontalLayerId(activeHoriz);
        const activeVert = localStorage.getItem("mpo_active_vertical_layer_id_v1");
        if (activeVert) setActiveVerticalLayerId(activeVert);

        const savedDesktop = localStorage.getItem("mpo_desktop_layers_v1");
        if (savedDesktop) {
          setDesktopLayers(sanitizeDesktopLayers(JSON.parse(savedDesktop)));
          setLayersFetched(true);
        }
        const activeDesktop = localStorage.getItem("mpo_active_desktop_layer_id_v1");
        if (activeDesktop) setActiveDesktopLayerId(activeDesktop);

        const savedBig = localStorage.getItem("mpo_big_layers_v1");
        if (savedBig) {
          const parsed = JSON.parse(savedBig);
          if (parsed && Array.isArray(parsed.layers)) {
            setBigLayers(parsed.layers.map(sanitizeBigLayer).filter((v: BigLayer | null): v is BigLayer => v !== null));
            setLayersFetched(true);
          }
        }
      } catch {}
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("mpo_layers_updated", handleCustomUpdate);
    window.addEventListener("mpo-big-layers", handleCustomUpdate);

    // Fetch layers from Axum API server for browser / OBS sources
    const base = getApiBaseUrl();
    const fetchServerLayers = () => {
      fetch(`${base}/api/layers`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) applyLayersPayload(data);
        })
        .catch(() => {});
    };

    fetchServerLayers();

    // Poll every 1.5s in overlay mode as a reliable fallback alongside WebSocket
    const pollTimer = isOverlayMode ? window.setInterval(fetchServerLayers, 1500) : null;

    // Listen to live WebSocket layer updates broadcast across network
    const handleServerLayers = (e: Event) => {
      const customEv = e as CustomEvent;
      applyLayersPayload(customEv.detail);
    };
    window.addEventListener("mpo_server_layers_updated", handleServerLayers);

    return () => {
      if (pollTimer !== null) window.clearInterval(pollTimer);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("mpo_layers_updated", handleCustomUpdate);
      window.removeEventListener("mpo-big-layers", handleCustomUpdate);
      window.removeEventListener("mpo_server_layers_updated", handleServerLayers);
    };
  }, [getApiBaseUrl, applyLayersPayload, isOverlayMode]);

  // 1. Overlay Mode: Concurrent 16:9, 9:16 Vertical (TikTok), or Layer-specific feed
  if (isOverlayMode) {
    // If layers have not been fetched yet, stay asleep (render nothing)
    if (!layersFetched) {
      return null;
    }

    // If a specific ?layer=<id> is requested, strictly stream ONLY that layer (never fall back to active layer or defaults)
    if (layerParam) {
      const matchedBigLayer = bigLayers.find((l) => l.id === layerParam);
      if (matchedBigLayer) {
        return <BigStage media={media} artUrl={artUrl} layer={matchedBigLayer} extractedColor={extractedColor} />;
      }
      const matchedLayer =
        desktopLayers.find((l) => l.id === layerParam) ||
        layers.find((l) => l.id === layerParam);
      if (!matchedLayer) {
        // Layer not found in fetched layers -> stay asleep
        return null;
      }
      return renderOverlayLayer(matchedLayer);
    }

    // Resolve target layer for general mode feeds (?mode=hud, ?mode=vertical, ?mode=overlay / ?mode=horizontal)
    let targetLayer: Layer | undefined;

    if (isHudFeed) {
      // Dedicated Desktop Overlay HUD layer (active desktop preset)
      targetLayer =
        desktopLayers.find((l) => l.id === activeDesktopLayerId) ||
        desktopLayers[0] ||
        layers.find((l) => l.id === "desktop-hud");
    } else if (isVerticalFeed) {
      // Prioritize active vertical formatted layer (e.g. TikTok Live Studio feed)
      targetLayer =
        layers.find((l) => l.id === activeVerticalLayerId && l.format === "vertical") ||
        layers.find((l) => l.id === activeLayerId && l.format === "vertical") ||
        layers.find((l) => l.format === "vertical");
    } else {
      // Standard horizontal stream overlay (OBS Studio / Twitch)
      targetLayer =
        layers.find((l) => l.id === activeHorizontalLayerId && l.format === "horizontal") ||
        layers.find((l) => l.id === activeLayerId && l.format === "horizontal") ||
        layers.find((l) => l.format === "horizontal");
    }

    if (!targetLayer) {
      return null;
    }

    return renderOverlayLayer(targetLayer);
  }

  function renderOverlayLayer(targetLayer: Layer) {
    const ActiveThemeComponent = THEME_COMPONENTS[targetLayer.themeId] || THEME_COMPONENTS["glass-modern"];

    const isTauri = typeof window !== "undefined" && Boolean((window as any).__TAURI_INTERNALS__);
    const isDesktopHud = isHudFeed || (isTauri && !searchParams.has("mode") && !layerParam);

    // If running in Desktop HUD mode and the overlay is turned off/hidden, unmount completely to idle 100% of processing
    if (isDesktopHud && !isOverlayVisible) {
      return null;
    }

    // Apply auto album accent color and separate desktop overlay sizing if enabled
    const effectiveConfig = {
      ...targetLayer.config,
      scale:
        isDesktopHud && targetLayer.config.useSeparateDesktopSize && targetLayer.config.desktopScale
          ? targetLayer.config.desktopScale
          : targetLayer.config.scale,
      customWidth:
        isDesktopHud && targetLayer.config.useSeparateDesktopSize && typeof targetLayer.config.desktopCustomWidth === "number"
          ? targetLayer.config.desktopCustomWidth
          : targetLayer.config.customWidth,
      customHeight:
        isDesktopHud && targetLayer.config.useSeparateDesktopSize && typeof targetLayer.config.desktopCustomHeight === "number"
          ? targetLayer.config.desktopCustomHeight
          : targetLayer.config.customHeight,
      accentColor:
        targetLayer.config.autoAlbumColor && extractedColor
          ? extractedColor
          : targetLayer.config.accentColor,
    };

    const effectiveCustomCss = targetLayer.customCss;

    const generatedThemeCss = generateEffectiveThemeCss(
      effectiveConfig,
      targetLayer.format,
      extractedColor,
      effectiveCustomCss
    );

    const mediaTransitionKey = `${media.title}-${media.artist}-${media.album_title}`;

    const themeContent = (
      <>
        {generatedThemeCss && <style>{generatedThemeCss}</style>}
        <TrackTransitionWrapper
          transitionKey={mediaTransitionKey}
          style={effectiveConfig.transitionStyle || "focus"}
          direction={effectiveConfig.transitionDirection || "left"}
          intensity={effectiveConfig.transitionIntensity || "standard"}
          durationMs={effectiveConfig.transitionDurationMs ?? (effectiveConfig.transitionDuration != null ? effectiveConfig.transitionDuration * 1000 : 350)}
          delayMs={effectiveConfig.transitionDelayMs ?? (effectiveConfig.transitionDelay != null ? effectiveConfig.transitionDelay * 1000 : 0)}
        >
          {targetLayer.builtTheme ? (
              <BuiltThemeMount
                theme={targetLayer.builtTheme}
                surface={isDesktopHud || targetLayer.isDesktop ? "desktop" : targetLayer.format === "vertical" ? "tiktok" : "obs"}
                media={media}
                artUrl={artUrl}
                config={effectiveConfig}
                extractedColor={extractedColor}
                customCss={effectiveCustomCss}
              />
          ) : (
            <ActiveThemeComponent
              media={media}
              artUrl={artUrl}
              config={effectiveConfig}
              format={targetLayer.format}
              extractedColor={extractedColor}
            />
          )}
        </TrackTransitionWrapper>
      </>
    );

    const alignParam = searchParams.get("align") || searchParams.get("valign") || "center";
    let alignItems: "center" | "flex-start" | "flex-end" = "center";
    let justifyContent: "center" | "flex-start" | "flex-end" = "center";
    let wrapperPadding = "0px";

    if (alignParam.includes("bottom")) {
      alignItems = "flex-end";
      wrapperPadding = "28px";
    } else if (alignParam.includes("top")) {
      alignItems = "flex-start";
      wrapperPadding = "28px";
    }

    if (alignParam.includes("left")) {
      justifyContent = "flex-start";
      wrapperPadding = "28px";
    } else if (alignParam.includes("right")) {
      justifyContent = "flex-end";
      wrapperPadding = "28px";
    }

    return (
      <div
        className={`mpo-feed-wrapper ${targetLayer.format === "vertical" ? "vertical-mode" : "horizontal-mode"}`}
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems,
          justifyContent,
          padding: wrapperPadding,
          boxSizing: "border-box",
          background: "transparent",
          overflow: "hidden",
        }}
      >
        {isDesktopHud ? (
          <DesktopOverlayWidget format={targetLayer.format}>
            <ThemeEffectBoundary configScale={effectiveConfig.scale}>{themeContent}</ThemeEffectBoundary>
          </DesktopOverlayWidget>
        ) : (
          <div className="mpo-source-resolution" style={{ zoom: sourceResolutionScale(searchParams.get("quality")), flex: "none" }}><ThemeEffectBoundary configScale={effectiveConfig.scale}>{themeContent}</ThemeEffectBoundary></div>
        )}
      </div>
    );
  }

  if (modeParam === "big") return <BigPresentation media={media} artUrl={artUrl} />;

  // 2. Studio Dashboard Mode
  return (
    <>
      <AppLaunchScreen minDurationMs={750} />
      <StudioDashboard
        media={media}
        artUrl={artUrl}
        isConnected={isConnected}
        apiBaseUrl={getApiBaseUrl()}
      />
    </>
  );
};

export default App;
