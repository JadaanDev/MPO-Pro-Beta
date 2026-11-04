/**
 * Dynamic Google Fonts Loader for MPO-pro
 * Injects Google Fonts stylesheet links into document head on demand.
 */

const loadedFonts = new Set<string>(["Inter", "Outfit", "JetBrains Mono"]);

export const ARABIC_GOOGLE_FONTS = ["Cairo", "Tajawal", "Almarai", "IBM Plex Sans Arabic", "Alexandria", "Readex Pro", "Noto Sans Arabic", "Noto Kufi Arabic", "Noto Naskh Arabic", "Changa", "El Messiri", "Amiri", "Zain", "Reem Kufi", "Vazirmatn"];
export const ENGLISH_GOOGLE_FONTS = ["Manrope", "Figtree", "Lato", "Open Sans", "Raleway", "Nunito", "Source Sans 3", "Work Sans", "Urbanist", "Sora", "Libre Franklin", "Barlow", "Karla", "DM Serif Display", "Cormorant Garamond"];
export const POPULAR_GOOGLE_FONTS = [
  "Inter",
  "Outfit",
  "JetBrains Mono",
  "Roboto",
  "Montserrat",
  "Poppins",
  "Cinzel",
  "Bebas Neue",
  "Space Grotesk",
  "Syne",
  "Press Start 2P",
  "Playfair Display",
  "Plus Jakarta Sans",
  "DM Sans",
  "Rubik",
  "Oswald",
  ...ARABIC_GOOGLE_FONTS,
  ...ENGLISH_GOOGLE_FONTS,
];

export function loadGoogleFont(fontName: string): void {
  if (!fontName || fontName.trim() === "" || loadedFonts.has(fontName)) {
    return;
  }

  const cleanName = fontName.trim();
  const linkId = `gfont-${cleanName.replace(/\s+/g, "-").toLowerCase()}`;

  if (document.getElementById(linkId)) {
    loadedFonts.add(cleanName);
    return;
  }

  const link = document.createElement("link");
  link.id = linkId;
  link.rel = "stylesheet";
  const family = encodeURIComponent(cleanName).replace(/%20/g, "+");
  const baseUrl = `https://fonts.googleapis.com/css2?family=${family}`;
  link.href = `${baseUrl}:wght@400;700&display=swap`;
  let triedRegularOnly = false;

  link.onload = () => {
    loadedFonts.add(cleanName);
  };

  link.onerror = () => {
    if (!triedRegularOnly) { triedRegularOnly = true; link.href = `${baseUrl}&display=swap`; return; }
    loadedFonts.delete(cleanName);
    link.remove();
    console.warn(`[MPO-pro] Could not load Google Font: ${cleanName}`);
  };

  document.head.appendChild(link);
}
