import { Children, isValidElement, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { getPopoverPosition, type PopoverPosition } from './popoverPosition.mjs';
import './studio-select.css';
const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

interface Option { value: string; label: string; disabled: boolean; group?: string }
function optionsFrom(children: ReactNode, group?: string): Option[] {
    return Children.toArray(children).flatMap(child => {
        if (!isValidElement<{ value?: string | number; children?: ReactNode; disabled?: boolean; label?: string }>(child)) return [];
        if (child.type === 'optgroup') return optionsFrom(child.props.children, child.props.label);
        if (child.type !== 'option') return [];
        const label = Children.toArray(child.props.children).join('');
        return [{ value: String(child.props.value ?? label), label, disabled: !!child.props.disabled, group }];
    });
}

/** Studio-owned popup styling and viewport placement, including body portals.
 * The value-shaped change callback keeps existing controlled field handlers simple. */
export function StudioSelect({ value, onChange, children, disabled, className = '', style, id, 'aria-label': label }: {
    value: string | number;
    onChange: (event: { target: { value: string } }) => void;
    children: ReactNode;
    disabled?: boolean;
    className?: string;
    style?: CSSProperties;
    id?: string;
    'aria-label'?: string;
}) {
    const generated = useId(), listId = `${generated}-options`;
    const options = useMemo(() => optionsFrom(children), [children]);
    const [open, setOpen] = useState(false), [active, setActive] = useState(0);
    const [position, setPosition] = useState<PopoverPosition | null>(null);
    const trigger = useRef<HTMLButtonElement>(null), popup = useRef<HTMLDivElement>(null);
    const search = useRef({ text: '', time: 0 });
    const selected = options.findIndex(option => option.value === String(value));
    const reveal = () => { if (!disabled) { setActive(Math.max(0, selected)); setPosition(null); setOpen(true); } };
    const choose = (index: number) => {
        if (!options[index] || options[index].disabled) return;
        onChange({ target: { value: options[index].value } });
        setOpen(false);
        trigger.current?.focus({ preventScroll: true });
    };
    useEffect(() => {
        if (!open) return;
        const outside = (event: Event) => { if (!trigger.current?.contains(event.target as Node) && !popup.current?.contains(event.target as Node)) setOpen(false); };
        document.addEventListener('pointerdown', outside, true);
        document.addEventListener('focusin', outside, true);
        return () => { document.removeEventListener('pointerdown', outside, true); document.removeEventListener('focusin', outside, true); };
    }, [open]);
    useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
    useClientLayoutEffect(() => {
        if (!open || !trigger.current || !popup.current) return;
        let raf = 0;
        const update = () => {
            const anchor = trigger.current;
            if (!anchor?.isConnected) { setOpen(false); return; }
            const rect = anchor.getBoundingClientRect(), viewport = window.visualViewport;
            const next = getPopoverPosition(rect, { width: Math.max(220, rect.width), height: Math.min(320, popup.current?.scrollHeight || 320) }, { left: viewport?.offsetLeft ?? 0, top: viewport?.offsetTop ?? 0, width: viewport?.width ?? window.innerWidth, height: viewport?.height ?? window.innerHeight });
            setPosition(previous => previous && Object.keys(next).every(key => next[key as keyof PopoverPosition] === previous[key as keyof PopoverPosition]) ? previous : next);
        };
        const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
        const observer = new ResizeObserver(schedule);
        for (let node: HTMLElement | null = trigger.current; node; node = node.parentElement) observer.observe(node);
        observer.observe(popup.current);
        window.addEventListener('resize', schedule);
        window.addEventListener('scroll', schedule, true);
        window.visualViewport?.addEventListener('resize', schedule);
        window.visualViewport?.addEventListener('scroll', schedule);
        update();
        return () => { cancelAnimationFrame(raf); observer.disconnect(); window.removeEventListener('resize', schedule); window.removeEventListener('scroll', schedule, true); window.visualViewport?.removeEventListener('resize', schedule); window.visualViewport?.removeEventListener('scroll', schedule); };
    }, [open]);
    useEffect(() => {
        const menu = popup.current, option = menu?.querySelector<HTMLElement>(`[data-option-index="${active}"]`);
        if (!open || !menu || !option) return;
        if (option.offsetTop < menu.scrollTop) menu.scrollTop = option.offsetTop;
        else if (option.offsetTop + option.offsetHeight > menu.scrollTop + menu.clientHeight) menu.scrollTop = option.offsetTop + option.offsetHeight - menu.clientHeight;
    }, [open, active, position?.maxHeight]);
    return <>
        <button id={id} ref={trigger} type="button" role="combobox" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined} aria-activedescendant={open ? `${listId}-${active}` : undefined} disabled={disabled} data-arrange-ui className={`studio-select ${className}`} style={style} onClick={() => open ? setOpen(false) : reveal()} onKeyDown={event => {
            if (event.key === 'Tab') { setOpen(false); return; }
            if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); return; }
            if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                if (!open) { reveal(); return; }
                const direction = event.key === 'ArrowUp' || event.key === 'End' ? -1 : 1;
                let next = event.key === 'Home' ? -1 : event.key === 'End' ? options.length : active;
                for (let i = 0; i < options.length; i++) { next = (next + direction + options.length) % options.length; if (!options[next].disabled) { setActive(next); break; } }
            } else if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault(); if (open) choose(active); else reveal();
            } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
                const now = Date.now();
                const text = (now - search.current.time < 700 ? search.current.text : '') + event.key.toLocaleLowerCase();
                search.current = { text, time: now };
                const next = options.findIndex(option => !option.disabled && option.label.toLocaleLowerCase().startsWith(text));
                if (next >= 0) { event.preventDefault(); if (!open) reveal(); setActive(next); }
            }
        }}><span>{options[selected]?.label || 'Choose an option'}</span><ChevronDown size={14} aria-hidden="true" /></button>
        {open && typeof document !== 'undefined' && createPortal(<div ref={popup} id={listId} role="listbox" aria-label={label} data-arrange-ui className="studio-select-popup" style={{ left: position?.left ?? 0, top: position?.top ?? 0, width: Math.max(220, trigger.current?.getBoundingClientRect().width || 220), maxWidth: position?.maxWidth, maxHeight: Math.min(320, position?.maxHeight ?? 320), visibility: position ? 'visible' : 'hidden' }} onPointerDown={event => event.preventDefault()}>
            {options.map((option, index) => <div key={`${option.group || ''}-${option.value}`}>
                {option.group && option.group !== options[index - 1]?.group && <div className="studio-select-group">{option.group}</div>}
                <div id={`${listId}-${index}`} role="option" aria-selected={option.value === String(value)} aria-disabled={option.disabled || undefined} data-option-index={index} className={`studio-select-option ${index === active ? 'active' : ''}`} onPointerMove={() => { if (!option.disabled) setActive(index); }} onClick={() => choose(index)}><span>{option.label}</span>{option.value === String(value) && <Check size={14} aria-hidden="true" />}</div>
            </div>)}
        </div>, document.body)}
    </>;
}
