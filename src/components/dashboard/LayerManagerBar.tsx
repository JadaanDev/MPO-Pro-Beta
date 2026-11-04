import React, { useState, useRef } from "react";
import { 
  Layers, 
  Plus, 
  Copy, 
  Trash2, 
  Undo2, 
  Redo2, 
  History, 
  Download, 
  Upload, 
  Check, 
  Clock,
  Smartphone,
  Monitor,
  FolderOpen,
  FileJson
} from "lucide-react";
import { Layer, HistoryEntry } from "../../types/layers";

interface LayerManagerBarProps {
  layers: Layer[];
  activeLayerId: string;
  onSelectLayer: (id: string) => void;
  onCreateLayer: (name: string, format: "horizontal" | "vertical") => void;
  onDuplicateLayer: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  history: HistoryEntry[];
  historyIndex: number;
  onRevertHistory: (entryId: string) => void;
  onExportJson: () => string;
  onImportJson: (json: string) => boolean;
  onOpenLayerBrowser?: () => void;
}

export const LayerManagerBar: React.FC<LayerManagerBarProps> = ({
  layers,
  activeLayerId,
  onSelectLayer,
  onCreateLayer,
  onDuplicateLayer,
  onDeleteLayer,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  history,
  historyIndex,
  onRevertHistory,
  onExportJson,
  onImportJson,
  onOpenLayerBrowser,
}) => {
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileJson, setUploadedFileJson] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [newLayerName, setNewLayerName] = useState("");
  const [newLayerFormat, setNewLayerFormat] = useState<"horizontal" | "vertical">("horizontal");
  const [copiedExport, setCopiedExport] = useState(false);

  // Keep top bar uncluttered: display up to 3 recent layers
  const recentLayers = (() => {
    if (layers.length <= 3) return layers;
    const active = layers.find((l) => l.id === activeLayerId);
    const others = layers.filter((l) => l.id !== activeLayerId);
    return active ? [active, ...others.slice(0, 2)] : layers.slice(0, 3);
  })();

  const handleExport = () => {
    const json = onExportJson();
    // Download as .json file
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mpo-pro-layers-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setUploadedFileJson(text);
      };
      reader.readAsText(file);
    }
  };

  const handleConfirmFileImport = () => {
    if (uploadedFileJson) {
      if (onImportJson(uploadedFileJson)) {
        setShowImportModal(false);
        setUploadedFileName(null);
        setUploadedFileJson(null);
      } else {
        alert("Invalid JSON format in file. Please check structure.");
      }
    }
  };

  const handleConfirmImport = () => {
    if (onImportJson(importText)) {
      setShowImportModal(false);
      setImportText("");
    } else {
      alert("Invalid JSON format. Please check the file contents.");
    }
  };

  const handleConfirmCreate = () => {
    if (newLayerName.trim()) {
      onCreateLayer(newLayerName.trim(), newLayerFormat);
      setNewLayerName("");
      setShowNewModal(false);
    }
  };

  return (
    <div className="layer-bar-container">
      {/* Left: Recent Layer Selector Tabs */}
      <div className="layer-tabs-scroll">
        <div className="layer-bar-title">
          <Layers size={13} color="var(--accent-primary)" />
          <span className="layer-bar-label">Recent:</span>
        </div>

        {recentLayers.map((l) => {
          const isSelected = l.id === activeLayerId;
          return (
            <button
              key={l.id}
              onClick={() => onSelectLayer(l.id)}
              className={`layer-tab-btn ${isSelected ? "selected" : ""}`}
              title={`${l.name} (${l.format === "vertical" ? "9:16 Vertical" : "16:9 Horizontal"})`}
            >
              {l.format === "vertical" ? (
                <Smartphone size={12} color="#00f0ff" />
              ) : (
                <Monitor size={12} color="#818cf8" />
              )}
              <span className="layer-tab-name">{l.name}</span>
              <span className="layer-slug-pill">
                {l.format === "vertical" ? "9:16" : "16:9"}
              </span>
            </button>
          );
        })}

        {onOpenLayerBrowser && (
          <button
            onClick={onOpenLayerBrowser}
            className="layer-browse-btn"
            title="Browse all layer presets in Left Panel"
          >
            <FolderOpen size={12} />
            <span>All ({layers.length})</span>
          </button>
        )}

        <button
          onClick={() => setShowNewModal(true)}
          className="layer-add-btn"
          title="Create New Layer Preset"
        >
          <Plus size={13} />
          <span>New</span>
        </button>
      </div>

      {/* Right: Actions, History & Undo/Redo */}
      <div className="layer-actions-group">
        {/* Undo / Redo */}
        <div className="tool-btn-group">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`layer-tool-btn ${canUndo ? "" : "disabled"}`}
            title="Undo (Ctrl + Z)"
          >
            <Undo2 size={13} />
          </button>

          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`layer-tool-btn ${canRedo ? "" : "disabled"}`}
            title="Redo (Ctrl + Y)"
          >
            <Redo2 size={13} />
          </button>
        </div>

        <div className="tool-divider" />

        {/* History Timeline */}
        <button
          onClick={() => setShowHistoryModal(true)}
          className="layer-tool-btn with-badge"
          title="Version History & Checkpoints"
        >
          <History size={13} />
          <span className="layer-badge-pill">{history.length}</span>
        </button>

        <div className="tool-divider" />

        {/* Duplicate / Delete current */}
        <button
          onClick={() => onDuplicateLayer(activeLayerId)}
          className="layer-tool-btn"
          title="Duplicate active layer"
        >
          <Copy size={13} />
        </button>

        {layers.length > 1 && (
          <button
            onClick={() => onDeleteLayer(activeLayerId)}
            className="layer-tool-btn danger"
            title="Delete active layer"
          >
            <Trash2 size={13} />
          </button>
        )}

        <div className="tool-divider" />

        {/* Export / Import */}
        <button
          onClick={handleExport}
          className="layer-tool-btn"
          title="Export Layers JSON"
        >
          {copiedExport ? <Check size={13} color="#10b981" /> : <Download size={13} />}
        </button>

        <button
          onClick={() => setShowImportModal(true)}
          className="layer-tool-btn"
          title="Import Layers JSON"
        >
          <Upload size={13} />
        </button>
      </div>

      {/* History Drawer Modal */}
      {showHistoryModal && (
        <div className="modal-backdrop" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <History size={18} color="var(--accent-primary)" />
                <span>Persistent Version History Timeline</span>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="modal-close-btn"
              >
                ✕
              </button>
            </div>

            <div className="history-list">
              {history.map((entry, idx) => {
                const isCurrent = idx === historyIndex;
                const d = new Date(entry.timestamp);
                const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                return (
                  <div
                    key={entry.id}
                    className={`history-entry-item ${isCurrent ? "current" : ""}`}
                  >
                    <div className="history-item-left">
                      <Clock size={14} color={isCurrent ? "var(--accent-primary)" : "#64748b"} />
                      <div>
                        <div className="history-item-desc">{entry.description}</div>
                        <div className="history-item-time">{timeStr} • {entry.layers.length} Layers</div>
                      </div>
                    </div>

                    {isCurrent ? (
                      <span className="history-current-pill">Current</span>
                    ) : (
                      <button
                        onClick={() => {
                          onRevertHistory(entry.id);
                          setShowHistoryModal(false);
                        }}
                        className="history-revert-btn"
                      >
                        Revert Here
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Create Layer Modal */}
      {showNewModal && (
        <div className="modal-backdrop" onClick={() => setShowNewModal(false)}>
          <div className="modal-card small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Create New Layer Preset</div>
              <button onClick={() => setShowNewModal(false)} className="modal-close-btn">✕</button>
            </div>
            <div className="modal-body">
              <label className="modal-label">Layer Name</label>
              <input
                type="text"
                value={newLayerName}
                onChange={(e) => setNewLayerName(e.target.value)}
                placeholder="e.g. TikTok Vertical Overlay"
                className="modal-input"
                autoFocus
              />

              <label className="modal-label" style={{ marginTop: "12px" }}>Stream Format</label>
              <div className="format-picker">
                <button
                  onClick={() => setNewLayerFormat("horizontal")}
                  className={`format-option ${newLayerFormat === "horizontal" ? "active" : ""}`}
                >
                  <Monitor size={16} />
                  <span>Horizontal (16:9 OBS)</span>
                </button>

                <button
                  onClick={() => setNewLayerFormat("vertical")}
                  className={`format-option ${newLayerFormat === "vertical" ? "active" : ""}`}
                >
                  <Smartphone size={16} />
                  <span>Vertical (9:16 TikTok)</span>
                </button>
              </div>

              <div className="modal-actions">
                <button onClick={() => setShowNewModal(false)} className="modal-btn cancel">
                  Cancel
                </button>
                <button onClick={handleConfirmCreate} className="modal-btn confirm">
                  Create Layer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import JSON Modal (Dual Option: Upload File + Paste Text) */}
      {showImportModal && (
        <div className="modal-backdrop" onClick={() => setShowImportModal(false)}>
          <div className="modal-card dual-import-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <Upload size={16} color="var(--accent-primary)" />
                <span>Import Layers Workspace</span>
              </div>
              <button onClick={() => setShowImportModal(false)} className="modal-close-btn">✕</button>
            </div>
            <div className="modal-body dual-import-body">
              {/* Option 1: File Upload */}
              <div className="import-box file-upload-box">
                <div className="import-box-header">
                  <FileJson size={15} color="#38bdf8" />
                  <span className="import-box-title">Method 1: Upload .json File</span>
                </div>
                <div
                  className="file-dropzone-area"
                  onClick={() => fileInputRef.current?.click()}
                  title="Click to browse or drop file"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json,application/json"
                    onChange={handleFileUpload}
                    style={{ display: "none" }}
                  />
                  <Upload size={24} className="dropzone-icon" />
                  <div className="dropzone-text">
                    {uploadedFileName ? (
                      <span className="file-ready-text">Selected: {uploadedFileName}</span>
                    ) : (
                      <span>Click to browse or drop your .json file here</span>
                    )}
                  </div>
                </div>
                {uploadedFileJson && (
                  <button
                    onClick={handleConfirmFileImport}
                    className="modal-btn confirm import-action-btn"
                  >
                    Import Uploaded File
                  </button>
                )}
              </div>

              <div className="import-box-divider">
                <span>OR</span>
              </div>

              {/* Option 2: Paste Raw JSON */}
              <div className="import-box text-paste-box">
                <div className="import-box-header">
                  <Copy size={15} color="#a5b4fc" />
                  <span className="import-box-title">Method 2: Paste JSON Directly</span>
                </div>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder='Paste JSON here: {"layers":[...]}'
                  className="import-textarea"
                  rows={4}
                />
                <button
                  onClick={handleConfirmImport}
                  disabled={!importText.trim()}
                  className="modal-btn confirm import-action-btn"
                >
                  Import Pasted JSON
                </button>
              </div>
            </div>
            <div className="modal-footer-close">
              <button onClick={() => setShowImportModal(false)} className="modal-btn cancel">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
