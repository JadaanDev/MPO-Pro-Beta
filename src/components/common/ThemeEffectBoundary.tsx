import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { themeEffectGutter, themeEffectScale, themeLayoutSize } from "../../utils/themeEffects";
import "./theme-effect-boundary.css";
import './theme-layout.css';
import type { ThemeConfig } from '../../types/themes';
import { useThemeLayout } from '../../hooks/useThemeLayout';

const useClientLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Reserve transparent paint space without masking the glass or its backdrop. */
export function ThemeEffectBoundary({ children, config, configScale = 1, fullSize = false, className = "", style }: {
  children: ReactNode;
  configScale?: number;
  config?:ThemeConfig;
  fullSize?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const layout = useRef<HTMLDivElement>(null);
  const paint = useThemeLayout(layout,config);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const scale = themeEffectScale(configScale);
  useClientLayoutEffect(() => {
    if (fullSize || !layout.current) return;
    const inner = layout.current;
    let frame = 0;
    let observedRoot: HTMLElement | null = null;
    const measure = () => {
      const root = inner.querySelector<HTMLElement>("[data-theme-layout-root]") || inner.querySelector<HTMLElement>(".mpo-theme-container");
      if (root !== observedRoot) {
        if (observedRoot) observer.unobserve(observedRoot);
        observedRoot = root;
        if (root) observer.observe(root);
      }
      if (!root) return;
      // Layout dimensions exclude animated blur/rotation, so track transitions
      // cannot make the native window resize on every animation frame.
      const intrinsic = config?.layoutBoundary && config.layoutBoundary!=='legacy' ? {width:root.offsetWidth,height:root.offsetHeight} : themeLayoutSize(root);
      const width = Math.ceil(Math.max(intrinsic.width,paint.reservedWidth) * scale);
      const height = Math.ceil(intrinsic.height * scale);
      if (width && height) setSize(previous => previous?.width === width && previous.height === height ? previous : { width, height });
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    observer.observe(inner);
    // A layer can replace its theme root without replacing the boundary itself.
    const mutations = new MutationObserver(schedule);
    mutations.observe(inner, { childList: true, subtree: true });
    window.addEventListener("resize", schedule);
    document.addEventListener("visibilitychange", schedule);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      mutations.disconnect();
      window.removeEventListener("resize", schedule);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [scale, fullSize, paint.reservedWidth,config?.layoutBoundary]);

  const gutter=themeEffectGutter(scale);
  return <div className={`mpo-theme-effect-boundary ${fullSize ? "mpo-theme-effect-full" : ""} ${className}`} style={{ paddingTop:gutter+Math.ceil(paint.top*scale),paddingRight:gutter+Math.ceil(paint.right*scale),paddingBottom:gutter+Math.ceil(paint.bottom*scale),paddingLeft:gutter+Math.ceil(paint.left*scale), ...style }}>
    <div className="mpo-theme-effect-content" style={!fullSize && size ? size : undefined}>
      <div ref={layout} className="mpo-theme-effect-layout">{children}</div>
    </div>
  </div>;
}
