import type { MediaState } from '../types/media';

export interface MediaObservationTrace { received_at_ms: number; transport: string; accepted: boolean; state: MediaState; }
const observations: MediaObservationTrace[] = [];
/** Bounded raw history for the copyable diagnostic report. Publication freshness
 * is kept separate from provider timestamp and tuple freshness. */
export function recordMediaObservation(state: MediaState, transport: string, accepted: boolean) {
  observations.push({ received_at_ms: Date.now(), transport, accepted, state });
  if (observations.length > 900) observations.shift();
}
export function mediaObservationTrace(): MediaObservationTrace[] { return observations.slice(); }
