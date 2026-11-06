import { useId, type CSSProperties, type PointerEvent } from "react";
import type { MediaState } from "../types/media";
import type { ThemeDefinition, ThemeSurface } from "./schema";
import { validateThemeDefinition } from "./schema";
import { CompiledThemeRunner } from "./compiler/CompiledThemeRunner";
import { generateSdkThemeCss, sdkRoleVisible, type SdkRole } from "./compiler/sdkBridge";
import { SdkThemeSupplement, sdkSupplementState } from "./compiler/SdkThemeSupplement";
import { useSharedTimeline } from "../hooks/useSharedTimeline";
import { timelinePresentation } from "../utils/timelinePresentation";

const ELEMENT_CLASS_MAP: Record<string, string> = {
  artwork: "mpo-art",
  title: "mpo-title",
  artist: "mpo-artist",
  album: "mpo-album",
  source: "mpo-badge",
  status: "mpo-playback-status",
  progress: "mpo-progress",
  text: "mpo-custom-text",
};

/** Render declarative content without executing theme-provided code. */
export function ThemeRenderer({
  theme,
  surface,
  media: rawMedia,
  artUrl,
  selectedElementId,
  onSelectElement,
  onElementPointerDown,
  onResizePointerDown,
  config,
  extractedColor,
  customCss,
}: {
  theme: ThemeDefinition;
  surface: ThemeSurface;
  media: MediaState;
  artUrl: string;
  selectedElementId?: string | null;
  onSelectElement?: (id: string) => void;
  onElementPointerDown?: (e: PointerEvent, elementId: string) => void;
  onResizePointerDown?: (e: PointerEvent, elementId: string) => void;
  config?: Record<string, any>;
  extractedColor?: string | null;
  customCss?: string;
}) {
  const scopeClass = `mpo-sdk-declarative-${useId().replace(/:/g, "")}`;
  const media = useSharedTimeline(rawMedia);
  const timeline = timelinePresentation(media);
  if (validateThemeDefinition(theme).length) return <div role="alert">This theme is invalid.</div>;
  if (theme.bundle) {
    return (
      <CompiledThemeRunner
        bundle={theme.bundle}
        media={media}
        rawMedia={rawMedia}
        artUrl={artUrl}
        surface={surface}
        format={surface === "tiktok" ? "vertical" : "horizontal"}
        config={config}
        extractedColor={extractedColor}
        customCss={customCss}
      />
    );
  }
  const elements = theme.layouts?.[surface] ?? theme.elements;
  const progress = timeline.determinate ? Math.max(0, Math.min(1, media.position_ms / media.duration_ms)) : 0;
  const roleFor = (type: string): SdkRole => type === "source" ? "badge" : type === "text" ? "themeLabel" : type as SdkRole;
  const roles = new Set(elements.map(element => roleFor(element.type)));
  const supplement = sdkSupplementState(roles, media, config || {});

  const canvasBg = theme.canvas?.background || "linear-gradient(145deg, rgba(15, 23, 42, 0.92), rgba(9, 13, 24, 0.96))";
  const canvasRadius = theme.canvas?.borderRadius ?? (surface === "big" ? 24 : 16);
  const canvasBorder = theme.canvas?.borderColor
    ? `${theme.canvas.borderWidth || 1}px solid ${theme.canvas.borderColor}`
    : "1px solid rgba(255, 255, 255, 0.12)";
  const canvasShadow = theme.canvas?.boxShadow || "var(--mpo-frame-shadow, 0 7px 18px -7px rgba(0, 0, 0, 0.36))";
  const canvasBlur = theme.canvas?.backdropBlur ? `blur(${theme.canvas.backdropBlur}px)` : undefined;

  return (
    <div
      className={`mpo-sdk-host mpo-theme-container mpo-sdk-surface-${surface} ${scopeClass}`}
      style={{ position: "relative", width: "100%", height: "100%", overflow: "visible", background: "transparent" }}
    >
    {config && <style>{generateSdkThemeCss(config, surface === "tiktok" ? "vertical" : "horizontal", extractedColor, customCss, `.${scopeClass}`, surface === "big")}</style>}
    <div
      className="mpo-sdk-surface mpo-card"
      data-theme-role="frame"
      data-theme-sdk-frame="true"
      data-mpo-has-supplement={supplement.hasSupplement ? "true" : undefined}
      style={{
        "--mpo-sdk-supplement-room": `${supplement.room}px`,
        position: "relative",
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
        background: canvasBg,
        borderRadius: canvasRadius,
        border: canvasBorder,
        boxShadow: canvasShadow,
        backdropFilter: canvasBlur,
        WebkitBackdropFilter: canvasBlur,
      } as CSSProperties}
    >
      <style>{`
        @keyframes mpo-builder-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      {elements
        .filter((element) => sdkRoleVisible(roleFor(element.type), element.visible, config))
        .map((element) => {
          const isSelected = selectedElementId === element.id;
          const elClass = ELEMENT_CLASS_MAP[element.type] || "";
          const borderRadius = element.borderRadius !== undefined
            ? element.borderRadius
            : (element.type === "artwork" ? 10 : element.type === "progress" ? 999 : 6);

          const textShadow = element.glow && element.color
            ? `0 0 10px ${element.color}, 0 0 20px ${element.color}88`
            : undefined;

          const boxShadow = element.glow && element.color && (element.type === "artwork" || element.type === "progress" || element.backgroundColor)
            ? `0 0 18px ${element.color}55`
            : undefined;

          const style: CSSProperties = {
            position: "absolute",
            left: `${element.x}%`,
            top: `${element.y}%`,
            width: `${element.width}%`,
            height: `${element.height}%`,
            color: element.color || "white",
            fontSize: element.fontSize,
            fontFamily: element.fontFamily || undefined,
            fontWeight: element.fontWeight || (element.type === "title" ? 700 : element.type === "artist" ? 500 : element.type === "source" || element.type === "status" ? 600 : 400),
            textAlign: element.textAlign || "left",
            textTransform: element.textTransform || (element.type === "source" || element.type === "status" ? "uppercase" : undefined),
            letterSpacing: element.letterSpacing || (element.type === "source" || element.type === "status" ? "0.04em" : undefined),
            opacity: element.opacity !== undefined ? element.opacity : 1,
            backgroundColor: element.backgroundColor || undefined,
            border: element.borderColor ? `${element.borderWidth || 1}px solid ${element.borderColor}` : undefined,
            textShadow,
            boxShadow,
            borderRadius,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: element.textAlign === "center" ? "center" : element.textAlign === "right" ? "flex-end" : "flex-start",
            boxSizing: "border-box",
            outline: isSelected ? "2px solid #38bdf8" : onSelectElement ? "1px dashed rgba(255,255,255,0.16)" : undefined,
            background: isSelected ? (element.backgroundColor || "rgba(56, 189, 248, 0.08)") : (element.backgroundColor || undefined),
            cursor: onElementPointerDown ? "move" : onSelectElement ? "pointer" : undefined,
            userSelect: "none",
            touchAction: "none",
          };

          let content;
          switch (element.type) {
            case "artwork": {
              const isVinyl = borderRadius >= 50 || borderRadius === 999;
              content = artUrl ? (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    position: "relative",
                    borderRadius,
                    overflow: "hidden",
                    animation: element.spinning ? "mpo-builder-spin 10s linear infinite" : undefined,
                  }}
                >
                  <img
                    className="mpo-art-img"
                    data-theme-role="artwork-image"
                    src={artUrl}
                    alt="Album artwork"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius,
                      display: "block",
                    }}
                  />
                  {isVinyl && (
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "24%",
                        height: "24%",
                        borderRadius: "50%",
                        background: "#090d18",
                        border: "2px solid rgba(255,255,255,0.4)",
                        boxShadow: "inset 0 0 6px rgba(0,0,0,0.8)",
                      }}
                    />
                  )}
                </div>
              ) : null;
              break;
            }
            case "title":
              content = <span style={{ fontWeight: "inherit", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{media.title}</span>;
              break;
            case "artist":
              content = <span style={{ fontWeight: "inherit", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{media.artist}</span>;
              break;
            case "album":
              content = <span style={{ opacity: 0.85, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{media.album_title}</span>;
              break;
            case "source":
              content = <span style={{ fontWeight: "inherit", letterSpacing: style.letterSpacing }}>{media.app_name}</span>;
              break;
            case "status": {
              const isPlaying = media.status === "Playing";
              const statusText = isPlaying
                ? (config?.themePlayingLabel || element.playingText || element.customText || "PLAYING")
                : (config?.themePausedLabel || element.pausedText || (media.status === "Paused" ? "PAUSED" : "STOPPED"));
              content = <span style={{ fontWeight: "inherit", letterSpacing: style.letterSpacing }}>{statusText}</span>;
              break;
            }
            case "text":
              content = <span style={{ fontWeight: "inherit", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{config?.themeLabel || element.customText || "CUSTOM LABEL"}</span>;
              break;
            case "progress":
              content = (
                <div data-theme-part="progress-track" data-timeline-state={timeline.state} role="progressbar" aria-label="Playback progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={timeline.determinate ? progress * 100 : undefined} aria-valuetext={timeline.label} style={{ width: "100%", height: "100%", background: element.backgroundColor || "#ffffff33", borderRadius, overflow: "hidden" }}>
                  <div data-theme-role="progress-fill" className="mpo-progress-fill" style={{ width: timeline.determinate ? `${progress * 100}%` : "25%", opacity: timeline.determinate ? 1 : .35, height: "100%", background: element.color || "currentColor", borderRadius }} />
                </div>
              );
              break;
          }

          return (
            <div
              key={element.id}
              data-theme-element={element.id}
              data-theme-type={element.type}
              data-theme-role={roleFor(element.type)}
              className={`mpo-sdk-element ${elClass}`}
              style={style}
              dir="auto"
              onPointerDown={
                onElementPointerDown
                  ? (e) => {
                      e.stopPropagation();
                      onElementPointerDown(e, element.id);
                    }
                  : undefined
              }
              onClick={
                onSelectElement
                  ? (e) => {
                      e.stopPropagation();
                      onSelectElement(element.id);
                    }
                  : undefined
              }
            >
              {content ||
                (element.type === "artwork" ? (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(99, 102, 241, 0.18)",
                      borderRadius,
                      fontSize: 28,
                    }}
                  >
                    ♫
                  </div>
                ) : null)}

              {/* Corner Resize Handle */}
              {isSelected && onResizePointerDown && (
                <div
                  data-resize-handle={element.id}
                  title="Drag to resize element"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onResizePointerDown(e, element.id);
                  }}
                  style={{
                    position: "absolute",
                    right: 0,
                    bottom: 0,
                    width: 14,
                    height: 14,
                    background: "#38bdf8",
                    borderTopLeftRadius: 4,
                    cursor: "nwse-resize",
                    zIndex: 10,
                    boxShadow: "0 0 6px rgba(0,0,0,0.5)",
                  }}
                />
              )}
            </div>
          );
        })}
      {config && <SdkThemeSupplement roles={roles} media={media} artUrl={artUrl} config={config} currentTime={timeline.current} durationTime={timeline.duration} />}
    </div>
    </div>
  );
}
