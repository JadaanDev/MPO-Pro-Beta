import React from "react";
import { 
  X, 
  RotateCcw, 
  Clock, 
  CheckCircle2, 
  FastForward, 
  History as HistoryIcon,
  Sparkles
} from "lucide-react";
import { HistoryEntry } from "../../types/layers";

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryEntry[];
  historyIndex: number;
  onRevertToHistory: (id: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  historyIndex,
  onRevertToHistory,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) => {
  if (!isOpen) return null;

  return (
    <div className="history-drawer-backdrop" onClick={onClose}>
      <aside 
        className="history-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="history-drawer-header">
          <div className="drawer-title-group">
            <HistoryIcon size={16} color="var(--accent-primary)" />
            <span className="drawer-title">Workspace Version History</span>
            <span className="drawer-badge">{history.length} Checkpoints</span>
          </div>

          <div className="drawer-header-actions">
            {/* Quick Step Undo/Redo */}
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="drawer-step-btn"
              title="Undo Step (Ctrl+Z)"
            >
              <RotateCcw size={13} />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="drawer-step-btn"
              title="Redo Step (Ctrl+Y)"
            >
              <FastForward size={13} />
            </button>
            <button
              onClick={onClose}
              className="drawer-close-btn"
              title="Close History Panel"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Tip Banner */}
        <div className="history-drawer-tip">
          <Sparkles size={13} color="#00f0ff" />
          <span>
            Reverting to any past checkpoint retains your entire timeline until you make a new modification.
          </span>
        </div>

        {/* Checkpoint Timeline List */}
        <div className="history-timeline-scroll">
          {history.map((entry, idx) => {
            const isCurrent = idx === historyIndex;
            const isFuture = idx > historyIndex;

            const timeStr = new Date(entry.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });

            return (
              <div
                key={entry.id}
                onClick={() => onRevertToHistory(entry.id)}
                className={`history-checkpoint-card ${
                  isCurrent ? "active-checkpoint" : isFuture ? "future-checkpoint" : "past-checkpoint"
                }`}
              >
                <div className="checkpoint-indicator-rail">
                  <div className={`checkpoint-node ${isCurrent ? "node-active" : isFuture ? "node-future" : "node-past"}`}>
                    {isCurrent ? (
                      <CheckCircle2 size={12} color="#10b981" />
                    ) : (
                      <Clock size={10} />
                    )}
                  </div>
                  {idx < history.length - 1 && <div className="checkpoint-connecting-line" />}
                </div>

                <div className="checkpoint-card-body">
                  <div className="checkpoint-header-row">
                    <span className="checkpoint-desc">{entry.description}</span>
                    <span className="checkpoint-time">{timeStr}</span>
                  </div>

                  <div className="checkpoint-footer-row">
                    <span className="checkpoint-layer-meta">
                      {entry.layers.length} Layers • Active: {entry.activeLayerId}
                    </span>

                    {isCurrent ? (
                      <span className="checkpoint-status-tag current">Active Checkpoint</span>
                    ) : isFuture ? (
                      <span className="checkpoint-status-tag future">Redo Branch</span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRevertToHistory(entry.id);
                        }}
                        className="checkpoint-revert-btn"
                        title="Revert workspace to this timestamp"
                      >
                        Revert Here
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
};

export default HistoryDrawer;
