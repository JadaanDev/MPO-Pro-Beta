import React, { Component, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Code, RefreshCw } from "lucide-react";
import type { ThemeBundle, MpoThemeProps } from "./types";
import { compileThemeBundle } from "./themeCompiler";
import type { MediaState } from "../../types/media";
import type { ThemeSurface } from "../schema";
import { generateSdkThemeCss, normalizeSdkTheme, type SdkRole } from "./sdkBridge";
import { SdkThemeSupplement, sdkSupplementState } from "./SdkThemeSupplement";
import { useSharedTimeline, rawTimelineMedia } from "../../hooks/useSharedTimeline";
import { timelinePresentation } from "../../utils/timelinePresentation";

const useClientLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

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
  rawMedia?: MediaState;
  artUrl: string;
  extractedColor?: string | null;
  surface?: ThemeSurface;
  format?: "horizontal" | "vertical";
  config?: Record<string, any>;
  customCss?: string;
  onCompilationResult?: (result: { success: boolean; timeMs: number; errorCount: number }) => void;
}

export const CompiledThemeRunner: React.FC<CompiledThemeRunnerProps> = ({
  bundle,
  media: inputMedia,
  rawMedia: originalMedia,
  artUrl,
  extractedColor,
  surface = "desktop",
  format = "horizontal",
  config = {},
  customCss,
  onCompilationResult,
}) => {
  const rawMedia = originalMedia || rawTimelineMedia(inputMedia);
  const media = useSharedTimeline(inputMedia);
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
    const timeline = timelinePresentation(media);
    const progress = timeline.determinate ? Math.max(0, Math.min(1, media.position_ms / media.duration_ms)) : 0;

    return {
      media,
      rawMedia,
      timeline: { positionKnown: timeline.positionKnown, durationKnown: timeline.durationKnown, kind: timeline.kind, state: timeline.state },
      artUrl,
      colors: {
        dominant,
        contrastText,
        accent: config.autoAlbumColor ? dominant : (config.accentColor || dominant),
      },
      surface,
      format,
      progress,
      formattedTime: {
        current: timeline.current,
        duration: timeline.duration || "--:--",
      },
      config,
    };
  }, [media, rawMedia, artUrl, extractedColor, surface, format, config]);

  const scopeClass = `mpo-theme-scope-${bundle.manifest.id || "custom-theme"}`;

  const hostRef = useRef<HTMLDivElement>(null);
  const [bridge, setBridge] = useState<{ frame: HTMLElement | null; roles: Set<SdkRole> }>({ frame: null, roles: new Set() });
  useClientLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const normalize = () => {
      const next = normalizeSdkTheme(host, media, config);
      const { hasSupplement, room } = sdkSupplementState(next.roles, media, config);
      if (next.frame) {
        if (hasSupplement) next.frame.setAttribute("data-mpo-has-supplement", "true");
        else next.frame.removeAttribute("data-mpo-has-supplement");
        next.frame.style.setProperty("--mpo-sdk-supplement-room", `${room}px`);
      }
      setBridge(previous => previous.frame === next.frame && [...previous.roles].join() === [...next.roles].join() ? previous : next);
    };
    normalize();
    const observer = new MutationObserver(normalize);
    observer.observe(host, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [compilation.Component, rawMedia, config, surface]);

  const universalStyles = useMemo(() => {
    const scope = `.${scopeClass}`;
    return generateSdkThemeCss(config, format, extractedColor, customCss, scope, surface === "big");
  }, [config, extractedColor, customCss, scopeClass, format, surface]);
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
      <div ref={hostRef} className={`mpo-sdk-host mpo-sdk-surface mpo-theme-container ${scopeClass}`} style={{ position: "relative", width: "100%", height: "100%", overflow: "visible", background: "transparent" }}>
        <Component {...themeProps} />
      </div>
      {bridge.frame && createPortal(<SdkThemeSupplement roles={bridge.roles} media={media} artUrl={artUrl} config={config} currentTime={themeProps.formattedTime.current} durationTime={themeProps.formattedTime.duration} />, bridge.frame)}
    </ThemeErrorBoundary>
  );
};

