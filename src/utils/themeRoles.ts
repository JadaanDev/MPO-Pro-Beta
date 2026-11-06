export const ROLE_SELECTORS = {
    frame: '.mpo-card,.big-stage-inner', artwork: '.mpo-art,.collection-art,.apple-art-box,.artwork-container',
    title: '.mpo-title,.track-title,.big-copy h1', artist: '.mpo-artist,.track-artist', album: '.mpo-album,.track-album',
    themeLabel: '.mpo-theme-label', badge: '.mpo-badge', status: '.mpo-playback-status',
    timestamps: '.mpo-universal-timestamps,.apple-timestamps-row,.cyber-timestamps,.glass-timestamps,.zen-time',
    progress: '.mpo-progress,.apple-progress-bar-track,.glass-progress-track,.cyber-progress-track,.collection-progress',
    indicator: '.mpo-universal-visualizer,.mpo-visualizer',
} as const;
export type ArrangeRole = keyof typeof ROLE_SELECTORS;
const aliases: Record<string, ArrangeRole> = { 'artwork-image': 'artwork', 'progress-track': 'progress', 'progress-fill': 'progress', 'indicator-bar': 'indicator', source: 'badge', card: 'frame', text: 'themeLabel', 'theme-label': 'themeLabel', visualizer: 'indicator', 'playback-status': 'status' };
export function nodeRole(node: Element): ArrangeRole | null {
    const role = node.getAttribute('data-theme-role');
    if (role && role in aliases)
        return aliases[role];
    if (role && role in ROLE_SELECTORS)
        return role as ArrangeRole;
    for (const key of Object.keys(ROLE_SELECTORS) as ArrangeRole[])
        if (node.matches(ROLE_SELECTORS[key]))
            return key;
    return null;
}
export function roleTargets(root: ParentNode, role: ArrangeRole): HTMLElement[] {
    const semantic = Array.from(root.querySelectorAll<HTMLElement>(`[data-theme-role="${role}"]`));
    const nodes = semantic.length ? semantic : Array.from(root.querySelectorAll<HTMLElement>(ROLE_SELECTORS[role]));
    return nodes.filter(el => el.offsetWidth > 0 && el.offsetHeight > 0 && getComputedStyle(el).visibility !== 'hidden' && !nodes.some(other => other !== el && other.contains(el)));
}
export function roleTarget(root: ParentNode, role: ArrangeRole): HTMLElement | null { return roleTargets(root, role)[0] || null; }
