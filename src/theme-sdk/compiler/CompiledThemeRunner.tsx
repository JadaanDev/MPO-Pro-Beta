import React, { Component, useMemo } from "react";
import { AlertTriangle, Code, RefreshCw } from "lucide-react";
import type { ThemeBundle, MpoThemeProps } from "./types";
import { compileThemeBundle } from "./themeCompiler";
import type { MediaState } from "../../types/media";
import type { ThemeSurface } from "../schema";

interface ThemeErrorBoundaryProps {
  themeName: string;
  children: React.ReactNode;
  onRetry?: () => void;
}

interface ThemeErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ThemeErrorBoundary extends Component<ThemeErrorBoundaryProps, ThemeErrorBoundaryState> {
  constructor(props: ThemeErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ThemeErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[MPO Theme Runtime Error in "${this.props.themeName}"]`, error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            minHeight: "140px",
            background: "rgba(15, 23, 42, 0.95)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            borderRadius: "12px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            color: "#f87171",
            fontFamily: "monospace",
            boxSizing: "border-box",
            textAlign: "center",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertTriangle size={18} color="#ef4444" />
            <span style={{ fontWeight: 600, fontSize: "14px" }}>
              Theme Runtime Error ({this.props.themeName})
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "12px", color: "#fca5a5", maxWidth: "90%", wordBreak: "break-word" }}>
            {this.state.error?.message || "An unexpected error occurred while rendering this theme."}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              marginTop: "6px",
              padding: "4px 12px",
              fontSize: "11px",
              background: "rgba(239, 68, 68, 0.2)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              color: "#fecaca",
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <RefreshCw size={12} />
            <span>Retry Execution</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export interface CompiledThemeRunnerProps {
  bundle: ThemeBundle;
  media: MediaState;
  artUrl: string;
  extractedColor?: string | null;
  surface?: ThemeSurface;
  format?: "horizontal" | "vertical";
  config?: Record<string, any>;
  onCompilationResult?: (result: { success: boolean; timeMs: number; errorCount: number }) => void;
}

export const CompiledThemeRunner: React.FC<CompiledThemeRunnerProps> = ({
  bundle,
  media,
  artUrl,
  extractedColor,
  surface = "desktop",
  format = "horizontal",
  config = {},
  onCompilationResult,
}) => {
  // Compile the bundle
  const compilation = useMemo(() => {
    const res = compileThemeBundle(bundle);
    onCompilationResult?.({
      success: res.success,
      timeMs: res.compilationTimeMs,
      errorCount: res.diagnostics.filter((d) => d.severity === "error").length,
    });
    return res;
  }, [bundle, onCompilationResult]);

  // Compute normalized props
  const themeProps: MpoThemeProps = useMemo(() => {
    const dominant = extractedColor || "#38bdf8";
    const contrastText = "#ffffff";
    const progress =
      media.duration_ms > 0
        ? Math.max(0, Math.min(1, media.position_ms / media.duration_ms))
        : 0;

    const formatTime = (ms: number) => {
      const totalSec = Math.floor(Math.max(0, ms) / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      return `${min}:${sec < 10 ? "0" : ""}${sec}`;
    };

    return {
      media,
      artUrl,
      colors: {
        dominant,
        contrastText,
        accent: dominant,
      },
      surface,
      format,
      progress,
      formattedTime: {
        current: formatTime(media.position_ms),
        duration: formatTime(media.duration_ms),
      },
      config,
    };
  }, [media, artUrl, extractedColor, surface, format, config]);

  const scopeClass = `mpo-theme-scope-${bundle.manifest.id || "custom-theme"}`;

  // Universal CSS Variables & Semantic Rules Bridge (Beta 9)
  const universalStyles = useMemo(() => {
    const dominant = extractedColor || "#38bdf8";
    const contrastText = "#ffffff";
    const cssVars: Record<string, string> = {
      "--mpo-card-radius": config.borderRadius !== undefined ? `${config.borderRadius}px` : "24px",
      "--mpo-card-blur": config.blur !== undefined ? `${config.blur}px` : "40px",
      "--mpo-card-opacity": config.opacity !== undefined ? `${config.opacity}` : "0.85",
      "--mpo-glow-intensity": config.glowIntensity !== undefined ? `${config.glowIntensity}` : "1",
      "--mpo-glow-color": config.glowColor || config.accentColor || dominant,
      "--mpo-frame-padding": config.framePadding !== undefined ? `${config.framePadding}px` : "0px",
      "--mpo-font-family": config.fontFamily || "inherit",
      "--mpo-title-size": config.titleSize ? `${config.titleSize}px` : (config.titleFontSize ? `${config.titleFontSize}px` : "inherit"),
      "--mpo-artist-size": config.artistSize ? `${config.artistSize}px` : (config.artistFontSize ? `${config.artistFontSize}px` : "inherit"),
      "--mpo-text-color": config.titleColor || config.textColor || contrastText,
      "--mpo-art-display": config.showArt === false ? "none" : "flex",
      "--mpo-title-display": config.showTitle === false ? "none" : "block",
      "--mpo-artist-display": config.showArtist === false ? "none" : "block",
      "--mpo-album-display": config.showAlbum === false ? "none" : "block",
      "--mpo-badge-display": config.showBadge === false ? "none" : "inline-flex",
      "--mpo-progress-display": config.showProgress === false ? "none" : "block",
      "--mpo-timestamps-display": config.showTimestamps === false ? "none" : "flex",
      "--mpo-status-display": config.showPlaybackStatus === false ? "none" : "inline-flex",
      "--mpo-visualizer-display": config.showVisualizer === false ? "none" : "inline-flex",
    };

    if (config.elementPositions) {
      for (const [role, pos] of Object.entries(config.elementPositions)) {
        if (pos && typeof pos === "object") {
          const p = pos as { x?: number; y?: number; scale?: number };
          cssVars[`--mpo-pos-${role}-x`] = `${p.x || 0}px`;
          cssVars[`--mpo-pos-${role}-y`] = `${p.y || 0}px`;
          cssVars[`--mpo-scale-${role}`] = `${p.scale || 1}`;
        }
      }
    }

    const varLines = Object.entries(cssVars)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join("\n");

    const rules = `
.${scopeClass} {
${varLines}
}

.${scopeClass} :is([data-theme-role="artwork"], .mpo-art, [class*="artwork-container"], [class*="artwork-frame"]) {
  display: var(--mpo-art-display, flex) !important;
  transform: translate3d(var(--mpo-pos-artwork-x, 0px), var(--mpo-pos-artwork-y, 0px), 0) scale(var(--mpo-scale-artwork, 1)) !important;
}

.${scopeClass} :is([data-theme-role="title"], .mpo-title, [class*="track-title"]) {
  display: var(--mpo-title-display, block) !important;
  font-family: var(--mpo-font-family, inherit) !important;
  font-size: var(--mpo-title-size, inherit) !important;
  color: var(--mpo-text-color, inherit) !important;
  transform: translate3d(var(--mpo-pos-title-x, 0px), var(--mpo-pos-title-y, 0px), 0) scale(var(--mpo-scale-title, 1)) !important;
}

.${scopeClass} :is([data-theme-role="artist"], .mpo-artist, [class*="track-subtitle"]) {
  display: var(--mpo-artist-display, block) !important;
  font-family: var(--mpo-font-family, inherit) !important;
  font-size: var(--mpo-artist-size, inherit) !important;
  transform: translate3d(var(--mpo-pos-artist-x, 0px), var(--mpo-pos-artist-y, 0px), 0) scale(var(--mpo-scale-artist, 1)) !important;
}

.${scopeClass} :is([data-theme-role="album"], .mpo-album) {
  display: var(--mpo-album-display, block) !important;
  transform: translate3d(var(--mpo-pos-album-x, 0px), var(--mpo-pos-album-y, 0px), 0) scale(var(--mpo-scale-album, 1)) !important;
}

.${scopeClass} :is([data-theme-role="progress"], .mpo-progress, [class*="scrubber-section"], [class*="progress-track"]) {
  display: var(--mpo-progress-display, block) !important;
  transform: translate3d(var(--mpo-pos-progress-x, 0px), var(--mpo-pos-progress-y, 0px), 0) scale(var(--mpo-scale-progress, 1)) !important;
}

.${scopeClass} :is([data-theme-role="timestamps"], .mpo-universal-timestamps, [class*="timestamps"]) {
  display: var(--mpo-timestamps-display, flex) !important;
  transform: translate3d(var(--mpo-pos-timestamps-x, 0px), var(--mpo-pos-timestamps-y, 0px), 0) scale(var(--mpo-scale-timestamps, 1)) !important;
}

.${scopeClass} :is([data-theme-role="status"], .mpo-playback-status, [class*="status-badge"]) {
  display: var(--mpo-status-display, inline-flex) !important;
  transform: translate3d(var(--mpo-pos-status-x, 0px), var(--mpo-pos-status-y, 0px), 0) scale(var(--mpo-scale-status, 1)) !important;
}

.${scopeClass} :is([data-theme-role="indicator"], .mpo-visualizer, [class*="equalizer"], [class*="visualizer"]) {
  display: var(--mpo-visualizer-display, inline-flex) !important;
  transform: translate3d(var(--mpo-pos-indicator-x, 0px), var(--mpo-pos-indicator-y, 0px), 0) scale(var(--mpo-scale-indicator, 1)) !important;
}

.${scopeClass} :is([data-theme-role="badge"], .mpo-badge, [class*="route-pill"]) {
  display: var(--mpo-badge-display, inline-flex) !important;
  transform: translate3d(var(--mpo-pos-badge-x, 0px), var(--mpo-pos-badge-y, 0px), 0) scale(var(--mpo-scale-badge, 1)) !important;
}

.${scopeClass} :is(.ios-card, .custom-theme-card, .mpo-card, [class*="-card"]) {
  border-radius: var(--mpo-card-radius, inherit) !important;
  box-shadow: var(--mpo-frame-shadow, 0 7px 18px -7px rgba(0, 0, 0, 0.36)) !important;
  backdrop-filter: blur(var(--mpo-card-blur, 40px)) !important;
  -webkit-backdrop-filter: blur(var(--mpo-card-blur, 40px)) !important;
}
`;
    return rules;
  }, [config, extractedColor, scopeClass]);

  if (!compilation.success || !compilation.Component) {
    const errorDiag = compilation.diagnostics.find((d) => d.severity === "error");
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          minHeight: "120px",
          background: "rgba(15, 23, 42, 0.95)",
          border: "1px solid rgba(245, 158, 11, 0.4)",
          borderRadius: "12px",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          color: "#fbbf24",
          fontFamily: "monospace",
          fontSize: "12px",
          boxSizing: "border-box",
          textAlign: "center",
          gap: "6px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
          <Code size={16} color="#f59e0b" />
          <span>Compilation Failed in {errorDiag?.file || "Theme"}</span>
        </div>
        <p style={{ margin: 0, color: "#fef3c7", maxWidth: "90%", wordBreak: "break-word" }}>
          {errorDiag?.line ? `Line ${errorDiag.line}: ` : ""}
          {errorDiag?.message || "Check theme code in Code Studio."}
        </p>
      </div>
    );
  }

  const Component = compilation.Component;

  return (
    <ThemeErrorBoundary themeName={bundle.manifest.name}>
      {compilation.scopedCss && <style>{compilation.scopedCss}</style>}
      {universalStyles && <style>{universalStyles}</style>}
      <div className={`mpo-sdk-host mpo-sdk-surface mpo-theme-container ${scopeClass}`} style={{ position: "relative", width: "100%", height: "100%", overflow: "visible", background: "transparent" }}>
        <Component {...themeProps} />
      </div>
    </ThemeErrorBoundary>
  );
};

