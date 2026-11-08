import { useSyncExternalStore } from 'react';

export const ARRANGE_LOCK_KEY = 'mpo_arrange_movement_locked_v1';
const EVENT = 'mpo-arrange-movement-lock';
let volatile: boolean | undefined;
export function readArrangeMovementLock(): boolean {
    if (volatile !== undefined) return volatile;
    try { return localStorage.getItem(ARRANGE_LOCK_KEY) !== 'false'; } catch { return true; }
}
export function setArrangeMovementLock(value: boolean) {
    volatile = value;
    try { localStorage.setItem(ARRANGE_LOCK_KEY, String(value)); volatile = undefined; } catch {}
    window.dispatchEvent(new Event(EVENT));
}
function subscribe(listener: () => void) {
    const storage = (event: StorageEvent) => { if (event.key === ARRANGE_LOCK_KEY || event.key === null) { volatile = undefined; listener(); } };
    window.addEventListener(EVENT, listener);
    window.addEventListener('storage', storage);
    return () => { window.removeEventListener(EVENT, listener); window.removeEventListener('storage', storage); };
}
export function useArrangeMovementLock() {
    return [useSyncExternalStore(subscribe, readArrangeMovementLock, () => true), setArrangeMovementLock] as const;
}
