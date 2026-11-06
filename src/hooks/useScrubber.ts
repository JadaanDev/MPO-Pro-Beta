import type { MediaState } from '../types/media';
import { useSharedTimeline } from './useSharedTimeline';
import { formatTimelineTime, timelinePresentation } from '../utils/timelinePresentation';

export const formatTime = formatTimelineTime;
export interface ScrubberTelemetry { currentMs: number; driftMs: number; speed: number; negativeWarps: number; renderCount: number; isMonotonic: boolean; }
declare global { interface Window { __mpoScrubberTelemetry?: ScrubberTelemetry; __mpoEcoMode?: boolean; } }

export function isTimelineSeek(previous: { position: number; timestamp: number; status: string; rate?: number } | null, next: { position: number; timestamp: number; status: string; rate?: number }): boolean {
  if (!previous || previous.status !== 'Playing' || next.status !== 'Playing') return false;
  const elapsed = Math.max(0, next.timestamp - previous.timestamp);
  return Math.abs(next.position - previous.position - elapsed * (previous.rate ?? 1)) > 2500;
}

export function useScrubber(raw: MediaState) {
  const media = useSharedTimeline(raw);
  const timeline = timelinePresentation(media);
  return {
    media,
    currentMs: media.position_ms,
    formattedCurrent: timeline.current,
    formattedDuration: timeline.duration || '--:--',
    progress: timeline.determinate ? Math.max(0, Math.min(1, media.position_ms / media.duration_ms)) : 0,
    positionKnown: timeline.positionKnown,
    durationKnown: timeline.durationKnown,
    timeline,
  };
}
