import React, { useState } from "react";
import { 
  Sliders, 
  Plus, 
  RotateCcw, 
  Search, 
  Music, 
  Globe, 
  PlayCircle, 
  MessageSquare, 
  Trash2, 
  Headphones, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { Toggle } from "../../../common/Toggle";
import { 
  MediaAppSource, 
  MediaAppSourceCategory,
  CATEGORY_DEFINITIONS,
  updateAppSource, 
  toggleCategory,
  applyMusicOnlyPreset,
  denyAllBrowsersPreset,
  toggleAllSources,
  addCustomAppSource, 
  removeAppSource, 
  resetAppSourcesToDefault 
} from "../../../../utils/appSources";

interface SettingsTabPlayersProps {
  appSources: MediaAppSource[];
  onSourcesUpdated: (sources: MediaAppSource[]) => void;
}

const CATEGORY_ICONS: Record<MediaAppSourceCategory, React.ReactNode> = {
  music: <Music size={15} color="#ec4899" />,
  browser: <Globe size={15} color="#38bdf8" />,
  player: <PlayCircle size={15} color="#a855f7" />,
  communication: <MessageSquare size={15} color="#10b981" />,
  custom: <Sliders size={15} color="#f59e0b" />,
};

export const SettingsTabPlayers: React.FC<SettingsTabPlayersProps> = ({
  appSources,
  onSourcesUpdated,
}) => {
  const [appSearch, setAppSearch] = useState<string>("");
  const [activeCategoryTab, setActiveCategoryTab] = useState<"all" | MediaAppSourceCategory>("all");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [newAppName, setNewAppName] = useState<string>("");
  const [newAppDisplayName, setNewAppDisplayName] = useState<string>("");
  const [newAppCategory, setNewAppCategory] = useState<MediaAppSourceCategory>("custom");
  const [showAddAppForm, setShowAddAppForm] = useState<boolean>(false);

  // Toggle single app allow / deny
  const handleToggleAppSource = (id: string, enabled: boolean) => {
    const updated = updateAppSource(id, { enabled });
    onSourcesUpdated(updated);
  };

  // Toggle master category allow / deny
  const handleToggleCategory = (category: MediaAppSourceCategory, enabled: boolean) => {
    const updated = toggleCategory(category, enabled);
    onSourcesUpdated(updated);
  };

  // Preset: Music Only
  const handlePresetMusicOnly = () => {
    const updated = applyMusicOnlyPreset();
    onSourcesUpdated(updated);
  };

  // Preset: Deny All Browsers
  const handlePresetDenyBrowsers = () => {
    const updated = denyAllBrowsersPreset();
    onSourcesUpdated(updated);
  };

  // Preset: Allow All
  const handlePresetAllowAll = () => {
    const updated = toggleAllSources(true);
    onSourcesUpdated(updated);
  };

  // Preset: Deny All
  const handlePresetDenyAll = () => {
    const updated = toggleAllSources(false);
    onSourcesUpdated(updated);
  };

  // Edit custom display name
  const handleEditAppDisplayName = (id: string, displayName: string) => {
    const updated = updateAppSource(id, { displayName });
    onSourcesUpdated(updated);
  };

  // Add custom app
  const handleAddCustomApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName.trim()) return;
    const updated = addCustomAppSource(newAppName.trim(), newAppDisplayName.trim() || undefined, newAppCategory);
    onSourcesUpdated(updated);
    setNewAppName("");
    setNewAppDisplayName("");
    setShowAddAppForm(false);
  };

  // Remove custom app
  const handleRemoveApp = (id: string) => {
    const updated = removeAppSource(id);
    onSourcesUpdated(updated);
  };

  // Reset to default
  const handleResetApps = () => {
    if (window.confirm("Reset all audio apps, categories, and player rules to system default?")) {
      const updated = resetAppSourcesToDefault();
      onSourcesUpdated(updated);
    }
  };

  // Toggle category accordion
  const toggleCategoryCollapse = (catId: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  // Filter sources by search query
  const searchFilteredSources = appSources.filter((s) => {
    const q = appSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      s.displayName.toLowerCase().includes(q) ||
      s.matchRule.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
    );
  });

  // Group sources by category
  const categoriesList: MediaAppSourceCategory[] = ["music", "browser", "player", "communication", "custom"];
  const visibleCategories = categoriesList.filter((cat) => {
    if (activeCategoryTab !== "all" && activeCategoryTab !== cat) return false;
    return searchFilteredSources.some((s) => s.category === cat);
  });

  const totalAllowed = appSources.filter((s) => s.enabled).length;

  return (
    <div className="settings-section-card highlight-purple">
      {/* Header */}
      <div className="settings-card-header">
        <div className="settings-card-icon-wrap" style={{ background: "rgba(236, 72, 153, 0.15)" }}>
          <Sliders size={20} color="#ec4899" />
        </div>
        <div className="settings-card-title-group">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <div className="settings-card-title">Media Players & App Sources Manager</div>
              <div className="settings-card-desc">
                Allow or deny any audio application, web browser, or entire category. Denied sources are skipped at the OS level so they will never hijack your overlay from an allowed player.
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setShowAddAppForm((v) => !v)}
                className="settings-btn-pill primary"
                title="Add any audio player or executable process"
              >
                <Plus size={13} />
                <span>Add App</span>
              </button>
              <button
                type="button"
                onClick={handleResetApps}
                className="settings-btn-pill"
                title="Restore default player settings"
              >
                <RotateCcw size={13} />
                <span>Reset Defaults</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Presets Bar */}
      <div className="app-presets-strip">
        <span className="presets-label">Quick Rules:</span>
        <div className="presets-buttons-group">
          <button
            type="button"
            className="preset-btn-pill highlight-music"
            onClick={handlePresetMusicOnly}
            title="Isolate Spotify, Apple Music & TIDAL. Block all web browsers & background videos."
          >
            <Headphones size={13} />
            <span>Music Only Mode</span>
          </button>

          <button
            type="button"
            className="preset-btn-pill highlight-browsers"
            onClick={handlePresetDenyBrowsers}
            title="Block Chrome, Edge, Firefox, Brave, and Opera in 1 click"
          >
            <ShieldAlert size={13} />
            <span>Deny All Browsers</span>
          </button>

          <button
            type="button"
            className="preset-btn-pill"
            onClick={handlePresetAllowAll}
            title="Allow all applications and categories"
          >
            <CheckCircle2 size={13} color="#10b981" />
            <span>Allow All</span>
          </button>

          <button
            type="button"
            className="preset-btn-pill"
            onClick={handlePresetDenyAll}
            title="Deny all applications"
          >
            <XCircle size={13} color="#f43f5e" />
            <span>Deny All</span>
          </button>
        </div>

        <div className="presets-summary-badge">
          <span className="count-allowed">{totalAllowed}</span>
          <span className="count-total">/{appSources.length} Allowed</span>
        </div>
      </div>

      {/* Add Custom App Form */}
      {showAddAppForm && (
        <form onSubmit={handleAddCustomApp} className="add-app-form">
          <div className="form-input-col">
            <label>Executable Process or Identifier</label>
            <input
              type="text"
              placeholder="e.g. zen.exe, cider.exe, foobar2000"
              value={newAppName}
              onChange={(e) => setNewAppName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-input-col">
            <label>Custom Display Name (Shown on MPO)</label>
            <input
              type="text"
              placeholder="e.g. Zen Music, Cider Player"
              value={newAppDisplayName}
              onChange={(e) => setNewAppDisplayName(e.target.value)}
            />
          </div>
          <div className="form-input-col" style={{ maxWidth: 160 }}>
            <label>Category</label>
            <select
              value={newAppCategory}
              onChange={(e) => setNewAppCategory(e.target.value as MediaAppSourceCategory)}
              className="add-app-select"
            >
              <option value="music">Music</option>
              <option value="browser">Browser</option>
              <option value="player">Player</option>
              <option value="communication">Communication</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div className="form-submit-col">
            <button type="submit" className="settings-btn-pill primary">
              Save App
            </button>
            <button
              type="button"
              onClick={() => setShowAddAppForm(false)}
              className="settings-btn-pill"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Search & Category Filter Pills */}
      <div className="app-sources-search-row">
        <div className="search-wrap">
          <Search size={14} color="#64748b" />
          <input
            type="text"
            placeholder="Search audio apps (Spotify, Chrome, YouTube Music, VLC, Discord, etc.)..."
            value={appSearch}
            onChange={(e) => setAppSearch(e.target.value)}
          />
        </div>

        <div className="category-filter-pills">
          <button
            type="button"
            className={`cat-filter-btn ${activeCategoryTab === "all" ? "active" : ""}`}
            onClick={() => setActiveCategoryTab("all")}
          >
            All ({searchFilteredSources.length})
          </button>
          {categoriesList.map((cat) => {
            const count = appSources.filter((s) => s.category === cat).length;
            if (count === 0 && cat !== "custom") return null;
            return (
              <button
                key={cat}
                type="button"
                className={`cat-filter-btn ${activeCategoryTab === cat ? "active" : ""}`}
                onClick={() => setActiveCategoryTab(cat)}
              >
                {CATEGORY_DEFINITIONS[cat].name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Grouped Category Sections with Master Toggles */}
      <div className="app-categories-container">
        {visibleCategories.length === 0 ? (
          <div className="app-sources-empty">
            No media applications matched your search "{appSearch}".
          </div>
        ) : (
          visibleCategories.map((catId) => {
            const catMeta = CATEGORY_DEFINITIONS[catId];
            const catSources = searchFilteredSources.filter((s) => s.category === catId);
            if (catSources.length === 0) return null;

            const allowedInCat = catSources.filter((s) => s.enabled).length;
            const isAllCatEnabled = allowedInCat === catSources.length;
            const isCollapsed = Boolean(collapsedCategories[catId]);

            return (
              <div key={catId} className={`category-section-card ${isAllCatEnabled ? "all-enabled" : allowedInCat === 0 ? "all-denied" : "partial"}`}>
                {/* Category Master Header Card */}
                <div className="category-header-row">
                  <div className="category-header-left" onClick={() => toggleCategoryCollapse(catId)}>
                    <button type="button" className="cat-accordion-arrow">
                      {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                    </button>
                    <div className="category-icon-wrap">
                      {CATEGORY_ICONS[catId]}
                    </div>
                    <div className="category-titles-col">
                      <div className="category-name-wrap">
                        <span className="category-title">{catMeta.name}</span>
                        <span className={`category-status-pill ${isAllCatEnabled ? "allowed" : allowedInCat === 0 ? "denied" : "partial"}`}>
                          {isAllCatEnabled ? "All Allowed" : allowedInCat === 0 ? "All Denied" : `${allowedInCat}/${catSources.length} Allowed`}
                        </span>
                      </div>
                      <span className="category-desc">{catMeta.description}</span>
                    </div>
                  </div>

                  {/* Category Master Switch */}
                  <div className="category-header-right">
                    <div className="master-toggle-group">
                      <span className="master-toggle-label">
                        {isAllCatEnabled ? "Category Allowed" : allowedInCat === 0 ? "Category Denied" : "Toggle Category"}
                      </span>
                      <Toggle
                        checked={isAllCatEnabled}
                        onChange={(checked: boolean) => handleToggleCategory(catId, checked)}
                        size="md"
                      />
                    </div>
                  </div>
                </div>

                {/* Individual Apps List in Category */}
                {!isCollapsed && (
                  <div className="category-apps-list">
                    {catSources.map((source) => (
                      <div key={source.id} className={`app-source-item ${source.enabled ? "enabled" : "disabled"}`}>
                        <div className="app-source-info">
                          <div className="app-icon-wrap">
                            <Music size={14} color={source.enabled ? "#ec4899" : "#64748b"} />
                          </div>
                          <div className="app-names-col">
                            <input
                              type="text"
                              className="app-display-name-input"
                              value={source.displayName}
                              onChange={(e) => handleEditAppDisplayName(source.id, e.target.value)}
                              title="Click to edit shown name on overlay (auto-saved)"
                            />
                            <div className="app-raw-rule">
                              Match Rule: <code>{source.matchRule}</code>
                              {source.isCustom && <span className="custom-app-badge">Custom</span>}
                            </div>
                          </div>
                        </div>

                        <div className="app-source-controls">
                          <span className={`status-label ${source.enabled ? "shown" : "hidden"}`}>
                            {source.enabled ? "Allowed" : "Denied"}
                          </span>
                          <Toggle
                            checked={source.enabled}
                            onChange={(checked: boolean) => handleToggleAppSource(source.id, checked)}
                            size="sm"
                          />
                          {source.isCustom && (
                            <button
                              type="button"
                              onClick={() => handleRemoveApp(source.id)}
                              className="delete-source-btn"
                              title="Remove custom player"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
