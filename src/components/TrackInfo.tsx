import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { MediaState } from "../types/media";

interface TrackInfoProps {
  media: MediaState;
  showAppBadge?: boolean;
}

export const TrackInfo: React.FC<TrackInfoProps> = ({ media, showAppBadge = true }) => {
  const isPlaying = media.status === "Playing";

  return (
    <div className="track-content">
      <div className="track-header">
        {showAppBadge && (
          <span className="app-badge">
            {media.app_name || "Windows Media"}
          </span>
        )}
        <div className={`live-indicator ${isPlaying ? "playing" : "paused"}`}>
          <span className="live-bar" />
          <span className="live-bar" />
          <span className="live-bar" />
          <span className="live-bar" />
        </div>
      </div>

      {/* Morphing track title */}
      <AnimatePresence mode="wait">
        <motion.div
          key={media.title}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="track-title"
          title={media.title}
        >
          {media.title || "No Track Active"}
        </motion.div>
      </AnimatePresence>

      {/* Track Artist & Album */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${media.artist}-${media.album_title}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="track-artist"
          title={`${media.artist}${media.album_title ? ` • ${media.album_title}` : ""}`}
        >
          {media.artist || "Awaiting media stream..."}
          {media.album_title && ` • ${media.album_title}`}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
