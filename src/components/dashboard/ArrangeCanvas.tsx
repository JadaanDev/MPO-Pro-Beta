import { StudioSelect } from "../common/StudioSelect";
import { useEffect, useLayoutEffect, useRef, useState, type HTMLAttributes, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import type { ThemeConfig, TextElement } from '../../types/themes';
import { ARRANGE_ROLE_LABELS, roleFromTarget, roleTarget, type ArrangeRole } from '../../utils/themeRoles';
import { constrainedDelta, pointerDelta, proportionalResize, restoreGesture } from '../../utils/arrangeGeometry';
import './arrange-canvas.css';
const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const UI_TARGET = '[data-arrange-ui],[data-arrange-handle],input,select,textarea,[contenteditable="true"]';
const DRAG_THRESHOLD = 5; // Screen pixels, independent of preview or theme scale.
type GestureEdit = {
    before: ThemeConfig;
    after: ThemeConfig;
};
type EditSnapshot = { current: ThemeConfig };
function effectivePlacement(el: HTMLElement, position: {
    x: number;
    y: number;
    scale?: number;
}, policy: ThemeConfig['layoutBoundary']) {
    if (policy !== 'constrain' || !el.hasAttribute('data-mpo-constrained'))
        return position;
    const css = getComputedStyle(el), parts = css.translate.split(' ').map(parseFloat), scale = parseFloat(css.scale);
    return { x: Number.isFinite(parts[0]) ? parts[0] : position.x, y: Number.isFinite(parts[1]) ? parts[1] : position.y, scale: Number.isFinite(scale) ? scale : position.scale };
}
interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
    enabled: boolean;
    selected: ArrangeRole | null;
    onSelect: (role: ArrangeRole | null) => void;
    config: ThemeConfig;
    onConfigChange: (fn: (config: ThemeConfig) => ThemeConfig) => void;
    onCommitHistory?: (description?: string) => void;
    layerKey: string;
}
export function ArrangeCanvas({ enabled, selected, onSelect, config, onConfigChange, onCommitHistory, layerKey, children, ...props }: Props) {
    const host = useRef<HTMLDivElement>(null), latest = useRef(config);
    latest.current = config;
    const stop = useRef<(() => void) | null>(null), abort = useRef<(() => void) | null>(null);
    const historyFrames = useRef(new Set<number>());
    const [box, setBox] = useState<{
        left: number;
        top: number;
        width: number;
        height: number;
    } | null>(null);
    const [mode, setMode] = useState<'scale' | 'size'>('scale');
    const [past, setPast] = useState<GestureEdit[]>([]), [future, setFuture] = useState<GestureEdit[]>([]);
    const [dragging, setDragging] = useState(false);
    useEffect(() => { setPast([]); setFuture([]); }, [layerKey]);
    useEffect(() => { setDragging(false); return () => { stop.current?.(); historyFrames.current.forEach(frame => cancelAnimationFrame(frame)); historyFrames.current.clear(); }; }, [enabled, layerKey]);
    useClientLayoutEffect(() => {
        if (!enabled || !selected || !host.current) {
            setBox(null);
            return;
        }
        const root = host.current;
        let frame = 0;
        const measure = () => { const target = roleTarget(root, selected); if (!target) {
            setBox(null);
            return;
        } const r = target.getBoundingClientRect(); setBox(old => old && Math.abs(old.left - r.left) < .2 && Math.abs(old.top - r.top) < .2 && Math.abs(old.width - r.width) < .2 && Math.abs(old.height - r.height) < .2 ? old : { left: r.left, top: r.top, width: r.width, height: r.height }); };
        const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
        const observer = new ResizeObserver(schedule);
        observer.observe(root);
        const target = roleTarget(root, selected);
        if (target)
            observer.observe(target);
        const mutation = new MutationObserver(schedule);
        mutation.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
        window.addEventListener('scroll', schedule, true);
        window.addEventListener('resize', schedule);
        measure();
        return () => { cancelAnimationFrame(frame); observer.disconnect(); mutation.disconnect(); window.removeEventListener('scroll', schedule, true); window.removeEventListener('resize', schedule); };
    }, [enabled, selected, config]);
    const change = (fn: (c: ThemeConfig) => ThemeConfig, snapshot?: EditSnapshot) => onConfigChange(c => { const next = fn(c); latest.current = next; if (snapshot) snapshot.current = next; return next; });
    const record = (before: ThemeConfig, label: string, snapshot: EditSnapshot) => {
        const frame = requestAnimationFrame(() => {
            historyFrames.current.delete(frame);
            if (JSON.stringify(before) === JSON.stringify(snapshot.current)) return;
            setPast(v => [...v.slice(-49), { before, after: snapshot.current }]); setFuture([]); onCommitHistory?.(label);
        });
        historyFrames.current.add(frame);
    };
    const restore = (redo = false) => { const source = redo ? future : past, edit = source[source.length - 1]; if (!edit)
        return; if (redo) {
        setFuture(source.slice(0, -1));
        setPast(v => [...v, edit]);
    }
    else {
        setPast(source.slice(0, -1));
        setFuture(v => [...v, edit]);
    } change(c => restoreGesture(c, redo ? edit.after : edit.before, redo ? edit.before : edit.after)); onCommitHistory?.(redo ? 'Redo Arrange gesture' : 'Undo Arrange gesture'); };
    const start = (event: ReactPointerEvent, resize = false) => {
        if (!enabled || event.button !== 0 || event.isPrimary === false || !host.current)
            return;
        stop.current?.();
        const role = resize ? selected : roleFromTarget(event.target as Element, host.current);
        if (!resize) onSelect(role);
        if (!role)
            return;
        const target = roleTarget(host.current, role), frame = roleTarget(host.current, 'frame');
        if (!target || !frame)
            return;
        event.preventDefault();
        event.stopPropagation();
        host.current.focus({ preventScroll: true });
        const before = latest.current, p = effectivePlacement(target, before.elementPositions?.[role] || { x: 0, y: 0, scale: 1 }, before.layoutBoundary);
        const snapshot: EditSnapshot = { current: before };
        const root = host.current.querySelector<HTMLElement>('[data-theme-layout-root],.mpo-theme-container') || frame;
        const rr = root.getBoundingClientRect(), fr = frame.getBoundingClientRect(), tr = target.getBoundingClientRect();
        let parent = target.parentElement;
        while (parent && parent !== host.current && !parent.offsetWidth)
            parent = parent.parentElement;
        const zoom = parent?.offsetWidth ? parent.getBoundingClientRect().width / parent.offsetWidth : rr.width / Math.max(1, root.offsetWidth), startX = event.clientX, startY = event.clientY;
        const pointer = event.pointerId, capture = event.currentTarget as HTMLElement;
        const width = target.offsetWidth, height = target.offsetHeight, font = parseFloat(getComputedStyle(target).fontSize) || 16;
        let pending: PointerEvent | null = null, raf = 0, changed = false;
        const apply = (e: PointerEvent, capturePointer = true) => {
            let delta = pointerDelta({ x: startX, y: startY }, { x: e.clientX, y: e.clientY }, zoom);
            if (!changed) {
                const threshold = event.pointerType === 'touch' ? 8 : DRAG_THRESHOLD;
                if (Math.hypot(e.clientX - startX, e.clientY - startY) < threshold) return;
                if (capturePointer) capture.setPointerCapture(pointer);
                setDragging(true);
            }
            changed = true;
            if (!resize && before.layoutBoundary === 'constrain' && role !== 'frame')
                delta = constrainedDelta({ x: tr.left / zoom, y: tr.top / zoom, width: tr.width / zoom, height: tr.height / zoom }, { x: fr.left / zoom, y: fr.top / zoom, width: fr.width / zoom, height: fr.height / zoom }, delta);
            let factor = proportionalResize(tr.width, tr.height, e.clientX - startX, e.clientY - startY);
            if (resize && before.layoutBoundary === 'constrain' && role !== 'frame')
                factor = Math.min(factor, fr.width / Math.max(1, tr.width), fr.height / Math.max(1, tr.height));
            change(() => {
                if (resize && mode === 'size') {
                    if (role === 'frame')
                        return { ...before, customWidth: Math.max(1, width + (e.clientX - startX) / (tr.width / Math.max(1, width))), customHeight: Math.max(1, height + (e.clientY - startY) / (tr.height / Math.max(1, height))), widthMode: 'fixed' };
                    if (role === 'artwork')
                        return { ...before, artSize: Math.max(1, width * factor) };
                    if (['title', 'artist', 'album', 'themeLabel', 'badge', 'timestamps', 'status'].includes(role!)) {
                        const key = role as TextElement;
                        return { ...before, typography: { ...before.typography, [key]: { ...before.typography?.[key], size: Math.max(1, font * factor) } } };
                    }
                    if (role === 'progress')
                        return { ...before, progressHeight: Math.max(1, height + (e.clientY - startY) / (tr.height / Math.max(1, height))) };
                    if (role === 'indicator')
                        return { ...before, visualizerHeight: Math.max(1, height + (e.clientY - startY) / (tr.height / Math.max(1, height))) };
                }
                return { ...before, elementPositions: { ...before.elementPositions, [role!]: { ...p, ...(resize ? { scale: Math.max(.01, (p.scale ?? 1) * factor) } : { x: p.x + delta.x, y: p.y + delta.y }) } } };
            }, snapshot);
        };
        const move = (e: PointerEvent) => { if (e.pointerId !== pointer)
            return; pending = e; if (!raf)
            raf = requestAnimationFrame(() => { raf = 0; if (pending)
                apply(pending); }); };
        const cleanup = () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', pointerCancel); window.removeEventListener('blur', cancel); window.removeEventListener('keydown', key, true); stop.current = null; abort.current = null; setDragging(false); if (capture.hasPointerCapture(pointer))
            capture.releasePointerCapture(pointer); };
        const up = (e: PointerEvent) => { if (e.pointerId !== pointer)
            return; cancelAnimationFrame(raf); apply(e, false); cleanup(); if (changed)
            record(before, resize ? 'Resized Arrange element' : 'Moved Arrange element', snapshot); };
        const cancel = () => { cleanup(); if (changed)
            change(() => before); };
        const key = (e: KeyboardEvent) => { if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            cancel();
        } };
        const pointerCancel = (e: PointerEvent) => { if (e.pointerId === pointer) cancel(); };
        stop.current = cleanup;
        abort.current = cancel;
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', pointerCancel);
        window.addEventListener('blur', cancel);
        window.addEventListener('keydown', key, true);
    };
    return <div {...props} className={`arrange-canvas ${props.className || ''}`} ref={host} tabIndex={enabled ? 0 : undefined} data-arrange-dragging={enabled && dragging || undefined} aria-label={enabled ? 'Arrange canvas: click to select; drag to move; arrows to nudge; Escape to cancel' : undefined} onPointerDownCapture={event => {
        const target = event.target as Element;
        if (host.current?.contains(target) && !target.closest(UI_TARGET)) start(event);
    }} onClickCapture={event => {
        const target = event.target as Element;
        if (enabled && host.current?.contains(target) && !target.closest(UI_TARGET)) { event.preventDefault(); event.stopPropagation(); }
    }} onClick={enabled ? undefined : props.onClick} onLostPointerCapture={() => abort.current?.()} onKeyDown={event => { if (!enabled || (event.target as Element).closest('input,textarea,select,button,[data-arrange-ui],[contenteditable="true"]'))
        return; if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        restore(event.shiftKey);
        return;
    } if (!selected)
        return; const d = event.shiftKey ? 10 : 1; const delta: Record<string, [
        number,
        number
    ]> = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }; if (!delta[event.key])
        return; event.preventDefault(); const before = latest.current, snapshot: EditSnapshot = { current: before }; let effective: {
        x: number;
        y: number;
        scale?: number;
    } | undefined; let [dx, dy] = delta[event.key]; if (before.layoutBoundary === 'constrain' && selected !== 'frame' && host.current) {
        const target = roleTarget(host.current, selected), frame = roleTarget(host.current, 'frame');
        if (target && frame) {
            effective = effectivePlacement(target, before.elementPositions?.[selected] || { x: 0, y: 0, scale: 1 }, before.layoutBoundary);
            const r = target.getBoundingClientRect(), f = frame.getBoundingClientRect();
            const zoom = f.width / Math.max(1, frame.offsetWidth);
            const limited = constrainedDelta({ x: r.left / zoom, y: r.top / zoom, width: r.width / zoom, height: r.height / zoom }, { x: f.left / zoom, y: f.top / zoom, width: f.width / zoom, height: f.height / zoom }, { x: dx, y: dy });
            dx = limited.x;
            dy = limited.y;
        }
    } change(c => { const p = effective || c.elementPositions?.[selected] || { x: 0, y: 0, scale: 1 }; return { ...c, elementPositions: { ...c.elementPositions, [selected]: { ...p, x: p.x + dx, y: p.y + dy } } }; }, snapshot); record(before, 'Nudged Arrange element', snapshot); }}>
    {enabled && <div className="arrange-gesture-toolbar" data-arrange-ui data-arrange-handle>
      <span className="arrange-selected-name">{selected ? ARRANGE_ROLE_LABELS[selected] : 'Select an element'}</span>
      <StudioSelect aria-label="Resize behavior" disabled={!selected} value={mode} onChange={e => setMode(e.target.value as typeof mode)}><option value="scale">Proportional scale</option><option value="size">Edit dimensions / font size</option></StudioSelect>
      <button type="button" disabled={!past.length} onClick={() => restore()}>Undo</button><button type="button" disabled={!future.length} onClick={() => restore(true)}>Redo</button>
    </div>}
    <div className="arrange-preview-content">{children}</div>
    {enabled && typeof document !== 'undefined' && box && createPortal(<div className="arrange-selection-box" style={box} data-arrange-ui>
      <button className="arrange-resize-grip" data-arrange-handle aria-label="Drag to resize selected element" title="Drag to resize; Escape cancels" onPointerDown={e => start(e, true)}>↘</button>
    </div>, document.body)}
  </div>;
}
