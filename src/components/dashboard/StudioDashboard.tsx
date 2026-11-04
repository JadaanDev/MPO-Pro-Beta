import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { version as appVersion } from "../../../package.json";
import { 
  Home, ArrowRight, Radio, Monitor, Smartphone, Sparkles,
  Palette, 
  Tv, 
  Settings, 
  History as HistoryIcon,
  AppWindow,
  Globe,
  Send,
  Wand2,
  BookOpen
} from "lucide-react";
import { ThemeId, ThemeConfig } from "../../types/themes";
import { LayerFormat } from "../../types/layers";
import { MediaState } from "../../types/media";
import { BigStudio } from "../../big-studio/BigStudio";
import { OverlayStudio } from "./OverlayStudio";
import { DesktopHudStudio } from "./DesktopHudStudio";
import { StreamingHub } from "./StreamingHub";
import { SystemSettings } from "./SystemSettings";
import { LayerSelectDropdown } from "../common/LayerSelectDropdown";
import { HistoryDrawer } from "./HistoryDrawer";
import { CssReferenceModal } from "./CssReferenceModal";
import { useLayers } from "../../hooks/useLayers";
import { extractDominantColor } from "../../utils/colorExtractor";
import { isTauriEnvironment } from "../../hooks/useMediaState";
import { MpoLogo } from "../common/MpoLogo";
import { MyThemesPage } from "../../theme-sdk/pages/MyThemesPage";
import { ThemeBuilderPage } from "../../theme-sdk/pages/ThemeBuilderPage";
import { SdkDocsExplorer } from "../../theme-sdk/SdkDocsExplorer";
import { bundleToThemeDefinition } from "../../theme-sdk/templates/starterBundles";
import type { ThemeDefinition, ThemeSurface } from "../../theme-sdk/schema";
import { readThemeLibrary, writeThemeLibrary } from "../../theme-sdk/library";
import { readBigProject, writeBigProject } from "../../big-studio/layers";

type DashboardTab = "big" | "home" | "studio" | "tiktok" | "desktop-hud" | "my-themes" | "builder" | "sdk-docs" | "css" | "streaming" | "system";

interface StudioDashboardProps {
  media: MediaState;
  artUrl: string;
  apiBaseUrl: string;
  isConnected: boolean;
}

export const StudioDashboard: React.FC<StudioDashboardProps> = ({
  media,
  artUrl,
  apiBaseUrl,
  isConnected,
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") as DashboardTab;
      if (tabParam === "css") return "studio";
      if (tabParam && ["home", "studio", "tiktok", "desktop-hud", "big", "my-themes", "builder", "sdk-docs", "css", "streaming", "system"].includes(tabParam)) {
        return tabParam;
      }
    } catch {}
    return "home";
  });

  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab);
    try {
      const url = new URL(window.location.href);
      if (tab === "home") {
        url.searchParams.delete("tab");
      } else {
        url.searchParams.set("tab", tab);
      }
      window.history.replaceState({}, "", url.toString());
    } catch {}
  };

  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    const onSave = (event: Event) => setSaveError((event as CustomEvent).detail === "error");
    window.addEventListener("mpo_save_status", onSave);
    return () => window.removeEventListener("mpo_save_status", onSave);
  }, []);
  const [extractedColor, setExtractedColor] = useState<string | null>(null);
  const [leftPanelTab, setLeftPanelTab] = useState<"themes" | "layers">("themes");

  // Show/Hide left themes & layers panel
  const [showLeftPanel, setShowLeftPanel] = useState<boolean>(() => {
    try {
      return localStorage.getItem("mpo_left_panel_visible") !== "false";
    } catch {
      return true;
    }
  });

  // History Drawer & CSS Reference Modal visibility
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isCssModalOpen, setIsCssModalOpen] = useState(false);

  // Import JSON Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  const isTauri = isTauriEnvironment();

  const {
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
    updateActiveDesktopLayer,
    createDesktopLayer,
    duplicateDesktopLayer,
    renameDesktopLayer,
    deleteDesktopLayer,
    commitActiveLayer,
    createLayer,
    duplicateLayer,
    renameLayer,
    deleteLayer,
    undo,
    redo,
    canUndo,
    canRedo,
    history,
    historyIndex,
    revertToHistory,
    exportLayersJson,
    importLayersJson,
  } = useLayers();

  const studioFormat: LayerFormat | null = activeTab === "studio" ? "horizontal" : activeTab === "tiktok" ? "vertical" : null;
  const studioLayers = studioFormat ? layers.filter((layer) => layer.format === studioFormat) : layers;
  useLayoutEffect(() => {
    if (!studioFormat) return;
    const candidates = layers.filter((layer) => layer.format === studioFormat);
    if (!candidates.length) { createLayer(studioFormat === "vertical" ? "TikTok overlay" : "Stream overlay", studioFormat); return; }
    if (!candidates.some((layer) => layer.id === activeLayerId)) {
      const preferredId = studioFormat === "vertical" ? activeVerticalLayerId : activeHorizontalLayerId;
      const target = candidates.find((layer) => layer.id === preferredId) || candidates[0];
      setActiveLayerId(target.id);
    }
  }, [studioFormat, layers, activeLayerId, activeHorizontalLayerId, activeVerticalLayerId, createLayer, setActiveLayerId]);
  const createStudioLayer = (name?: string, format?: LayerFormat) => createLayer(name, studioFormat || format || "horizontal");
  const deleteStudioLayer = (id: string) => { if (!studioFormat || studioLayers.length > 1) deleteLayer(id); };

  const handleToggleLeftPanel = () => {
    setShowLeftPanel((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("mpo_left_panel_visible", String(next));
      } catch {}
      return next;
    });
  };

  // Extract dominant color from album art whenever artUrl changes
  useEffect(() => {
    let cancelled = false;
    setExtractedColor(null);
    if (artUrl) extractDominantColor(artUrl).then(color => { if (!cancelled) setExtractedColor(color); });
    return () => { cancelled = true; };
  }, [artUrl]);

  const handleThemeSelect = (themeId: ThemeId) => {
    let built: ThemeDefinition | undefined;
    try {
      built = readThemeLibrary().find((t) => t.id === themeId);
    } catch {}
    updateActiveLayer((l) => ({ ...l, themeId, builtTheme: built }), `Switched theme to ${themeId}`, true);
    window.dispatchEvent(new Event("mpo_layers_updated"));
  };

  const handleUpdateActiveBuiltTheme = (updater: (prev: ThemeDefinition) => ThemeDefinition) => {
    if (!activeLayer.builtTheme) return;
    const updated = updater(activeLayer.builtTheme);
    updateActiveLayer((l) => ({ ...l, builtTheme: updated }), `Updated built theme ${updated.name}`, false);
    try {
      const lib = readThemeLibrary();
      const nextLib = lib.map((t) => (t.id === updated.id ? updated : t));
      writeThemeLibrary(nextLib);
    } catch {}
  };

  const [bigRevision, setBigRevision] = useState(0);
  useEffect(() => {
    const onBig = () => setBigRevision((r) => r + 1);
    window.addEventListener("mpo-big-layers", onBig);
    return () => window.removeEventListener("mpo-big-layers", onBig);
  }, []);

  const routedStudios: Partial<Record<ThemeSurface, string | undefined>> = (() => {
    void bigRevision;
    const obsLayer = layers.find((l) => l.id === activeHorizontalLayerId && l.format === "horizontal") || layers.find((l) => l.format === "horizontal");
    const tiktokLayer = layers.find((l) => l.id === activeVerticalLayerId && l.format === "vertical") || layers.find((l) => l.format === "vertical");
    const bigProj = readBigProject();
    const bigActive = bigProj.layers.find((l) => l.id === bigProj.activeLayerId) || bigProj.layers[0];
    return {
      obs: obsLayer?.builtTheme?.id,
      tiktok: tiktokLayer?.builtTheme?.id,
      desktop: (activeDesktopLayer || desktopLayer)?.builtTheme?.id,
      big: bigActive?.builtTheme?.id,
    };
  })();

  const handleRouteToStudio = (theme: ThemeDefinition, surface: ThemeSurface, openStudio = false) => {
    if (surface === "obs") {
      const target = layers.find((l) => l.id === activeHorizontalLayerId && l.format === "horizontal") || layers.find((l) => l.format === "horizontal");
      if (target) {
        updateLayerById(target.id, (l) => ({ ...l, builtTheme: theme }), `Routed "${theme.name}" to OBS Studio`);
        setActiveLayerId(target.id);
      }
      window.dispatchEvent(new Event("mpo_layers_updated"));
      if (openStudio) handleTabChange("studio");
    } else if (surface === "tiktok") {
      const target = layers.find((l) => l.id === activeVerticalLayerId && l.format === "vertical") || layers.find((l) => l.format === "vertical");
      if (target) {
        updateLayerById(target.id, (l) => ({ ...l, builtTheme: theme }), `Routed "${theme.name}" to TikTok Studio`);
        setActiveLayerId(target.id);
      }
      window.dispatchEvent(new Event("mpo_layers_updated"));
      if (openStudio) handleTabChange("tiktok");
    } else if (surface === "desktop") {
      updateActiveDesktopLayer((l) => ({ ...l, builtTheme: theme }));
      window.dispatchEvent(new Event("mpo_layers_updated"));
      if (openStudio) handleTabChange("desktop-hud");
    } else if (surface === "big") {
      const proj = readBigProject();
      const nextLayers = proj.layers.map((l) => (l.id === proj.activeLayerId ? { ...l, builtTheme: theme } : l));
      writeBigProject({ ...proj, layers: nextLayers });
      setBigRevision((r) => r + 1);
      if (openStudio) handleTabChange("big");
    }
  };

  const handleConfigChange = (updater: (prev: ThemeConfig) => ThemeConfig) => {
    // Continuous live updates without spamming history
    updateActiveLayer((l) => ({ ...l, config: updater(l.config) }), "Adjusted appearance settings", false);
    window.dispatchEvent(new Event("mpo_layers_updated"));
  };

  const handleCssChange = (newCss: string) => {
    updateActiveLayer((l) => ({ ...l, customCss: newCss }), "Edited custom CSS", true);
    window.dispatchEvent(new Event("mpo_layers_updated"));
  };

  const [isOverlayActive, setIsOverlayActive] = useState(false);

  useEffect(() => {
    if (isTauri) {
      const syncOverlayVisibility = async () => {
        try {
          const { invoke } = await import("@tauri-apps/api/core");
          const visible = await invoke<boolean>("is_desktop_overlay_visible");
          setIsOverlayActive(Boolean(visible));
        } catch {}
      };

      // Initial query
      syncOverlayVisibility();

      // Poll periodically (1s) to guarantee navbar toggle is always in sync with OS state
      const interval = setInterval(syncOverlayVisibility, 1000);
      window.addEventListener("focus", syncOverlayVisibility);

      let unlistenFn: (() => void) | null = null;
      import("@tauri-apps/api/event").then(({ listen }) => {
        listen<boolean>("overlay-visibility-changed", (event) => {
          setIsOverlayActive(event.payload);
        }).then((fn) => {
          unlistenFn = fn;
        });
      });

      return () => {
        clearInterval(interval);
        window.removeEventListener("focus", syncOverlayVisibility);
        if (unlistenFn) unlistenFn();
      };
    }
  }, [isTauri]);

  const browserPopupRef = useRef<Window | null>(null);

  const handleToggleOverlay = async () => {
    if (isTauri) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const next = await invoke<boolean>("toggle_desktop_overlay");
        setIsOverlayActive(next);
      } catch (e) {
        console.error("Failed to toggle overlay:", e);
      }
    } else {
      if (browserPopupRef.current && !browserPopupRef.current.closed) {
        browserPopupRef.current.close();
        browserPopupRef.current = null;
        setIsOverlayActive(false);
      } else {
        const popup = window.open(`/?layer=${activeLayerId}`, "_blank", "width=640,height=220");
        browserPopupRef.current = popup;
        setIsOverlayActive(Boolean(popup));
        if (popup) {
          const pollTimer = setInterval(() => {
            if (popup.closed) {
              setIsOverlayActive(false);
              browserPopupRef.current = null;
              clearInterval(pollTimer);
            }
          }, 600);
        }
      }
    }
  };

  const handleOpenLayerBrowser = () => {
    handleTabChange(activeTab === "tiktok" ? "tiktok" : "studio");
    setLeftPanelTab("layers");
    if (!showLeftPanel) setShowLeftPanel(true);
  };

  const handleExportJson = () => {
    const jsonStr = exportLayersJson();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mpo-layers-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePerformImport = () => {
    if (!importJsonText.trim()) return;
    const success = importLayersJson(importJsonText);
    if (success) {
      setImportFeedback("Layers imported successfully!");
      setTimeout(() => {
        setImportFeedback(null);
        setIsImportModalOpen(false);
        setImportJsonText("");
      }, 1200);
    } else {
      setImportFeedback("Invalid JSON structure. Please check and try again.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportJsonText(content);
        const success = importLayersJson(content);
        if (success) {
          setImportFeedback("Imported JSON file successfully!");
          setTimeout(() => {
            setImportFeedback(null);
            setIsImportModalOpen(false);
            setImportJsonText("");
          }, 1200);
        } else {
          setImportFeedback("Invalid file content. Please verify your .json file.");
        }
      }
    };
    reader.readAsText(file);
  };

  const isPlaying = media.status === "Playing";

  return (
    <div className="dashboard-root">
      {/* Top Application Header - Clean & Focused */}
      <header className="dashboard-header">
        <div className="brand-group">
          <MpoLogo size={32} />
          <div className="brand-title">
            MPO <span className="brand-pro">STUDIO</span> <span className="version-pill">v{appVersion}</span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="header-context"><span>WORKSPACE</span><strong>{({big: "Big Studio", home: "Overview", "my-themes": "My Themes", builder: "Theme Builder", "sdk-docs": "SDK Docs & API", studio: "Overlay studio", tiktok: "TikTok studio", "desktop-hud": "Desktop overlay", streaming: "Streaming", css: "Custom CSS", system: "Settings"} as const)[activeTab]}</strong></div><div className="header-actions">
          {saveError && <span className="beta-save-error" role="status" title="Your edits remain in this browser. Check the local service, then make another edit to retry syncing.">Sync unavailable</span>}
          {/* Untitled UI Layer Select Dropdown */}
          {activeTab !== "desktop-hud" && activeTab !== "big" && activeTab !== "my-themes" && activeTab !== "builder" && activeTab !== "sdk-docs" && <LayerSelectDropdown
            layers={studioLayers}
            activeLayerId={activeLayerId}
            onSelectLayer={setActiveLayerId}
            onCreateLayer={createStudioLayer}
            onDuplicateLayer={duplicateLayer}
            onDeleteLayer={deleteStudioLayer}
            onOpenHistoryDrawer={() => setIsHistoryDrawerOpen(true)}
            onOpenImportModal={() => setIsImportModalOpen(true)}
            onExportJson={handleExportJson}
            onOpenLayerBrowser={handleOpenLayerBrowser}
            historyCount={history.length}
          />}

          {activeTab === "desktop-hud" && <label className="header-desktop-switch"><span>Desktop layer</span><select aria-label="Switch desktop layer" value={activeDesktopLayerId} onChange={event=>setActiveDesktopLayerId(event.target.value)}>{desktopLayers.map(layer=><option key={layer.id} value={layer.id}>{layer.name}</option>)}</select></label>}
          {/* Version History Drawer Trigger */}
          {activeTab !== "desktop-hud" && <button
            onClick={() => setIsHistoryDrawerOpen(true)}
            className="hdr-icon-btn"
            title="Open version history" aria-label="Open version history"
          >
            <HistoryIcon size={15} />
          </button>}
        </div>
      </header>

      {/* Main Body */}
      <div className="dashboard-body">
        <nav className="dashboard-sidebar fixed-rail" aria-label="Main navigation">
          <div className="nav-section-label">WORKSPACE</div>
          {([
            ["home", "Overview", Home], ["studio", "Overlay studio", Palette], ["tiktok", "TikTok studio", Smartphone], ["desktop-hud", "Desktop overlay", AppWindow],
            ["big", "Big Studio", Monitor], ["streaming", "Streaming", Tv]
          ] as const).map(([tab, label, Icon]) => (
            <button key={tab} onClick={() => handleTabChange(tab)} className={`workspace-nav-item ${activeTab === tab ? "active" : ""}`} aria-current={activeTab === tab ? "page" : undefined} title={label}>
              <Icon size={18} /><span>{label}</span>{activeTab === tab && <i />}
            </button>
          ))}

          <div className="nav-section-label" style={{ marginTop: 14 }}>THEMES &amp; SDK</div>
          <button onClick={() => handleTabChange("my-themes")} className={`workspace-nav-item ${activeTab === "my-themes" ? "active" : ""}`} title="My Themes">
            <Sparkles size={18} /><span>My Themes</span>{activeTab === "my-themes" && <i />}
          </button>
          <button onClick={() => handleTabChange("builder")} className={`workspace-nav-item ${activeTab === "builder" ? "active" : ""}`} style={{ paddingLeft: 22 }} title="Theme Builder">
            <Wand2 size={16} /><span>Theme Builder</span>{activeTab === "builder" && <i />}
          </button>
          <button onClick={() => handleTabChange("sdk-docs")} className={`workspace-nav-item ${activeTab === "sdk-docs" ? "active" : ""}`} style={{ paddingLeft: 22 }} title="SDK Docs & API">
            <BookOpen size={16} /><span>SDK Docs &amp; API</span>{activeTab === "sdk-docs" && <i />}
          </button>

          <div className="nav-section-label" style={{ marginTop: 14 }}>PREFERENCES</div>
          <button onClick={() => handleTabChange("system")} className={`workspace-nav-item ${activeTab === "system" ? "active" : ""}`} title="Settings">
            <Settings size={18} /><span>Settings</span>{activeTab === "system" && <i />}
          </button>

          <div className="nav-spacer" />
          <div className="nav-session"><span className={`nav-session-dot ${isConnected ? "playing" : ""}`} /><div><strong>{isConnected ? "Media service connected" : "Media service offline"}</strong><small>{isConnected ? (isPlaying ? media.title : "Waiting for playback") : "Open MPO-pro to connect"}</small></div></div>
        </nav>

        {/* Tab Content View */}
        <main className={`dashboard-content ${activeTab === "studio" || activeTab === "tiktok" || activeTab === "desktop-hud" || activeTab === "big" || activeTab === "my-themes" || activeTab === "builder" || activeTab === "sdk-docs" ? "studio-mode" : ""}`}>
          {activeTab === "my-themes" && (
            <MyThemesPage
              media={media}
              artUrl={artUrl}
              routedStudios={routedStudios}
              onRouteToStudio={handleRouteToStudio}
              onOpenBuilder={() => handleTabChange("builder")}
            />
          )}
          {activeTab === "builder" && (
            <ThemeBuilderPage
              media={media}
              artUrl={artUrl}
              routedStudios={routedStudios}
              onRouteToStudio={handleRouteToStudio}
            />
          )}
          {activeTab === "sdk-docs" && (
            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
              <SdkDocsExplorer
                onUseTemplate={(bundle) => {
                  handleRouteToStudio(bundleToThemeDefinition(bundle), "obs", true);
                }}
              />
            </div>
          )}
          {activeTab === "home" && (
            <div className="new-home"><div className="new-home-inner">
              <div className="new-eyebrow"><span /> YOUR CREATIVE CONTROL ROOM</div>
              <div className="new-intro"><div><h1>Make your music<br /><em>part of the moment.</em></h1><p>Design a beautiful now-playing overlay for your desktop or your next live stream.</p></div><div className="new-intro-tag"><Sparkles size={16} /> MADE FOR YOUR MOMENT</div></div>
              <div className="new-grid"><section className="new-feature"><div className="new-card-top"><span>01 / CREATE</span><Palette size={19} /></div><h2>Your overlay,<br />your style.</h2><p>Choose a theme, fine-tune the details, and see every change in the studio.</p><button onClick={() => handleTabChange("studio")}>Open overlay studio <ArrowRight size={16} /></button><div className="new-art" aria-hidden="true"><div className="new-art-cover"><span>♫</span></div><div><small>NOW PLAYING</small><strong>Sound in motion</strong><span>Your overlay, your way</span><div className="new-art-line"><i /></div></div></div></section>
              <div className="new-side"><section className="new-status"><div className="new-card-top"><span>PLAYBACK</span><Radio size={18} /></div><div className="new-status-label"><span className={isPlaying ? 'live' : ''} />{!isConnected ? 'Media service offline' : isPlaying ? 'Playing' : media.status === 'Paused' ? 'Paused' : 'Waiting for playback'}</div><h3>{!isConnected ? 'Connect your media service' : isPlaying || media.status === 'Paused' ? media.title : 'Your music belongs here'}</h3><p>{!isConnected ? 'Start the MPO-pro desktop app to receive live playback.' : isPlaying || media.status === 'Paused' ? `${media.artist || 'Unknown artist'} · ${media.app_name || 'Media source'}` : 'Start a supported player to see its track information.'}</p><button className="new-text-button" onClick={() => handleTabChange('system')}>Manage sources <ArrowRight size={14} /></button></section>
              <section className="new-quick"><div className="new-card-top"><span>QUICK START</span><span>02 / 03</span></div><button onClick={() => handleTabChange('desktop-hud')}><span className="new-icon"><Monitor size={19} /></span><span><strong>Desktop overlay</strong><small>Keep music in view while you play</small></span><ArrowRight size={17} /></button><button onClick={() => handleTabChange('tiktok')}><span className="new-icon purple"><Smartphone size={19} /></span><span><strong>TikTok studio</strong><small>Design a vertical overlay</small></span><ArrowRight size={17} /></button></section></div></div>
              <div className="new-bottom"><div><strong>Ready when you are.</strong><span>Build once, make it yours everywhere.</span></div><button onClick={() => handleTabChange('streaming')}>Explore streaming setup <ArrowRight size={15} /></button></div>
            </div></div>
          )}
          {(activeTab === "studio" || activeTab === "tiktok") && studioFormat && activeLayer.format === studioFormat && (
            <OverlayStudio
              key={studioFormat}
              currentTheme={activeLayer.themeId}
              onThemeSelect={handleThemeSelect}
              config={activeLayer.config}
              onConfigChange={handleConfigChange}
              onCommitHistory={commitActiveLayer}
              media={media}
              artUrl={artUrl}
              customCss={activeLayer.customCss}
              format={activeLayer.format}
              extractedColor={extractedColor}
              layers={studioLayers}
              activeLayerId={activeLayerId}
              onSelectLayer={setActiveLayerId}
              onCreateLayer={createStudioLayer}
              onDuplicateLayer={duplicateLayer}
              onDeleteLayer={deleteStudioLayer}
              onRenameLayer={renameLayer}
              leftPanelTab={leftPanelTab}
              onSetLeftPanelTab={setLeftPanelTab}
              showLeftPanel={showLeftPanel}
              onToggleLeftPanel={handleToggleLeftPanel}
              onOpenCssReference={() => setIsCssModalOpen(true)}
              onCustomCssChange={handleCssChange}
              onUpdateBuiltTheme={handleUpdateActiveBuiltTheme}
              onOpenBuilder={() => handleTabChange("builder")}
            />
          )}

          {activeTab === "desktop-hud" && (
            <DesktopHudStudio
              desktopLayer={activeDesktopLayer || desktopLayer}
              updateDesktopLayer={updateActiveDesktopLayer}
              desktopLayers={desktopLayers}
              activeDesktopLayerId={activeDesktopLayerId}
              onSelectDesktopLayer={setActiveDesktopLayerId}
              onCreateDesktopLayer={createDesktopLayer}
              onDuplicateDesktopLayer={duplicateDesktopLayer}
              onRenameDesktopLayer={renameDesktopLayer}
              onDeleteDesktopLayer={deleteDesktopLayer}
              media={media}
              artUrl={artUrl}
              extractedColor={extractedColor}
              apiBaseUrl={apiBaseUrl}
              onOpenCssReference={() => setIsCssModalOpen(true)}
            />
          )}

          {activeTab === "big" && <BigStudio media={media} artUrl={artUrl} extractedColor={extractedColor} onOpenCssReference={() => setIsCssModalOpen(true)} />}

          {activeTab === "streaming" && (
            <StreamingHub
              apiBaseUrl={apiBaseUrl}
              layers={layers}
              activeLayerId={activeLayerId}
            />
          )}

          {activeTab === "system" && (
            <SystemSettings layers={layers} activeLayerId={activeLayerId} />
          )}
        </main>
      </div>

      {/* Slim Bottom Line Footer: Currently Playing, Desktop Overlay Status, and Credits */}
      <footer className="dashboard-footer-slim">
        {/* Currently Playing Status with Mini Equalizer */}
        <div className="footer-left-status">
          <div className="footer-now-playing">
            <div className={`footer-eq-bars ${isPlaying ? "playing" : "idle"}`}>
              <span />
              <span />
              <span />
            </div>
            <span className="footer-track-info">
              {media.title
                ? `${media.app_name || "Media"} • ${media.title}${media.artist ? ` — ${media.artist}` : ""}`
                : "Awaiting Audio Stream"}
            </span>
          </div>
        </div>

        {/* Desktop Overlay Status Toggle */}
        <div className="footer-center-overlay">
          <button
            type="button"
            onClick={handleToggleOverlay}
            className={`footer-overlay-toggle ${isOverlayActive ? "active" : ""}`}
            title="Toggle Desktop Overlay (Ctrl + Shift + O • Lock/Move with Ctrl + Shift + L)"
          >
            <span className={`footer-dot ${isOverlayActive ? "pulse" : ""}`} />
            <span>Desktop Overlay: {isOverlayActive ? "ON" : "OFF"}</span>
          </button>
        </div>

        {/* Credits & Official Links */}
        <div className="footer-right-credits">
          <a
            href="https://jadaan.dev"
            target="_blank"
            rel="noreferrer"
            className="footer-author-pill"
            title="Visit Developer Hub (Jadaan.Dev)"
          >
            By Jadaan.Dev
          </a>

          <a
            href="https://mpopro.notion.site/"
            target="_blank"
            rel="noreferrer"
            className="footer-link"
            title="Official Website (mpopro.notion.site)"
          >
            <Globe size={11} color="#38bdf8" />
            <span>Website</span>
          </a>

          <a
            href="https://t.me/mpo_pro"
            target="_blank"
            rel="noreferrer"
            className="footer-link"
            title="Telegram Channel for Updates & Feedback (t.me/mpo_pro)"
          >
            <Send size={11} color="#22d3ee" />
            <span>Telegram</span>
          </a>
        </div>
        <span className="footer-version" aria-label={`MPO-pro version ${appVersion}`}>v{appVersion}</span>
      </footer>

      {/* Version History Right Slide-over Drawer */}
      <HistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        history={history}
        historyIndex={historyIndex}
        onRevertToHistory={revertToHistory}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      {/* CSS Reference & LLM Documentation Modal */}
      <CssReferenceModal
        isOpen={isCssModalOpen}
        onClose={() => setIsCssModalOpen(false)}
      />

      {/* Import JSON Modal */}
      {isImportModalOpen && (
        <div className="import-modal-backdrop" onClick={() => setIsImportModalOpen(false)}>
          <div className="import-modal-card v4" onClick={(e) => e.stopPropagation()}>
            <div className="import-modal-header">
              <span className="import-modal-title">Import Layers Workspace</span>
              <button 
                onClick={() => setIsImportModalOpen(false)}
                className="import-close-btn"
              >
                ×
              </button>
            </div>

            <div className="import-dual-container">
              {/* Method 1: Dropzone File Upload */}
              <div className="import-method-card">
                <label className="import-dropzone">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden-file-input"
                  />
                  <div className="dropzone-inner">
                    <span className="dropzone-text">Click to browse or drop your .json file here</span>
                  </div>
                </label>
              </div>

              <div className="import-divider-tag">OR</div>

              {/* Method 2: Paste Raw JSON */}
              <div className="import-method-card">
                <textarea
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder='Paste JSON here: {"layers":[...]}'
                  className="import-textarea"
                  rows={6}
                />
                <button
                  onClick={handlePerformImport}
                  className="import-submit-btn"
                  disabled={!importJsonText.trim()}
                >
                  Import Pasted JSON
                </button>
              </div>
            </div>

            {importFeedback && (
              <div className="import-feedback-banner">
                {importFeedback}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudioDashboard;
