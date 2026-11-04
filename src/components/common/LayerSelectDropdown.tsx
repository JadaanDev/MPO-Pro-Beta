import React, { useState, useRef, useEffect } from "react";
import { 
  ChevronDown, 
  Check, 
  Plus, 
  Copy, 
  Trash2, 
  History, 
  Download, 
  Upload, 
  Layers, 
  Monitor, 
  Smartphone 
} from "lucide-react";
import { Layer } from "../../types/layers";

interface LayerSelectDropdownProps {
  layers: Layer[];
  activeLayerId: string;
  onSelectLayer: (id: string) => void;
  onCreateLayer: (name?: string, format?: "horizontal" | "vertical") => void;
  onDuplicateLayer: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onOpenHistoryDrawer: () => void;
  onOpenImportModal: () => void;
  onExportJson: () => void;
  onOpenLayerBrowser: () => void;
  historyCount?: number;
}

export const LayerSelectDropdown: React.FC<LayerSelectDropdownProps> = ({
  layers,
  activeLayerId,
  onSelectLayer,
  onCreateLayer,
  onDuplicateLayer,
  onDeleteLayer,
  onOpenHistoryDrawer,
  onOpenImportModal,
  onExportJson,
  onOpenLayerBrowser,
  historyCount = 0,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeLayer = layers.find((l) => l.id === activeLayerId) || layers[0];

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  const handleSelect = (id: string) => {
    onSelectLayer(id);
    setIsOpen(false);
  };

  return (
    <div className="layer-select-dropdown-container" ref={dropdownRef}>
      {/* Trigger Button (Untitled UI Select Trigger Style) */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`layer-select-trigger ${isOpen ? "open" : ""}`}
        title="Switch or manage active overlay layer preset"
      >
        <div className="trigger-lead-icon">
          {activeLayer?.format === "vertical" ? (
            <Smartphone size={14} color="#a855f7" />
          ) : (
            <Monitor size={14} color="#38bdf8" />
          )}
        </div>

        <div className="trigger-text-group">
          <span className="trigger-layer-name">{activeLayer?.name || "Active Layer"}</span>
          <span className={`trigger-format-badge ${activeLayer?.format || "horizontal"}`}>
            {activeLayer?.format === "vertical" ? "9:16" : "16:9"}
          </span>
        </div>

        <ChevronDown size={14} className={`trigger-chevron ${isOpen ? "rotate" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="layer-select-menu">
          <div className="menu-header-row">
            <span className="menu-title">Select Preset Layer</span>
            <span className="menu-count-badge">{layers.length} Layers</span>
          </div>

          <div className="menu-layers-list">
            {layers.map((layer) => {
              const isSelected = layer.id === activeLayerId;

              return (
                <div
                  key={layer.id}
                  onClick={() => handleSelect(layer.id)}
                  className={`menu-layer-item ${isSelected ? "selected" : ""}`}
                >
                  <div className="layer-item-lead">
                    {layer.format === "vertical" ? (
                      <Smartphone size={13} className="format-icon vertical" />
                    ) : (
                      <Monitor size={13} className="format-icon horizontal" />
                    )}
                  </div>

                  <div className="layer-item-info">
                    <div className="layer-item-title-row">
                      <span className="layer-item-name">{layer.name}</span>
                      <span className={`layer-item-pill ${layer.format}`}>
                        {layer.format === "vertical" ? "9:16" : "16:9"}
                      </span>
                    </div>

                  </div>

                  <div className="layer-item-tail">
                    {isSelected && <Check size={14} className="check-icon" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Tools Section */}
          <div className="menu-actions-divider" />
          <div className="menu-actions-list">
            <button
              onClick={() => {
                onCreateLayer("New Overlay Layer", "horizontal");
                setIsOpen(false);
              }}
              className="menu-action-btn primary"
            >
              <Plus size={13} />
              <span>New Layer Preset</span>
            </button>

            <button
              onClick={() => {
                onDuplicateLayer(activeLayerId);
                setIsOpen(false);
              }}
              className="menu-action-btn"
            >
              <Copy size={13} />
              <span>Duplicate Active Layer</span>
            </button>

            {layers.length > 1 && (
              <button
                onClick={() => {
                  onDeleteLayer(activeLayerId);
                  setIsOpen(false);
                }}
                className="menu-action-btn danger"
              >
                <Trash2 size={13} />
                <span>Delete Active Layer</span>
              </button>
            )}

            <button
              onClick={() => {
                onOpenHistoryDrawer();
                setIsOpen(false);
              }}
              className="menu-action-btn"
            >
              <History size={13} color="#00f0ff" />
              <span>Version History Timeline</span>
              {historyCount > 0 && <span className="action-tag">{historyCount}</span>}
            </button>

            <button
              onClick={() => {
                onOpenLayerBrowser();
                setIsOpen(false);
              }}
              className="menu-action-btn"
            >
              <Layers size={13} color="#6366f1" />
              <span>Manage Layers Browser</span>
            </button>

            <div className="menu-sub-actions-row">
              <button
                onClick={() => {
                  onExportJson();
                  setIsOpen(false);
                }}
                className="menu-sub-btn"
                title="Export Workspace JSON"
              >
                <Download size={12} />
                <span>Export</span>
              </button>
              <button
                onClick={() => {
                  onOpenImportModal();
                  setIsOpen(false);
                }}
                className="menu-sub-btn"
                title="Import Layers JSON"
              >
                <Upload size={12} />
                <span>Import</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LayerSelectDropdown;
