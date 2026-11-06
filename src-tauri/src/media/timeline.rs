//! Stateful provider observations and monotonic playback estimates. No OS calls.
pub use super::types::TimelineObservation;
use super::types::TimelineState;

const FILETIME_UNIX_OFFSET: i64 = 116_444_736_000_000_000;
const MAX_MEDIA_MS: i64 = 366 * 24 * 60 * 60 * 1000;
const MAX_INITIAL_AGE_MS: i64 = 5 * 60 * 1000;

#[derive(Clone, Debug, PartialEq)]
struct Sample {
    position: Option<i64>,
    source_start: Option<i64>,
    end: Option<i64>,
    min: Option<i64>,
    max: Option<i64>,
    timestamp: Option<i64>,
}

#[cfg(test)]
mod tests {
    use super::*;
    const WALL: i64 = 1_788_815_206_892;
    fn observation(position: i64, end: Option<i64>, time: Option<i64>) -> TimelineObservation {
        TimelineObservation {
            position_ms: Some(position),
            end_ms: end,
            updated_ticks: time.map(|v| v * 10_000 + FILETIME_UNIX_OFFSET),
            ..Default::default()
        }
    }
    fn tick(
        clock: &mut TimelineClock,
        sample: &TimelineObservation,
        ms: u64,
        status: &str,
        rate: Option<f64>,
    ) -> TimelineSnapshot {
        clock.update(Some(sample.clone()), ms, WALL + ms as i64, status, rate)
    }

    #[test]
    fn unchanged_tuple_advances_five_minutes_without_reanchoring() {
        for stamp in [None, Some(WALL)] {
            let mut clock = TimelineClock::default();
            let sample = observation(20_000, Some(600_000), stamp);
            for ms in (0..=300_000).step_by(1000) {
                let state = tick(&mut clock, &sample, ms, "Playing", Some(1.0));
                assert_eq!(state.position_ms, 20_000 + ms as i64);
                assert_eq!(state.timeline.received_at_ms, WALL);
                assert_eq!(state.timeline.raw_observation.as_ref(), Some(&sample));
            }
        }
    }
    #[test]
    fn invalid_timestamps_and_unknown_bounds_do_not_invent_a_counter() {
        for time in [None, Some(0), Some(WALL + 1_000_000), Some(1000)] {
            let mut clock = TimelineClock::default();
            let state = tick(
                &mut clock,
                &observation(20_000, None, time),
                0,
                "Playing",
                None,
            );
            assert_eq!(state.position_ms, 20_000);
            assert!(state.timeline.position_valid);
            assert!(!state.timeline.duration_known);
            assert_eq!(state.timeline.kind, "unknown");
        }
        let mut clock = TimelineClock::default();
        let missing = observation(0, None, None);
        assert!(
            !tick(&mut clock, &missing, 0, "Playing", None)
                .timeline
                .position_valid
        );
        assert_eq!(
            tick(&mut clock, &missing, 1000, "Playing", None).position_ms,
            0
        );
        assert!(provider_timestamp(Some(i64::MIN), WALL).is_none());
        assert!(provider_timestamp(Some(i64::MAX), WALL).is_none());
    }
    #[test]
    fn stale_pause_resume_and_rate_changes_preserve_position() {
        let mut clock = TimelineClock::default();
        let sample = observation(20_000, Some(600_000), Some(WALL));
        tick(&mut clock, &sample, 0, "Playing", Some(1.0));
        assert_eq!(
            tick(&mut clock, &sample, 5000, "Paused", Some(1.0)).position_ms,
            25_000
        );
        assert_eq!(
            tick(&mut clock, &sample, 10_000, "Paused", Some(1.0)).position_ms,
            25_000
        );
        assert_eq!(
            tick(&mut clock, &sample, 12_000, "Playing", Some(1.0)).position_ms,
            25_000
        );
        assert_eq!(
            tick(&mut clock, &sample, 14_000, "Playing", Some(2.0)).position_ms,
            27_000
        );
        assert_eq!(
            tick(&mut clock, &sample, 16_000, "Playing", Some(2.0)).position_ms,
            31_000
        );
    }
    #[test]
    fn rates_seeks_buffering_and_end_bounds() {
        for rate in [0.5, 1.0, 1.5, 2.0, 4.0] {
            let mut clock = TimelineClock::default();
            let sample = observation(20_000, Some(180_000), Some(WALL));
            tick(&mut clock, &sample, 0, "Playing", Some(rate));
            assert_eq!(
                tick(&mut clock, &sample, 1000, "Playing", Some(rate)).position_ms,
                20_000 + (1000.0 * rate) as i64
            );
            let seek = observation(5000, Some(180_000), Some(WALL + 2000));
            assert_eq!(
                tick(&mut clock, &seek, 2000, "Playing", Some(rate)).position_ms,
                5000
            );
            let seek = observation(170_000, Some(180_000), Some(WALL + 3000));
            assert_eq!(
                tick(&mut clock, &seek, 3000, "Playing", Some(rate)).position_ms,
                170_000
            );
            assert_eq!(
                tick(&mut clock, &seek, 4000, "Buffering", Some(rate)).position_ms,
                170_000 + (1000.0 * rate) as i64
            );
            assert!(
                !tick(&mut clock, &seek, 5000, "Buffering", Some(rate))
                    .timeline
                    .advancing
            );
            tick(&mut clock, &seek, 6000, "Playing", Some(rate));
            for ms in (7000..=30_000).step_by(1000) {
                tick(&mut clock, &seek, ms, "Playing", Some(rate));
            }
            let end = tick(&mut clock, &seek, 31_000, "Playing", Some(rate));
            assert_eq!(end.position_ms, 180_000);
            assert!(!end.timeline.advancing);
        }
    }
    #[test]
    fn fresh_pause_and_delayed_observations() {
        let mut clock = TimelineClock::default();
        tick(
            &mut clock,
            &observation(20_000, Some(180_000), Some(WALL)),
            0,
            "Playing",
            None,
        );
        let pause = observation(22_000, Some(180_000), Some(WALL + 5000));
        assert_eq!(
            tick(&mut clock, &pause, 5000, "Paused", None).position_ms,
            22_000
        );
        let old = observation(2000, Some(180_000), Some(WALL));
        assert_eq!(
            tick(&mut clock, &old, 6000, "Paused", None).position_ms,
            22_000
        );
        let mut clock = TimelineClock::default();
        tick(
            &mut clock,
            &observation(20_000, Some(180_000), Some(WALL)),
            0,
            "Playing",
            None,
        );
        let small_seek = observation(20_500, Some(180_000), Some(WALL + 1000));
        assert_eq!(
            tick(&mut clock, &small_seek, 1000, "Playing", None).position_ms,
            20_500
        );
    }
    #[test]
    fn live_window_is_distinct_from_unknown_duration() {
        let mut clock = TimelineClock::default();
        let mut sample = observation(160_000, Some(180_000), Some(WALL));
        sample.start_ms = Some(100_000);
        sample.min_seek_ms = Some(100_000);
        sample.max_seek_ms = Some(180_000);
        assert_eq!(
            tick(&mut clock, &sample, 0, "Playing", None).position_ms,
            60_000
        );
        sample.start_ms = Some(101_000);
        sample.end_ms = Some(181_000);
        sample.max_seek_ms = Some(181_000);
        sample.position_ms = Some(161_000);
        sample.updated_ticks = Some((WALL + 1000) * 10_000 + FILETIME_UNIX_OFFSET);
        let state = tick(&mut clock, &sample, 1000, "Playing", None);
        assert_eq!(state.timeline.kind, "live");
        assert!(!state.timeline.duration_known);
        assert_eq!(state.duration_ms, 0);
        assert_eq!(state.timeline.max_seek_ms, Some(80_000));
    }
    #[test]
    fn recovery_freezes_stale_tuple_but_accepts_fresh_source_evidence() {
        let mut clock = TimelineClock::default();
        let sample = observation(20_000, Some(600_000), Some(WALL));
        tick(&mut clock, &sample, 0, "Playing", None);
        tick(&mut clock, &sample, 1000, "Playing", None);
        assert_eq!(
            tick(&mut clock, &sample, 120_000, "Playing", None).position_ms,
            21_000
        );
        let fresh = observation(100_000, Some(600_000), Some(WALL + 121_000));
        assert_eq!(
            tick(&mut clock, &fresh, 121_000, "Playing", None).position_ms,
            100_000
        );
    }
    #[test]
    fn identical_metadata_sessions_and_loss_increment_generation() {
        let mut order = PublicationOrder::default();
        assert!(order.select("session-a", "same-title-artist"));
        assert_eq!(order.generation, 1);
        assert!(!order.select("session-a", "same-title-artist"));
        assert!(order.select("session-b", "same-title-artist"));
        assert_eq!(order.generation, 2);
        assert!(order.select("", ""));
        assert_eq!(order.generation, 3);
        assert!(order.select("session-b", "same-title-artist"));
        assert_eq!(order.generation, 4);
        assert_eq!(order.publish(), 1);
        assert_eq!(order.publish(), 2);
    }
    #[test]
    fn credible_initial_compensation_rate_validation_and_bad_bounds() {
        let mut clock = TimelineClock::default();
        let sample = observation(20_000, Some(180_000), Some(WALL - 3500));
        assert_eq!(
            tick(&mut clock, &sample, 0, "Playing", Some(2.0)).position_ms,
            27_000
        );
        let zero = tick(&mut clock, &sample, 1000, "Playing", Some(0.0));
        assert_eq!(zero.position_ms, 29_000);
        assert!(zero.playback_rate_known);
        assert!(!zero.timeline.advancing);
        let unknown = tick(&mut clock, &sample, 2000, "Playing", Some(f64::NAN));
        assert!(!unknown.playback_rate_known);
        assert_eq!(unknown.playback_rate, 1.0);
        let mut invalid = observation(175_000, Some(180_000), Some(WALL));
        invalid.max_seek_ms = Some(900_000);
        let mut clock = TimelineClock::default();
        tick(&mut clock, &invalid, 0, "Playing", None);
        assert_eq!(
            tick(&mut clock, &invalid, 10_000, "Playing", None).position_ms,
            180_000
        );
    }
    #[test]
    fn timestamp_only_refresh_and_wall_clock_changes_do_not_reanchor() {
        let mut clock = TimelineClock::default();
        let original = observation(20_000, Some(600_000), Some(WALL));
        tick(&mut clock, &original, 0, "Playing", None);
        let refresh = observation(20_000, Some(600_000), Some(WALL + 1000));
        assert_eq!(
            tick(&mut clock, &refresh, 1000, "Playing", None).position_ms,
            21_000
        );
        let state = clock.update(Some(refresh.clone()), 2000, WALL + 120_000, "Playing", None);
        assert_eq!(state.position_ms, 22_000);
        assert_eq!(state.timeline.received_at_ms, WALL + 1000);
        let state = clock.update(Some(refresh), 3000, WALL - 120_000, "Playing", None);
        assert_eq!(state.position_ms, 23_000);
        assert_eq!(state.timeline.received_at_ms, WALL + 1000);
    }
}

#[derive(Clone, Debug)]
struct Anchor {
    position: f64,
    at: u64,
    playing: bool,
    rate: f64,
    uncertainty: u64,
    observed: bool,
}

#[derive(Default, Debug)]
pub struct TimelineClock {
    anchor: Option<Anchor>,
    last: Option<Sample>,
    observed: Option<i64>,
    observed_at: Option<i64>,
    received_at: i64,
    observation_mono: u64,
    live: bool,
    last_tick: Option<(u64, i64, i64)>,
    last_raw: Option<TimelineObservation>,
}

#[derive(Debug)]
pub struct TimelineSnapshot {
    pub position_ms: i64,
    pub duration_ms: i64,
    pub playback_rate: f64,
    pub playback_rate_known: bool,
    pub timeline: TimelineState,
}

/// Selection generation changes even when two distinct sessions share metadata.
#[derive(Default, Debug)]
pub struct PublicationOrder {
    pub generation: u64,
    pub sequence: u64,
    selected: Option<(String, String)>,
}

impl PublicationOrder {
    pub fn select(&mut self, source: &str, track: &str) -> bool {
        let next = if source.is_empty() {
            None
        } else {
            Some((source.to_owned(), track.to_owned()))
        };
        if next == self.selected {
            return false;
        }
        self.selected = next;
        self.generation = self.generation.saturating_add(1);
        true
    }
    pub fn publish(&mut self) -> u64 {
        self.sequence = self.sequence.saturating_add(1);
        self.sequence
    }
}

pub fn provider_timestamp(ticks: Option<i64>, now: i64) -> Option<i64> {
    let unix = ticks?
        .checked_sub(FILETIME_UNIX_OFFSET)?
        .checked_div(10_000)?;
    if unix <= 0 || unix > now.saturating_add(1000) {
        None
    } else {
        Some(unix.min(now))
    }
}

fn valid_ms(value: Option<i64>) -> Option<i64> {
    value.filter(|v| (0..=MAX_MEDIA_MS).contains(v))
}

fn sample(raw: &TimelineObservation, now: i64) -> Sample {
    let source_start = valid_ms(raw.start_ms);
    let start = source_start.unwrap_or(0);
    let end = valid_ms(raw.end_ms)
        .filter(|v| *v > start)
        .map(|v| v - start);
    let min = valid_ms(raw.min_seek_ms)
        .filter(|v| *v >= start)
        .map(|v| v - start)
        .filter(|v| end.map_or(true, |end| *v <= end));
    let max = valid_ms(raw.max_seek_ms)
        .filter(|v| *v > start)
        .map(|v| v - start)
        .filter(|v| min.map_or(true, |min| *v > min));
    let timestamp = provider_timestamp(raw.updated_ticks, now);
    let position = valid_ms(raw.position_ms)
        .filter(|v| *v >= start)
        .map(|v| v - start)
        .filter(|v| end.map_or(true, |end| *v <= end.saturating_add(2000)))
        // All-zero default properties without timestamp/bounds do not establish a playhead.
        .filter(|v| *v > 0 || end.is_some() || max.is_some() || timestamp.is_some());
    Sample {
        position,
        source_start,
        end,
        min,
        max,
        timestamp,
    }
}

fn projected(anchor: &Anchor, now: u64) -> f64 {
    anchor.position
        + if anchor.playing {
            now.saturating_sub(anchor.at) as f64 * anchor.rate
        } else {
            0.0
        }
}

fn clamp(position: f64, sample: Option<&Sample>) -> i64 {
    let floor = sample.and_then(|s| s.min).unwrap_or(0);
    let ceiling = sample.and_then(|s| match (s.max, s.end) {
        (Some(max), Some(end)) => Some(max.min(end)),
        (max, end) => max.or(end),
    });
    let position = position.max(floor as f64);
    position
        .min(ceiling.unwrap_or(MAX_MEDIA_MS) as f64)
        .max(0.0)
        .round() as i64
}

fn compensation(sample: &Sample, now: i64, playing: bool, rate: f64) -> i64 {
    if !playing {
        return 0;
    }
    let age = sample
        .timestamp
        .map(|time| now.saturating_sub(time))
        .unwrap_or(0);
    if !(0..=MAX_INITIAL_AGE_MS).contains(&age) {
        return 0;
    }
    let delta = (age as f64 * rate).round() as i64;
    // A valid epoch alone is insufficient: very stale short tracks must not
    // immediately jump to their end when first discovered.
    if sample
        .end
        .zip(sample.position)
        .is_some_and(|(end, pos)| delta > (end - pos).max(0).saturating_add(10_000))
    {
        0
    } else {
        delta
    }
}

impl TimelineClock {
    pub fn update(
        &mut self,
        raw: Option<TimelineObservation>,
        now_mono: u64,
        now_wall: i64,
        status: &str,
        supplied_rate: Option<f64>,
    ) -> TimelineSnapshot {
        let known = supplied_rate.filter(|rate| rate.is_finite() && (0.0..=16.0).contains(rate));
        let rate = known.unwrap_or(1.0);
        let playing = status == "Playing" && rate > 0.0;
        // A long polling gap is recovery, not evidence of uninterrupted playback.
        // A fresh provider tuple below can still correct this conservative freeze.
        if let Some((mono, wall, position)) = self.last_tick {
            if now_mono.saturating_sub(mono) > 15_000 {
                if let Some(anchor) = self.anchor.as_mut() {
                    anchor.position = position as f64;
                    anchor.at = now_mono;
                    anchor.observed = false;
                    anchor.uncertainty = anchor
                        .uncertainty
                        .saturating_add(now_wall.saturating_sub(wall).max(0) as u64);
                }
            }
        }
        let previous_position = self
            .anchor
            .as_ref()
            .map(|anchor| clamp(projected(anchor, now_mono), self.last.as_ref()));
        let incoming = raw.as_ref().map(|raw| sample(raw, now_wall));
        let acceptable = incoming.filter(|next| {
            // Delayed observations cannot rewind an already accepted source clock.
            !self
                .last
                .as_ref()
                .and_then(|old| old.timestamp)
                .zip(next.timestamp)
                .is_some_and(|(old, new)| new.saturating_add(1000) < old)
        });
        if let Some(next) = acceptable {
            let changed = raw.as_ref() != self.last_raw.as_ref();
            let position_changed = self.last.as_ref().and_then(|old| old.position) != next.position;
            let bounds_changed = self.last.as_ref().is_some_and(|old| {
                old.source_start != next.source_start
                    || old.end != next.end
                    || old.min != next.min
                    || old.max != next.max
            });
            if let Some(old) = self.last.as_ref() {
                // Live evidence is a moving DVR window, not missing duration.
                if old
                    .source_start
                    .zip(next.source_start)
                    .is_some_and(|(a, b)| b > a)
                    && old
                        .end
                        .zip(next.end)
                        .is_some_and(|(a, b)| (a - b).abs() <= 2000)
                    && old.max.zip(next.max).is_some()
                {
                    self.live = true;
                }
            }
            if changed && next.position.is_some() {
                self.observed = next.position;
                self.observed_at = next.timestamp;
                self.received_at = now_wall;
            }
            let fresh_transition = self
                .anchor
                .as_ref()
                .is_some_and(|anchor| anchor.playing != playing || anchor.rate != rate)
                && self
                    .last
                    .as_ref()
                    .and_then(|old| old.timestamp)
                    .zip(next.timestamp)
                    .is_some_and(|(old, new)| new > old && now_wall.saturating_sub(new) <= 2000);
            let authoritative =
                self.anchor.is_none() || position_changed || bounds_changed || fresh_transition;
            if authoritative {
                if let Some(position) = next.position {
                    let delta = compensation(&next, now_wall, playing, rate);
                    let candidate = clamp(position.saturating_add(delta) as f64, Some(&next));
                    let status_changed = self
                        .anchor
                        .as_ref()
                        .is_some_and(|anchor| anchor.playing != playing);
                    let fresh_position = position_changed
                        && next.timestamp.is_some_and(|new| {
                            now_wall.saturating_sub(new) <= 2000
                                && self
                                    .last
                                    .as_ref()
                                    .and_then(|old| old.timestamp)
                                    .map_or(true, |old| new > old)
                        });
                    let keep_forward = playing
                        && !status_changed
                        && !bounds_changed
                        && !fresh_position
                        && self.anchor.is_some()
                        && previous_position
                            .is_some_and(|old| candidate < old && old - candidate <= 1500);
                    let position = if keep_forward {
                        previous_position.unwrap()
                    } else {
                        candidate
                    };
                    let stamp_age = next
                        .timestamp
                        .map(|stamp| now_wall.saturating_sub(stamp) as u64)
                        .unwrap_or(1000);
                    self.anchor = Some(Anchor {
                        position: position as f64,
                        at: now_mono,
                        playing,
                        rate,
                        uncertainty: stamp_age.min(MAX_INITIAL_AGE_MS as u64),
                        observed: delta == 0 && !keep_forward,
                    });
                }
            }
            if changed && next.position.is_some() {
                self.observation_mono = now_mono;
            }
            // Invalid/missing position cannot replace a credible observation or its bounds.
            if next.position.is_some() {
                self.last = Some(next);
                self.last_raw = raw.clone();
            }
        }
        if let Some(anchor) = self.anchor.as_mut() {
            if anchor.playing != playing || anchor.rate != rate {
                let position = previous_position
                    .unwrap_or_else(|| clamp(projected(anchor, now_mono), self.last.as_ref()));
                anchor.position = position as f64;
                anchor.at = now_mono;
                anchor.playing = playing;
                anchor.rate = rate;
                anchor.observed = false;
            }
        }
        let position = self
            .anchor
            .as_ref()
            .map(|anchor| clamp(projected(anchor, now_mono), self.last.as_ref()))
            .unwrap_or(0);
        let valid = self.anchor.is_some();
        let duration = if self.live {
            None
        } else {
            self.last.as_ref().and_then(|s| s.end)
        };
        let origin = match self.anchor.as_ref() {
            None => "unavailable",
            Some(anchor) if anchor.observed && (!anchor.playing || now_mono == anchor.at) => {
                "observed"
            }
            _ => "estimated",
        };
        let uncertainty = self
            .anchor
            .as_ref()
            .map(|anchor| {
                anchor
                    .uncertainty
                    .saturating_add(now_mono.saturating_sub(self.observation_mono))
            })
            .unwrap_or(0);
        let timeline = TimelineState {
            raw_observation: raw,
            observed_position_ms: self.observed,
            observed_at_ms: self.observed_at,
            received_at_ms: self.received_at,
            position_valid: valid,
            duration_known: duration.is_some(),
            origin: origin.into(),
            kind: if self.live {
                "live"
            } else if duration.is_some() {
                "finite"
            } else {
                "unknown"
            }
            .into(),
            source_start_ms: self.last.as_ref().and_then(|s| s.source_start),
            start_ms: self.last.as_ref().and_then(|s| s.source_start.map(|_| 0)),
            end_ms: self.last.as_ref().and_then(|s| s.end),
            min_seek_ms: self.last.as_ref().and_then(|s| s.min),
            max_seek_ms: self.last.as_ref().and_then(|s| s.max),
            uncertainty_ms: uncertainty,
            advancing: valid
                && playing
                && self
                    .last
                    .as_ref()
                    .and_then(|s| s.max.or(s.end))
                    .map_or(true, |end| position < end),
        };
        self.last_tick = Some((now_mono, now_wall, position));
        TimelineSnapshot {
            position_ms: position,
            duration_ms: duration.unwrap_or(0),
            playback_rate: rate,
            playback_rate_known: known.is_some(),
            timeline,
        }
    }
}
