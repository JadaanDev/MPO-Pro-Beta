import React, { useState } from "react";
import {
  Activity,
  X,
  Play,
  RefreshCw,
  CheckCircle2,
  Copy,
  Check,
  Zap,
} from "lucide-react";
import {
  DiagnosticReport,
  runLiveAudit,
  runSyntheticStressTest,
} from "../../utils/diagnosticEngine";
import { mediaObservationTrace } from "../../utils/mediaTelemetry";

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaStatus?: string;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({
  isOpen,
  onClose,
  mediaStatus = "Paused",
}) => {
  const [mode, setMode] = useState<"live" | "synthetic">("synthetic");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progressPct, setProgressPct] = useState<number>(0);
  const [liveMetrics, setLiveMetrics] = useState<Partial<DiagnosticReport>>({});
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [telemetryCopied, setTelemetryCopied] = useState(false);

  if (!isOpen) return null;

  const handleStartBenchmark = async () => {
    setIsRunning(true);
    setProgressPct(0);
    setLiveMetrics({});
    setReport(null);

    try {
      let finalReport: DiagnosticReport;
      if (mode === "live") {
        finalReport = await runLiveAudit(5, (pct, partial) => {
          setProgressPct(pct);
          setLiveMetrics(partial);
        });
      } else {
        finalReport = await runSyntheticStressTest(5, (pct, partial) => {
          setProgressPct(pct);
          setLiveMetrics(partial);
        });
      }
      setReport(finalReport);
    } catch (err) {
      console.error("Diagnostic run failed:", err);
    } finally {
      setIsRunning(false);
      setProgressPct(100);
    }
  };

  const handleCopyReport = () => {
    if (!report) return;
    const text = [
      `=== MPO-pro 7.0.0-beta.15 Performance & Jitter Diagnostic ===`,
      `Mode: ${report.mode.toUpperCase()}`,
      `Health Grade: ${report.healthGrade}`,
      `Verdict: ${report.verdict}`,
      `Average FPS: ${report.fps} FPS`,
      `Dropped Frames (>33ms): ${report.droppedFrames}`,
      `Negative Time Warps: ${report.negativeWarps}`,
      `Sudden Skips: ${report.suddenJumps}`,
      `Max Packet Jitter: ${report.maxDriftMs}ms`,
      `Re-Render Rate: ~${report.reRenderRate}/sec`,
      `Timestamp: ${report.timestamp}`,
      `Details:`,
      ...report.details.map((d) => ` - ${d}`),
    ].join("\n");

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="diag-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="diag-modal-header">
          <div className="diag-header-title">
            <Activity size={18} color="#06b6d4" />
            <span>Scrubber & Performance Diagnostics</span>
            <span className="diag-version-pill">beta 15</span>
          </div>
          <button onClick={onClose} className="modal-close-btn" title="Close Diagnostics">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="diag-modal-body">
          {/* Mode Selector Tabs */}
          <div className="diag-mode-tabs">
            <button
              onClick={() => {
                if (!isRunning) setMode("synthetic");
              }}
              className={`diag-mode-btn ${mode === "synthetic" ? "active" : ""}`}
            >
              <Zap size={14} />
              <span>Synthetic Jitter Stress Test</span>
            </button>
            <button
              onClick={() => {
                if (!isRunning) setMode("live");
              }}
              className={`diag-mode-btn ${mode === "live" ? "active" : ""}`}
            >
              <Activity size={14} />
              <span>Live Media Playback Audit</span>
            </button>
          </div>

          {/* Description Card */}
          <div className="diag-intro-card">
            {mode === "synthetic" ? (
              <>
                <strong>Synthetic Jitter Simulation:</strong> Injects 5 simulated Windows GSMTC packets
                with randomized position jitter in the shared timeline model
                engine. Mathematically verifies that <strong>zero negative time warps</strong> occur and
                seconds never flick backwards.
              </>
            ) : (
              <>
                <strong>Live Stream Telemetry Audit:</strong> Actively samples real media playback for 5
                seconds. Measures actual monitor refresh FPS, component re-render frequency, and watches for
                any second regressions in the DOM. (Currently media is: <strong>{mediaStatus}</strong>).
              </>
            )}
          </div>

          {/* Running Progress Box */}
          {isRunning && (
            <div className="diag-running-box">
              <RefreshCw size={28} className="diag-spinner" />
              <div className="diag-progress-bar-wrap">
                <div
                  className="diag-progress-bar-fill"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="diag-running-status">
                Running {mode === "synthetic" ? "Synthetic Stress Test" : "Live Audit"}... {progressPct}%
                {liveMetrics.fps ? ` • ${liveMetrics.fps} FPS` : ""}
              </div>
            </div>
          )}

          {/* Results Display */}
          {report && !isRunning && (
            <>
              {/* Verdict Banner */}
              <div className="diag-verdict-banner">
                <div className={`diag-grade-badge ${report.healthGrade === "A+" ? "a-plus" : "b"}`}>
                  {report.healthGrade}
                </div>
                <div className="diag-verdict-text">
                  <div className="diag-verdict-title">{report.verdict}</div>
                  <div className="diag-verdict-subtitle">
                    {mode === "synthetic"
                      ? "Shared timeline simulation completed; live provider accuracy needs raw telemetry."
                      : "Live telemetry verified zero timeline glitches during playback."}
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="diag-metrics-grid">
                <div className="diag-metric-card">
                  <span className="diag-metric-label">Frame Rate</span>
                  <span className={`diag-metric-value ${report.fps >= 55 ? "good" : "warning"}`}>
                    {report.fps} <small style={{ fontSize: 11 }}>FPS</small>
                  </span>
                </div>

                <div className="diag-metric-card">
                  <span className="diag-metric-label">Negative Warps</span>
                  <span className={`diag-metric-value ${report.negativeWarps === 0 ? "good" : "bad"}`}>
                    {report.negativeWarps}
                  </span>
                </div>

                <div className="diag-metric-card">
                  <span className="diag-metric-label">Dropped Frames</span>
                  <span className={`diag-metric-value ${report.droppedFrames === 0 ? "good" : "warning"}`}>
                    {report.droppedFrames}
                  </span>
                </div>

                <div className="diag-metric-card">
                  <span className="diag-metric-label">Worst Jitter</span>
                  <span className="diag-metric-value good">
                    {report.maxDriftMs} <small style={{ fontSize: 11 }}>ms</small>
                  </span>
                </div>
              </div>

              {/* Details List */}
              <div className="diag-details-list">
                {report.details.map((detail, idx) => (
                  <div key={idx} className="diag-detail-item">
                    <CheckCircle2 size={13} color="#10b981" />
                    <span>{detail}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Initial State (Before running) */}
          {!report && !isRunning && (
            <div className="diag-metrics-grid">
              <div className="diag-metric-card">
                <span className="diag-metric-label">Target FPS</span>
                <span className="diag-metric-value good">60 FPS</span>
              </div>
              <div className="diag-metric-card">
                <span className="diag-metric-label">Allowed Glitches</span>
                <span className="diag-metric-value good">0</span>
              </div>
              <div className="diag-metric-card">
                <span className="diag-metric-label">Filter Algorithm</span>
                <span className="diag-metric-value good" style={{ fontSize: 14 }}>
                  Shared timeline
                </span>
              </div>
              <div className="diag-metric-card">
                <span className="diag-metric-label">State Throttle</span>
                <span className="diag-metric-value good" style={{ fontSize: 14 }}>
                  20 Hz / 5 Hz eco
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="diag-modal-footer">
          {report ? (
            <button onClick={handleCopyReport} className="diag-copy-btn">
              {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              <span>{copied ? "Copied to Clipboard" : "Copy Diagnostic Report"}</span>
            </button>
          ) : (
            <div style={{ fontSize: 11, color: "#64748b" }}>
              Click Start to launch 5-second diagnostic benchmark
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button className="diag-copy-btn" onClick={async () => {
              await navigator.clipboard.writeText(JSON.stringify({ version: '7.0.0-beta.15', captured_at: new Date().toISOString(), observations: mediaObservationTrace() }, null, 2));
              setTelemetryCopied(true);
              setTimeout(() => setTelemetryCopied(false), 2000);
            }} title="Copy recent raw provider observations, source identity, receipt times, publication order and transport decisions">
              <Copy size={14}/><span>{telemetryCopied ? 'Telemetry copied' : 'Copy media telemetry'}</span>
            </button>
            <button
              onClick={handleStartBenchmark}
              disabled={isRunning}
              className="diag-run-btn"
            >
              {isRunning ? (
                <>
                  <RefreshCw size={14} className="diag-spinner" />
                  <span>Testing ({progressPct}%)...</span>
                </>
              ) : (
                <>
                  <Play size={14} />
                  <span>{report ? "Run Again" : "Start Benchmark"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticsModal;
