import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Layer } from "../../types/layers";
interface Props { layer: Layer; x: number; y: number; url?: string; canDelete: boolean; onClose: () => void; onRename: () => void; onDuplicate: () => void; onDelete: () => void; onCopy?: () => void; onExport?: () => void }
export function exportSingleLayer(layer: Layer) {
  const desktop = Boolean(layer.isDesktop);
  const payload = {version:"2.0.0", singleLayer:true, exportedAt:Date.now(), layers: desktop ? [] : [layer], activeLayerId: desktop ? "" : layer.id, desktopLayers: desktop ? [layer] : [], activeDesktopLayerId: desktop ? layer.id : ""};
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}));
  const a = document.createElement("a"); a.href = url; a.download = (layer.name.replace(/[^a-z0-9_-]+/gi,"-") || "layer") + ".json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function LayerContextMenu({layer,x,y,url,canDelete,onClose,onRename,onDuplicate,onDelete,onCopy,onExport}:Props) {
  useEffect(() => { const close = () => onClose(); const key = (e:KeyboardEvent) => { if(e.key === "Escape") onClose(); }; window.addEventListener("pointerdown",close); window.addEventListener("keydown",key); window.addEventListener("blur",close); return () => {window.removeEventListener("pointerdown",close);window.removeEventListener("keydown",key);window.removeEventListener("blur",close);}; },[onClose]);
  const run = (action:()=>void) => {action();onClose();};
  return createPortal(<div className="layer-context-menu" role="menu" style={{left:Math.max(4,Math.min(x,window.innerWidth-230)),top:Math.max(4,Math.min(y,window.innerHeight-245))}} onPointerDown={e=>e.stopPropagation()} onContextMenu={e=>e.preventDefault()}><strong title={layer.name}>{layer.name}</strong><button role="menuitem" onClick={()=>run(onRename)}>Rename</button><button role="menuitem" onClick={()=>run(onDuplicate)}>Duplicate</button><button role="menuitem" onClick={()=>run(onExport || (()=>exportSingleLayer(layer)))}>Export layer</button>{onCopy && <button role="menuitem" title={url} onClick={()=>run(onCopy)}>Copy URL</button>}<button role="menuitem" disabled={!canDelete} className="danger" onClick={()=>run(onDelete)}>Delete</button></div>,document.body);
}
