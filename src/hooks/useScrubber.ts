import { useEffect, useRef, useState } from "react";
import { MediaState } from "../types/media";

export function formatTime(ms: number): string {
  if (isNaN(ms) || ms < 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export interface ScrubberTelemetry {
  currentMs: number;
  driftMs: number;
  speed: number;
  negativeWarps: number;
  renderCount: number;
  isMonotonic: boolean;
}

// Global telemetry registry for the Diagnostic Engine
declare global {
  interface Window {
    __mpoScrubberTelemetry?: ScrubberTelemetry;
    __mpoEcoMode?: boolean;
  }
}

export function isTimelineSeek(previous: { position: number; timestamp: number; status: string } | null, next: { position: number; timestamp: number; status: string }): boolean {
  if (!previous || previous.status !== "Playing" || next.status !== "Playing") return false;
  const elapsed = Math.max(0, next.timestamp - previous.timestamp);
  return Math.abs(next.position - previous.position - elapsed) > 2500;
}

export function useScrubber(media: MediaState) {
  const [currentMs, setCurrentMs] = useState<number>(media.position_ms);
  const [formattedCurrent, setFormattedCurrent] = useState<string>(formatTime(media.position_ms));
  const [progress, setProgress] = useState<number>(
    media.duration_ms > 0 ? Math.min(Math.max(media.position_ms / media.duration_ms, 0), 1) : 0
  );

  // References for continuous monotonic timeline
  const currentMsRef = useRef<number>(media.position_ms);
  const lastTickRef = useRef<number>(performance.now());
  const rafRef = useRef<number | null>(null);
  const targetDriftRef = useRef<number>(0);
  const lastTrackKeyRef = useRef<string>(`${media.app_name}-${media.title}-${media.artist}-${media.album_title}`);
  const lastSampleRef = useRef<{ position: number; timestamp: number; status: string } | null>(null);
  const timerRef = useRef<number | null>(null);
  const lastRenderTimeRef = useRef<number>(0);
  const lastRenderedSecRef = useRef<number>(Math.floor(media.position_ms / 1000));
  const negativeWarpsRef = useRef<number>(0);
  const renderCountRef = useRef<number>(0);

  // Track reconciliation when media prop updates
  useEffect(() => {
    const isUninitialized = !media.title && !media.artist && media.status === "Stopped" && (!media.updated_at || media.updated_at <= 0);
    if (isUninitialized && !lastSampleRef.current) {
      return;
    }
    const trackKey = `${media.app_name}-${media.title}-${media.artist}-${media.album_title}`;
    const trackChanged = trackKey !== lastTrackKeyRef.current;
    lastTrackKeyRef.current = trackKey;
    const sampleTime = Number.isFinite(media.updated_at) && media.updated_at > 0 ? media.updated_at : Date.now();
    const previous = trackChanged ? null : lastSampleRef.current;
    // Native IPC, WebSocket and the initial fetch can deliver the same snapshot out of order.
    if (previous && sampleTime < previous.timestamp) return;
    lastSampleRef.current = { position: media.position_ms, timestamp: sampleTime, status: media.status };
    const arrivalLatency = media.status === "Playing" ? Math.max(0, Math.min(Date.now() - sampleTime, 15000)) : 0;
    const targetPos = Math.max(0, media.duration_ms > 0 ? Math.min(media.position_ms + arrivalLatency, media.duration_ms) : media.position_ms);
    // Compare successive source samples, rather than the rendered clock: a lagging
    // browser packet is not itself evidence of a deliberate rewind.
    const seekDetected = isTimelineSeek(previous, { position: media.position_ms, timestamp: sampleTime, status: media.status });
    if (trackChanged || !previous || previous.status !== media.status || media.status !== "Playing" || media.duration_ms <= 0 || seekDetected) {
      currentMsRef.current = targetPos;
      lastTickRef.current = performance.now();
      targetDriftRef.current = 0;
      setCurrentMs(targetPos);
      setFormattedCurrent(formatTime(targetPos));
      setProgress(media.duration_ms > 0 ? Math.min(targetPos / media.duration_ms, 1) : 0);
      lastRenderedSecRef.current = Math.floor(targetPos / 1000);
    } else {
      targetDriftRef.current = targetPos - currentMsRef.current;
    }
  }, [media.position_ms, media.duration_ms, media.status, media.title, media.artist, media.album_title, media.app_name, media.updated_at]);

  // Main high-precision animation loop
  useEffect(() => {
    if (media.status !== "Playing" || media.duration_ms <= 0) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    lastTickRef.current = performance.now();

    const tick = (now: number) => {
      const dt = Math.max(now - lastTickRef.current, 0);
      lastTickRef.current = now;

      // Calculate speed compensation based on drift
      // When behind (drift > 50ms): speed up slightly (max 1.05x)
      // When ahead (drift < -50ms): slow down slightly (min 0.95x)
      let speed = 1.0;
      const drift = targetDriftRef.current;

      if (drift > 50) {
        speed = 1.0 + Math.min((drift - 50) / 1000, 0.05);
      } else if (drift < -50) {
        speed = 1.0 - Math.min((-drift - 50) / 1000, 0.05);
      }

      // Correct drift gradually without making the displayed clock run backwards.
      targetDriftRef.current -= dt * (speed - 1);

      const prevMs = currentMsRef.current;
      const advancedMs = prevMs + dt * speed;

      // STRICT MONOTONIC CLAMP: Time CANNOT flow backwards while playing!
      const nextMs = Math.min(Math.max(advancedMs, prevMs), media.duration_ms);

      if (nextMs < prevMs) {
        negativeWarpsRef.current += 1;
      }

      currentMsRef.current = nextMs;

      // Determine if Eco/Streamer/Game mode is active
      const isEcoMode = typeof document !== "undefined" && (
        document.body.classList.contains("eco-gpu-mode") ||
        document.body.classList.contains("game-mode-active") ||
        document.body.classList.contains("streamer-mode") ||
        window.location.search.includes("mode=overlay") ||
        window.location.search.includes("mode=vertical") ||
        Boolean((window as any).__mpoEcoMode) ||
        Boolean((window as any).__mpoGameActive)
      );

      // Throttle React state re-renders:
      // 1. Advance text display every single second on integer second advance (1 Hz monotonic, 0 freeze!)
      // 2. Progress bar: updates at ~20 FPS (every 50ms) in normal mode, or at 5 FPS (every 200ms) in eco mode
      const currentSec = Math.floor(nextMs / 1000);
      const secondAdvanced = currentSec > lastRenderedSecRef.current;
      const timeSinceLastRender = now - lastRenderTimeRef.current;
      const renderThrottleMs = isEcoMode ? 200 : 50;

      if (secondAdvanced || timeSinceLastRender >= renderThrottleMs) {
        lastRenderTimeRef.current = now;
        renderCountRef.current += 1;

        setCurrentMs(nextMs);
        const nextProgress = media.duration_ms > 0 ? Math.min(Math.max(nextMs / media.duration_ms, 0), 1) : 0;
        setProgress(nextProgress);

        if (secondAdvanced) {
          lastRenderedSecRef.current = currentSec;
          setFormattedCurrent(formatTime(nextMs));
        }

        // Expose telemetry to window for diagnostics
        if (typeof window !== "undefined") {
          window.__mpoScrubberTelemetry = {
            currentMs: nextMs,
            driftMs: Math.round(targetDriftRef.current),
            speed: Number(speed.toFixed(3)),
            negativeWarps: negativeWarpsRef.current,
            renderCount: renderCountRef.current,
            isMonotonic: true,
          };
        }
      }

      {
        if (isEcoMode) {
          timerRef.current = window.setTimeout(() => {
            timerRef.current = null;
            rafRef.current = requestAnimationFrame(tick);
          }, 100); // 10 FPS tick rate during gaming: sub-second precision, ~0.001% CPU!
        } else {
          rafRef.current = requestAnimationFrame(tick);
        }
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    const handlePerfChange = () => {
      if (media.status === "Playing" && media.duration_ms > 0 && !rafRef.current) {
        lastTickRef.current = performance.now();
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    window.addEventListener("mpo_perf_changed", handlePerfChange);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      rafRef.current = null;
      timerRef.current = null;
      window.removeEventListener("mpo_perf_changed", handlePerfChange);
    };
  }, [media.status, media.duration_ms]);

  return {
    currentMs,
    formattedCurrent,
    formattedDuration: formatTime(media.duration_ms),
    progress, // 0.0 to 1.0 for scaleX hardware transform
  };
}
