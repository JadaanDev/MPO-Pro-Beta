/** Marquees often contain an aria-hidden visual copy. It must not count twice
 * in host text fitting or become visible again in the host's marquee. */
export function themeText(element: Element): string {
  if (element.hasAttribute("hidden") || element.getAttribute("aria-hidden") === "true" || /^(SCRIPT|STYLE|SVG)$/i.test(element.tagName)) return "";
  return Array.from(element.childNodes).map(node => node.nodeType === 3 ? node.textContent || "" : node.nodeType === 1 ? themeText(node as Element) : "").join("");
}
