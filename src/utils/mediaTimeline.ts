import type { MediaState } from '../types/media';
import { timelinePresentation } from './timelinePresentation';

const MAX_POSITION = 366 * 86400 * 1000;
export function timelineRate(media: MediaState): number {
  const rate = media.playback_rate;
  return typeof rate === 'number' && Number.isFinite(rate) && rate >= 0 && rate <= 16 ? rate : 1;
}
export function mediaIdentity(media: MediaState): string {
  return JSON.stringify([media.stream_id, media.source_generation, media.source_id || media.app_name, media.title, media.artist, media.album_title]);
}
function bound(media: MediaState, position: number): number {
  const positive = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
  const t = media.timeline;
  const floor = positive(t?.min_seek_ms) ? t.min_seek_ms : 0;
  const duration = timelinePresentation(media).durationKnown ? media.duration_ms : MAX_POSITION;
  const ceiling = positive(t?.max_seek_ms) && t.max_seek_ms >= floor ? t.max_seek_ms : duration;
  return Math.max(0, Math.min(Math.max(position, floor), ceiling, duration, MAX_POSITION));
}

/** The backend position is already projected AT updated_at. Apply transport
 * compensation once, then advance from a local monotonic anchor. */
export class MediaTimelineClock {
  raw: MediaState | null = null;
  private anchor = 0;
  private at = 0;
  private advancing = false;
  private rate = 1;
  correctionMs = 0;

  ingest(media: MediaState, mono: number, wall: number, force = false): boolean {
    if (media === this.raw) return false;
    const old = this.raw;
    if (!force && old && media.stream_id && media.stream_id === old.stream_id && (media.sequence ?? 0) <= (old.sequence ?? 0)) return false;
    if (!force && old && !media.stream_id && !old.stream_id && media.updated_at < old.updated_at) return false;
    const same = old && mediaIdentity(old) === mediaIdentity(media);
    const previous = this.position(mono);
    const known = timelinePresentation(media).positionKnown;
    const rate = timelineRate(media);
    const advancing = known && media.status === 'Playing' && rate > 0 && media.timeline?.advancing !== false;
    const latency = advancing && media.updated_at > 0 && wall >= media.updated_at && wall - media.updated_at <= 15000 ? wall - media.updated_at : 0;
    let position = bound(media, (known ? media.position_ms : 0) + latency * rate);
    if (same && old && !media.timeline && media.position_ms === old.position_ms && media.duration_ms === old.duration_ms) position = previous;
    // The versioned backend already reconciles provider jitter. Preserve even
    // small authoritative seeks; only legacy snapshots need this local heuristic.
    if (!media.timeline && same && old?.status === media.status && timelineRate(old) === rate && advancing && previous > position && previous - position <= 1500) position = previous;
    this.raw = media;
    this.correctionMs = same ? position - previous : 0;
    this.anchor = known ? position : 0;
    this.at = mono;
    this.rate = rate;
    this.advancing = advancing;
    return true;
  }

  position(mono: number): number {
    if (!this.raw) return 0;
    // Without a fresh backend publication, advancement becomes unverifiable.
    return bound(this.raw, this.anchor + (this.advancing ? Math.min(15000, Math.max(0, mono - this.at)) * this.rate : 0));
  }
  project(mono: number): MediaState | null {
    if (!this.raw) return null;
    const position = this.position(mono);
    const elapsed = Math.max(0, mono - this.at);
    const timeline = this.raw.timeline;
    return {
      ...this.raw, position_ms: position,
      ...(timeline ? { timeline: {
        ...timeline,
        origin: !timeline.position_valid ? 'unavailable' : position !== this.raw.position_ms ? 'estimated' : timeline.origin,
        uncertainty_ms: timeline.uncertainty_ms + elapsed,
        advancing: this.isAdvancingAt(mono),
      } } : {}),
    };
  }
  isAdvancingAt(mono: number): boolean { return this.advancing && mono - this.at < 15000 && !!this.raw && this.position(mono) < bound(this.raw, MAX_POSITION); }
}
