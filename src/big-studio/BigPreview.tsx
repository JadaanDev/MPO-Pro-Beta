import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
const useClientLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
/** Render at 1280×720, fitting both available dimensions in the editor. */
export function BigPreview({ children }: { children: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  useClientLayoutEffect(() => {
    const parent = frame.current?.parentElement;
    if (!parent) return;
    const measure = () => {
      if (parent.clientWidth > 0 && parent.clientHeight > 0) {
        const next = Math.min(parent.clientWidth, parent.clientHeight * 16 / 9);
        setWidth(previous => previous !== null && Math.abs(previous-next) < .5 ? previous : next);
      }
    };
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    window.addEventListener("resize", measure);
    document.addEventListener("visibilitychange", measure);
    measure();
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); document.removeEventListener("visibilitychange", measure); };
  }, []);
  return <div ref={frame} className="big-preview-frame preview-canvas-scope big-preview-contained" style={{width:width ?? "100%"}}>
    <div style={{ width: 1280, height: 720, zoom: (width ?? 1280) / 1280 }}>{children}</div>
  </div>;
}
