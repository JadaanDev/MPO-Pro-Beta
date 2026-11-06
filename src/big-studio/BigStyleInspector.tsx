import { useRef, useState, type ChangeEvent } from "react";
import { ImagePlus, Palette, SlidersHorizontal } from "lucide-react";
import type { ThemeConfig } from "../types/themes";
import { Toggle } from "../components/common/Toggle";
import { HexColorPicker } from "../components/common/HexColorPicker";
import { BigNumberInput } from "./BigNumberInput";
import { setVisibility, type VisibilityKey } from "../utils/visibility";
type Props = { config: ThemeConfig; stageScale?: number; onStageScaleChange?: (scale:number)=>void; onChange: (update: (config: ThemeConfig) => ThemeConfig) => void };
export function BigStyleInspector({ config, onChange, stageScale = 1, onStageScaleChange }: Props) {
  const set = (patch: Partial<ThemeConfig>) => onChange(old => ({ ...old, ...patch }));
  const fileInput = useRef<HTMLInputElement>(null);
  const [error,setError] = useState("");
  const visibility: Array<[VisibilityKey, string]> = [
    ["showArt", "Artwork"], ["showTitle", "Track title"], ["showArtist", "Artist"], ["showAlbum", "Album"], ["showThemeLabel", "Theme text"],
    ["showProgress", "Progress"], ["showTimestamps", "Timestamps"], ["showBadge", "Source badge"], ["showPlaybackStatus", "Playback status"], ["showVisualizer", "Playback indicator"]
  ];
  const chooseLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (!file) return;
    if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 256 * 1024) {setError("Choose a PNG, JPEG or WebP logo under 256 KB.");return;}
    const reader = new FileReader(); reader.onload = () => {if(typeof reader.result === "string") {set({bigBrandLogo:reader.result});setError("");}};
    reader.onerror=()=>setError("Could not read that image."); reader.readAsDataURL(file);
  };
  return <section className="big-presentation-inspector">
    <div className="big-inspector-intro"><SlidersHorizontal size={15}/><div><h3>Presentation settings</h3><p>Changes apply to this layer in your presentation.</p></div></div>
    <section className="big-settings-card"><div className="big-settings-heading"><Palette size={15}/><div><h4>Branding</h4><p>Give this presentation your own identity.</p></div></div>
      <label className="big-field">Brand name <input type="text" maxLength={80} value={config.bigBrandName || ""} placeholder="Your brand or channel" onChange={e=>set({bigBrandName:e.target.value})}/></label>
      <div className="big-field big-color-field"><span style={{ fontSize: 11, color: "inherit", marginBottom: 3, display: "block" }}>Accent color</span><HexColorPicker value={/^#[\da-f]{6}$/i.test(config.accentColor) ? config.accentColor : "#8DF6C4"} onChange={hex=>set({accentColor:hex,autoAlbumColor:false,artworkColors:{...config.artworkColors,accent:"manual"}})}/></div>
      <div className="big-logo-row"><button type="button" className="big-secondary-action" onClick={()=>fileInput.current?.click()}><ImagePlus size={14}/> {config.bigBrandLogo ? "Change logo" : "Add logo"}</button>{config.bigBrandLogo && <><img src={config.bigBrandLogo} alt="Brand logo preview"/><button type="button" className="big-secondary-action" onClick={()=>set({bigBrandLogo:undefined})}>Remove</button></>}<input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={chooseLogo}/></div>
      <small>PNG, JPEG or WebP, up to 256 KB. Included when exporting this layer.</small>{error && <p role="alert" className="big-brand-error">{error}</p>}
    </section>
    <section className="big-settings-card"><div className="big-settings-heading"><div><h4>Visible elements</h4><p>Choose what appears on the stage.</p></div></div><div className="big-visibility-grid">{visibility.map(([key,label])=><Toggle key={key} label={label} title={label} size="sm" checked={key === "showVisualizer" ? Boolean(config[key]) : config[key] !== false} onChange={value=>onChange(old=>setVisibility(old,key,value))}/>)}</div></section>
    <details className="big-settings-details"><summary>Presentation size</summary><div>{onStageScaleChange && <><BigNumberInput label="Stage content scale (all layers)" unit="%" value={stageScale*100} onCommit={value=>onStageScaleChange(Math.max(0,(value ?? 100)/100))}/><button type="button" onClick={()=>onStageScaleChange(1)}>Reset stage scale</button></>}<p>Effective scale: {Math.round(stageScale * (config.scale ?? 1) * 10000)/100}% = stage × selected layer</p><button type="button" onClick={()=>set({scale:1})}>Reset selected layer scale</button><BigNumberInput label="Selected layer scale" unit="%" value={(config.scale ?? 1)*100} onCommit={value=>set({scale:(value ?? 100)/100})}/><BigNumberInput label="Content width" unit="px" value={config.bigCustomWidth || undefined} onCommit={value=>set({bigCustomWidth:value || 0})}/><BigNumberInput label="Content height" unit="px" value={config.bigCustomHeight || undefined} onCommit={value=>set({bigCustomHeight:value || 0})}/><small>Leave dimensions empty to use the responsive layout.</small></div></details>
  </section>;
}
