interface TimelinePresentationInput {
  position_ms: number;
  duration_ms: number;
  timeline?: {
    position_valid: boolean;
    duration_known: boolean;
    kind: "finite" | "live" | "unknown";
  } | null;
}

export function formatTimelineTime(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return "--:--";
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Missing duration and missing position are independent. A legacy positive
 * position is useful elapsed evidence; an all-zero unknown snapshot is not. */
export function timelinePresentation(media: TimelinePresentationInput, currentTime?: string, durationTime?: string) {
  const validPosition = Number.isFinite(media.position_ms) && media.position_ms >= 0;
  const validDuration = Number.isFinite(media.duration_ms) && media.duration_ms > 0;
  const durationKnown = validDuration && (media.timeline ? media.timeline.duration_known : true);
  const positionKnown = validPosition && (media.timeline ? media.timeline.position_valid : media.position_ms > 0 || durationKnown);
  const kind = media.timeline?.kind || (durationKnown ? "finite" : "unknown");
  const current = positionKnown ? currentTime || formatTimelineTime(media.position_ms) : "--:--";
  const duration = durationKnown ? durationTime || formatTimelineTime(media.duration_ms) : "";
  const determinate = positionKnown && durationKnown;
  const state = determinate ? "determinate" : positionKnown ? "elapsed" : "unavailable";
  return {
    positionKnown, durationKnown, kind, determinate, state, current, duration,
    label: durationKnown ? `${current} / ${duration}` : current,
  } as const;
}
