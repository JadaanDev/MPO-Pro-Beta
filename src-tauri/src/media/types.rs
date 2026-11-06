use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct MediaState {
    pub title: String,
    pub artist: String,
    pub album_title: String,
    pub status: String,
    pub position_ms: i64,
    pub duration_ms: i64,
    pub app_name: String,
    pub art_timestamp: i64,
    pub has_art: bool,
    pub updated_at: i64,
    #[serde(default)]
    pub source_id: String,
    #[serde(default)]
    pub source_generation: u64,
    #[serde(default)]
    pub sequence: u64,
    #[serde(default)]
    pub stream_id: String,
    #[serde(default = "default_rate")]
    pub playback_rate: f64,
    #[serde(default)]
    pub playback_rate_known: bool,
    #[serde(default)]
    pub timeline: TimelineState,
}

fn default_rate() -> f64 {
    1.0
}

/// Unmodified GSMTC tuple, including invalid/missing fields, for diagnosis.
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct TimelineObservation {
    pub position_ms: Option<i64>,
    pub start_ms: Option<i64>,
    pub end_ms: Option<i64>,
    pub min_seek_ms: Option<i64>,
    pub max_seek_ms: Option<i64>,
    pub updated_ticks: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TimelineState {
    pub raw_observation: Option<TimelineObservation>,
    pub observed_position_ms: Option<i64>,
    pub observed_at_ms: Option<i64>,
    pub received_at_ms: i64,
    pub position_valid: bool,
    pub duration_known: bool,
    pub origin: String,
    pub kind: String,
    pub source_start_ms: Option<i64>,
    pub start_ms: Option<i64>,
    pub end_ms: Option<i64>,
    pub min_seek_ms: Option<i64>,
    pub max_seek_ms: Option<i64>,
    pub uncertainty_ms: u64,
    pub advancing: bool,
}

impl Default for TimelineState {
    fn default() -> Self {
        Self {
            raw_observation: None,
            observed_position_ms: None,
            observed_at_ms: None,
            received_at_ms: 0,
            position_valid: false,
            duration_known: false,
            origin: "unavailable".into(),
            kind: "unknown".into(),
            source_start_ms: None,
            start_ms: None,
            end_ms: None,
            min_seek_ms: None,
            max_seek_ms: None,
            uncertainty_ms: 0,
            advancing: false,
        }
    }
}

impl Default for MediaState {
    fn default() -> Self {
        Self {
            title: "Awaiting Media Source".to_string(),
            artist: "Start playback on Spotify, Chrome, etc.".to_string(),
            album_title: "Windows GSMTC Telemetry".to_string(),
            status: "Stopped".to_string(),
            position_ms: 0,
            duration_ms: 0,
            app_name: "MPO-pro-beta".to_string(),
            art_timestamp: 0,
            has_art: false,
            updated_at: 0,
            source_id: String::new(),
            source_generation: 0,
            sequence: 0,
            stream_id: String::new(),
            playback_rate: 1.0,
            playback_rate_known: false,
            timeline: TimelineState::default(),
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct MediaControlPayload {
    pub action: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AppFilterRule {
    pub id: String,
    pub match_rule: String,
    pub display_name: String,
    pub enabled: bool,
    #[serde(default)]
    pub category: String,
}
