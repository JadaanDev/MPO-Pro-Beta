import React, { useState } from "react";
import { LayerContextMenu } from "./LayerContextMenu";
import { LayerCard } from "./LayerCard";
import { THEME_REGISTRY } from "../../themes/ThemeRegistry";
import { Layer } from "../../types/layers";
import { Search, Plus, Layers } from "lucide-react";

interface LayerBrowserProps {
  layers: Layer[];
  activeLayerId: string;
  onSelectLayer: (id: string) => void;
  onCreateLayer: (name: string, format: "horizontal" | "vertical") => void;
  onDuplicateLayer: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onRenameLayer?: (id: string, name: string) => void;
  lockedFormat?: "horizontal" | "vertical";
}

export const LayerBrowser: React.FC<LayerBrowserProps> = ({
  layers,
  activeLayerId,
  onSelectLayer,
  onCreateLayer,
  onDuplicateLayer,
  onDeleteLayer,
  onRenameLayer,
  lockedFormat,
}) => {
  const [menu, setMenu] = useState<{layer:Layer;x:number;y:number}|null>(null);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [editName, setEditName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [newLayerName, setNewLayerName] = useState("");
  const [newLayerFormat, setNewLayerFormat] = useState<"horizontal" | "vertical">("horizontal");
  const [copiedLayerId, setCopiedLayerId] = useState<string | null>(null);

  const [urlHostMode, setUrlHostMode] = useState<"ip" | "domain">(() => {
    try {
      return (localStorage.getItem("mpo_preferred_url_host") as "ip" | "domain") || "ip";
    } catch {
      return "ip";
    }
  });

  const getLayerUrl = (layer: Layer) => {
    const mode = layer.format === "vertical" ? "vertical" : "overlay";
    const host = urlHostMode === "domain" ? "mpobeta.local:4849" : "127.0.0.1:4849";
    const url = `http://${host}/?mode=${mode}&layer=${layer.id}`;
    return url;
  };
  const handleCopyLayerUrl = (layer: Layer) => {
    navigator.clipboard.writeText(getLayerUrl(layer));
    setCopiedLayerId(layer.id);
    setTimeout(() => setCopiedLayerId(null), 2000);
  };

  const toggleUrlHostMode = (mode: "ip" | "domain") => {
    setUrlHostMode(mode);
    try {
      localStorage.setItem("mpo_preferred_url_host", mode);
      window.dispatchEvent(new Event("mpo_url_host_changed"));
    } catch {}
  };

  const filteredLayers = layers.filter((l) =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.themeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (THEME_REGISTRY[l.themeId]?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateConfirm = () => {
    if (newLayerName.trim()) {
      onCreateLayer(newLayerName.trim(), lockedFormat || newLayerFormat);
      setNewLayerName("");
      setShowNewModal(false);
    }
  };

  return (
    <div className="layer-browser-root unified-layer-browser">
      {/* Search & Add New Layer */}
      <div className="browser-search-row unified-search-row">
        <div className="search-input-wrap unified-search-wrap">
          <Search size={13} className="search-icon unified-search-icon" />
          <input
            type="text"
            placeholder="Search layers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="browser-search-input unified-search-input"
          />
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="browser-add-btn unified-add-btn"
          title="Create New Preset"
        >
          <Plus size={14} />
          <span>New</span>
        </button>
      </div>

      <div className="unified-host-row"><span>Feed URL format</span><div className="unified-host-actions">
        <button type="button" className={urlHostMode === "ip" ? "is-active" : ""} onClick={()=>toggleUrlHostMode("ip")} aria-pressed={urlHostMode === "ip"}>127.0.0.1</button>
        <button type="button" className={urlHostMode === "domain" ? "is-active" : ""} onClick={()=>toggleUrlHostMode("domain")} aria-pressed={urlHostMode === "domain"}>mpobeta.local</button>
      </div></div>
      <div className="unified-layer-list">
        {filteredLayers.map(layer => <LayerCard key={layer.id} layer={layer} active={layer.id === activeLayerId} copied={copiedLayerId === layer.id} canDelete={layers.length > 1} editing={editingId === layer.id} editName={editName} onEditName={setEditName} onSelect={()=>onSelectLayer(layer.id)} onRename={()=>{setEditingId(layer.id);setEditName(layer.name);}} onSaveRename={()=>{if(editName.trim()) onRenameLayer?.(layer.id,editName.trim());setEditingId(null);}} onCancelRename={()=>setEditingId(null)} onCopy={()=>handleCopyLayerUrl(layer)} onDuplicate={()=>onDuplicateLayer(layer.id)} onDelete={()=>onDeleteLayer(layer.id)} onMenu={event=>{event.preventDefault();event.stopPropagation();setMenu({layer,x:event.clientX,y:event.clientY});}} />)}
        {filteredLayers.length === 0 && <div className="browser-empty-state"><Layers size={24}/><span>No matching layers found</span></div>}
      </div>

      {menu && <LayerContextMenu {...menu} url={getLayerUrl(menu.layer)} canDelete={layers.length > 1} onClose={()=>setMenu(null)} onRename={()=>{setEditingId(menu.layer.id);setEditName(menu.layer.name);}} onDuplicate={()=>onDuplicateLayer(menu.layer.id)} onDelete={()=>onDeleteLayer(menu.layer.id)} onCopy={()=>handleCopyLayerUrl(menu.layer)} />}
      {/* New Layer Modal */}
      {showNewModal && (
        <div className="modal-backdrop" onClick={() => setShowNewModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div className="modal-title-group">
                <div className="modal-title">
                  <Layers size={18} color="#6366f1" />
                  <span>Create Layer Preset</span>
                </div>
                <p className="modal-subtitle">Configure an independent theme preset for your stream scenes.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="modal-close-btn"
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="modal-field">
              <label>Preset Name</label>
              <input
                type="text"
                placeholder="e.g. Twitch Main Cam Overlay"
                value={newLayerName}
                onChange={(e) => setNewLayerName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateConfirm()}
                autoFocus
              />
            </div>

            {lockedFormat ? <div className="modal-field"><label>Format</label><p>{lockedFormat === "vertical" ? "9:16 · TikTok studio" : "16:9 · Overlay studio"}</p></div> : <div className="modal-field"><label>Format</label><select value={newLayerFormat} onChange={(e) => setNewLayerFormat(e.target.value as "horizontal" | "vertical")}><option value="horizontal">16:9 Horizontal</option><option value="vertical">9:16 Vertical</option></select></div>}

            <div className="modal-actions">
              <button type="button" onClick={() => setShowNewModal(false)} className="modal-btn secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateConfirm}
                disabled={!newLayerName.trim()}
                className="modal-btn primary"
              >
                Create Preset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
