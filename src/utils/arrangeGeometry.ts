import { THEME_EFFECT_GUTTER } from "./themeEffects";
export interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
}
export function pointerDelta(start: {
    x: number;
    y: number;
}, end: {
    x: number;
    y: number;
}, zoom: number) {
    const factor = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
    return { x: (end.x - start.x) / factor, y: (end.y - start.y) / factor };
}
export function constrainedDelta(box: Box, frame: Box, delta: {
    x: number;
    y: number;
}) {
    return { x: Math.max(frame.x - box.x, Math.min(frame.x + frame.width - box.x - box.width, delta.x)), y: Math.max(frame.y - box.y, Math.min(frame.y + frame.height - box.y - box.height, delta.y)) };
}
export function proportionalResize(width: number, height: number, dx: number, dy: number) {
    return Math.max(.01, 1 + (dx * width + dy * height) / Math.max(1, width * width + height * height));
}
export function contentWidth(measured: number, min = 320, max = 600) {
    const low = Number.isFinite(min) && min > 0 ? min : 320, high = Math.max(low, Number.isFinite(max) && max > 0 ? max : 600);
    return { width: Math.max(low, Math.min(high, Math.ceil(measured))), min: low, max: high };
}
/** Restore only gesture-owned leaves that have not since been edited elsewhere. */
export function restoreGesture<T>(current: T, before: T, after: T): T {
    if (JSON.stringify(before) === JSON.stringify(after))
        return current;
    const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
    if (object(current) && (object(before) || before === undefined) && (object(after) || after === undefined)) {
        const next: Record<string, unknown> = { ...current };
        for (const key of new Set([...Object.keys(before || {}), ...Object.keys(after || {})])) {
            const value = restoreGesture(next[key], (before as Record<string, unknown> | undefined)?.[key], (after as Record<string, unknown> | undefined)?.[key]);
            if (value === undefined)
                delete next[key];
            else
                next[key] = value;
        }
        return next as T;
    }
    return JSON.stringify(current) === JSON.stringify(after) ? before : current;
}
/** Invert the paint-size model, including the fixed minimum effect gutter below
 * 100% scale. Scaling the whole window ratio would make small HUDs lag the grip. */
export function resizeHudScale(before: number, width: number, height: number, dx: number, dy: number): number {
    const edge = THEME_EFFECT_GUTTER * 2;
    const gutter = edge * Math.max(1, before), w = Math.max(1, (width - gutter) / Math.max(.01, before)), h = Math.max(1, (height - gutter) / Math.max(.01, before));
    const targetW = width + dx, targetH = height + dy;
    const small = Math.max(.01, Math.min(1, ((targetW - edge) * w + (targetH - edge) * h) / (w * w + h * h)));
    const large = Math.max(1, (targetW * (w + edge) + targetH * (h + edge)) / ((w + edge) ** 2 + (h + edge) ** 2));
    const error = (scale: number) => (w * scale + edge * Math.max(1, scale) - targetW) ** 2 + (h * scale + edge * Math.max(1, scale) - targetH) ** 2;
    return error(small) <= error(large) ? small : large;
}
