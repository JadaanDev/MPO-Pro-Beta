import type { ThemeConfig } from "../../types/themes";
import type { MediaState } from "../../types/media";
import { generateEffectiveThemeCss } from "../../utils/ThemeStyleEngine";
import { mergeLegacyCss, scopeElementCss } from "../../utils/elementCss";

export const SDK_ROLES = ["frame", "artwork", "artwork-image", "title", "artist", "album", "progress", "progress-track", "progress-fill", "badge", "status", "timestamps", "indicator", "indicator-bar", "themeLabel"] as const;
export type SdkRole = typeof SDK_ROLES[number];

const aliases: Record<string, SdkRole> = { card: "frame", image: "artwork-image", source: "badge", text: "themeLabel", visualizer: "indicator", "theme-label": "themeLabel", "playback-status": "status" };

export const SDK_VISIBILITY_KEYS = {
  artwork: "showArt", title: "showTitle", artist: "showArtist", album: "showAlbum", progress: "showProgress", badge: "showBadge", status: "showPlaybackStatus", timestamps: "showTimestamps", indicator: "showVisualizer", themeLabel: "showThemeLabel",
} as const;

export function sdkRoleVisible(role: SdkRole, authoredVisible: boolean, config?: Partial<ThemeConfig>): boolean {
  const key = SDK_VISIBILITY_KEYS[role as keyof typeof SDK_VISIBILITY_KEYS];
  const edited = key ? config?.visibilityOverrides?.[key] : undefined;
  return edited === undefined ? authoredVisible : edited;
}

/** Resolve compatibility names without adding legacy classes that change layout. */
export function inferSdkRole(className: string, explicitRole?: string | null, tagName = ""): SdkRole | null {
  if (explicitRole) {
    const role = aliases[explicitRole] || explicitRole;
    if ((SDK_ROLES as readonly string[]).includes(role)) return role as SdkRole;
  }
  const tokens = className.split(/\s+/).filter(Boolean);
  const matches = (pattern: RegExp) => tokens.some(token => pattern.test(token));
  if (matches(/(?:^|[-_])(?:scrubber|progress)[-_](?:fill|bar-fill)$/i) || tokens.includes("mpo-progress-fill")) return "progress-fill";
  if (matches(/(?:^|[-_])(?:eq|vis)[-_]bar$/i)) return "indicator-bar";
  if (matches(/(?:^|[-_])(?:timestamps|times|time-row)$/i) || tokens.includes("mpo-universal-timestamps")) return "timestamps";
  if (matches(/(?:^|[-_])(?:status|status-badge|playback-status|status-pill)$/i) || tokens.includes("mpo-playback-status")) return "status";
  if (matches(/(?:^|[-_])(?:route-name|pill-title)$/i)) return "badge";
  if (matches(/(?:^|[-_])(?:theme-label|custom-label|eyebrow|kicker)$/i)) return "themeLabel";
  if (matches(/(?:^|[-_])(?:track-title|card-title|title)$/i)) return "title";
  if (matches(/(?:^|[-_])(?:track-subtitle|track-artist|card-artist|artist)$/i)) return "artist";
  if (matches(/(?:^|[-_])(?:track-album|album)$/i)) return "album";
  if (matches(/(?:^|[-_])(?:equalizer|visualizer|visualizer-bars|universal-visualizer)$/i)) return "indicator";
  if (matches(/(?:^|[-_])(?:artwork|album-art|art)[-_](?:img|image)$/i) || tokens.includes("art-img")) return "artwork-image";
  if (matches(/(?:^|[-_])(?:artwork-container|artwork-wrapper|artwork-frame|art-wrapper|art-box|art-circle|vinyl-wrapper|album-art|artwork|art)$/i)) return tagName.toLowerCase() === "img" ? "artwork-image" : "artwork";
  if (matches(/(?:^|[-_])(?:scrubber-track|progress-track|progress-wrap|progress-wrapper|progress)$/i)) return "progress";
  if (matches(/(?:^|[-_])(?:route-name|app-badge|source-badge|badge|route-pill|audio-route-pill|top-pill)$/i)) return "badge";
  if (matches(/(?:^|[-_])card$/i) || tokens.includes("mpo-card")) return "frame";
  return null;
}

const setAttribute = (element: HTMLElement, name: string, value: string) => {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
};
const labelOverrides = new WeakMap<HTMLElement, { original: string; value: string }>();

function labelTextTarget(node: HTMLElement): HTMLElement | null {
  if (["SVG", "IMG", "SCRIPT", "STYLE", "PATH"].includes(node.tagName.toUpperCase())) return null;
  if (node.children.length === 0) return node;
  for (const child of Array.from(node.children).reverse()) {
    const target = labelTextTarget(child as HTMLElement);
    if (target) return target;
  }
  return null;
}

export interface SdkBridgeResult { frame: HTMLElement | null; roles: Set<SdkRole> }

/** Normalize DOM produced by arbitrary React components, including motion nodes.
 * Explicit roles win; nested artwork wrappers never receive duplicate offsets. */
export function normalizeSdkTheme(host: HTMLElement, media?: MediaState, config: Partial<ThemeConfig> = {}): SdkBridgeResult {
  const roles = new Set<SdkRole>();
  const nodes = Array.from(host.querySelectorAll<HTMLElement>("*"));
  const frames: HTMLElement[] = [];
  for (const node of nodes) {
    if (node.closest("[data-theme-sdk-generated]")) continue;
    const inferred = node.getAttribute("data-theme-sdk-inferred") === "true";
    const originalRole = node.getAttribute("data-theme-sdk-nested-role");
    let role = inferSdkRole(typeof node.className === "string" ? node.className : "", inferred ? null : (node.getAttribute("data-theme-role") || originalRole), node.tagName);
    if (!role) continue;
    if (role === "progress-track" && !node.parentElement?.closest('[data-theme-role="progress"]')) {
      setAttribute(node, "data-theme-part", "progress-track");
      setAttribute(node, "data-theme-role", "progress");
      role = "progress";
    }
    if (node.parentElement?.closest(`[data-theme-role="${role}"]`)) {
      if (role === "artwork") setAttribute(node, "data-theme-part", "artwork-clip");
      if (node.hasAttribute("data-theme-role")) {
        setAttribute(node, "data-theme-sdk-nested-role", role);
        node.removeAttribute("data-theme-role");
      }
      continue;
    }
    if (originalRole) node.removeAttribute("data-theme-sdk-nested-role");
    // A route pill can contain an independent playback status. Target its source
    // text instead so turning off the badge does not also hide the status.
    if (role === "badge" && node.querySelector('[data-theme-role="status"], [class*="status-badge"], [class*="status-pill"]')) {
      if (node.hasAttribute("data-theme-role")) {
        setAttribute(node, "data-theme-sdk-compound-role", "badge");
        node.removeAttribute("data-theme-role");
      }
      for (const candidate of Array.from(node.children)) {
        const child = candidate as HTMLElement;
        const childRole = inferSdkRole(typeof child.className === "string" ? child.className : "", child.getAttribute("data-theme-role"), child.tagName);
        if (childRole === "status" || ["SVG", "IMG"].includes(child.tagName.toUpperCase())) continue;
        const text = labelTextTarget(child);
        if (text && !text.hasAttribute("data-theme-role")) { setAttribute(text, "data-theme-role", "badge"); break; }
      }
      continue;
    }
    if (!node.hasAttribute("data-theme-role") || inferred) {
      setAttribute(node, "data-theme-role", role);
      if (originalRole) node.removeAttribute("data-theme-sdk-inferred");
      else setAttribute(node, "data-theme-sdk-inferred", "true");
    } else if (node.getAttribute("data-theme-role") !== role) setAttribute(node, "data-theme-role", role);
    if (role === "progress" || role === "progress-track") setAttribute(node, "data-theme-part", "progress-track");
    if (role === "indicator") setAttribute(node, "data-theme-sdk-native-indicator", "true");
    if (node.style?.display === "none") setAttribute(node, "data-theme-sdk-hidden", "true");
    if (role === "artwork-image" && node.parentElement?.closest('[data-theme-role="artwork"]')) {
      for (let clip: HTMLElement | null = node.parentElement; clip && clip.getAttribute("data-theme-role") !== "artwork"; clip = clip.parentElement) setAttribute(clip, "data-theme-part", "artwork-clip");
    }
    // Older themes combine two metadata fields in one plain text node. Split
    // only the known media values; never rewrite author-provided rich markup.
    if (role === "artist" && media?.artist && media.album_title && node.children.length === 0) {
      const combined = (node.textContent || "").trim();
      if ([" • ", " · ", " — ", " - ", " / "].some(separator => combined === `${media.artist}${separator}${media.album_title}`)) node.textContent = media.artist;
    }
    const label = role === "status" ? (media?.status === "Playing" ? config.themePlayingLabel : config.themePausedLabel) : role === "themeLabel" ? config.themeLabel : undefined;
    const textTarget = role === "status" || role === "themeLabel" ? labelTextTarget(node) : null;
    if (textTarget) {
      const previous = labelOverrides.get(textTarget);
      if (label) {
        const current = textTarget.textContent || "";
        if (!previous || current !== previous.value) labelOverrides.set(textTarget, { original: current, value: label });
        else previous.value = label;
        if (current !== label) textTarget.textContent = label;
      } else if (previous) {
        if (textTarget.textContent === previous.value) textTarget.textContent = previous.original;
        labelOverrides.delete(textTarget);
      }
    }
    roles.add(role);
    if (role === "frame") frames.push(node);
  }
  // Themes with no named card still have a usable inner frame. Never mark the
  // SDK host itself: it is the transparent positioning and sizing contract.
  if (!frames.length) {
    const first = Array.from(host.children).find(node => !["STYLE", "SCRIPT", "LINK"].includes(node.tagName)) as HTMLElement | undefined;
    if (first) {
      setAttribute(first, "data-theme-role", "frame");
      frames.push(first);
      roles.add("frame");
    }
  }
  for (const frame of frames) {
    setAttribute(frame, "data-theme-sdk-frame", "true");
    for (let wrapper = frame.parentElement; wrapper && wrapper !== host; wrapper = wrapper.parentElement) {
      if (wrapper.getAttribute("data-theme-role") !== "frame") setAttribute(wrapper, "data-theme-sdk-wrapper", "true");
    }
  }
  const visibleFrame = frames.find(frame => frame.offsetWidth > 0 && frame.offsetHeight > 0 && (!frame.getClientRects || frame.getClientRects().length > 0));
  const primary = visibleFrame || frames[0] || null;
  if (primary) {
    // CSS-switched multi-surface bundles may keep inactive cards in the DOM.
    // Only the selected card can satisfy a missing slot in its supplement.
    const activeRoles = new Set<SdkRole>(["frame"]);
    for (const node of nodes) {
      if (node.closest("[data-theme-sdk-generated]") || node.closest("[data-theme-sdk-frame]") !== primary) continue;
      const role = node.getAttribute("data-theme-role") as SdkRole | null;
      if (role && (SDK_ROLES as readonly string[]).includes(role)) activeRoles.add(role);
    }
    return { frame: primary, roles: activeRoles };
  }
  return { frame: null, roles };
}

/** Compatibility variables are an authoring API; shared inspector CSS remains
 * the sole authority for role styling and never forces arbitrary default fonts. */
export function sdkBridgeCss(config: Partial<ThemeConfig>, scope: string): string {
  const variables: Record<string, string | number | undefined> = {
    "--mpo-card-radius": config.borderRadius === undefined ? undefined : `${config.borderRadius}px`,
    "--mpo-card-blur": config.blur === undefined ? undefined : `${config.blur}px`,
    "--mpo-card-opacity": config.opacity,
    "--mpo-frame-padding": config.framePadding === undefined ? undefined : `${config.framePadding}px`,
    "--mpo-font-family": config.fontFamily,
    "--mpo-title-size": config.titleSize === undefined ? undefined : `${config.titleSize}px`,
    "--mpo-artist-size": config.artistSize === undefined ? undefined : `${config.artistSize}px`,
    "--mpo-text-color": config.titleColor || undefined,
    "--mpo-glow-color": config.accentColor,
  };
  const vars = Object.entries(variables).filter(([, value]) => value !== undefined && value !== "").map(([key, value]) => `${key}: ${value};`).join("\n");
  const dimensions = `${config.customWidth && config.customWidth > 0 ? "width: 100% !important; max-width: none !important;" : ""}${config.customHeight && config.customHeight > 0 ? "height: 100% !important; max-height: none !important;" : ""}`;
  const textProperties = {
    title: { ...{ color: config.titleColor, size: config.titleSize, weight: config.titleWeight, font: config.titleFont || config.fontFamily, transform: config.titleTransform }, ...config.typography?.title },
    artist: { ...{ color: config.artistColor, size: config.artistSize, weight: config.artistWeight, font: config.fontFamily, transform: config.artistTransform }, ...config.typography?.artist },
    album: { ...{ size: config.albumSize, font: config.fontFamily }, ...config.typography?.album },
    themeLabel: { font: config.fontFamily, ...config.typography?.themeLabel }, badge: { font: config.fontFamily, ...config.typography?.badge },
    status: { font: config.fontFamily, ...config.typography?.status }, timestamps: { font: config.fontFamily, ...config.typography?.timestamps },
  };
  const inheritedText = Object.entries(textProperties).map(([role, properties]) => {
    const cssNames: Record<string, string> = { color: "color", size: "font-size", weight: "font-weight", font: "font-family", transform: "text-transform", italic: "font-style" };
    const declarations = Object.entries(properties).filter(([, value]) => value !== undefined && value !== "").map(([key]) => `${cssNames[key]}: inherit !important;${key === "color" ? " -webkit-text-fill-color: inherit !important;" : ""}`).join(" ");
    return declarations ? `${scope} [data-theme-role="${role}"] :is(span, strong, b, em, i, a):not([data-theme-role]):not([data-theme-role="${role}"] [data-theme-role] *) { ${declarations} }` : "";
  }).join("\n");
  const reveal = Object.entries(SDK_VISIBILITY_KEYS).filter(([, key]) => config.visibilityOverrides?.[key] === true).map(([role]) => {
    const target = `${scope} [data-theme-role="${role}"]:is([data-theme-default-hidden], [data-theme-sdk-hidden])`;
    return `${target} { display: revert !important; }\n${["flex", "inline-flex", "block", "inline-block", "grid", "inline-grid"].map(display => `${target}[data-theme-display="${display}"] { display: ${display} !important; }`).join("\n")}`;
  }).join("\n");
  return `${scope} {${vars}}
${inheritedText}
${reveal}
${config.artRadius === undefined ? "" : `${scope} [data-theme-part="artwork-clip"] { border-radius: ${Math.max(0, config.artRadius)}px !important; }`}
${scope} [data-theme-sdk-wrapper] { overflow: visible !important; background: transparent !important; border: none !important; box-shadow: none !important; filter: none !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; mask: none !important; -webkit-mask: none !important; clip-path: none !important; }
${scope} [data-theme-sdk-frame] { min-width: 0 !important; min-height: 0 !important; box-sizing: border-box; ${dimensions} }
${config.showVisualizer !== undefined ? `${scope} [data-theme-sdk-native-indicator] { display: none !important; }` : ""}
${scope} [data-mpo-has-supplement] { padding-bottom: max(var(--mpo-frame-padding, 0px), var(--mpo-sdk-supplement-room, 38px)) !important; }
${scope} .mpo-sdk-supplement { position: absolute; left: 14px; right: 14px; bottom: 8px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; min-width: 0; font-size: 11px; }
${scope} .mpo-sdk-supplement > * { min-width: 0; }
${scope} .mpo-sdk-supplement [data-theme-role="indicator"] { margin-left: auto; }
`;
}

/** Keep custom CSS last even when the SDK's sizing compatibility rules apply. */
export function generateSdkThemeCss(config: Partial<ThemeConfig>, format: "horizontal" | "vertical", extractedColor: string | null | undefined, customCss: string | undefined, scope: string, unboundedSizes = false): string {
  return generateEffectiveThemeCss({ ...config, elementCss: undefined } as ThemeConfig, format, extractedColor, undefined, scope, { unboundedSizes }) + "\n" + sdkBridgeCss(config, scope) + "\n" + scopeElementCss(mergeLegacyCss(customCss, config.elementCss), scope);
}
