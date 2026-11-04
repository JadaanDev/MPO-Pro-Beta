import {
  ELEMENT_TYPES,
  THEME_SURFACES,
  validateThemeDefinition,
  type ElementType,
  type ThemeDefinition,
  type ThemeElement,
  type ThemeSurface,
} from "./schema";

const DEFAULT_ELEMENTS: ThemeElement[] = [
  { id: "artwork", type: "artwork", x: 3, y: 10, width: 22, height: 80, visible: true },
  { id: "title", type: "title", x: 28, y: 14, width: 68, height: 24, visible: true, color: "#ffffff", fontSize: 22 },
  { id: "artist", type: "artist", x: 28, y: 42, width: 68, height: 18, visible: true, color: "#94a3b8", fontSize: 15 },
  { id: "album", type: "album", x: 28, y: 62, width: 46, height: 14, visible: true, color: "#64748b", fontSize: 12 },
  { id: "progress", type: "progress", x: 28, y: 82, width: 68, height: 6, visible: true, color: "#6366f1" },
  { id: "source", type: "source", x: 76, y: 62, width: 20, height: 14, visible: true, color: "#38bdf8", fontSize: 11 },
  { id: "status", type: "status", x: 76, y: 14, width: 20, height: 14, visible: true, color: "#10b981", fontSize: 11 },
];

const TIKTOK_ELEMENTS: ThemeElement[] = [
  { id: "artwork", type: "artwork", x: 15, y: 6, width: 70, height: 42, visible: true },
  { id: "title", type: "title", x: 8, y: 52, width: 84, height: 10, visible: true, color: "#ffffff", fontSize: 22 },
  { id: "artist", type: "artist", x: 8, y: 63, width: 84, height: 8, visible: true, color: "#94a3b8", fontSize: 15 },
  { id: "album", type: "album", x: 8, y: 72, width: 84, height: 6, visible: true, color: "#64748b", fontSize: 12 },
  { id: "progress", type: "progress", x: 8, y: 82, width: 84, height: 3, visible: true, color: "#6366f1" },
  { id: "source", type: "source", x: 8, y: 89, width: 40, height: 6, visible: true, color: "#38bdf8", fontSize: 11 },
  { id: "status", type: "status", x: 52, y: 89, width: 40, height: 6, visible: true, color: "#10b981", fontSize: 11 },
];

export function createStarterTheme(name = "Custom Studio Theme", id = `theme-${Date.now()}`): ThemeDefinition {
  return {
    schemaVersion: 1,
    id,
    name,
    elements: DEFAULT_ELEMENTS.map((el) => ({ ...el })),
    layouts: {
      tiktok: TIKTOK_ELEMENTS.map((el) => ({ ...el })),
    },
  };
}

function escapeAttr(val: string): string {
  return val.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function unescapeAttr(val: string): string {
  return val
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function serializeElement(el: ThemeElement, indent = "  "): string {
  const attrs: string[] = [
    `id="${escapeAttr(el.id)}"`,
    `x="${el.x}"`,
    `y="${el.y}"`,
    `width="${el.width}"`,
    `height="${el.height}"`,
    `visible="${el.visible}"`,
  ];
  if (el.color) attrs.push(`color="${escapeAttr(el.color)}"`);
  if (el.fontSize !== undefined) attrs.push(`fontSize="${el.fontSize}"`);
  if (el.fontFamily) attrs.push(`fontFamily="${escapeAttr(el.fontFamily)}"`);
  if (el.fontWeight !== undefined) attrs.push(`fontWeight="${escapeAttr(String(el.fontWeight))}"`);
  if (el.textAlign) attrs.push(`textAlign="${escapeAttr(el.textAlign)}"`);
  if (el.textTransform) attrs.push(`textTransform="${escapeAttr(el.textTransform)}"`);
  if (el.letterSpacing) attrs.push(`letterSpacing="${escapeAttr(el.letterSpacing)}"`);
  if (el.borderRadius !== undefined) attrs.push(`borderRadius="${el.borderRadius}"`);
  if (el.backgroundColor) attrs.push(`backgroundColor="${escapeAttr(el.backgroundColor)}"`);
  if (el.borderColor) attrs.push(`borderColor="${escapeAttr(el.borderColor)}"`);
  if (el.borderWidth !== undefined) attrs.push(`borderWidth="${el.borderWidth}"`);
  if (el.opacity !== undefined) attrs.push(`opacity="${el.opacity}"`);
  if (el.spinning !== undefined) attrs.push(`spinning="${el.spinning}"`);
  if (el.glow !== undefined) attrs.push(`glow="${el.glow}"`);
  if (el.customText) attrs.push(`customText="${escapeAttr(el.customText)}"`);
  if (el.playingText) attrs.push(`playingText="${escapeAttr(el.playingText)}"`);
  if (el.pausedText) attrs.push(`pausedText="${escapeAttr(el.pausedText)}"`);
  return `${indent}<${el.type} ${attrs.join(" ")} />`;
}

/**
 * Serializes a declarative ThemeDefinition into an HTML-like MPO SDK document.
 */
export function serializeThemeMarkup(theme: ThemeDefinition): string {
  const lines: string[] = [];
  const rootAttrs: string[] = [
    `id="${escapeAttr(theme.id)}"`,
    `name="${escapeAttr(theme.name)}"`,
    `version="${theme.schemaVersion}"`,
  ];
  if (theme.canvas?.background) rootAttrs.push(`canvasBackground="${escapeAttr(theme.canvas.background)}"`);
  if (theme.canvas?.borderRadius !== undefined) rootAttrs.push(`canvasRadius="${theme.canvas.borderRadius}"`);
  if (theme.canvas?.borderWidth !== undefined) rootAttrs.push(`canvasBorderWidth="${theme.canvas.borderWidth}"`);
  if (theme.canvas?.borderColor) rootAttrs.push(`canvasBorderColor="${escapeAttr(theme.canvas.borderColor)}"`);
  if (theme.canvas?.backdropBlur !== undefined) rootAttrs.push(`canvasBlur="${theme.canvas.backdropBlur}"`);
  if (theme.canvas?.boxShadow) rootAttrs.push(`canvasShadow="${escapeAttr(theme.canvas.boxShadow)}"`);

  lines.push(`<mpo-theme ${rootAttrs.join(" ")}>`);
  for (const el of theme.elements) {
    lines.push(serializeElement(el, "  "));
  }
  if (theme.layouts) {
    for (const surface of THEME_SURFACES) {
      const surfaceElements = theme.layouts[surface];
      if (surfaceElements && surfaceElements.length > 0) {
        lines.push(`  <surface name="${surface}">`);
        for (const el of surfaceElements) {
          lines.push(serializeElement(el, "    "));
        }
        lines.push(`  </surface>`);
      }
    }
  }
  lines.push(`</mpo-theme>`);
  return lines.join("\n");
}

function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const regex = /([a-zA-Z0-9_-]+)\s*=\s*"([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(attrString)) !== null) {
    attrs[match[1]] = unescapeAttr(match[2]);
  }
  return attrs;
}

function parseElementTag(tagName: string, attrString: string, context: string, errors: string[]): ThemeElement | null {
  const attrs = parseAttributes(attrString);
  const resolvedType = (tagName === "element" ? attrs.type : tagName) as ElementType;
  if (!ELEMENT_TYPES.includes(resolvedType)) {
    errors.push(`${context}: Unsupported element tag <${tagName}>.`);
    return null;
  }
  const id = (attrs.id || resolvedType).trim();
  const x = Number(attrs.x ?? 0);
  const y = Number(attrs.y ?? 0);
  const width = Number(attrs.width ?? 25);
  const height = Number(attrs.height ?? 20);
  const visible = attrs.visible === undefined ? true : attrs.visible === "true";
  const element: ThemeElement = {
    id,
    type: resolvedType,
    x,
    y,
    width,
    height,
    visible,
  };
  if (attrs.color !== undefined && attrs.color.trim() !== "") {
    element.color = attrs.color.trim();
  }
  if (attrs.fontSize !== undefined && attrs.fontSize.trim() !== "") {
    element.fontSize = Number(attrs.fontSize);
  }
  if (attrs.fontFamily !== undefined && attrs.fontFamily.trim() !== "") {
    element.fontFamily = attrs.fontFamily.trim();
  }
  if (attrs.fontWeight !== undefined && attrs.fontWeight.trim() !== "") {
    element.fontWeight = attrs.fontWeight.trim();
  }
  if (attrs.textAlign !== undefined && (attrs.textAlign === "left" || attrs.textAlign === "center" || attrs.textAlign === "right")) {
    element.textAlign = attrs.textAlign;
  }
  if (attrs.textTransform !== undefined && (attrs.textTransform === "none" || attrs.textTransform === "uppercase" || attrs.textTransform === "lowercase" || attrs.textTransform === "capitalize")) {
    element.textTransform = attrs.textTransform;
  }
  if (attrs.letterSpacing !== undefined && attrs.letterSpacing.trim() !== "") {
    element.letterSpacing = attrs.letterSpacing.trim();
  }
  if (attrs.borderRadius !== undefined && attrs.borderRadius.trim() !== "") {
    element.borderRadius = Number(attrs.borderRadius);
  }
  if (attrs.backgroundColor !== undefined && attrs.backgroundColor.trim() !== "") {
    element.backgroundColor = attrs.backgroundColor.trim();
  }
  if (attrs.borderColor !== undefined && attrs.borderColor.trim() !== "") {
    element.borderColor = attrs.borderColor.trim();
  }
  if (attrs.borderWidth !== undefined && attrs.borderWidth.trim() !== "") {
    element.borderWidth = Number(attrs.borderWidth);
  }
  if (attrs.opacity !== undefined && attrs.opacity.trim() !== "") {
    element.opacity = Number(attrs.opacity);
  }
  if (attrs.spinning !== undefined) {
    element.spinning = attrs.spinning === "true";
  }
  if (attrs.glow !== undefined) {
    element.glow = attrs.glow === "true";
  }
  if (attrs.customText !== undefined && attrs.customText.trim() !== "") {
    element.customText = attrs.customText;
  }
  if (attrs.playingText !== undefined && attrs.playingText.trim() !== "") {
    element.playingText = attrs.playingText;
  }
  if (attrs.pausedText !== undefined && attrs.pausedText.trim() !== "") {
    element.pausedText = attrs.pausedText;
  }
  return element;
}

/**
 * Parses HTML-like MPO SDK markup into a validated ThemeDefinition.
 */
export function parseThemeMarkup(markup: string): { theme?: ThemeDefinition; errors: string[] } {
  const errors: string[] = [];
  const clean = markup.replace(/<!--[\s\S]*?-->/g, "").trim();
  const rootMatch = /^<mpo-theme\b([^>]*)>([\s\S]*?)<\/mpo-theme>$/i.exec(clean);
  if (!rootMatch) {
    return { errors: ["Root <mpo-theme id=\"...\" name=\"...\">...</mpo-theme> tag is required."] };
  }

  const rootAttrs = parseAttributes(rootMatch[1]);
  const id = (rootAttrs.id || "").trim();
  const name = (rootAttrs.name || "").trim();
  const schemaVersion = rootAttrs.version ? Number(rootAttrs.version) : 1;

  let body = rootMatch[2];
  const layouts: Partial<Record<ThemeSurface, ThemeElement[]>> = {};

  // Extract <surface name="...">...</surface> blocks first
  const surfaceRegex = /<surface\b([^>]*)>([\s\S]*?)<\/surface>/gi;
  body = body.replace(surfaceRegex, (_full, surfaceAttrStr: string, surfaceContent: string) => {
    const sAttrs = parseAttributes(surfaceAttrStr);
    const surfaceName = sAttrs.name as ThemeSurface;
    if (!THEME_SURFACES.includes(surfaceName)) {
      errors.push(`Unsupported surface "${sAttrs.name || ""}". Expected one of: ${THEME_SURFACES.join(", ")}.`);
      return "";
    }
    const surfaceElements: ThemeElement[] = [];
    const elRegex = /<([a-zA-Z0-9_-]+)\b([^>]*?)\/>/g;
    let elMatch: RegExpExecArray | null;
    while ((elMatch = elRegex.exec(surfaceContent)) !== null) {
      const parsed = parseElementTag(elMatch[1].toLowerCase(), elMatch[2], `surface[${surfaceName}]`, errors);
      if (parsed) surfaceElements.push(parsed);
    }
    layouts[surfaceName] = surfaceElements;
    return "";
  });

  // Parse default elements in remaining body
  const elements: ThemeElement[] = [];
  const elRegex = /<([a-zA-Z0-9_-]+)\b([^>]*?)\/>/g;
  let elMatch: RegExpExecArray | null;
  while ((elMatch = elRegex.exec(body)) !== null) {
    const parsed = parseElementTag(elMatch[1].toLowerCase(), elMatch[2], "elements", errors);
    if (parsed) elements.push(parsed);
  }

  const canvas: Record<string, any> = {};
  if (rootAttrs.canvasBackground) canvas.background = rootAttrs.canvasBackground;
  if (rootAttrs.canvasRadius !== undefined) canvas.borderRadius = Number(rootAttrs.canvasRadius);
  if (rootAttrs.canvasBorderWidth !== undefined) canvas.borderWidth = Number(rootAttrs.canvasBorderWidth);
  if (rootAttrs.canvasBorderColor) canvas.borderColor = rootAttrs.canvasBorderColor;
  if (rootAttrs.canvasBlur !== undefined) canvas.backdropBlur = Number(rootAttrs.canvasBlur);
  if (rootAttrs.canvasShadow) canvas.boxShadow = rootAttrs.canvasShadow;

  const candidate: ThemeDefinition = {
    schemaVersion: schemaVersion as 1,
    id,
    name,
    elements,
    ...(Object.keys(layouts).length > 0 ? { layouts } : {}),
    ...(Object.keys(canvas).length > 0 ? { canvas } : {}),
  };

  const schemaErrors = validateThemeDefinition(candidate);
  const allErrors = [...errors, ...schemaErrors];
  if (allErrors.length > 0) {
    return { errors: allErrors };
  }
  return { theme: candidate, errors: [] };
}
