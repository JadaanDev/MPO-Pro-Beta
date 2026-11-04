/** Artwork-derived colors. Contrast is measured against the selected opaque surface. */
export function parseHex(value?: string | null): [number, number, number] | null {
  if (!value || !/^#[\da-f]{6}$/i.test(value)) return null;
  return [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16)) as [number, number, number];
}
export function toHex(rgb: readonly number[]): string {
  return `#${rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;
}
export function luminance(rgb: readonly number[]): number {
  const [r, g, b] = rgb.map(value => { const v = value / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrastRatio(a: readonly number[], b: readonly number[]): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}
export function readableArtworkColor(art: readonly number[], background: readonly number[], minRatio: number): string {
  if (contrastRatio(art, background) >= minRatio) return toHex(art);
  const black = [0, 0, 0], white = [255, 255, 255];
  const destination = contrastRatio(white, background) >= contrastRatio(black, background) ? white : black;
  if (contrastRatio(destination, background) < minRatio) return toHex(destination);
  let low = 0, high = 1;
  for (let i = 0; i < 16; i++) {
    const mid = (low + high) / 2;
    const mixed = art.map((v, index) => v * (1 - mid) + destination[index] * mid);
    if (contrastRatio(mixed.map(Math.round), background) >= minRatio) high = mid; else low = mid;
  }
  return toHex(art.map((v, index) => v * (1 - high) + destination[index] * high));
}
export function bestContrastColor(background: readonly number[]): string {
  return contrastRatio([255, 255, 255], background) >= contrastRatio([0, 0, 0], background) ? "#ffffff" : "#000000";
}
export function artworkSurface(art: readonly number[], contrast: boolean): string {
  if (contrast) return luminance(art) > 0.4 ? "#11131b" : "#f5f3f8";
  return toHex(art.map(v => Math.round(v * 0.16)));
}
