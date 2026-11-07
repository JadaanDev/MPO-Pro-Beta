export const ROLE_SELECTORS = {
    frame: '.mpo-card,.big-stage-inner,[class*="-card"]', artwork: '.mpo-art,.mpo-art-img,.collection-art,.apple-art-box,.artwork-container,[data-theme-element="artwork"],[data-theme-type="artwork"],[class*="artwork-container"],[class*="artwork-img"],[class*="album-art"]',
    title: '.mpo-title,.track-title,.big-copy h1,[data-theme-element="title"],[data-theme-type="title"],[class*="track-title"],[class*="-title"],[class*="trackTitle"]',
    artist: '.mpo-artist,.track-artist,[data-theme-element="artist"],[data-theme-type="artist"],[class*="track-subtitle"],[class*="track-artist"],[class*="-artist"],[class*="trackArtist"]',
    album: '.mpo-album,.track-album,[data-theme-element="album"],[data-theme-type="album"],[class*="track-album"],[class*="-album"]',
    themeLabel: '.mpo-theme-label,[data-theme-element="text"],[data-theme-type="text"]',
    badge: '.mpo-badge,[data-theme-element="badge"],[data-theme-element="source"],[data-theme-type="source"],[class*="audio-route"],[class*="route-pill"],[class*="badge"]',
    status: '.mpo-playback-status,[data-theme-element="status"],[data-theme-type="status"],[class*="status-badge"],[class*="playback-status"]',
    timestamps: '.mpo-universal-timestamps,.apple-timestamps-row,.cyber-timestamps,.glass-timestamps,.zen-time,[data-theme-element="timestamps"],[class*="timestamps"],[class*="time-current"],[class*="time-end"]',
    progress: '.mpo-progress,.mpo-progress-fill,.apple-progress-bar-track,.glass-progress-track,.cyber-progress-track,.collection-progress,[data-theme-element="progress"],[data-theme-type="progress"],[class*="scrubber-track"],[class*="scrubber-section"],[class*="progress-bar"]',
    indicator: '.mpo-universal-visualizer,.mpo-visualizer,[class*="equalizer"],[class*="visualizer"]',
} as const;
export type ArrangeRole = keyof typeof ROLE_SELECTORS;
export const ARRANGE_ROLE_LABELS: Record<ArrangeRole, string> = { title: 'Track title', artist: 'Artist', album: 'Album', themeLabel: 'Theme text', badge: 'Source badge', timestamps: 'Timestamps', status: 'Playback status', artwork: 'Artwork', progress: 'Progress bar', indicator: 'Playback indicator', frame: 'Frame' };
const aliases: Record<string, ArrangeRole> = { 'artwork-image': 'artwork', 'progress-track': 'progress', 'progress-fill': 'progress', 'indicator-bar': 'indicator', source: 'badge', card: 'frame', text: 'themeLabel', 'theme-label': 'themeLabel', visualizer: 'indicator', 'playback-status': 'status' };
export function nodeRole(node: Element): ArrangeRole | null {
    const role = node.getAttribute?.('data-theme-role');
    if (role === 'host') return null;
    if (role && role in aliases)
        return aliases[role];
    if (role && role in ROLE_SELECTORS)
        return role as ArrangeRole;
    for (const key of Object.keys(ROLE_SELECTORS) as ArrangeRole[])
        if (ROLE_SELECTORS[key].split(',').some(selector => node.matches(selector)))
            return key;
    return null;
}
/** One resolver for pointer selection, hover and compatibility selectors. */
export function roleFromTarget(target: Element, boundary: Element): ArrangeRole | null {
    for (let node: Element | null = target; node && node !== boundary; node = node.parentElement) {
        const role = nodeRole(node);
        if (role) return role;
    }
    return null;
}
export function roleTargets(root: ParentNode, role: ArrangeRole): HTMLElement[] {
    const names = [role, ...Object.keys(aliases).filter(name => aliases[name] === role)];
    const semantic = Array.from(root.querySelectorAll<HTMLElement>(names.map(name => `[data-theme-role="${name}"]`).join(',')));
    const nodes = semantic.length ? semantic : Array.from(root.querySelectorAll<HTMLElement>(ROLE_SELECTORS[role]));
    return nodes.filter(el => el.offsetWidth > 0 && el.offsetHeight > 0 && getComputedStyle(el).visibility !== 'hidden' && !nodes.some(other => other !== el && other.contains(el)));
}
export function roleTarget(root: ParentNode, role: ArrangeRole): HTMLElement | null { return roleTargets(root, role)[0] || null; }
