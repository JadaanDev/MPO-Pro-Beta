import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { recommendedSourceSize, SOURCE_QUALITY_SCALE } from "../../utils/browserSource";
import { themeEffectSize, themeLayoutSize } from "../../utils/themeEffects";
import { ThemeEffectBoundary } from "../common/ThemeEffectBoundary";
import type { ThemeConfig } from '../../types/themes';

const useClientLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Fit using layout zoom so WebView renders text at the final size instead of scaling a bitmap. */
export const AutoFitPreview: React.FC<{ children: React.ReactNode; config?:ThemeConfig; configScale: number; contentKey: string; onContentSize?: (size: { width: number; height: number }) => void }> = ({ children, config, configScale, contentKey, onContentSize }) => {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);
  const lastSize = useRef<{ width: number; height: number } | null>(null);
  useClientLayoutEffect(() => {
    const container = viewport.current;
    const inner = content.current;
    if (!container || !inner) return;
    const measure = () => {
      const root = inner.querySelector<HTMLElement>("[data-theme-layout-root]") || inner.querySelector<HTMLElement>(".mpo-theme-container");
      const themeScale = Number.isFinite(configScale) ? Math.max(.1, configScale) : 1;
      const layout = root ? themeLayoutSize(root) : { width: 0, height: 0 };
      const rootWidth = layout.width;
      const rootHeight = layout.height;
      const boundary=inner.querySelector<HTMLElement>('.mpo-theme-effect-boundary');
      if (rootWidth && rootHeight) {
        const size = boundary?.offsetWidth && boundary?.offsetHeight ? {width:Math.ceil(boundary.offsetWidth*SOURCE_QUALITY_SCALE),height:Math.ceil(boundary.offsetHeight*SOURCE_QUALITY_SCALE)} : recommendedSourceSize(rootWidth, rootHeight, themeScale);
        if (size.width !== lastSize.current?.width || size.height !== lastSize.current?.height) {
          lastSize.current = size;
          onContentSize?.(size);
        }
      }
      const { width, height } = boundary?.offsetWidth && boundary.offsetHeight ? {width:boundary.offsetWidth,height:boundary.offsetHeight} : rootWidth && rootHeight
        ? themeEffectSize(rootWidth, rootHeight, themeScale)
        : { width: inner.offsetWidth, height: inner.offsetHeight };
      if (!width || !height || !container.clientWidth || !container.clientHeight) return;
      const next = Math.min(1, container.clientWidth / width, container.clientHeight / height);
      if (Math.abs(scaleRef.current - next) > .001) {
        scaleRef.current = next;
        setScale(next);
      }
    };
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(inner);
    const boundary=inner.querySelector<HTMLElement>('.mpo-theme-effect-boundary');if(boundary)observer.observe(boundary);
    const root = inner.querySelector<HTMLElement>("[data-theme-layout-root]") || inner.querySelector<HTMLElement>(".mpo-theme-container");
    if (root) observer.observe(root);
    // WebView2 can suspend resize notifications while the window is minimized.
    const remeasure = () => requestAnimationFrame(measure);
    window.addEventListener("resize", remeasure);
    document.addEventListener("visibilitychange", remeasure);
    measure();
    return () => { observer.disconnect(); window.removeEventListener("resize", remeasure); document.removeEventListener("visibilitychange", remeasure); };
  }, [configScale, contentKey, onContentSize]);
  return <div className="auto-fit-preview" ref={viewport}><div ref={content} className="auto-fit-content" style={{ zoom: scale < 0.999 ? scale : 1 }}><ThemeEffectBoundary config={config} configScale={configScale}>{children}</ThemeEffectBoundary></div></div>;
};
