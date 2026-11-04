export type PlaybackStatus = 'Playing' | 'Paused' | 'Stopped' | 'Closed';

export type ThemeType = 'glass-obsidian' | 'cyber-neon' | 'streamer-capsule' | 'vinyl-grooves';

export interface MediaState {
  title: string;
  artist: string;
  album_title: string;
  status: PlaybackStatus;
  position_ms: number;
  duration_ms: number;
  app_name: string;
  art_timestamp: number;
  has_art: boolean;
  updated_at: number;
}

export interface OverlayConfig {
  theme: ThemeType;
  scale: number;
  showProgress: boolean;
  showAppBadge: boolean;
  isEditMode: boolean;
}

export const DEFAULT_MEDIA_STATE: MediaState = {
  title: "Awaiting Media Source",
  artist: "Start playback on Spotify, Chrome, etc.",
  album_title: "Windows GSMTC Telemetry",
  status: "Stopped",
  position_ms: 0,
  duration_ms: 0,
  app_name: "MPO-pro",
  art_timestamp: 0,
  has_art: false,
  updated_at: Date.now(),
};

export const MOCK_MEDIA_STATE: MediaState = {
  title: "Midnight City",
  artist: "M83",
  album_title: "Hurry Up, We're Dreaming",
  status: "Playing",
  position_ms: 64000,
  duration_ms: 243000,
  app_name: "Spotify",
  art_timestamp: Date.now(),
  has_art: true,
  updated_at: Date.now(),
};
