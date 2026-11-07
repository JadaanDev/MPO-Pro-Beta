import { StudioSelect } from "../common/StudioSelect";
import { THEME_ELEMENT_LABELS, type ThemeElement } from "./ContextualThemeEditor";

const semanticTargets: Record<ThemeElement, string> = {
  title: '[data-theme-role="title"]', artist: '[data-theme-role="artist"]', album: '[data-theme-role="album"]',
  themeLabel: '[data-theme-role="themeLabel"], [data-theme-role="text"], [data-theme-role="theme-label"]',
  badge: '[data-theme-role="badge"], [data-theme-role="source"]',
  timestamps: '[data-theme-role="timestamps"]', status: '[data-theme-role="status"], [data-theme-role="playback-status"]',
  artwork: '[data-theme-role="artwork"], [data-theme-role="artwork-image"]:not([data-theme-role="artwork"] *)',
  progress: '[data-theme-role="progress"], [data-theme-role="progress-track"]:not([data-theme-role="progress"] *), [data-theme-role="progress-fill"]:not([data-theme-role="progress"] *)',
  indicator: '[data-theme-role="indicator"], [data-theme-role="visualizer"], [data-theme-role="indicator-bar"]:not([data-theme-role="indicator"] *)',
  frame: '[data-theme-role="frame"], [data-theme-role="card"]',
};
const semanticCss = Object.entries(semanticTargets).map(([role, targets]) => `
.arrange-mode :is(.single-preview-mount,.big-preview-frame) :is(${targets}) { cursor: pointer; }
.arrange-mode[data-arrange-hovered="${role}"] :is(.single-preview-mount,.big-preview-frame) :is(${targets}) { outline: 1px dashed #cdbcf5; outline-offset: 3px; }
.arrange-mode[data-arrange-selected="${role}"] :is(.single-preview-mount,.big-preview-frame) :is(${targets}) { outline: 2px solid #e1d2ff !important; outline-offset: 3px; }
`).join("\n");

/** Hidden and absent roles remain reachable by keyboard and can be enabled. */
export function ArrangeElementPicker({ selected, onSelect }: { selected: ThemeElement | null; onSelect: (role: ThemeElement) => void }) {
  return <><style>{semanticCss}</style><label className="arrange-element-picker">Edit element <StudioSelect aria-label="Arrange element" value={selected || ""} onChange={event => onSelect(event.target.value as ThemeElement)}>
    <option value="" disabled>Select an element</option>
    {(Object.entries(THEME_ELEMENT_LABELS) as [ThemeElement, string][]).map(([role, label]) => <option key={role} value={role}>{label}</option>)}
  </StudioSelect></label></>;
}
