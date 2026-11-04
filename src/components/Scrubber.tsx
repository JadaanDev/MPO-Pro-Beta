import React from "react";
import { MediaState } from "../types/media";
import { useScrubber } from "../hooks/useScrubber";

interface ScrubberProps {
  media: MediaState;
}

export const Scrubber: React.FC<ScrubberProps> = ({ media }) => {
  const { formattedCurrent, formattedDuration, progress } = useScrubber(media);

  if (media.duration_ms <= 0) {
    return null;
  }

  return (
    <div className="progress-container">
      <div className="progress-track">
        {/* High performance hardware-accelerated GPU scaleX */}
        <div
          className="progress-fill"
          style={{
            transform: `scaleX(${progress})`,
          }}
        />
      </div>
      <div className="progress-timestamps">
        <span>{formattedCurrent}</span>
        <span>{formattedDuration}</span>
      </div>
    </div>
  );
};
