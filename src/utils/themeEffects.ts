/** Paint space outside the card, in logical pixels at 1×. */
export const THEME_EFFECT_GUTTER = 32;

export function themeEffectScale(value: number) {
  return Number.isFinite(value) ? Math.max(0.1, value) : 1;
}

export function themeEffectGutter(scale = 1) {
  return Math.ceil(THEME_EFFECT_GUTTER * Math.max(1, themeEffectScale(scale)));
}

export function themeEffectSize(width: number, height: number, scale = 1) {
  const effectiveScale = themeEffectScale(scale);
  const gutter = themeEffectGutter(effectiveScale);
  return {
    width: Math.ceil(Math.max(0, width) * effectiveScale) + gutter * 2,
    height: Math.ceil(Math.max(0, height) * effectiveScale) + gutter * 2,
  };
}
