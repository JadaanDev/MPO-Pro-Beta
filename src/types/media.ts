export type PlaybackStatus = 'Playing' | 'Paused' | 'Stopped' | 'Closed' | 'Buffering';

export interface MediaTimeline {
  raw_observation?: { position_ms: number | null; start_ms: number | null; end_ms: number | null; min_seek_ms: number | null; max_seek_ms: number | null; updated_ticks: number | null } | null;
  observed_position_ms: number | null;
  observed_at_ms: number | null;
  received_at_ms: number;
  position_valid: boolean;
  duration_known: boolean;
  origin: 'observed' | 'estimated' | 'unavailable';
  kind: 'finite' | 'live' | 'unknown';
  source_start_ms?: number | null;
  start_ms: number | null;
  end_ms: number | null;
  min_seek_ms: number | null;
  max_seek_ms: number | null;
  uncertainty_ms: number;
  advancing: boolean;
}

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
  source_id?: string;
  source_generation?: number;
  sequence?: number;
  stream_id?: string;
  playback_rate?: number;
  playback_rate_known?: boolean;
  timeline?: MediaTimeline;
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
