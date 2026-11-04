import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Disc3 } from "lucide-react";
import { ThemeType } from "../types/media";

interface AlbumArtProps {
  artUrl: string;
  theme: ThemeType;
  isPlaying: boolean;
  title: string;
}

export const AlbumArt: React.FC<AlbumArtProps> = ({ artUrl, theme, isPlaying, title }) => {
  return (
    <div className="art-wrapper">
      {theme === "vinyl-grooves" && <div className="vinyl-disc" />}

      <AnimatePresence mode="wait">
        {artUrl ? (
          <motion.img
            key={artUrl}
            src={artUrl}
            alt={title}
            className="art-image"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            onError={(e) => {
              // Hide broken image link
              (e.target as HTMLElement).style.display = "none";
            }}
          />
        ) : (
          <motion.div
            key="fallback-art"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
            }}
          >
            <Disc3
              size={32}
              style={{
                color: "var(--accent-primary)",
                animation: isPlaying ? "spin-vinyl 3s linear infinite" : "none",
                opacity: 0.8,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
