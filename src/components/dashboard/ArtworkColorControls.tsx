import { ArtworkColorMode, ArtworkColorTarget, ThemeConfig } from "../../types/themes";
import "./artwork-color-controls.css";

const targets: Array<[ArtworkColorTarget, string]> = [
  ["surface", "Surface"], ["accent", "Master accent"], ["text", "All text"],
  ["border", "Borders"], ["progress", "Progress fill"], ["indicator", "Playback indicator"],
];
type Props = { config: ThemeConfig; onConfigChange: (update: (old: ThemeConfig) => ThemeConfig) => void; onCommitHistory?: (description?: string) => void; extractedColor?: string | null };
export function ArtworkColorControls({config,onConfigChange,onCommitHistory,extractedColor}:Props) {
  const applyAll = (mode: ArtworkColorMode) => {
    onConfigChange(old => ({...old, artworkColors: Object.fromEntries(targets.map(([target]) => [target,mode])), ...(mode === "manual" ? {autoAlbumColor:false} : {})}));
    onCommitHistory?.(`Set all color sources to ${mode}`);
  };
  return <section className="artwork-color-controls" aria-label="Artwork color sources">
    <div className="artwork-color-heading"><strong>Artwork color matching</strong><span className={`artwork-color-status ${extractedColor ? "available" : ""}`}>{extractedColor ? "Artwork detected" : "Waiting for artwork"}</span></div>
    <p>Choose a color source for each part of this layer. Artwork colors are adjusted for readability; contrast uses light or dark colors.</p>
    <div className="artwork-color-actions"><button type="button" onClick={()=>applyAll("artwork")}>Match all</button><button type="button" onClick={()=>applyAll("contrast")}>Contrast all</button><button type="button" onClick={()=>applyAll("manual")}>Use manual colors</button></div>
    <div className="artwork-color-grid">{targets.map(([target,label])=><label key={target}><span>{label}</span><select aria-label={`${label} color source`} value={target === "accent" && config.autoAlbumColor && (!config.artworkColors?.accent || config.artworkColors.accent === "manual") ? "legacy" : config.artworkColors?.[target] || "manual"} onChange={event=>{const mode=event.target.value as ArtworkColorMode;onConfigChange(old=>({...old,artworkColors:{...old.artworkColors,[target]:mode},...(target === "accent" && mode === "manual" ? {autoAlbumColor:false} : {})}));onCommitHistory?.(`Changed ${label} color source`);}}><option value="manual">Theme / manual</option>{target === "accent" && config.autoAlbumColor && <option value="legacy" disabled>Artwork (accent only)</option>}<option value="artwork">Match artwork</option><option value="contrast">High contrast</option></select></label>)}</div>
    <small>Manual colors are retained. Contrast uses the chosen surface or a dark reference; transparency and custom CSS can change the final result.</small>
  </section>;
}
