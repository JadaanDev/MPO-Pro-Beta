import React, { useState, useEffect } from "react";
import { Layer } from "../../types/layers";
import { isTauriEnvironment } from "../../hooks/useMediaState";
import { MediaAppSource, getAppSources } from "../../utils/appSources";
import { SettingsHeader, SettingsTabId } from "./settings/SettingsHeader";
import { SettingsTabFeeds } from "./settings/tabs/SettingsTabFeeds";
import { SettingsTabPlayers } from "./settings/tabs/SettingsTabPlayers";
import { SettingsTabHotkeys } from "./settings/tabs/SettingsTabHotkeys";
import { SettingsTabSystem } from "./settings/tabs/SettingsTabSystem";
import { SettingsTabAbout } from "./settings/tabs/SettingsTabAbout";

interface SystemSettingsProps {
  layers?: Layer[];
  activeLayerId?: string;
}

const SETTINGS_TAB_STORAGE_KEY = "mpo_settings_active_tab_v1";

export const SystemSettings: React.FC<SystemSettingsProps> = ({
  layers = [],
  activeLayerId,
}) => {
  const isTauri = isTauriEnvironment();

  // Active Tab State with persistence
  const [activeTab, setActiveTab] = useState<SettingsTabId>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_TAB_STORAGE_KEY) as SettingsTabId;
      if (saved && ["feeds", "players", "hotkeys", "system", "about"].includes(saved)) {
        return saved;
      }
    } catch {}
    return "feeds";
  });

  const handleSelectTab = (tab: SettingsTabId) => {
    setActiveTab(tab);
    try {
      localStorage.setItem(SETTINGS_TAB_STORAGE_KEY, tab);
    } catch {}
  };

  // Host Mode (127.0.0.1 vs mpobeta.local)
  const [urlHostMode, setUrlHostMode] = useState<"ip" | "domain">(() => {
    try {
      return (localStorage.getItem("mpo_preferred_url_host") as "ip" | "domain") || "ip";
    } catch {
      return "ip";
    }
  });

  const handleToggleHostMode = (mode: "ip" | "domain") => {
    setUrlHostMode(mode);
    try {
      localStorage.setItem("mpo_preferred_url_host", mode);
      window.dispatchEvent(new Event("mpo_url_host_changed"));
    } catch {}
  };

  // Windows & Tauri System Integration States
  const [systemError, setSystemError] = useState<string | null>(null);
  const [serviceStatus, setServiceStatus] = useState<{ state: "checking" | "online" | "offline"; version?: string }>({ state: "checking" });
  useEffect(() => {
    if (activeTab !== "system") return;
    let cancelled = false;
    const controller = new AbortController();
    const check = async () => {
      try {
        const response = await fetch("http://127.0.0.1:4849/api/v1/health", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Health check failed");
        const data = await response.json();
        if (!cancelled) setServiceStatus({ state: "online", version: data.version });
      } catch { if (!cancelled) setServiceStatus({ state: "offline" }); }
    };
    check();
    const timer = setInterval(check, 10000);
    return () => { cancelled = true; clearInterval(timer); controller.abort(); };
  }, [activeTab]);
  const [autostart, setAutostart] = useState<boolean>(false);
  const [hostsMapped, setHostsMapped] = useState<boolean>(false);
  const [hudActive, setHudActive] = useState<boolean>(false);
  const [uacMsg, setUacMsg] = useState<string | null>(null);

  const [autoStartHud, setAutoStartHud] = useState<boolean>(() => {
    try {
      return localStorage.getItem("mpo_auto_start_hud") === "true";
    } catch {
      return false;
    }
  });

  const [autoLockHud, setAutoLockHud] = useState<boolean>(() => {
    try {
      return localStorage.getItem("mpo_auto_lock_hud") === "true";
    } catch {
      return false;
    }
  });

  const [fadeOnHoverLocked, setFadeOnHoverLocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem("mpo_hud_fade_on_hover") === "true";
    } catch {
      return false;
    }
  });

  // Global Hotkey State
  const [overlayHotkey, setOverlayHotkey] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("mpo_hotkeys");
      if (saved) return JSON.parse(saved).overlay || "Ctrl+Shift+O";
    } catch {}
    return "Ctrl+Shift+O";
  });

  const [lockHotkey, setLockHotkey] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("mpo_hotkeys");
      if (saved) return JSON.parse(saved).lock || "Ctrl+Shift+L";
    } catch {}
    return "Ctrl+Shift+L";
  });

  // Media App Sources State
  const [appSources, setAppSources] = useState<MediaAppSource[]>(() => getAppSources());

  useEffect(() => {
    if (!isTauri) return;

    import("@tauri-apps/api/core").then(({ invoke }) => {
      invoke<{ overlay: string; lock: string } | null>("get_saved_global_hotkeys")
        .then((saved) => { if (saved) { setOverlayHotkey(saved.overlay); setLockHotkey(saved.lock); } })
        .catch(() => {});
      invoke<boolean>("get_autostart")
        .then(setAutostart)
        .catch(() => {});

      invoke<boolean>("check_hosts_mapping")
        .then(setHostsMapped)
        .catch(() => {});

      invoke<boolean>("is_desktop_overlay_visible")
        .then(setHudActive)
        .catch(() => {});

      invoke<boolean>("get_auto_start_hud")
        .then((val) => setAutoStartHud(Boolean(val)))
        .catch(() => {});

      invoke<boolean>("get_auto_lock_hud")
        .then((val) => setAutoLockHud(Boolean(val)))
        .catch(() => {});


    });

    let cancelled = false;
    const refreshNative = () => {
      import("@tauri-apps/api/core").then(({ invoke }) => {
        invoke<boolean>("get_autostart").then(setAutostart).catch(() => {});
        invoke<boolean>("check_hosts_mapping").then((mapped) => { setHostsMapped(mapped); if (!mapped) handleToggleHostMode("ip"); }).catch(() => {});
        invoke<boolean>("is_desktop_overlay_visible").then(setHudActive).catch(() => {});
      }).catch(() => {});
    };
    window.addEventListener("focus", refreshNative);
    let unlistenVis: (() => void) | null = null;
    import("@tauri-apps/api/event").then(({ listen }) => {
      listen<boolean>("overlay-visibility-changed", (event) => {
        setHudActive(Boolean(event.payload));
      }).then((fn) => { if (cancelled) fn(); else unlistenVis = fn; });


    });

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshNative);
      if (unlistenVis) unlistenVis();
    };
  }, [isTauri]);

  // Sync app sources
  useEffect(() => {
    const handleSourcesUpdate = () => {
      setAppSources(getAppSources());
    };
    window.addEventListener("mpo_app_sources_updated", handleSourcesUpdate);
    return () => window.removeEventListener("mpo_app_sources_updated", handleSourcesUpdate);
  }, []);

  // Hotkey Saver
  const handleSaveHotkeys = async (newOverlay: string, newLock: string) => {
    if (isTauri) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("update_global_hotkeys", { overlay: newOverlay, lock: newLock });
        setSystemError(null);
      } catch (err) {
        setSystemError(`Could not register shortcut: ${String(err)}`);
        return;
      }
    }
    setOverlayHotkey(newOverlay);
    setLockHotkey(newLock);
    try {
      localStorage.setItem("mpo_hotkeys", JSON.stringify({ overlay: newOverlay, lock: newLock }));
      window.dispatchEvent(new Event("mpo_hotkeys_updated"));
    } catch {}

  };

  // Windows Autostart
  const handleToggleAutostart = async (checked: boolean) => {
    if (isTauri) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("set_autostart", { enabled: checked });
        setAutostart(await invoke<boolean>("get_autostart"));
        setSystemError(null);
      } catch (e) {
        setSystemError(`Could not update Windows startup: ${String(e)}`);
      }
    }
  };

  // Toggle HUD Window
  const handleToggleHud = async () => {
    if (isTauri) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const next = await invoke<boolean>("toggle_desktop_overlay");
        setHudActive(Boolean(next));
      } catch (e) {
        setSystemError(`Could not change overlay visibility: ${String(e)}`);
      }
    } else {
      window.open("/?mode=hud", "_blank", "width=640,height=220,resizable=yes");
    }
  };

  // Auto Start HUD
  const handleToggleAutoStartHud = async (checked: boolean) => {
    if (isTauri) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("set_auto_start_hud", { enabled: checked });
        setAutoStartHud(checked);
        localStorage.setItem("mpo_auto_start_hud", String(checked));
        setSystemError(null);
      } catch (e) {
        setSystemError(`Could not save overlay startup: ${String(e)}`);
      }
    }
  };

  // Auto Lock HUD In-Place
  const handleToggleAutoLockHud = async (checked: boolean) => {
    if (isTauri) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("set_auto_lock_hud", { enabled: checked });
        setAutoLockHud(checked);
        localStorage.setItem("mpo_auto_lock_hud", String(checked));
        setSystemError(null);
      } catch (e) {
        setSystemError(`Could not save overlay lock: ${String(e)}`);
      }
    }
  };

  // Ghost Peek Mode
  const handleToggleFadeOnHover = (checked: boolean) => {
    setFadeOnHoverLocked(checked);
    try {
      localStorage.setItem("mpo_hud_fade_on_hover", String(checked));
      window.dispatchEvent(new Event("mpo_hud_fade_on_hover_changed"));
    } catch {}
  };

  // Hosts Activation via UAC
  const handleTriggerUac = async () => {
    if (isTauri) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        setUacMsg("Requesting Windows UAC elevation...");
        const res = await invoke<string>("trigger_hosts_elevation");
        setUacMsg(res);
        const mapped = await invoke<boolean>("check_hosts_mapping");
        setHostsMapped(mapped);
        setTimeout(() => setUacMsg(null), 5000);
      } catch (err: unknown) {
        setUacMsg(`Error: ${String(err)}`);
        setTimeout(() => setUacMsg(null), 5000);
      }
    }
  };

  // Hosts Deactivation
  const handleDeactivateHosts = async () => {
    if (isTauri) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        setUacMsg("Deactivating mpobeta.local in Windows hosts...");
        const res = await invoke<string>("remove_hosts_mapping");
        setUacMsg(res);
        const mapped = await invoke<boolean>("check_hosts_mapping");
        setHostsMapped(mapped);
        if (!mapped) {
          handleToggleHostMode("ip");
        }
        setTimeout(() => setUacMsg(null), 5000);
      } catch (err: unknown) {
        setUacMsg(`Error: ${String(err)}`);
        setTimeout(() => setUacMsg(null), 5000);
      }
    }
  };

  return (
    <div className="settings-dashboard-container">
      {/* Dedicated Settings Header with Tab Switcher */}
      <SettingsHeader
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        layersCount={layers.length}
        urlHostMode={urlHostMode}
        hostsMapped={hostsMapped}
      />

      {/* Active Tab Content Area */}
      <div className="settings-tab-content-area">
        {/* Tab 1: Layer URLs & Streaming Feeds */}
        {activeTab === "feeds" && (
          <SettingsTabFeeds
            layers={layers}
            activeLayerId={activeLayerId}
            urlHostMode={urlHostMode}
            onToggleHostMode={handleToggleHostMode}
            hostsMapped={hostsMapped}
          />
        )}

        {/* Tab 2: Audio Players & Media Sources */}
        {activeTab === "players" && (
          <SettingsTabPlayers
            appSources={appSources}
            onSourcesUpdated={setAppSources}
          />
        )}

        {/* Tab 3: Global Hotkeys Customization */}
        {activeTab === "hotkeys" && (
          <>
          {systemError && <p role="alert" className="big-error">{systemError}</p>}
          <SettingsTabHotkeys
            overlayHotkey={overlayHotkey}
            lockHotkey={lockHotkey}
            onSaveHotkeys={handleSaveHotkeys}
          />
          </>
        )}

        {/* Tab 4: Windows & System Integration */}
        {activeTab === "system" && (
          <SettingsTabSystem
            nativeAvailable={isTauri}
            systemError={systemError}
            serviceStatus={serviceStatus}
            autostart={autostart}
            onToggleAutostart={handleToggleAutostart}
            hudActive={hudActive}
            onToggleHud={handleToggleHud}
            autoStartHud={autoStartHud}
            onToggleAutoStartHud={handleToggleAutoStartHud}
            autoLockHud={autoLockHud}
            onToggleAutoLockHud={handleToggleAutoLockHud}
            fadeOnHoverLocked={fadeOnHoverLocked}
            onToggleFadeOnHover={handleToggleFadeOnHover}
            hostsMapped={hostsMapped}
            onTriggerUac={handleTriggerUac}
            onDeactivateHosts={handleDeactivateHosts}
            uacMsg={uacMsg}
            overlayHotkey={overlayHotkey}
            lockHotkey={lockHotkey}
          />
        )}

        {/* Tab 5: Telemetry & Developer Ecosystem */}
        {activeTab === "about" && (
          <SettingsTabAbout
            overlayHotkey={overlayHotkey}
            lockHotkey={lockHotkey}
          />
        )}
      </div>
    </div>
  );
};

export default SystemSettings;
