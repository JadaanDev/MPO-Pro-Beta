import { validateThemeDefinition, type ThemeDefinition } from './schema';
import type { ThemeBundle } from './compiler/types';
function fingerprint(text: string) { let hash = 2166136261; for (const char of text.replace(/\r\n/g, '\n')) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
} return (hash >>> 0).toString(16); }
export function visualProjectFile(theme: ThemeDefinition, tsx: string, css: string): string {
    const { bundle: _bundle, sourceBundle: _source, ...project } = theme;
    return JSON.stringify({ format: 'mpo-visual-project', version: 1, theme: project, tsx: fingerprint(tsx), css: fingerprint(css) }, null, 2);
}
/** Never overwrite external source edits with stale visual geometry. */
export function visualThemeFromBundle(bundle: ThemeBundle): ThemeDefinition | null {
    try {
        const project = JSON.parse(bundle.files['mpo-builder.json'] || 'null');
        if ((bundle.manifest.entryPoint && bundle.manifest.entryPoint !== 'Theme.tsx') || bundle.manifest.stylesheets?.some(file => file !== 'style.css')) return null;
        if (project?.format !== 'mpo-visual-project' || project.version !== 1 || validateThemeDefinition(project.theme).length || project.theme.id !== bundle.manifest.id || fingerprint(bundle.files['Theme.tsx'] || '') !== project.tsx || fingerprint(bundle.files['style.css'] || '') !== project.css)
            return null;
        return { ...project.theme, name:bundle.manifest.name, canvasSizes: { ...project.theme.canvasSizes, ...bundle.manifest.canvasSizes }, sourceBundle: bundle };
    }
    catch {
        return null;
    }
}
