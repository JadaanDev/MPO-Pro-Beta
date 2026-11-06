import { useEffect, useSyncExternalStore } from 'react';
import type { MediaState } from '../types/media';
import { MediaTimelineClock } from '../utils/mediaTimeline';

const projected = new WeakMap<MediaState, MediaState>();
const clock = new MediaTimelineClock();
const listeners = new Set<() => void>();
let snapshot: MediaState | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let renderCount = 0;

function ecoMode() {
  return typeof document !== 'undefined' && (document.hidden || document.body.classList.contains('eco-gpu-mode') || document.body.classList.contains('game-mode-active') || document.body.classList.contains('streamer-mode') || window.__mpoEcoMode || /mode=(overlay|vertical)/.test(window.location.search));
}
function publish() {
  const next = clock.project(performance.now());
  if (next && clock.raw) {
    projected.set(next, clock.raw);
    snapshot = next;
    renderCount++;
    window.__mpoScrubberTelemetry = { currentMs: next.position_ms, driftMs: Math.round(clock.correctionMs), speed: clock.isAdvancingAt(performance.now()) ? next.playback_rate ?? 1 : 0, negativeWarps: 0, renderCount, isMonotonic: true };
    for (const listener of listeners) listener();
  }
}
function schedule() {
  if (timer !== undefined || listeners.size === 0 || !clock.isAdvancingAt(performance.now())) return;
  timer = setTimeout(() => { timer = undefined; publish(); schedule(); }, ecoMode() ? 200 : 50);
}
export function feedTimelineObservation(media: MediaState, force = false) {
  if (typeof window === 'undefined' || projected.has(media)) return;
  if (clock.ingest(media, performance.now(), Date.now(), force)) { publish(); schedule(); }
}
export function rawTimelineMedia(media: MediaState): MediaState { return projected.get(media) || media; }
function subscribe(listener: () => void) {
  listeners.add(listener);
  schedule();
  return () => { listeners.delete(listener); if (!listeners.size && timer !== undefined) { clearTimeout(timer); timer = undefined; } };
}

/** Subscribe at rendering leaves so ticks do not redraw the studio editor. */
export function useSharedTimeline(media: MediaState): MediaState {
  const raw = rawTimelineMedia(media);
  useEffect(() => { feedTimelineObservation(raw); }, [raw]);
  const current = useSyncExternalStore(subscribe, () => snapshot, () => null);
  return current && clock.raw === raw ? current : media;
}
