import React, { useEffect, useState } from "react";
import { MpoLogo } from "./MpoLogo";

interface AppLaunchScreenProps {
  onReady?: () => void;
  statusMessage?: string;
  minDurationMs?: number;
}

export const AppLaunchScreen: React.FC<AppLaunchScreenProps> = ({
  onReady,
  statusMessage,
  minDurationMs = 700,
}) => {
  const [phase, setPhase] = useState<"init" | "prewarm" | "ready" | "fade">("init");
  const [displayStatus, setDisplayStatus] = useState("Initializing Multimedia Engine...");

  useEffect(() => {
    const t1 = setTimeout(() => {
      setPhase("prewarm");
      setDisplayStatus("Pre-warming Studio Workspace...");
    }, minDurationMs * 0.4);

    const t2 = setTimeout(() => {
      setPhase("ready");
      setDisplayStatus("Ready");
    }, minDurationMs * 0.85);

    const t3 = setTimeout(() => {
      setPhase("fade");
      onReady?.();
    }, minDurationMs);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [minDurationMs, onReady]);

  if (phase === "fade") return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        background: "radial-gradient(circle at center, #0f172a 0%, #090d18 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "24px",
        transition: "opacity 0.35s ease",
        opacity: phase === "ready" ? 0.9 : 1,
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
          transform: "scale(1.15)",
        }}
      >
        <MpoLogo size={64} />
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontSize: "18px",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              background: "linear-gradient(135deg, #ffffff 40%, #94a3b8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            MPO STUDIO
          </span>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              padding: "2px 6px",
              background: "rgba(56, 189, 248, 0.15)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              color: "#38bdf8",
              borderRadius: "999px",
            }}
          >
            v7.0.0-beta.16
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "10px",
          width: "220px",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "3px",
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: "999px",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: "100%",
              width: phase === "init" ? "40%" : phase === "prewarm" ? "80%" : "100%",
              background: "linear-gradient(90deg, #38bdf8, #6366f1)",
              borderRadius: "999px",
              transition: "width 0.35s ease-out",
            }}
          />
        </div>

        <span
          style={{
            fontSize: "11px",
            color: "#94a3b8",
            fontFamily: "system-ui, sans-serif",
            letterSpacing: "0.02em",
          }}
        >
          {statusMessage || displayStatus}
        </span>
      </div>
    </div>
  );
};

