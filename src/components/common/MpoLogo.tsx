import React from "react";

interface MpoLogoProps {
  size?: number;
  className?: string;
}

export const MpoLogo: React.FC<MpoLogoProps> = ({ size = 32, className = "" }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`mpo-logo-svg ${className}`}
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        {/* Outer squircle gradient */}
        <linearGradient id="mpoBorderGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#00f0ff" />
        </linearGradient>

        {/* Glow fill gradient */}
        <linearGradient id="mpoBgGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#090d16" />
        </linearGradient>

        {/* Core glyph gradient */}
        <linearGradient id="mpoGlyphGrad" x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00f0ff" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>

        {/* Specular highlight */}
        <linearGradient id="mpoSpecular" x1="24" y1="2" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Rounded Squircle Container */}
      <rect
        x="2.5"
        y="2.5"
        width="43"
        height="43"
        rx="12"
        fill="url(#mpoBgGrad)"
        stroke="url(#mpoBorderGrad)"
        strokeWidth="1.5"
      />

      {/* Specular inner curved reflection */}
      <path
        d="M 5 14 C 5 8.5, 8.5 5, 14 5 L 34 5 C 39.5 5, 43 8.5, 43 14 L 43 20 C 30 20, 18 16, 5 24 Z"
        fill="url(#mpoSpecular)"
      />

      {/* Dynamic Sound Wave Bars / Play Monogram */}
      {/* Bar 1 (Left Pulse) */}
      <rect
        x="12"
        y="19"
        width="3.5"
        height="10"
        rx="1.75"
        fill="url(#mpoGlyphGrad)"
      />

      {/* Bar 2 (Mid-Left High Pulse) */}
      <rect
        x="18"
        y="13"
        width="3.5"
        height="22"
        rx="1.75"
        fill="url(#mpoGlyphGrad)"
      />

      {/* Bar 3 (Center Peak Pulse) */}
      <rect
        x="24"
        y="9"
        width="3.5"
        height="30"
        rx="1.75"
        fill="url(#mpoBorderGrad)"
      />

      {/* Bar 4 (Mid-Right High Pulse) */}
      <rect
        x="30"
        y="15"
        width="3.5"
        height="18"
        rx="1.75"
        fill="url(#mpoGlyphGrad)"
      />

      {/* Bar 5 (Right Out-Pulse) */}
      <rect
        x="36"
        y="21"
        width="3.5"
        height="6"
        rx="1.75"
        fill="#00f0ff"
      />
    </svg>
  );
};
