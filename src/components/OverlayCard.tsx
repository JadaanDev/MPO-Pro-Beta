import React from "react";
import { motion } from "motion/react";
import { MediaState, ThemeType } from "../types/media";
import { AlbumArt } from "./AlbumArt";
import { TrackInfo } from "./TrackInfo";
import { Scrubber } from "./Scrubber";
import { EditControls } from "./EditControls";

interface OverlayCardProps {
  media: MediaState;
  artUrl: string;
  theme: ThemeType;
  onThemeChange: (theme: ThemeType) => void;
  isEditMode: boolean;
  onLockHud: () => void;
  onToggleMock: () => void;
  isTauri: boolean;
  apiBaseUrl: string;
}

export const OverlayCard: React.FC<OverlayCardProps> = ({
  media,
  artUrl,
  theme,
  onThemeChange,
  isEditMode,
  onLockHud,
  onToggleMock,
  isTauri,
  apiBaseUrl,
}) => {
  const isPlaying = media.status === "Playing";

  return (
    <div className={`overlay-viewport ${isEditMode ? "interactive" : ""}`}>
      <motion.div
        layout
        className={`mpo-card ${isPlaying ? "playing" : "paused"} ${isEditMode ? "edit-mode-active" : ""}`}
        data-theme={theme}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Ambient reactive back-glow */}
        <div className="mpo-ambient-glow" />

        {/* Edit mode floating toolbar */}
        {isEditMode && (
          <EditControls
            theme={theme}
            onThemeChange={onThemeChange}
            onLockHud={onLockHud}
            onToggleMock={onToggleMock}
            isTauri={isTauri}
            apiBaseUrl={apiBaseUrl}
          />
        )}

        {/* Album Artwork with transitions */}
        <AlbumArt
          artUrl={artUrl}
          theme={theme}
          isPlaying={isPlaying}
          title={media.title}
        />

        {/* Metadata + Timeline */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <TrackInfo media={media} />
          <Scrubber media={media} />
        </div>
      </motion.div>
    </div>
  );
};
