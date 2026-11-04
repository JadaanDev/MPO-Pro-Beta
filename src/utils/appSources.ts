import { MediaState } from "../types/media";

export type MediaAppSourceCategory = "music" | "browser" | "player" | "communication" | "custom";

export interface CategoryMeta {
  id: MediaAppSourceCategory;
  name: string;
  description: string;
  icon: string;
}

export const CATEGORY_DEFINITIONS: Record<MediaAppSourceCategory, CategoryMeta> = {
  music: {
    id: "music",
    name: "Music Streaming",
    description: "Dedicated audio streaming services & desktop music libraries",
    icon: "music",
  },
  browser: {
    id: "browser",
    name: "Web Browsers",
    description: "Web browsers playing YouTube, Twitch, SoundCloud, or online media",
    icon: "globe",
  },
  player: {
    id: "player",
    name: "Desktop Media Players",
    description: "Desktop media players, video players & local playback engines",
    icon: "play-circle",
  },
  communication: {
    id: "communication",
    name: "Communication & Voice",
    description: "Voice chat, gaming clients, and messaging apps with media integration",
    icon: "message-square",
  },
  custom: {
    id: "custom",
    name: "Custom Added Players",
    description: "User-defined executables and custom audio processes",
    icon: "sliders",
  },
};

export interface MediaAppSource {
  id: string;
  matchRule: string; // Substring or process name to match against incoming app_name
  displayName: string; // User-customizable display name
  enabled: boolean; // Show (true) or Hide (false) on MPO
  isCustom?: boolean; // User-added custom executable
  lastSeen?: number; // Timestamp when last detected active
  category: MediaAppSourceCategory;
}

export const DEFAULT_APP_SOURCES: MediaAppSource[] = [
  // Music Streaming
  {
    id: "spotify",
    matchRule: "spotify",
    displayName: "Spotify",
    enabled: true,
    category: "music",
  },
  {
    id: "apple-music",
    matchRule: "apple",
    displayName: "Apple Music",
    enabled: true,
    category: "music",
  },
  {
    id: "tidal",
    matchRule: "tidal",
    displayName: "TIDAL",
    enabled: true,
    category: "music",
  },
  {
    id: "amazon-music",
    matchRule: "amazon",
    displayName: "Amazon Music",
    enabled: true,
    category: "music",
  },
  {
    id: "itunes",
    matchRule: "itunes",
    displayName: "iTunes",
    enabled: true,
    category: "music",
  },
  {
    id: "deezer",
    matchRule: "deezer",
    displayName: "Deezer",
    enabled: true,
    category: "music",
  },
  {
    id: "cider",
    matchRule: "cider",
    displayName: "Cider Player",
    enabled: true,
    category: "music",
  },
  {
    id: "youtube-music",
    matchRule: "youtube",
    displayName: "YouTube Music",
    enabled: true,
    category: "music",
  },

  // Web Browsers
  {
    id: "chrome",
    matchRule: "chrome",
    displayName: "Google Chrome",
    enabled: true,
    category: "browser",
  },
  {
    id: "edge",
    matchRule: "msedge",
    displayName: "Microsoft Edge",
    enabled: true,
    category: "browser",
  },
  {
    id: "firefox",
    matchRule: "firefox",
    displayName: "Mozilla Firefox",
    enabled: true,
    category: "browser",
  },
  {
    id: "brave",
    matchRule: "brave",
    displayName: "Brave Browser",
    enabled: true,
    category: "browser",
  },
  {
    id: "opera",
    matchRule: "opera",
    displayName: "Opera Browser",
    enabled: true,
    category: "browser",
  },
  {
    id: "vivaldi",
    matchRule: "vivaldi",
    displayName: "Vivaldi Browser",
    enabled: true,
    category: "browser",
  },
  {
    id: "zen",
    matchRule: "zen",
    displayName: "Zen Browser",
    enabled: true,
    category: "browser",
  },

  // Media & Video Players
  {
    id: "vlc",
    matchRule: "vlc",
    displayName: "VLC Media Player",
    enabled: true,
    category: "player",
  },
  {
    id: "foobar2000",
    matchRule: "foobar",
    displayName: "Foobar2000",
    enabled: true,
    category: "player",
  },
  {
    id: "aimp",
    matchRule: "aimp",
    displayName: "AIMP Player",
    enabled: true,
    category: "player",
  },
  {
    id: "musicbee",
    matchRule: "musicbee",
    displayName: "MusicBee",
    enabled: true,
    category: "player",
  },
  {
    id: "wmplayer",
    matchRule: "mediaplayer",
    displayName: "Windows Media Player",
    enabled: true,
    category: "player",
  },
  {
    id: "potplayer",
    matchRule: "potplayer",
    displayName: "PotPlayer",
    enabled: true,
    category: "player",
  },
  {
    id: "mpv",
    matchRule: "mpv",
    displayName: "MPV Player",
    enabled: true,
    category: "player",
  },

  // Communication
  {
    id: "discord",
    matchRule: "discord",
    displayName: "Discord",
    enabled: true,
    category: "communication",
  },
  {
    id: "telegram",
    matchRule: "telegram",
    displayName: "Telegram",
    enabled: true,
    category: "communication",
  },
];

const STORAGE_KEY = "mpo_app_sources_config";

/**
 * Retrieve current configured app sources from localStorage.
 * If empty or corrupt, seeds with DEFAULT_APP_SOURCES.
 */
export function getAppSources(): MediaAppSource[] {
  if (typeof window === "undefined") return DEFAULT_APP_SOURCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Failed to load app sources from localStorage:", err);
  }
  // Initialize default
  saveAppSources(DEFAULT_APP_SOURCES);
  return DEFAULT_APP_SOURCES;
}

/**
 * Persist app sources to localStorage and broadcast change event to all tabs/windows.
 * Also synchronizes active allowed/denied rules with the Rust backend.
 */
export function saveAppSources(sources: MediaAppSource[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
    window.dispatchEvent(new CustomEvent("mpo_app_sources_updated", { detail: sources }));
    syncAppSourcesWithBackend(sources);
  } catch (err) {
    console.error("Failed to save app sources:", err);
  }
}

/**
 * Synchronize allowed app match rules with the Rust GSMTC backend
 */
export function syncAppSourcesWithBackend(sources: MediaAppSource[]): void {
  if (typeof window === "undefined") return;

  const rules = sources.map((s) => ({
    id: s.id,
    match_rule: s.matchRule.toLowerCase(),
    display_name: s.displayName,
    enabled: s.enabled,
    category: s.category,
  }));

  // 1. If running in native Tauri, invoke Tauri command
  if ((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) {
    import("@tauri-apps/api/core")
      .then(({ invoke }) => {
        invoke("set_app_filter_rules", { rules }).catch(() => {});
      })
      .catch(() => {});
    return; // The command updates the same backend state and file as the HTTP route.
  }

  // 2. HTTP POST to local API server for OBS/web synchronization
  try {
    const base = window.location.port === "4849" || window.location.hostname === "mpobeta.local"
      ? `${window.location.protocol}//${window.location.host}`
      : "http://127.0.0.1:4849";

    fetch(`${base}/api/app-sources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rules),
    }).catch(() => {});
  } catch {}
}

/**
 * Update a specific app source (e.g. displayName, enabled) and auto-save immediately.
 */
export function updateAppSource(id: string, updates: Partial<MediaAppSource>): MediaAppSource[] {
  const current = getAppSources();
  const next = current.map((item) => {
    if (item.id === id) {
      return { ...item, ...updates };
    }
    return item;
  });
  saveAppSources(next);
  return next;
}

/**
 * Toggle an entire category of applications (Allow All or Deny All in category).
 */
export function toggleCategory(category: MediaAppSourceCategory, enabled: boolean): MediaAppSource[] {
  const current = getAppSources();
  const next = current.map((item) => {
    if (item.category === category) {
      return { ...item, enabled };
    }
    return item;
  });
  saveAppSources(next);
  return next;
}

/**
 * Preset: Music Only Mode (Allow all music apps, Deny all browsers, players, and communication)
 */
export function applyMusicOnlyPreset(): MediaAppSource[] {
  const current = getAppSources();
  const next = current.map((item) => {
    if (item.category === "music") {
      return { ...item, enabled: true };
    }
    return { ...item, enabled: false };
  });
  saveAppSources(next);
  return next;
}

/**
 * Preset: Deny All Browsers (Block Chrome, Edge, Firefox, Brave, Opera, etc.)
 */
export function denyAllBrowsersPreset(): MediaAppSource[] {
  return toggleCategory("browser", false);
}

/**
 * Master Toggle: Allow or Deny all app sources globally
 */
export function toggleAllSources(enabled: boolean): MediaAppSource[] {
  const current = getAppSources();
  const next = current.map((item) => ({ ...item, enabled }));
  saveAppSources(next);
  return next;
}

/**
 * Add a new custom app player source.
 */
export function addCustomAppSource(
  nameOrProcess: string,
  displayName?: string,
  category: MediaAppSourceCategory = "custom"
): MediaAppSource[] {
  const trimmed = nameOrProcess.trim();
  if (!trimmed) return getAppSources();

  const id = "custom-" + trimmed.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + Date.now().toString(36);
  const newSource: MediaAppSource = {
    id,
    matchRule: trimmed.toLowerCase().replace(/\.exe$/i, ""),
    displayName: displayName?.trim() || trimmed.replace(/\.exe$/i, ""),
    enabled: true,
    isCustom: true,
    category,
    lastSeen: Date.now(),
  };

  const current = getAppSources();
  const next = [newSource, ...current];
  saveAppSources(next);
  return next;
}

/**
 * Delete a custom source.
 */
export function removeAppSource(id: string): MediaAppSource[] {
  const current = getAppSources();
  const next = current.filter((item) => item.id !== id);
  saveAppSources(next);
  return next;
}

/**
 * Reset sources back to system defaults.
 */
export function resetAppSourcesToDefault(): MediaAppSource[] {
  saveAppSources(DEFAULT_APP_SOURCES);
  return DEFAULT_APP_SOURCES;
}

/**
 * Find the best matching AppSource for an incoming raw app_name string.
 */
export function findMatchingAppSource(rawAppName: string, sources: MediaAppSource[]): MediaAppSource | null {
  if (!rawAppName) return null;
  const lower = rawAppName.toLowerCase().trim();

  // 1. Exact match on matchRule
  const exact = sources.find((s) => s.matchRule.toLowerCase() === lower);
  if (exact) return exact;

  // 2. Substring match
  const sub = sources.find((s) => lower.includes(s.matchRule.toLowerCase()) || s.matchRule.toLowerCase().includes(lower));
  if (sub) return sub;

  // 3. Match on displayName
  const displayMatch = sources.find((s) => s.displayName.toLowerCase() === lower);
  if (displayMatch) return displayMatch;

  return null;
}

/**
 * Process an incoming MediaState:
 * 1. Discover unknown active audio/music apps and auto-register them
 * 2. If app is marked hidden (enabled: false), suppresses the track so overlay is clean
 * 3. Replaces app_name with the user's custom displayName
 */
export function applyAppSourceFilter(incoming: MediaState): { media: MediaState; isSuppressed: boolean } {
  if (!incoming.app_name || !incoming.app_name.trim()) {
    return { media: incoming, isSuppressed: false };
  }

  const sources = getAppSources();
  const matched = findMatchingAppSource(incoming.app_name, sources);

  if (matched) {
    // If user disabled/hid this app
    if (!matched.enabled) {
      return {
        media: {
          ...incoming,
          status: "Paused",
          title: "",
          artist: "",
          has_art: false,
        },
        isSuppressed: true,
      };
    }

    // App is enabled, update lastSeen and rename to user's configured displayName
    matched.lastSeen = Date.now();
    return {
      media: {
        ...incoming,
        app_name: matched.displayName,
      },
      isSuppressed: false,
    };
  }

  // Auto-discovery: A new app playing audio was detected!
  // Register it into the list as enabled so the user can immediately see and customize it in Settings.
  const rawClean = incoming.app_name.trim();
  const slug = rawClean.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const newDiscovered: MediaAppSource = {
    id: `discovered-${slug}`,
    matchRule: rawClean.toLowerCase(),
    displayName: rawClean,
    enabled: true,
    isCustom: false,
    category: "player",
    lastSeen: Date.now(),
  };

  const updatedSources = [...sources, newDiscovered];
  saveAppSources(updatedSources);

  return { media: incoming, isSuppressed: false };
}
