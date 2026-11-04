import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, useId } from "react";
import { createPortal } from "react-dom";
import { Check, Copy } from "lucide-react";
import { getPopoverPosition, type PopoverPosition } from "./popoverPosition.mjs";

const useClientLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export interface HexColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  onBlur?: () => void;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

const PRESET_SWATCHES = [
  "#FFFFFF",
  "#94A3B8",
  "#38BDF8",
  "#06B6D4",
  "#10B981",
  "#F59E0B",
  "#F43F5E",
  "#A855F7",
  "#6366F1",
  "#1E293B",
  "#090D18",
  "#000000",
];

export function normalizeHex(val?: string, fallback = "#FFFFFF"): string {
  if (!val) return fallback;
  let clean = val.trim().replace(/^#/, "");
  if (clean.length === 3) clean = clean.split("").map((c) => c + c).join("");
  if (/^[0-9a-fA-F]{6}$/.test(clean)) return `#${clean.toUpperCase()}`;
  return fallback;
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  let clean = hex.replace(/^#/, "");
  if (clean.length === 3) clean = clean.split("").map((c) => c + c).join("");
  if (clean.length !== 6) clean = "FFFFFF";
  const num = parseInt(clean, 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
}

function hsvToHex(h: number, s: number, v: number): string {
  s = s / 100;
  v = v / 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  const toHex = (n: number) => {
    const val = Math.round((n + m) * 255);
    return Math.max(0, Math.min(255, val)).toString(16).padStart(2, "0").toUpperCase();
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export const HexColorPicker: React.FC<HexColorPickerProps> = ({
  value,
  onChange,
  onBlur,
  label,
  className = "",
  style,
  disabled = false,
}) => {
  const currentHex = normalizeHex(value);
  const [isOpen, setIsOpen] = useState(false);
  const [typedHex, setTypedHex] = useState(currentHex);
  const [copied, setCopied] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition | null>(null);
  const popoverId = useId();
  const openRef = useRef(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const satValRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onBlurRef = useRef(onBlur);
  onBlurRef.current = onBlur;

  const closePicker = useCallback((restoreFocus = false) => {
    if (!openRef.current) return;
    openRef.current = false;
    dragCleanupRef.current?.();
    setIsOpen(false);
    setPopoverPosition(null);
    onBlurRef.current?.();
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => () => {
    dragCleanupRef.current?.();
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  }, []);

  const hsv = useMemo(() => hexToHsv(currentHex), [currentHex]);

  useEffect(() => {
    setTypedHex(currentHex);
  }, [currentHex]);

  // Portal content is outside the trigger's DOM subtree. Both belong to this
  // picker for outside-pointer and keyboard-focus dismissal.
  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: Event) => {
      const target = e.target as Node;
      if (!containerRef.current?.contains(target) && !popoverRef.current?.contains(target)) closePicker();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closePicker(true);
      }
    };
    document.addEventListener("pointerdown", handleOutside, true);
    document.addEventListener("focusin", handleOutside, true);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", handleOutside, true);
      document.removeEventListener("focusin", handleOutside, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, closePicker]);

  useClientLayoutEffect(() => {
    if (!isOpen) return;
    if (disabled) { closePicker(); return; }
    const anchor = anchorRef.current, popover = popoverRef.current;
    if (!anchor || !popover) return;
    let frame = 0;
    let previous: PopoverPosition | null = null;
    const update = () => {
      const rect = anchor.getBoundingClientRect();
      if (!anchor.isConnected || !rect.width || !rect.height) { closePicker(); return false; }
      const viewport = window.visualViewport;
      const position = getPopoverPosition(rect, {
        width: 220,
        // scrollHeight retains the natural content height when maxHeight has
        // constrained the popup, letting it grow again after a window resize.
        height: Math.max(popover.offsetHeight, popover.scrollHeight + popover.offsetHeight - popover.clientHeight),
      }, {
        left: viewport?.offsetLeft ?? 0,
        top: viewport?.offsetTop ?? 0,
        width: viewport?.width ?? document.documentElement.clientWidth,
        height: viewport?.height ?? document.documentElement.clientHeight,
      });
      if (!previous || Object.keys(position).some(key => position[key as keyof PopoverPosition] !== previous![key as keyof PopoverPosition])) {
        previous = position;
        setPopoverPosition(position);
      }
      return true;
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    const observer = new ResizeObserver(schedule);
    observer.observe(popover);
    // Parent resize notifications also cover splitters and collapsed panels.
    let parent: HTMLElement | null = anchor;
    while (parent) { observer.observe(parent); parent = parent.parentElement; }
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    document.addEventListener("toggle", schedule, true);
    window.visualViewport?.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("scroll", schedule);
    update();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      document.removeEventListener("toggle", schedule, true);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
    };
  }, [isOpen, disabled, closePicker]);

  const isPositioned = popoverPosition !== null;
  useClientLayoutEffect(() => {
    if (isOpen && isPositioned) popoverRef.current?.focus({ preventScroll: true });
  }, [isOpen, isPositioned]);

  const handleApplyColor = useCallback((nextHex: string) => {
    const valid = normalizeHex(nextHex);
    setTypedHex(valid);
    onChange(valid);
  }, [onChange]);

  // Saturation / Brightness 2D interaction
  const handleSatValPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!satValRef.current || disabled || e.button !== 0) return;
    e.preventDefault();
    dragCleanupRef.current?.();
    const rect = satValRef.current.getBoundingClientRect();
    const updateFromPointer = (clientX: number, clientY: number) => {
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
      const newS = Math.round((x / rect.width) * 100);
      const newV = Math.round(100 - (y / rect.height) * 100);
      const nextHex = hsvToHex(hsv.h, newS, newV);
      handleApplyColor(nextHex);
    };

    updateFromPointer(e.clientX, e.clientY);

    const onPointerMove = (moveEvent: PointerEvent) => {
      updateFromPointer(moveEvent.clientX, moveEvent.clientY);
    };
    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      dragCleanupRef.current = null;
    };
    dragCleanupRef.current = onPointerUp;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  // Hue Slider interaction
  const handleHuePointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!hueRef.current || disabled || e.button !== 0) return;
    e.preventDefault();
    dragCleanupRef.current?.();
    const rect = hueRef.current.getBoundingClientRect();
    const updateFromPointer = (clientX: number) => {
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const newH = Math.round((x / rect.width) * 360) % 360;
      const nextHex = hsvToHex(newH, hsv.s, hsv.v);
      handleApplyColor(nextHex);
    };

    updateFromPointer(e.clientX);

    const onPointerMove = (moveEvent: PointerEvent) => {
      updateFromPointer(moveEvent.clientX);
    };
    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      dragCleanupRef.current = null;
    };
    dragCleanupRef.current = onPointerUp;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  const handleCopyHex = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(currentHex);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const handleHexInputCommit = () => {
    const valid = normalizeHex(typedHex, currentHex);
    handleApplyColor(valid);
    onBlur?.();
  };

  return (
    <div
      ref={containerRef}
      className={`hex-color-picker-container ${className}`}
      style={{
        position: "relative",
        display: "inline-flex",
        flexDirection: "column",
        gap: 4,
        ...style,
      }}
    >
      {label && (
        <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>
          {label}
        </span>
      )}

      {/* Trigger Bar: Swatch + Monospace Uppercase HEX Input */}
      <div
        ref={anchorRef}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "3px 6px",
          background: "rgba(15, 23, 42, 0.75)",
          border: isOpen ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: 7,
          boxShadow: isOpen ? "0 0 10px rgba(56, 189, 248, 0.25)" : "none",
          transition: "border-color 0.15s ease",
        }}
      >
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => { if (isOpen) closePicker(); else { openRef.current = true; setPopoverPosition(null); setIsOpen(true); } }}
          aria-label={label ? `Choose ${label} color` : "Choose color"}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={isOpen ? popoverId : undefined}
          title={`Click to pick color (Current: ${currentHex})`}
          style={{
            width: 22,
            height: 22,
            borderRadius: 5,
            background: currentHex,
            border: "1px solid rgba(255, 255, 255, 0.25)",
            boxShadow: `0 0 6px ${currentHex}33, inset 0 0 4px rgba(0,0,0,0.4)`,
            cursor: disabled ? "not-allowed" : "pointer",
            padding: 0,
            flexShrink: 0,
          }}
        />

        <input
          type="text"
          aria-label={label ? `${label} HEX color` : "HEX color"}
          value={typedHex}
          disabled={disabled}
          spellCheck={false}
          maxLength={7}
          onChange={(e) => {
            const next = e.target.value.toUpperCase();
            setTypedHex(next);
            if (/^#[0-9A-F]{6}$/.test(next)) {
              onChange(next);
            }
          }}
          onBlur={handleHexInputCommit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleApplyColor(normalizeHex(typedHex, currentHex));
              if (isOpen) closePicker(); else onBlurRef.current?.();
            }
          }}
          style={{
            width: 74,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#f8fafc",
            fontFamily: "monospace",
            fontSize: 11.5,
            fontWeight: 600,
            letterSpacing: "0.04em",
          }}
        />

        <button
          type="button"
          onClick={handleCopyHex}
          title="Copy HEX code"
          style={{
            background: "transparent",
            border: "none",
            color: copied ? "#34d399" : "#64748b",
            cursor: "pointer",
            padding: 2,
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>

      {/* Popover Color Studio */}
      {isOpen && !disabled && typeof document !== "undefined" && createPortal(
        <div
          ref={popoverRef}
          id={popoverId}
          role="dialog"
          aria-label="HEX Color Picker"
          tabIndex={-1}
          data-placement={popoverPosition?.placement}
          onPointerDown={event => event.stopPropagation()}
          onMouseDown={event => event.stopPropagation()}
          onClick={event => event.stopPropagation()}
          style={{
            position: "fixed",
            top: popoverPosition?.top ?? 0,
            left: popoverPosition?.left ?? 0,
            visibility: popoverPosition ? "visible" : "hidden",
            zIndex: 2147483647,
            width: 220,
            maxWidth: popoverPosition?.maxWidth ?? "calc(100vw - 16px)",
            maxHeight: popoverPosition?.maxHeight ?? "calc(100vh - 16px)",
            boxSizing: "border-box",
            overflowY: "auto",
            overflowX: "hidden",
            overscrollBehavior: "contain",
            padding: 12,
            borderRadius: 12,
            background: "#090d18",
            border: "1px solid rgba(56, 189, 248, 0.35)",
            boxShadow: "0 18px 38px rgba(0, 0, 0, 0.8), 0 0 16px rgba(56, 189, 248, 0.15)",
            backdropFilter: "blur(16px)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            fontFamily: "var(--font-body, system-ui, sans-serif)",
            outline: "none",
          }}
        >
          {/* 2D Saturation & Brightness Visual Plane */}
          <div
            ref={satValRef}
            onPointerDown={handleSatValPointer}
            style={{
              position: "relative",
              width: "100%",
              height: 120,
              flexShrink: 0,
              borderRadius: 8,
              cursor: "crosshair",
              overflow: "hidden",
              backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
              backgroundImage:
                "linear-gradient(to top, #000000 0%, transparent 100%), linear-gradient(to right, #ffffff 0%, transparent 100%)",
              touchAction: "none",
            }}
          >
            {/* Thumb */}
            <div
              style={{
                position: "absolute",
                left: `${hsv.s}%`,
                top: `${100 - hsv.v}%`,
                transform: "translate(-50%, -50%)",
                width: 13,
                height: 13,
                borderRadius: "50%",
                border: "2px solid #ffffff",
                boxShadow: "0 0 4px rgba(0,0,0,0.8)",
                backgroundColor: currentHex,
                pointerEvents: "none",
              }}
            />
          </div>

          {/* Rainbow Hue Track Slider */}
          <div
            ref={hueRef}
            onPointerDown={handleHuePointer}
            style={{
              position: "relative",
              width: "100%",
              height: 12,
              flexShrink: 0,
              borderRadius: 6,
              cursor: "pointer",
              background:
                "linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)",
              touchAction: "none",
            }}
          >
            {/* Hue Thumb */}
            <div
              style={{
                position: "absolute",
                left: `${(hsv.h / 360) * 100}%`,
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "#ffffff",
                border: "2px solid #090d18",
                boxShadow: "0 0 4px rgba(0,0,0,0.6)",
                pointerEvents: "none",
              }}
            />
          </div>

          {/* Preset Swatches Palette */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
            <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>SWATCHES</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 5 }}>
              {PRESET_SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  title={swatch}
                  onClick={() => handleApplyColor(swatch)}
                  style={{
                    height: 20,
                    borderRadius: 4,
                    background: swatch,
                    border: currentHex === swatch ? "2px solid #38bdf8" : "1px solid rgba(255,255,255,0.15)",
                    boxShadow: currentHex === swatch ? "0 0 6px #38bdf8" : "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Canonical HEX Display Footer */}
          <div
            style={{
              display: "flex",
              flexShrink: 0,
              flexWrap: "wrap",
              gap: 6,
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 6,
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  background: currentHex,
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              />
              <span style={{ fontSize: 11, fontFamily: "monospace", color: "#38bdf8", fontWeight: 700 }}>
                {currentHex}
              </span>
            </div>

            <button
              type="button"
              onClick={() => closePicker(true)}
              style={{
                padding: "3px 8px",
                borderRadius: 5,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "#cbd5e1",
                fontSize: 10.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Done
            </button>
          </div>
        </div>, document.body
      )}
    </div>
  );
};
