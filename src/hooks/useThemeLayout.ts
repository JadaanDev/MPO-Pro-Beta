import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';
import type { ThemeConfig, TextElement } from '../types/themes';
import { roleTarget, roleTargets, type ArrangeRole } from '../utils/themeRoles';
import { constrainedDelta, contentWidth } from '../utils/arrangeGeometry';
const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const textRoles: TextElement[] = ['title', 'artist', 'album', 'themeLabel', 'badge', 'timestamps', 'status'];
export interface LayoutPaint {
    left: number;
    right: number;
    top: number;
    bottom: number;
    reservedWidth: number;
}
const EMPTY: LayoutPaint = { left: 0, right: 0, top: 0, bottom: 0, reservedWidth: 0 };
/** Opt-in layout policies. Only variables/attributes and a decorative surface
 * are owned here; React's text nodes and authored layout are never reparented. */
export function useThemeLayout(container: RefObject<HTMLDivElement>, config?: ThemeConfig): LayoutPaint {
    const [paint, setPaint] = useState(EMPTY);
    const configKey = JSON.stringify(config);
    useClientLayoutEffect(() => {
        const root = container.current;
        const active = !!config && (config.widthMode === 'content' || config.layoutBoundary && config.layoutBoundary !== 'legacy' || Object.values(config.typography || {}).some(t => t?.overflow && t.overflow !== 'theme'));
        if (!root || !config || !active) {
            setPaint(previous => previous === EMPTY ? previous : EMPTY);
            return;
        }
        let raf = 0, disposed = false, surface: HTMLDivElement | null = null, frame: HTMLElement | null = null;
        const autoDirections = new Set<HTMLElement>();
        const owned = new Set<HTMLElement>(), baseFonts = new WeakMap<HTMLElement, number>(), baseShadows = new WeakMap<HTMLElement, string>();
        const context = document.createElement('canvas').getContext('2d');
        const variable = (el: HTMLElement, name: string, value: string) => { owned.add(el); if (el.style.getPropertyValue(name) !== value)
            el.style.setProperty(name, value); };
        const marker = (el: HTMLElement, name: string, value = '') => { owned.add(el); if (el.getAttribute(name) !== value)
            el.setAttribute(name, value); };
        const naturalText = (el: HTMLElement, base?: number) => {
            const style = getComputedStyle(el), font = base ?? (parseFloat(style.fontSize) || 16);
            if (!context)
                return el.scrollWidth;
            context.font = `${style.fontStyle} ${style.fontWeight} ${font}px ${style.fontFamily}`;
            context.direction = style.direction === 'rtl' ? 'rtl' : 'ltr';
            let text = el.textContent || '';
            if (style.textTransform === 'uppercase')
                text = text.toLocaleUpperCase();
            if (style.textTransform === 'lowercase')
                text = text.toLocaleLowerCase();
            return context.measureText(text).width + Math.max(0, text.length - 1) * (parseFloat(style.letterSpacing) || 0);
        };
        const measure = () => {
            if (disposed)
                return;
            const nextFrame = roleTarget(root, 'frame');
            if (!nextFrame)
                return;
            if (frame !== nextFrame) {
                surface?.remove();
                surface = null;
                frame = nextFrame;
            }
            const layout = root.querySelector<HTMLElement>('[data-theme-layout-root],.mpo-theme-container') || frame;
            const policy = config.layoutBoundary || 'legacy';
            // Restore native appearance only while sampling it. The extension carries
            // the foreground surface outside its nominal layout without percentage reflow.
            if (policy === 'grow' && !surface) {
                frame.removeAttribute('data-mpo-grow-frame');
                const cs = getComputedStyle(frame);
                surface = document.createElement('div');
                surface.setAttribute('data-mpo-frame-extension', '');
                Object.assign(surface.style, { position: 'absolute', pointerEvents: 'none', zIndex: '-1', boxSizing: 'border-box', background: cs.background, border: cs.border, borderRadius: cs.borderRadius, boxShadow: cs.boxShadow, backdropFilter: cs.backdropFilter, WebkitBackdropFilter: cs.backdropFilter });
                frame.appendChild(surface);
                marker(frame, 'data-mpo-grow-frame');
            }
            let reservedWidth = 0;
            if (config.widthMode === 'content') {
                const bounds = contentWidth(0, config.contentMinWidth, config.contentMaxWidth);
                reservedWidth = bounds.max;
                variable(frame, '--mpo-content-width', `${bounds.max}px`);
                marker(frame, 'data-mpo-content-width');
                const w = frame.offsetWidth;
                const wanted = ['title', 'artist', 'album'].flatMap(role => roleTargets(frame!, role as ArrangeRole)).filter(el => !el.closest('[data-mpo-sdk-supplement]')).map(el => {
                    const style = getComputedStyle(el), available = el.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0);
                    const natural = naturalText(el, baseFonts.get(el));
                    return style.position === 'absolute' ? natural / Math.max(.01, available / Math.max(1, w)) : w - Math.max(0, available) + natural;
                });
                variable(frame, '--mpo-content-width', `${contentWidth(Math.max(bounds.min, ...wanted), bounds.min, bounds.max).width}px`);
            }
            for (const role of textRoles) {
                const appearance = config.typography?.[role], mode = appearance?.overflow;
                if (!mode || mode === 'theme')
                    continue;
                for (const el of roleTargets(frame, role)) {
                    if (!el.hasAttribute('dir')) {
                        el.setAttribute('dir', 'auto');
                        autoDirections.add(el);
                    }
                    const cs = getComputedStyle(el), base = baseFonts.get(el) ?? (parseFloat(cs.fontSize) || 16);
                    baseFonts.set(el, base);
                    const available = Math.max(1, el.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0));
                    const natural = naturalText(el, base);
                    marker(el, 'data-mpo-text-overflow', mode);
                    for (const node of [el, ...Array.from(el.querySelectorAll<HTMLElement>('span,div'))])
                        if (/marquee|ticker|scroll/i.test(getComputedStyle(node).animationName))
                            marker(node, 'data-mpo-stop-text-scroll');
                    if (mode === 'shrink') {
                        const minimum = Math.min(base, Math.max(1, appearance?.minSize ?? 12));
                        variable(el, '--mpo-fit-font-size', `${Math.min(base, Math.max(minimum, base * available / Math.max(1, natural)))}px`);
                    }
                    if (mode === 'marquee') {
                        const overflow = Math.max(0, natural - available);
                        const sign = cs.direction === 'rtl' ? 1 : -1;
                        marker(el, 'data-mpo-marquee-text', el.textContent || '');
                        marker(el, 'data-mpo-marquee-active', overflow > 1 ? 'true' : 'false');
                        variable(el, '--mpo-marquee-distance', `${sign * overflow}px`);
                        variable(el, '--mpo-marquee-duration', `${Math.max(3, overflow / Math.max(1, appearance?.marqueeSpeed ?? 30) + 3)}s`);
                        if (!baseShadows.has(el))
                            baseShadows.set(el, cs.textShadow);
                        variable(el, '--mpo-marquee-color', cs.color);
                        variable(el, '--mpo-marquee-shadow', baseShadows.get(el) || 'none');
                    }
                }
            }
            if (policy === 'constrain') {
                for (const role of Object.keys(config.elementPositions || {}) as ArrangeRole[]) {
                    if (role === 'frame' || !textRoles.includes(role as TextElement) && !['artwork', 'progress', 'indicator'].includes(role))
                        continue;
                    for (const el of roleTargets(frame, role)) {
                        el.removeAttribute('data-mpo-constrained');
                        const f = frame.getBoundingClientRect();
                        let r = el.getBoundingClientRect();
                        const p = config.elementPositions?.[role] || { x: 0, y: 0, scale: 1 }, factor = Math.min(1, f.width / Math.max(1, r.width), f.height / Math.max(1, r.height));
                        variable(el, '--mpo-constrained-scale', `${(p.scale ?? 1) * factor}`);
                        marker(el, 'data-mpo-constrained');
                        variable(el, '--mpo-constrained-translate', `${p.x}px ${p.y}px`);
                        r = el.getBoundingClientRect();
                        const scale = f.width / Math.max(1, frame.offsetWidth);
                        const delta = constrainedDelta({ x: r.left, y: r.top, width: r.width, height: r.height }, { x: f.left, y: f.top, width: f.width, height: f.height }, { x: 0, y: 0 });
                        variable(el, '--mpo-constrained-translate', `${p.x + delta.x / scale}px ${p.y + delta.y / scale}px`);
                    }
                }
            }
            const lr = layout.getBoundingClientRect(), fr = frame.getBoundingClientRect(), scale = lr.width / Math.max(1, layout.offsetWidth);
            const rects = [fr];
            if (policy === 'overflow' || policy === 'grow')
                for (const role of Object.keys(config.elementPositions || {}) as ArrangeRole[])
                    if (role !== 'frame' && role in { title: 1, artist: 1, album: 1, themeLabel: 1, badge: 1, status: 1, timestamps: 1, artwork: 1, progress: 1, indicator: 1 })
                        for (const el of roleTargets(frame, role))
                            rects.push(el.getBoundingClientRect());
            const minX = Math.min(...rects.map(r => r.left)), maxX = Math.max(...rects.map(r => r.right)), minY = Math.min(...rects.map(r => r.top)), maxY = Math.max(...rects.map(r => r.bottom));
            if (surface) {
                const unit = fr.width / Math.max(1, frame.offsetWidth);
                Object.assign(surface.style, { left: `${Math.min(0, (minX - fr.left) / unit) - frame.clientLeft}px`, top: `${Math.min(0, (minY - fr.top) / unit) - frame.clientTop}px`, width: `${(maxX - minX) / unit}px`, height: `${(maxY - minY) / unit}px` });
            }
            const next = { left: Math.max(0, (lr.left - minX) / scale), right: Math.max(0, (maxX - lr.right) / scale), top: Math.max(0, (lr.top - minY) / scale), bottom: Math.max(0, (maxY - lr.bottom) / scale), reservedWidth };
            setPaint(old => Object.keys(next).every(key => Math.abs(old[key as keyof LayoutPaint] - next[key as keyof LayoutPaint]) < .5) ? old : next);
        };
        const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
        const observer = new ResizeObserver(schedule);
        observer.observe(root);
        const observed = new Set<HTMLElement>();
        const observeTargets = () => { for (const el of observed)
            if (!root.contains(el)) {
                observer.unobserve(el);
                observed.delete(el);
                owned.delete(el);
                autoDirections.delete(el);
            } const card = roleTarget(root, 'frame'); if (card) {
            for (const el of [card, ...textRoles.flatMap(role => roleTargets(card, role))])
                if (!observed.has(el)) {
                    observer.observe(el);
                    observed.add(el);
                }
        } };
        const mutations = new MutationObserver(() => { observeTargets(); schedule(); });
        mutations.observe(root, { childList: true, subtree: true, characterData: true });
        window.addEventListener('resize', schedule);
        document.fonts?.addEventListener('loadingdone', schedule);
        document.fonts?.ready.then(() => { if (!disposed)
            schedule(); });
        observeTargets();
        measure();
        return () => { disposed = true; cancelAnimationFrame(raf); observer.disconnect(); mutations.disconnect(); window.removeEventListener('resize', schedule); document.fonts?.removeEventListener('loadingdone', schedule); surface?.remove(); for (const el of autoDirections)
            el.removeAttribute('dir'); for (const el of owned) {
            for (const attr of ['data-mpo-grow-frame', 'data-mpo-content-width', 'data-mpo-text-overflow', 'data-mpo-marquee-text', 'data-mpo-marquee-active', 'data-mpo-constrained', 'data-mpo-stop-text-scroll'])
                el.removeAttribute(attr);
            for (let i = el.style.length - 1; i >= 0; i--) {
                const key = el.style[i];
                if (key.startsWith('--mpo-content-') || key.startsWith('--mpo-fit-') || key.startsWith('--mpo-marquee-') || key.startsWith('--mpo-constrained-'))
                    el.style.removeProperty(key);
            }
        } };
    }, [container, configKey]);
    return paint;
}
