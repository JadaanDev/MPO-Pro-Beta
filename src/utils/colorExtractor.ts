// In-memory cache for extracted dominant colors keyed by art URL
const colorCache = new Map<string, string>();

export async function extractDominantColor(imageUrl: string): Promise<string | null> {
  if (!imageUrl) return null;
  if (colorCache.has(imageUrl)) {
    return colorCache.get(imageUrl)!;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }

        const sampleSize = 48;
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

        const imgData = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
        let maxScore = -1;
        let bestR = 99, bestG = 102, bestB = 241;

        for (let i = 0; i < imgData.length; i += 16) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const a = imgData[i + 3];

          if (a < 180) continue;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const lightness = (max + min) / 2;

          // Skip near-black and near-white
          if (lightness < 40 || lightness > 225) continue;

          const delta = max - min;
          const saturation = max === 0 ? 0 : delta / max;

          // Score by saturation and medium lightness
          const score = saturation * (1 - Math.abs(lightness - 128) / 128);

          if (score > maxScore) {
            maxScore = score;
            bestR = r;
            bestG = g;
            bestB = b;
          }
        }

        if (maxScore < 0) { resolve(null); return; }
        const toHex = (n: number) => n.toString(16).padStart(2, "0");
        const hex = `#${toHex(bestR)}${toHex(bestG)}${toHex(bestB)}`;
        colorCache.set(imageUrl, hex);
        resolve(hex);
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => {
      resolve(null);
    };

    img.src = imageUrl;
  });
}
