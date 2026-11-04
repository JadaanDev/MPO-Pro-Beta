/** Merge the two fields used by older layers, retaining their previous cascade order. */
export function mergeLegacyCss(customCss?: string, elementCss?: string): string {
  return [customCss, elementCss].filter(Boolean).join("\n\n");
}

function splitSelectors(text: string): string[] {
  const selectors: string[] = [];
  let start = 0, depth = 0, quote = "", escaped = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (escaped) { escaped = false; continue; }
    if (char === "\\") { escaped = true; continue; }
    if (quote) { if (char === quote) quote = ""; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === "(" || char === "[") depth++;
    else if (char === ")" || char === "]") depth--;
    else if (char === "," && depth === 0) { selectors.push(text.slice(start, i).trim()); start = i + 1; }
  }
  selectors.push(text.slice(start).trim());
  return selectors.filter(Boolean);
}

/** Restrict user rules to descendants of the theme mount. This is styling isolation,
 * not a security sandbox for untrusted CSS. Imports and global at-rules are omitted. */
export function scopeElementCss(css: string, scope: string): string {
  if (!css || typeof CSSStyleSheet === "undefined") return "";
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    const transform = (rules: CSSRuleList): string => Array.from(rules).map(rule => {
      if (rule.type === CSSRule.STYLE_RULE) {
        const style = rule as CSSStyleRule;
        const selectors = splitSelectors(style.selectorText);
        return `${selectors.map(s => `${scope} ${s}`).join(", ")} { ${style.style.cssText} }`;
      }
      if (rule.type === CSSRule.MEDIA_RULE || rule.type === CSSRule.SUPPORTS_RULE) {
        const group = rule as CSSGroupingRule;
        const header = rule.cssText.slice(0, rule.cssText.indexOf("{"));
        return `${header}{ ${transform(group.cssRules)} }`;
      }
      // Keyframes are intentionally not included: their names are document-global.
      return "";
    }).join("\n");
    return transform(sheet.cssRules);
  } catch {
    return "";
  }
}
