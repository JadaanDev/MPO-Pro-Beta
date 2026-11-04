import React from "react";
import { Check, Copy, Download, Edit2, Link, Trash2 } from "lucide-react";
import { ThemeConfig, ThemeId } from "../../types/themes";
import { THEME_REGISTRY } from "../../themes/ThemeRegistry";
import { desktopEditorConfig } from "../../utils/desktopEditorConfig";
import "./layer-card.css";

type Props = {
  layer: {id:string; name:string; themeId:string; format?:"horizontal"|"vertical"; config:ThemeConfig}; active: boolean; desktop?: boolean; presentation?: boolean; themeName?: string; copied: boolean; canDelete: boolean; onExport?: () => void;
  editing: boolean; editName: string; onEditName: (value: string) => void;
  onSelect: () => void; onRename: () => void; onSaveRename: () => void; onCancelRename: () => void;
  onCopy: () => void; onDuplicate: () => void; onDelete: () => void;
  onMenu: (event: React.MouseEvent<HTMLElement>) => void;
};
export function LayerCard({layer,active,desktop=false,presentation=false,themeName,onExport,copied,canDelete,editing,editName,onEditName,onSelect,onRename,onSaveRename,onCancelRename,onCopy,onDuplicate,onDelete,onMenu}: Props) {
  const config = desktop ? desktopEditorConfig(layer.config) : layer.config;
  const selectedWidth = presentation ? config.bigCustomWidth : config.customWidth;
  const width = selectedWidth ? `${selectedWidth}px` : "Auto";
  const scale = Math.round((config.scale ?? 1) * 100);
  const theme = themeName || THEME_REGISTRY[layer.themeId as ThemeId]?.name || layer.themeId;
  return <article className={`unified-layer-card ${active ? "is-active" : ""}`} onClick={onSelect} onContextMenu={onMenu}>
    <div className="unified-layer-card-top">
      <div className="unified-layer-title">
        {active && <span className="unified-layer-active">Active</span>}
        {editing ? <input className="unified-layer-rename" aria-label="Layer name" autoFocus value={editName} onClick={event=>event.stopPropagation()} onChange={event=>onEditName(event.target.value)} onBlur={onSaveRename} onKeyDown={event=>{if(event.key === "Enter") {event.preventDefault(); event.currentTarget.blur();} if(event.key === "Escape") {event.preventDefault(); onCancelRename();}}} /> : <button type="button" className="unified-layer-select" aria-pressed={active} onClick={event=>{event.stopPropagation();onSelect();}}>{layer.name}</button>}
      </div>
      <div className="unified-layer-actions" onClick={event=>event.stopPropagation()}>
        <button type="button" aria-label={`Rename ${layer.name}`} title="Rename layer" onClick={onRename}><Edit2 size={13}/></button>
        <button type="button" aria-label={`Copy URL for ${layer.name}`} title={copied ? "Copied" : "Copy layer URL"} onClick={onCopy}>{copied ? <Check size={13}/> : <Link size={13}/>}</button>
        <button type="button" aria-label={`Duplicate ${layer.name}`} title="Duplicate layer" onClick={onDuplicate}><Copy size={13}/></button>
        {onExport && <button type="button" aria-label={`Export ${layer.name}`} title="Export layer" onClick={onExport}><Download size={13}/></button>}
        <button type="button" aria-label={`Delete ${layer.name}`} title={canDelete ? "Delete layer" : "Keep at least one layer"} disabled={!canDelete} className="unified-layer-delete" onClick={onDelete}><Trash2 size={13}/></button>
      </div>
    </div>
    <div className="unified-layer-meta"><span className="unified-layer-theme" title={theme}>{theme}</span><span className="unified-layer-spec">{presentation ? "Stage" : desktop ? "Desktop" : layer.format === "vertical" ? "9:16" : "16:9"} · {width} · {scale}%</span></div>
  </article>;
}
