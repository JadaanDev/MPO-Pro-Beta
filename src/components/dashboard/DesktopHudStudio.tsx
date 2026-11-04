import React, { useState, useEffect } from "react";
import {
  AppWindow,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ExternalLink,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { Layer } from "../../types/layers";
import { ThemeId, ThemeConfig } from "../../types/themes";
import { MediaState } from "../../types/media";
import { desktopEditorConfig, applyDesktopEdit } from "../../utils/desktopEditorConfig";
import { isTauriEnvironment } from "../../hooks/useMediaState";
import { MpoLogo } from "../common/MpoLogo";
import { HudLayersPanel } from "./desktop/HudLayersPanel";
import { OverlayStudio } from "./OverlayStudio";
import { readThemeLibrary, writeThemeLibrary } from "../../theme-sdk/library";
import type { ThemeDefinition } from "../../theme-sdk/schema";

interface DesktopHudStudioProps {
  desktopLayer: Layer;
  updateDesktopLayer: (
    updater: (prev: Layer) => Layer,
    desc?: string,
    commitHistory?: boolean
  ) => void;
  desktopLayers?: Layer[];
  activeDesktopLayerId?: string;
  onSelectDesktopLayer?: (id: string) => void;
  onCreateDesktopLayer?: (name: string, themeId?: ThemeId) => void;
  onDuplicateDesktopLayer?: (id: string) => void;
  onRenameDesktopLayer?: (id: string, name: string) => void;
  onDeleteDesktopLayer?: (id: string) => void;
  media: MediaState;
  artUrl: string;
  extractedColor: string | null;
  apiBaseUrl?: string;
  onOpenCssReference?: () => void;
}

export const DesktopHudStudio: React.FC<DesktopHudStudioProps> = ({
  desktopLayer,
  updateDesktopLayer,
  desktopLayers = [],
  activeDesktopLayerId = "desktop-hud",
  onSelectDesktopLayer,
  onCreateDesktopLayer,
  onDuplicateDesktopLayer,
  onRenameDesktopLayer,
  onDeleteDesktopLayer,
  media,
  artUrl,
  extractedColor,
  onOpenCssReference,
}) => {
  const isTauri = isTauriEnvironment();

  // Desktop Overlay window states
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [isClickThrough, setIsClickThrough] = useState(false);
  const [leftPanelTab, setLeftPanelTab] = useState<"themes" | "layers">("themes");
  const [showLeftSidebar, setShowLeftSidebar] = useState<boolean>(() => {
    try {
      return localStorage.getItem("mpo_hud_show_left_sidebar") !== "false";
    } catch {
      return true;
    }
  });

  const handleToggleLeftSidebar = () => {
    setShowLeftSidebar((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("mpo_hud_show_left_sidebar", String(next));
      } catch {}
      return next;
    });
  };

  const [showRightSidebar, setShowRightSidebar] = useState<boolean>(() => {
    try {
      return localStorage.getItem("mpo_hud_show_right_sidebar") !== "false";
    } catch {
      return true;
    }
  });

  const handleToggleRightSidebar = () => {
    setShowRightSidebar((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("mpo_hud_show_right_sidebar", String(next));
      } catch {}
      return next;
    });
  };

  const [ghostPeekEnabled, setGhostPeekEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem("mpo_hud_fade_on_hover") === "true";
    } catch {
      return false;
    }
  });

  // Query Tauri initial state & listen to events
  useEffect(() => {
    if (!isTauri) return;

    import("@tauri-apps/api/core").then(({ invoke }) => {
      invoke<boolean>("is_desktop_overlay_visible")
        .then((v) => setIsOverlayVisible(Boolean(v)))
        .catch(() => {});
      invoke<boolean>("get_overlay_click_through")
        .then((l) => setIsClickThrough(Boolean(l)))
        .catch(() => {});
    });

    let unlistenVis: (() => void) | null = null;
    let unlistenLock: (() => void) | null = null;

    import("@tauri-apps/api/event").then(({ listen }) => {
      listen<boolean>("overlay-visibility-changed", (e) => {
        setIsOverlayVisible(Boolean(e.payload));
      }).then((fn) => { unlistenVis = fn; });

      listen<boolean>("overlay-clickthrough-changed", (e) => {
        setIsClickThrough(Boolean(e.payload));
      }).then((fn) => { unlistenLock = fn; });
    });

    return () => {
      if (unlistenVis) unlistenVis();
      if (unlistenLock) unlistenLock();
    };
  }, [isTauri]);

  const handleToggleOverlay = async () => {
    if (isTauri) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const next = await invoke<boolean>("toggle_desktop_overlay");
        setIsOverlayVisible(Boolean(next));
      } catch (err) {
        console.error("Failed to toggle overlay:", err);
      }
    } else {
      window.open("/?mode=hud", "_blank", "width=640,height=220,resizable=yes");
    }
  };

  const handleToggleClickThrough = async () => {
    if (!isTauri) return;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const next = await invoke<boolean>("toggle_overlay_click_through");
      setIsClickThrough(Boolean(next));
    } catch (err) {
      console.error("Failed to toggle click-through:", err);
    }
  };

  const handleToggleGhostPeek = () => {
    const next = !ghostPeekEnabled;
    setGhostPeekEnabled(next);
    try {
      localStorage.setItem("mpo_hud_fade_on_hover", String(next));
      window.dispatchEvent(new Event("mpo_hud_fade_on_hover_changed"));
    } catch {}
  };

  const handleSelectTheme = (themeId: ThemeId) => {
    let built: ThemeDefinition | undefined;
    try {
      built = readThemeLibrary().find((t) => t.id === themeId);
    } catch {}
    updateDesktopLayer(
      (prev) => ({
        ...prev,
        themeId,
        builtTheme: built,
      }),
      `HUD theme switched to ${themeId}`,
      true
    );
  };

  const handleUpdateBuiltTheme = (updater: (prev: ThemeDefinition) => ThemeDefinition) => {
    if (!desktopLayer.builtTheme) return;
    const updated = updater(desktopLayer.builtTheme);
    updateDesktopLayer((prev) => ({ ...prev, builtTheme: updated }), `Updated built theme ${updated.name}`, false);
    try {
      const lib = readThemeLibrary();
      const nextLib = lib.map((t) => (t.id === updated.id ? updated : t));
      writeThemeLibrary(nextLib);
    } catch {}
  };

  const handleUpdateConfig = (updater: (prev: ThemeConfig) => ThemeConfig) => {
    updateDesktopLayer((prev) => ({
      ...prev,
      config: applyDesktopEdit(prev.config, updater),
    }));
  };

  const handleCustomCssChange = (css: string) => {
    updateDesktopLayer((prev) => ({
      ...prev,
      customCss: css,
    }));
  };

  const desktopConfig = desktopLayer.config;
  const inspectorConfig = desktopEditorConfig(desktopConfig);
  const previewOverrides = desktopConfig.useSeparateDesktopSize ? {
    scale: desktopConfig.desktopScale ?? desktopConfig.scale,
    customWidth: desktopConfig.desktopCustomWidth ?? desktopConfig.customWidth,
    customHeight: desktopConfig.desktopCustomHeight ?? desktopConfig.customHeight,
  } : undefined;

  return (
    <div className="desktop-hud-studio-root">

      <OverlayStudio
        headerRightActions={<>
      {/* Top Header Bar - Clean Modern Design with Official MpoLogo */}
      <div className="hud-studio-top-bar">
        <div className="hud-topbar-brand">
          <MpoLogo size={22} />
          <span className="hud-title-text">Desktop Overlay</span>
        </div>

        {/* Global Actions */}
        <div className="hud-topbar-actions">
          <button
            type="button"
            onClick={handleToggleLeftSidebar}
            className={`hud-action-pill-btn ${showLeftSidebar ? "active-cyan" : ""}`}
            title={showLeftSidebar ? "Hide Themes & Presets Sidebar" : "Show Themes & Presets Sidebar"}
          >
            {showLeftSidebar ? <PanelLeftClose size={13} /> : <PanelLeftOpen size={13} />}
            <span>{showLeftSidebar ? "Hide Themes" : "Show Themes"}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleRightSidebar}
            className={`hud-action-pill-btn ${showRightSidebar ? "active-cyan" : ""}`}
            title={showRightSidebar ? "Hide HUD Styling Inspector" : "Show HUD Styling Inspector"}
          >
            {showRightSidebar ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}
            <span>{showRightSidebar ? "Hide Styling" : "Show Styling"}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleOverlay}
            className={`hud-action-pill-btn ${isOverlayVisible ? "active-live" : ""}`}
            title={isOverlayVisible ? "Hide Desktop Overlay Window" : "Launch Native Desktop Overlay Window"}
          >
            <AppWindow size={13} />
            <span>{isOverlayVisible ? "Overlay Active" : "Launch Overlay"}</span>
          </button>

          {isTauri && (
            <button
              type="button"
              onClick={handleToggleClickThrough}
              className={`hud-action-pill-btn ${isClickThrough ? "active-live" : ""}`}
              title={isClickThrough ? "Overlay is locked in click-through mode (Ctrl+Shift+L to unlock)" : "Move Mode: Drag handle to reposition anywhere"}
            >
              {isClickThrough ? <Lock size={12} /> : <Unlock size={12} />}
              <span>{isClickThrough ? "Locked (Pass-thru)" : "Move Mode"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleGhostPeek}
            className={`hud-action-pill-btn ${ghostPeekEnabled ? "active-cyan" : ""}`}
            title="Ghost Peek: Automatically fade HUD opacity down to 18% when cursor hovers over it"
          >
            {ghostPeekEnabled ? <EyeOff size={12} /> : <Eye size={12} />}
            <span>{ghostPeekEnabled ? "Peek ON" : "Peek OFF"}</span>
          </button>

          <a
            href="/?mode=hud"
            target="_blank"
            rel="noreferrer"
            className="hud-action-pill-btn"
            title="Open standalone Desktop Floating HUD URL in a browser tab"
          >
            <ExternalLink size={12} />
            <span>Open URL</span>
          </a>
        </div>
      </div>

        </>}
        studioName="Desktop studio" currentTheme={desktopLayer.themeId} onThemeSelect={handleSelectTheme}
        onUpdateBuiltTheme={handleUpdateBuiltTheme}
        config={inspectorConfig} previewOverrides={previewOverrides} onConfigChange={handleUpdateConfig}
        onCommitHistory={(desc) => updateDesktopLayer((prev) => prev, desc, true)}
        media={media} artUrl={artUrl} customCss={desktopLayer.customCss || ""} format="horizontal"
        extractedColor={extractedColor} layers={desktopLayers} activeLayerId={activeDesktopLayerId}
        onSelectLayer={onSelectDesktopLayer || (() => {})}
        onCreateLayer={(name) => onCreateDesktopLayer?.(name)} onDuplicateLayer={onDuplicateDesktopLayer || (() => {})}
        onDeleteLayer={onDeleteDesktopLayer || (() => {})} onCustomCssChange={handleCustomCssChange}
        onOpenCssReference={onOpenCssReference} leftPanelTab={leftPanelTab} onSetLeftPanelTab={setLeftPanelTab}
        showLeftPanel={showLeftSidebar} onToggleLeftPanel={handleToggleLeftSidebar} showInspector={showRightSidebar} onToggleInspector={handleToggleRightSidebar}
        layerBrowser={<HudLayersPanel layers={desktopLayers} activeLayerId={activeDesktopLayerId} onSelectLayer={onSelectDesktopLayer || (() => {})} onCreateLayer={onCreateDesktopLayer || (() => {})} onDuplicateLayer={onDuplicateDesktopLayer || (() => {})} onRenameLayer={onRenameDesktopLayer || (() => {})} onDeleteLayer={onDeleteDesktopLayer || (() => {})} />}
      />
    </div>
  );
};
