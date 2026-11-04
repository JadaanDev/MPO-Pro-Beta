import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { themeEffectGutter, themeEffectScale } from "../../utils/themeEffects";
import "./theme-effect-boundary.css";

const useClientLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Reserve transparent paint space without masking the glass or its backdrop. */
export function ThemeEffectBoundary({ children, configScale = 1, fullSize = false, className = "", style }: {
  children: ReactNode;
  configScale?: number;
  fullSize?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const layout = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const scale = themeEffectScale(configScale);
  useClientLayoutEffect(() => {
    if (fullSize || !layout.current) return;
    const inner = layout.current;
    const measure = () => {
      const root = inner.querySelector<HTMLElement>(".mpo-theme-container");
      if (!root) return;
      // Layout dimensions exclude animated blur/rotation, so track transitions
      // cannot make the native window resize on every animation frame.
      const width = Math.ceil(Math.max(root.offsetWidth, root.scrollWidth) * scale);
      const height = Math.ceil(Math.max(root.offsetHeight, root.scrollHeight) * scale);
      if (width && height) setSize(previous => previous?.width === width && previous.height === height ? previous : { width, height });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(inner);
    const root = inner.querySelector<HTMLElement>(".mpo-theme-container");
    if (root) observer.observe(root);
    measure();
    return () => observer.disconnect();
  }, [scale, fullSize, children]);

  return <div className={`mpo-theme-effect-boundary ${fullSize ? "mpo-theme-effect-full" : ""} ${className}`} style={{ padding: themeEffectGutter(scale), ...style }}>
    <div className="mpo-theme-effect-content" style={!fullSize && size ? size : undefined}>
      <div ref={layout} className="mpo-theme-effect-layout">{children}</div>
    </div>
  </div>;
}
