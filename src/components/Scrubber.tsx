import React from "react";
import { MediaState } from "../types/media";
import { useScrubber } from "../hooks/useScrubber";
import { timelinePresentation } from "../utils/timelinePresentation";

interface ScrubberProps {
  media: MediaState;
}

export const Scrubber: React.FC<ScrubberProps> = ({ media }) => {
  const { formattedCurrent, formattedDuration, progress } = useScrubber(media);

  const timeline = timelinePresentation(media, formattedCurrent, formattedDuration);

  return (
    <div className="progress-container" data-timeline-state={timeline.state}>
      <div className="progress-track" role="progressbar" aria-label="Playback progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={timeline.determinate ? progress * 100 : undefined} aria-valuetext={timeline.label}>
        {/* High performance hardware-accelerated GPU scaleX */}
        {timeline.determinate ? <div
          className="progress-fill"
          style={{
            transform: `scaleX(${progress})`,
          }}
        /> : <div className="progress-fill" style={{ width: "25%", opacity: .35 }} />}
      </div>
      <div className="progress-timestamps">
        <span>{timeline.current}</span>
        {timeline.durationKnown && <span>{timeline.duration}</span>}
      </div>
    </div>
  );
};
