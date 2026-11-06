/** Paint space outside the card, in logical pixels at 1×. */
export const THEME_EFFECT_GUTTER = 32;

export function themeEffectScale(value: number) {
  return Number.isFinite(value) ? Math.max(0.1, value) : 1;
}

export function themeEffectGutter(scale = 1) {
  return Math.ceil(THEME_EFFECT_GUTTER * Math.max(1, themeEffectScale(scale)));
}

/** SDK percentage layouts use a nominal canvas, independent of painted overflow. */
export function themeLayoutSize(root: {
  offsetWidth: number;
  offsetHeight: number;
  scrollWidth: number;
  scrollHeight: number;
  hasAttribute: (name: string) => boolean;
}) {
  const nominal = root.hasAttribute("data-theme-layout-root");
  return {
    width: nominal ? root.offsetWidth : Math.max(root.offsetWidth, root.scrollWidth),
    height: nominal ? root.offsetHeight : Math.max(root.offsetHeight, root.scrollHeight),
  };
}

export function themeEffectSize(width: number, height: number, scale = 1) {
  const effectiveScale = themeEffectScale(scale);
  const gutter = themeEffectGutter(effectiveScale);
  return {
    width: Math.ceil(Math.max(0, width) * effectiveScale) + gutter * 2,
    height: Math.ceil(Math.max(0, height) * effectiveScale) + gutter * 2,
  };
}
