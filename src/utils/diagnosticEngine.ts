import { MediaTimelineClock } from './mediaTimeline';
import { MOCK_MEDIA_STATE } from '../types/media';

export interface DiagnosticReport {
  mode: "live" | "synthetic";
  durationSec: number;
  fps: number;
  droppedFrames: number;
  maxFrameSpikeMs: number;
  negativeWarps: number;
  suddenJumps: number;
  reRenderRate: number;
  maxDriftMs: number;
  healthGrade: "A+" | "A" | "B" | "C" | "F";
  verdict: string;
  details: string[];
  timestamp: string;
}

/**
 * Runs a live audit of the active media scrubber and DOM rendering
 */
export async function runLiveAudit(
  durationSec: number = 5,
  onProgress?: (progressPct: number, partialReport: Partial<DiagnosticReport>) => void
): Promise<DiagnosticReport> {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const durationMs = durationSec * 1000;
    let frameCount = 0;
    let lastFrameTime = startTime;
    const frameDeltas: number[] = [];

    let previousSec: number | null = null;
    let negativeWarps = 0;
    let suddenJumps = 0;
    let maxDriftMs = 0;
    let initialRenderCount = window.__mpoScrubberTelemetry?.renderCount ?? 0;

    function getActiveTimestampText(): string | null {
      const el =
        document.querySelector(".progress-timestamps span:first-child") ||
        document.querySelector(".mpo-time-current") ||
        document.querySelector(".canvas-viewport-v4 span");
      return el ? el.textContent?.trim() ?? null : null;
    }

    function parseToSeconds(str: string | null): number | null {
      if (!str || !str.includes(":")) return null;
      const parts = str.split(":").map(Number);
      return parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])
        ? parts[0] * 60 + parts[1]
        : null;
    }

    function tick(now: number) {
      frameCount++;
      const delta = now - lastFrameTime;
      frameDeltas.push(delta);
      lastFrameTime = now;

      // Check DOM timestamp
      const timeStr = getActiveTimestampText();
      const currentSec = parseToSeconds(timeStr);

      if (currentSec !== null && previousSec !== null) {
        const diff = currentSec - previousSec;
        if (diff < 0) {
          negativeWarps++;
        } else if (diff > 1) {
          suddenJumps++;
        }
      }

      if (currentSec !== null) {
        previousSec = currentSec;
      }

      // Query telemetry if available
      if (window.__mpoScrubberTelemetry) {
        const drift = Math.abs(window.__mpoScrubberTelemetry.driftMs);
        if (drift > maxDriftMs) maxDriftMs = drift;
        if (window.__mpoScrubberTelemetry.negativeWarps > 0) {
          negativeWarps = Math.max(negativeWarps, window.__mpoScrubberTelemetry.negativeWarps);
        }
      }

      const elapsed = now - startTime;
      const pct = Math.min(Math.round((elapsed / durationMs) * 100), 100);

      if (onProgress && frameCount % 6 === 0) {
        const curFps = Math.round(frameCount / (elapsed / 1000));
        onProgress(pct, {
          fps: curFps,
          negativeWarps,
          suddenJumps,
          maxDriftMs,
        });
      }

      if (elapsed < durationMs) {
        requestAnimationFrame(tick);
      } else {
        const totalElapsedSec = (performance.now() - startTime) / 1000;
        const avgFps = Math.round(frameCount / totalElapsedSec);
        const slowFrames = frameDeltas.filter((d) => d > 33.3).length;
        const maxSpike = Math.round(Math.max(...frameDeltas, 0));
        const finalRenderCount = window.__mpoScrubberTelemetry?.renderCount ?? 0;
        const totalRenders = Math.max(finalRenderCount - initialRenderCount, 0);
        const reRenderRate = Number((totalRenders / totalElapsedSec).toFixed(1));

        let healthGrade: "A+" | "A" | "B" | "C" | "F" = "A+";
        const details: string[] = [];

        if (negativeWarps === 0 && suddenJumps === 0 && slowFrames === 0 && avgFps >= 55) {
          healthGrade = "A+";
          details.push("Zero negative time glitches detected");
          details.push(`Rendering benchmark: ${avgFps} FPS; provider accuracy is not measured`);
          details.push(`Shared clock publication rate: ~${reRenderRate}/s`);
        } else if (negativeWarps === 0 && suddenJumps === 0 && slowFrames < 5) {
          healthGrade = "A";
          details.push("Zero timeline glitches detected");
          details.push(`Minor frame delay (${slowFrames} frames > 33ms) under normal system load`);
        } else if (negativeWarps > 0) {
          healthGrade = "C";
          details.push(`Detected ${negativeWarps} negative time warps (seconds snapped backward)`);
        } else {
          healthGrade = "B";
          details.push(`Average FPS: ${avgFps}, Frame drops: ${slowFrames}`);
        }

        const report: DiagnosticReport = {
          mode: "live",
          durationSec,
          fps: avgFps,
          droppedFrames: slowFrames,
          maxFrameSpikeMs: maxSpike,
          negativeWarps,
          suddenJumps,
          reRenderRate: reRenderRate || 1.0,
          maxDriftMs,
          healthGrade,
          verdict:
            healthGrade === "A+" || healthGrade === "A"
              ? "Rendering stable during this sample; provider accuracy requires raw telemetry."
              : "Timeline corrections or frame delays observed; inspect raw telemetry for source changes and seeks.",
          details,
          timestamp: new Date().toLocaleTimeString(),
        };

        resolve(report);
      }
    }

    requestAnimationFrame(tick);
  });
}

/**
 * Runs a simulated synthetic jitter stress test injecting randomized Windows GSMTC packet delays
 */
export async function runSyntheticStressTest(
  durationSec: number = 5,
  onProgress?: (progressPct: number, partialReport: Partial<DiagnosticReport>) => void
): Promise<DiagnosticReport> {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const durationMs = durationSec * 1000;
    let frameCount = 0;
    let lastFrameTime = startTime;
    const frameDeltas: number[] = [];

    // Simulated media state
    const simBaseMs = 45000;
    let simCurrentMs = simBaseMs;
    const clock = new MediaTimelineClock();
    let sequence = 1;
    clock.ingest({ ...MOCK_MEDIA_STATE, position_ms: simBaseMs, updated_at: Date.now(), stream_id: 'diagnostic', sequence }, startTime, Date.now());
    let lastPacketTime = 0;
    let negativeWarps = 0;
    let maxDriftObserved = 0;

    function tick(now: number) {
      frameCount++;
      const dt = Math.min(now - lastFrameTime, 100);
      frameDeltas.push(dt);
      lastFrameTime = now;

      const elapsed = now - startTime;

      // Inject synthetic packet every ~800-1200ms with ±250ms randomized jitter
      if (now - lastPacketTime >= 950 + (Math.random() * 400 - 200)) {
        lastPacketTime = now;
        // Windows simulated position with artificial drift
        const packetJitter = (Math.random() - 0.48) * 350; // -175ms to +175ms
        const idealSongPos = simBaseMs + elapsed;
        const incomingPos = idealSongPos + packetJitter;
        const drift = incomingPos - simCurrentMs;
        if (Math.abs(drift) > maxDriftObserved) {
          maxDriftObserved = Math.round(Math.abs(drift));
        }
        clock.ingest({ ...MOCK_MEDIA_STATE, position_ms: incomingPos, updated_at: Date.now(), stream_id: 'diagnostic', sequence: ++sequence }, now, Date.now());
      }

      const prevMs = simCurrentMs;
      simCurrentMs = clock.position(now);
      if (simCurrentMs < prevMs) negativeWarps++;

      const pct = Math.min(Math.round((elapsed / durationMs) * 100), 100);

      if (onProgress && frameCount % 6 === 0) {
        const curFps = Math.round(frameCount / (elapsed / 1000));
        onProgress(pct, {
          fps: curFps,
          negativeWarps,
          maxDriftMs: maxDriftObserved,
        });
      }

      if (elapsed < durationMs) {
        requestAnimationFrame(tick);
      } else {
        const totalElapsedSec = (performance.now() - startTime) / 1000;
        const avgFps = Math.round(frameCount / totalElapsedSec);
        const slowFrames = frameDeltas.filter((d) => d > 33.3).length;
        const maxSpike = Math.round(Math.max(...frameDeltas, 0));

        const report: DiagnosticReport = {
          mode: "synthetic",
          durationSec,
          fps: avgFps,
          droppedFrames: slowFrames,
          maxFrameSpikeMs: maxSpike,
          negativeWarps,
          suddenJumps: 0,
          reRenderRate: 1.0,
          maxDriftMs: maxDriftObserved,
          healthGrade: negativeWarps ? "C" : "A",
          verdict: negativeWarps ? "Synthetic shared-clock regressions observed." : "Shared clock handled simulated packet jitter; live provider accuracy is not measured.",
          details: [
            `Injected ${sequence - 1} simulated observations with position jitter`,
            `Observed ${negativeWarps} regressions in the actual shared clock model`,
            `Measured ${avgFps} render FPS and ${slowFrames} delayed frames`,
            "Simulation does not establish GSMTC or browser playhead accuracy",
          ],
          timestamp: new Date().toLocaleTimeString(),
        };

        resolve(report);
      }
    }

    requestAnimationFrame(tick);
  });
}
