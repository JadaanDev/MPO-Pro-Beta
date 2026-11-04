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
