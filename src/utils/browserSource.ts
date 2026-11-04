import { themeEffectSize } from "./themeEffects";

/** A browser source is rasterized before OBS/TikTok scales it on the scene. */
export const SOURCE_QUALITY_SCALE = 2;
export function recommendedSourceSize(width: number, height: number, themeScale: number) {
  const size = themeEffectSize(width, height, themeScale);
  return {
    width: size.width * SOURCE_QUALITY_SCALE,
    height: size.height * SOURCE_QUALITY_SCALE,
  };
}
export function sourceResolutionScale(value: string | null): number {
  return value === "2" ? SOURCE_QUALITY_SCALE : 1;
}
export function browserSourceUrl(host: string, mode: "overlay" | "vertical", layerId: string) {
  const url = new URL(`http://${host}/`);
  url.searchParams.set("mode", mode);
  url.searchParams.set("layer", layerId);
  url.searchParams.set("quality", String(SOURCE_QUALITY_SCALE));
  return url.toString();
}
