import React, { useState } from "react";
import { LayerContextMenu } from "../LayerContextMenu";
import { LayerCard } from "../LayerCard";
import { Layer } from "../../../types/layers";
import { ThemeId } from "../../../types/themes";
import { Search, Plus } from "lucide-react";
import { THEME_REGISTRY } from "../../../themes/ThemeRegistry";

interface HudLayersPanelProps {
  layers: Layer[];
  activeLayerId: string;
  onSelectLayer: (id: string) => void;
  onCreateLayer: (name: string, themeId?: ThemeId) => void;
  onDuplicateLayer: (id: string) => void;
  onRenameLayer: (id: string, name: string) => void;
  onDeleteLayer: (id: string) => void;
}

export const HudLayersPanel: React.FC<HudLayersPanelProps> = ({
  layers,
  activeLayerId,
  onSelectLayer,
  onCreateLayer,
  onDuplicateLayer,
  onRenameLayer,
  onDeleteLayer,
}) => {
  const [menu, setMenu] = useState<{layer:Layer;x:number;y:number}|null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [newLayerName, setNewLayerName] = useState("");
  const [selectedThemeId, setSelectedThemeId] = useState<ThemeId>("desktop-air");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = layers.filter(
    (l) =>
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.themeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (THEME_REGISTRY[l.themeId]?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyUrl = (layerId: string) => {
    const url = `http://127.0.0.1:4849/?mode=hud&layer=${layerId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(layerId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStartRename = (layer: Layer) => {
    setEditingId(layer.id);
    setEditName(layer.name);
  };

  const handleSaveRename = (layerId: string) => {
    if (editName.trim()) {
      onRenameLayer(layerId, editName.trim());
    }
    setEditingId(null);
  };

  const handleCreateSubmit = () => {
    if (newLayerName.trim()) {
      onCreateLayer(newLayerName.trim(), selectedThemeId);
      setNewLayerName("");
      setShowNewModal(false);
    }
  };

  return (
    <div className="hud-layers-panel-root unified-layer-browser">
      {/* Search and New Preset Button */}
      <div className="hud-layers-search-row unified-search-row">
        <div className="hud-layers-search-wrap unified-search-wrap">
          <Search size={13} className="hud-layers-search-icon unified-search-icon" />
          <input
            type="text"
            placeholder="Search desktop profiles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="hud-layers-search-input unified-search-input"
          />
        </div>
        <button
          type="button"
          className="hud-layers-add-btn unified-add-btn"
          onClick={() => setShowNewModal(true)}
          title="Create New Desktop Overlay Preset"
        >
          <Plus size={14} />
          <span>New</span>
        </button>
      </div>

      <div className="unified-layer-list">
        {filtered.map(layer => <LayerCard key={layer.id} layer={layer} active={layer.id === activeLayerId} desktop copied={copiedId === layer.id} canDelete={layers.length > 1} editing={editingId === layer.id} editName={editName} onEditName={setEditName} onSelect={()=>onSelectLayer(layer.id)} onRename={()=>handleStartRename(layer)} onSaveRename={()=>handleSaveRename(layer.id)} onCancelRename={()=>setEditingId(null)} onCopy={()=>handleCopyUrl(layer.id)} onDuplicate={()=>onDuplicateLayer(layer.id)} onDelete={()=>onDeleteLayer(layer.id)} onMenu={event=>{event.preventDefault();event.stopPropagation();setMenu({layer,x:event.clientX,y:event.clientY});}} />)}
        {filtered.length === 0 && <div className="browser-empty-state"><span>No matching layers found</span></div>}
      </div>

      {menu && <LayerContextMenu {...menu} url={`http://127.0.0.1:4849/?mode=hud&layer=${menu.layer.id}`} canDelete={layers.length > 1} onClose={()=>setMenu(null)} onRename={()=>handleStartRename(menu.layer)} onDuplicate={()=>onDuplicateLayer(menu.layer.id)} onDelete={()=>onDeleteLayer(menu.layer.id)} onCopy={()=>handleCopyUrl(menu.layer.id)} />}
      {/* New Desktop Preset Modal */}
      {showNewModal && (
        <div className="hud-layer-modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="hud-layer-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="hud-layer-modal-title">Create Desktop Overlay Profile</h3>
            <p className="hud-layer-modal-desc">
              Save an independent HUD design profile with custom dimensions and styling.
            </p>

            <div className="hud-control-col" style={{ marginTop: 12 }}>
              <span className="hud-control-label">Profile Name</span>
              <input
                type="text"
                className="hud-layers-search-input"
                placeholder="e.g. Minimalist Zen Floating HUD"
                value={newLayerName}
                autoFocus
                onChange={(e) => setNewLayerName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateSubmit()}
              />
            </div>

            <div className="hud-control-col" style={{ marginTop: 12 }}>
              <span className="hud-control-label">Base Theme</span>
              <select
                className="hud-select"
                value={selectedThemeId}
                onChange={(e) => setSelectedThemeId(e.target.value as ThemeId)}
              >
                {Object.entries(THEME_REGISTRY).map(([id, t]) => (
                  <option key={id} value={id}>
                    {t.name} ({t.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="hud-layer-modal-actions">
              <button
                type="button"
                className="hud-secondary-btn"
                onClick={() => setShowNewModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="hud-primary-btn toggle-on"
                onClick={handleCreateSubmit}
                disabled={!newLayerName.trim()}
              >
                Create Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
