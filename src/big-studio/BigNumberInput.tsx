import { useEffect, useState } from "react";

/** An exact, non-negative finite value; an empty field resets optional dimensions. */
export function BigNumberInput({ label, value, onCommit, unit }: { label: string; value?: number; onCommit: (value: number | undefined) => void; unit?: string }) {
  const [text, setText] = useState(value === undefined ? "" : String(value));
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setText(value === undefined ? "" : String(value)); }, [value, editing]);
  const commit = () => {
    const next = text.trim() === "" ? undefined : Number(text);
    if (next === undefined || (Number.isFinite(next) && next >= 0)) onCommit(next);
    else setText(value === undefined ? "" : String(value));
    setEditing(false);
  };
  return <label className="big-number-field">{label}<span><input aria-label={label} type="number" step="any" min="0" value={text} placeholder="Auto" onFocus={() => setEditing(true)} onChange={event => setText(event.target.value)} onBlur={commit} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} />{unit && <small>{unit}</small>}</span></label>;
}
