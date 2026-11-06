import type { MediaState } from '../types/media';

export function isMediaState(value: unknown): value is MediaState {
  if (!value || typeof value !== 'object') return false;
  const v = value as MediaState;
  return ['title', 'artist', 'album_title', 'app_name'].every(key => typeof v[key as keyof MediaState] === 'string') &&
    ['Playing', 'Paused', 'Stopped', 'Closed', 'Buffering'].includes(v.status) &&
    [v.position_ms, v.duration_ms, v.updated_at, v.art_timestamp].every(Number.isFinite) && typeof v.has_art === 'boolean' &&
    (v.stream_id === undefined || typeof v.stream_id === 'string') &&
    [v.sequence, v.source_generation].every(n => n === undefined || Number.isSafeInteger(n) && n >= 0);
}

/** One gate before metadata, artwork or clock state can change. Wall time is
 * only a legacy fallback; process streams and publication order are authoritative. */
export class MediaPublicationOrder {
  current: MediaState | null = null;
  revision = 0;
  private retired = new Set<string>();

  accept(next: MediaState, requestedAtRevision?: number): boolean {
    if (!isMediaState(next)) return false;
    const old = this.current;
    if (next.stream_id && this.retired.has(next.stream_id)) return false;
    if (old && requestedAtRevision !== undefined && requestedAtRevision !== this.revision && next.stream_id !== old.stream_id) return false;
    if (old?.stream_id) {
      if (!next.stream_id) return false;
      if (next.stream_id === old.stream_id) {
        if ((next.sequence ?? 0) <= (old.sequence ?? 0) || (next.source_generation ?? 0) < (old.source_generation ?? 0)) return false;
      } else this.retired.add(old.stream_id);
    } else if (old && !next.stream_id && next.updated_at <= old.updated_at) return false;
    this.current = next;
    this.revision++;
    return true;
  }
}
