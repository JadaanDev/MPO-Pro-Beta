import { LockKeyhole, UnlockKeyhole } from 'lucide-react';
import './arrange-canvas.css';

export function ArrangeMovementLock({ locked, onChange }: { locked: boolean; onChange: (locked: boolean) => void }) {
    const Icon = locked ? LockKeyhole : UnlockKeyhole;
    return <button type="button" className={`themes-panel-toggle-btn arrange-movement-lock ${locked ? 'locked' : ''}`} data-arrange-ui aria-label="Arrange movement lock" aria-pressed={locked} onClick={() => onChange(!locked)} title={locked ? 'Click elements to style them. Movement and resizing are locked.' : 'Movement is unlocked. Drag, resize and placement editing are available.'}><Icon size={14} aria-hidden="true"/><span>Movement {locked ? 'locked' : 'unlocked'}</span></button>;
}
