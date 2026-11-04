import { useEffect, useState } from "react";
import { ThemeConfig } from "../../types/themes";

interface Props { config: ThemeConfig; onConfigChange: (updater: (previous: ThemeConfig) => ThemeConfig) => void; onCommitHistory?: (description?: string) => void }
function TimingInput({ label, value, onCommit }: { label: string; value: number; onCommit: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const next = Number(draft);
    if (draft.trim() && Number.isFinite(next) && next >= 0) { onCommit(next); setDraft(String(next)); }
    else setDraft(String(value));
  };
  return <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 10, fontSize: 11 }}>
    <span>{label}</span><span style={{ display: "flex", alignItems: "center", gap: 5 }}><input type="number" min="0" step="any" value={draft} aria-label={label + " in milliseconds"} onChange={event => setDraft(event.target.value)} onBlur={commit} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} style={{ width: 110, padding: "6px 8px", border: "1px solid #ffffff33", borderRadius: 6, color: "inherit", background: "#111725" }} /><span>ms</span></span>
  </label>;
}
export function TransitionTimingFields({config, onConfigChange, onCommitHistory}: Props) {
  const set = (key: "transitionDurationMs" | "transitionDelayMs", label: string) => (value: number) => { onConfigChange(current => ({...current, [key]: value})); onCommitHistory?.(label + " set to " + value + "ms"); };
  return <div><TimingInput label="Transition speed (duration)" value={config.transitionDurationMs ?? (config.transitionDuration != null ? config.transitionDuration * 1000 : 350)} onCommit={set("transitionDurationMs", "Transition duration")} /><TimingInput label="Transition delay" value={config.transitionDelayMs ?? (config.transitionDelay != null ? config.transitionDelay * 1000 : 0)} onCommit={set("transitionDelayMs", "Transition delay")} /><p style={{fontSize: 10, opacity: 0.65, margin: "8px 0 0"}}>Enter any non-negative time in milliseconds. A duration of 0 changes instantly.</p></div>;
}
