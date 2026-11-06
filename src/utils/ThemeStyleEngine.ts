import { mergeLegacyCss, scopeElementCss } from "./elementCss";
import { ThemeConfig, LayerFormat } from "../types/themes";
import { artworkSurface, bestContrastColor, parseHex, readableArtworkColor } from "./artworkColors";

/**
 * Universal Theme Style Engine
 * Transforms all 22+ ThemeConfig styling options into a high-specificity scoped CSS block.
 * Ensures consistent behavior across all 14 overlay themes with zero styling bleed into the studio UI.
 */
export function generateEffectiveThemeCss(
  config: ThemeConfig,
  _format: LayerFormat = "horizontal",
  extractedColor?: string | null,
  customCss?: string,
  scopeSelector = ":is(.preview-canvas-scope, .mpo-feed-wrapper, .desktop-overlay-container, .split-component-mount, .single-preview-mount)",
  options: { unboundedSizes?: boolean } = {}
): string {
  const artwork = parseHex(extractedColor);
  const modes = config.artworkColors;
  const surface = artwork && modes?.surface && modes.surface !== "manual" ? artworkSurface(artwork, modes.surface === "contrast") : null;
  // Transparent and custom surfaces can differ from this reference.
  const referenceSurface = parseHex(surface) || [18, 19, 27];
  const derive = (mode: string | undefined, minRatio: number) => !artwork || !mode || mode === "manual" ? null : mode === "contrast" ? bestContrastColor(referenceSurface) : readableArtworkColor(artwork, referenceSurface, minRatio);
  const activeAccent = derive(modes?.accent, 3) || ((config.autoAlbumColor && artwork) ? extractedColor! : config.accentColor);
  const rules: string[] = [];

  const scope = scopeSelector ? `${scopeSelector}` : "";
  const cardSelector = `${scope} :is([data-theme-role="frame"], .mpo-card, .big-stage-inner, .glass-card, .cyber-card, .pill-card, .vinyl-card, .streamer-card, .aero-card, .zen-card, .blade-bar, .orb-card, .tag-card, .island-card, .split-card, .story-card, .apple-music-card)`;

  // 1. Root & Card Variables
  rules.push(`
    ${scope} :is(.mpo-theme-container, .mpo-card, .big-stage, .big-stage-inner, .apple-music-live-root, .apple-music-card, .glass-modern-root, .cyber-hud-root, .minimal-pill-root, .vinyl-retro-root, .streamer-banner-root, .aero-glass-root, .zen-mono-root, .neon-blade-root, .floating-orb-root, .compact-tag-root, .dynamic-island-root, .split-horizon-root, .vertical-story-root) {
      --accent-primary: ${activeAccent};
      --big-accent: ${activeAccent};
      --card-blur: ${config.blur ?? 20}px;
      --card-opacity: ${config.opacity ?? 0.9};
      --card-radius: ${config.borderRadius ?? 18}px;
      --hud-backdrop-filter: blur(${config.blur ?? 20}px);
    }
  `);

  // Optional frame controls leave each theme's defaults intact until edited.
  if (typeof config.frameBorderWidth === "number") {
    const width = Math.max(0, config.frameBorderWidth);
    rules.push(`${cardSelector} { border-width: ${width}px !important; border-style: solid !important; }`);
  }
  if (config.frameBorderColor && /^#[0-9a-f]{6}$/i.test(config.frameBorderColor)) {
    rules.push(`${cardSelector} { border-color: ${config.frameBorderColor} !important; }`);
  }
  // The same bounded alpha falloff is used by built-ins and SDK cards. The
  // render host reserves 32px (scaled with the card) outside the foreground.
  const shadowPercent = Number.isFinite(config.frameShadow) ? Math.max(0, Math.min(100, config.frameShadow!)) : 55;
  const strength = Math.round(shadowPercent * 0.65) / 100;
  const accentGlow = shadowPercent > 0 && /^#[0-9a-f]{6}$/i.test(activeAccent || "")
    ? `, 0 0 10px ${activeAccent}18` : "";
  const frameShadow = shadowPercent === 0 ? "none" : `0 7px 18px -7px rgba(0,0,0,${strength})${accentGlow}`;
  rules.push(`${scope || ":root"} { --mpo-frame-shadow: ${frameShadow}; }`);
  rules.push(`${cardSelector} { box-shadow: var(--mpo-frame-shadow) !important; }`);

  // Positioning hosts never own a surface. In particular, do not erase a
  // legacy SDK element that is both a theme container and the actual card.
  rules.push(`
    ${scope} :is(.mpo-theme-container, [class*="-root"], .desktop-overlay-container, .desktop-overlay-content, .mpo-feed-wrapper:not(.big-stage)):not(.mpo-card):not([data-theme-role="frame"]) {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      overflow: visible;
    }
  `);

  // 2. Custom Dimensions (Width & Height) & Responsive Aspect-Ratio Adaptation
  if (config.widthMode!=='content' && config.customWidth && config.customWidth > 0) {
    rules.push(`
      ${cardSelector} {
        width: ${config.customWidth}px !important;
        min-width: 0 !important;
        max-width: none !important;
        ${options.unboundedSizes ? "flex-shrink: 0 !important;" : ""}
      }
      ${scope} :is(.mpo-theme-container, [class*="-root"]):not([data-theme-layout-root]):not(.mpo-sdk-host):not([data-theme-role="host"]) {
        width: max-content !important;
        min-width: 0 !important;
        max-width: none !important;
      }
    `);
  }

  if (config.customHeight && config.customHeight > 0) {
    const h = config.customHeight;
    const w = config.customWidth && config.customWidth > 0 ? config.customWidth : 360;
    const isLandscapeBox = w > h * 1.15;
    const maxArtForHeight = Math.max(40, h - 36);
    rules.push(`
      ${cardSelector} {
        height: ${h}px !important;
        min-height: 0 !important;
        max-height: none !important;
        ${options.unboundedSizes ? "flex-shrink: 0 !important;" : ""}
      }
      ${scope} :is(.mpo-theme-container, [class*="-root"]):not([data-theme-layout-root]):not(.mpo-sdk-host):not([data-theme-role="host"]) {
        height: max-content !important;
        min-height: 0 !important;
        max-height: none !important;
      }
    `);
    // When a vertical/TikTok card is given a landscape or constrained height aspect ratio, adapt its internal layout so artwork and text fit cleanly without clipping
    if (isLandscapeBox || h < 340) {
      const adaptedArt = config.artSize && config.artSize > 0 ? Math.min(config.artSize, maxArtForHeight) : Math.min(140, maxArtForHeight);
      rules.push(`
        ${scope} .collection-tiktok .collection-card {
          grid-template-columns: min(${adaptedArt}px, 45%) minmax(0, 1fr) !important;
          align-items: center !important;
          gap: 14px !important;
        }
        ${scope} .collection-tiktok .collection-art {
          width: ${adaptedArt}px !important;
          height: ${adaptedArt}px !important;
          max-height: ${maxArtForHeight}px !important;
        }
        ${scope} .story-card {
          flex-direction: row !important;
          align-items: center !important;
          justify-content: flex-start !important;
          gap: 16px !important;
          text-align: left !important;
        }
        ${scope} .story-art-box {
          width: ${adaptedArt}px !important;
          height: ${adaptedArt}px !important;
          min-width: ${adaptedArt}px !important;
          min-height: ${adaptedArt}px !important;
          margin-bottom: 0 !important;
        }
      `);
    }
  }

  // 3. Frame Padding
  if (typeof config.framePadding === "number" && config.framePadding >= 0) {
    rules.push(`
      ${cardSelector} {
        padding: ${config.framePadding}px !important;
      }
    `);
  }

  // Reserve room for optional, shared metadata and playback indicator.
  if (!options.unboundedSizes && (config.showAlbum || config.showVisualizer || config.showBadge || config.showPlaybackStatus || config.showTimestamps !== false)) {
    const indicator = config.showVisualizer ? Math.max(0, config.visualizerHeight ?? 24) : 0;
    const extra = Math.max(indicator, 16) + 14;
    rules.push(`${cardSelector}:not([data-theme-role="frame"]) { padding-bottom: ${Math.max(config.framePadding || 0, extra)}px !important; }`);
  }
  // Hide each theme's fixed bar indicator; the shared indicator supports count and height.
  rules.push(`${scope} :is(.mpo-visualizer, .apple-eq-container, .orb-status, .streamer-live-tag):not([data-theme-role="indicator"]):not([data-theme-role="status"]):not([data-theme-role="badge"]) { display: none !important; }`);

  // 4. Border Radius
  if (typeof config.borderRadius === "number") {
    rules.push(`
      ${cardSelector} {
        border-radius: ${config.borderRadius}px !important;
      }
    `);
  }

  // 5. Blur & Opacity (with Game & Streamer Eco-GPU Surface override)
  if (config.blur !== undefined || config.opacity !== undefined) {
    const blurPx = config.blur || 0;
    rules.push(`
      ${cardSelector} {
        backdrop-filter: blur(${blurPx}px) !important;
        -webkit-backdrop-filter: blur(${blurPx}px) !important;
      }

      /* Game Mode & Streamer Mode: ONLY the inner card receives the zero-blur eco surface */
      :is(.eco-gpu-mode, .game-mode-active, .streamer-mode) ${cardSelector} {
        --hud-backdrop-filter: none !important;
        --card-blur: 0px !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }

    `);
  }

  // 6. High Contrast Mode
  if (config.highContrast) {
    rules.push(`
      ${cardSelector} {
        filter: contrast(1.16) saturate(1.12);
      }
    `);
  }

  // 7. Player / Source Badge Visibility
  if (config.showBadge === false) {
    rules.push(`
      ${scope} :is(.mpo-badge, .apple-music-badge, .cyber-tag, .tag-badge, .blade-tag, .island-badge, .streamer-live-tag, .zen-badge) {
        display: none !important;
      }
    `);
  }

  // 8. Track Title & Typography
  if (config.showTitle === false) {
    rules.push(`
      ${scope} :is(.mpo-title, .apple-title, .cyber-title, .glass-title, .zen-title, .blade-title, .island-title, .split-title, .story-title, .vinyl-title, .streamer-title) {
        display: none !important;
      }
    `);
  } else {
    const titleStyles: string[] = [];
    if (config.titleFont) {
      titleStyles.push(`font-family: "${config.titleFont}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;`);
    }
    if (config.titleSize || (options.unboundedSizes && config.titleSize === 0)) {
      titleStyles.push(`font-size: ${config.titleSize}px !important;`);
    }
    if (config.titleWeight) {
      titleStyles.push(`font-weight: ${config.titleWeight} !important;`);
    }
    if (config.titleColor) {
      titleStyles.push(`color: ${config.titleColor} !important; -webkit-text-fill-color: ${config.titleColor} !important;`);
    }
    if (titleStyles.length > 0) {
      rules.push(`
        ${scope} :is(.mpo-title, .apple-title, .cyber-title, .glass-title, .zen-title, .blade-title, .island-title, .split-title, .story-title, .vinyl-title, .streamer-title) {
          ${titleStyles.join("\n")}
        }
      `);
    }
  }

  // 9. Artist Name Styling & Visibility
  if (config.showArtist === false) {
    rules.push(`
      ${scope} :is(.mpo-artist, .apple-artist, .cyber-artist, .glass-artist, .zen-artist, .blade-artist, .island-artist, .split-artist, .story-artist, .vinyl-artist, .streamer-artist) {
        display: none !important;
      }
    `);
  } else {
    const artistStyles: string[] = [];
    if (config.artistSize || (options.unboundedSizes && config.artistSize === 0)) {
      artistStyles.push(`font-size: ${config.artistSize}px !important;`);
    }
    if (config.artistWeight) artistStyles.push(`font-weight: ${config.artistWeight} !important;`);
    if (config.artistTransform) artistStyles.push(`text-transform: ${config.artistTransform} !important;`);
    if (config.artistColor) {
      artistStyles.push(`color: ${config.artistColor} !important; -webkit-text-fill-color: ${config.artistColor} !important;`);
    }
    if (artistStyles.length > 0) {
      rules.push(`
        ${scope} :is(.mpo-artist, .apple-artist, .cyber-artist, .glass-artist, .zen-artist, .blade-artist, .island-artist, .split-artist, .story-artist, .vinyl-artist, .streamer-artist) {
          ${artistStyles.join("\n")}
        }
      `);
    }
  }

  // 10. Album Subtitle
  if (config.showAlbum === false) {
    rules.push(`
      ${scope} :is(.mpo-album, .apple-album, .glass-album, .split-album, .story-album, .vinyl-album) {
        display: none !important;
      }
    `);
  } else if (config.albumSize || (options.unboundedSizes && config.albumSize === 0)) {
    rules.push(`
      ${scope} :is(.mpo-album, .apple-album, .glass-album, .split-album, .story-album, .vinyl-album) {
        font-size: ${config.albumSize}px !important;
      }
    `);
  }

  // Fine typography is scoped to overlay content and overrides the older controls.
  const typographySelectors = {
    title: ".mpo-title", artist: ".mpo-artist", album: ".mpo-album",
    themeLabel: ".mpo-theme-label", badge: ".mpo-badge", timestamps: ".mpo-universal-timestamps, .apple-timestamps-row, .aero-times, .cyber-timestamps, .orb-times, .glass-timestamps, .pill-time, .tag-time, .blade-time, .split-times, .streamer-time, .story-times, .vinyl-times, .zen-time",
    status: ".mpo-playback-status"
  };
  if (config.showPlaybackStatus === false) rules.push(`${scope} .mpo-playback-status { display: none !important; }`);
  if (config.showThemeLabel === false) rules.push(`${scope} .mpo-theme-label { display: none !important; }`);
  for (const [key, selectors] of Object.entries(typographySelectors)) {
    const style = config.typography?.[key as keyof typeof typographySelectors];
    if (!style) continue;
    const declarations: string[] = [];
    if (style.color && /^#[0-9a-f]{6}$/i.test(style.color)) declarations.push(`color: ${style.color} !important; -webkit-text-fill-color: ${style.color} !important`);
    if (Number.isFinite(style.size)) declarations.push(`font-size: ${Math.max(0, style.size!)}px !important`);
    if (Number.isFinite(style.weight)) declarations.push(`font-weight: ${Math.max(100, Math.min(900, style.weight!))} !important`);
    if (style.italic !== undefined) declarations.push(`font-style: ${style.italic ? "italic" : "normal"} !important`);
    if (style.transform && ["none", "uppercase", "lowercase", "capitalize"].includes(style.transform)) declarations.push(`text-transform: ${style.transform} !important`);
    if (style.font && /^[a-z0-9 ,'-]+$/i.test(style.font)) declarations.push(`font-family: "${style.font}", sans-serif !important`);
    if (declarations.length) rules.push(`${scope} :is(${selectors}) { ${declarations.join("; ")} }`);
  }

  // 11. Artwork Sizing, Radius & Border
  if (config.showArt === false) {
    rules.push(`
      ${scope} :is(.mpo-art, .mpo-art-img, .apple-art-box, .apple-art-img, .glass-art-box, .cyber-art-box, .pill-art-circle, .vinyl-jacket, .blade-art, .orb-art, .tag-art, .island-art, .split-art, .story-art) {
        display: none !important;
      }
    `);
  } else {
    const artStyles: string[] = [];
    if (config.artSize && config.artSize > 0) {
      artStyles.push(`
        width: ${config.artSize}px !important;
        height: ${config.artSize}px !important;
        min-width: ${config.artSize}px !important;
        min-height: ${config.artSize}px !important;
        max-width: ${config.artSize}px !important;
        max-height: ${config.artSize}px !important;
      `);
    }
    if (config.artRadius !== undefined) {
      artStyles.push(`border-radius: ${config.artRadius}px !important;`);
    }
    if (typeof config.artBorder === "number") {
      artStyles.push(`border: ${config.artBorder}px solid rgba(255, 255, 255, 0.28) !important;`);
    }
    if (artStyles.length > 0) {
      rules.push(`
        ${scope} :is(.mpo-art, .apple-art-box, .glass-art-box, .cyber-art-box, .pill-art-circle, .vinyl-jacket, .blade-art, .orb-art, .tag-art, .island-art, .split-art, .story-art) {
          ${artStyles.join("\n")}
        }
      `);
    }
  }

  if (config.artSize && config.artSize > 0) {
    rules.push(`${scope} .collection-card { --collection-art-size: ${config.artSize}px; } ${scope} .collection-card .collection-art { width: min(${config.artSize}px, 100%) !important; min-width: 0 !important; max-width: 100% !important; height: auto !important; min-height: 0 !important; aspect-ratio: 1; }`);
  }

  if (config.artGlow !== undefined) {
    rules.push(`${scope} .mpo-art { box-shadow: ${config.artGlow ? `0 0 14px ${activeAccent}66` : "none"} !important; }`);
  }
  if (config.spinningVinyl) {
    rules.push(`${scope} .mpo-art-img { animation: mpo-art-spin 12s linear infinite !important; }`);
  }
  {
    rules.push(`${scope} :is(.apple-timestamps-row,.aero-times,.cyber-timestamps,.orb-times,.glass-timestamps,.pill-time,.tag-time,.blade-time,.split-times,.streamer-time,.story-times,.vinyl-times,.zen-time):not([data-theme-role="timestamps"]) { display:none !important; }`);
  }
  const progressTrack = `${scope} :is(.big-progress,.collection-progress-track,.apple-progress-bar-track,.aero-track,.cyber-track,.orb-track,.glass-progress-track,.pill-track,.tag-track,.blade-progress-line,.island-track,.split-track,.streamer-progress-line,.story-track,.vinyl-track,.zen-track)`;
  const progressFill = `${scope} .mpo-progress-fill`;
  if (typeof config.progressHeight === "number") {
    const height = Math.max(0, config.progressHeight);
    rules.push(`${progressTrack} { height: ${height}px !important; }`);
  }
  // Only accept color-picker values here; imported configuration is untrusted data.
  const validColor = (value?: string) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
  if (validColor(config.progressTrackColor)) rules.push(`${progressTrack} { background: ${config.progressTrackColor} !important; }`);
  if (validColor(config.progressFillColor)) rules.push(`${progressFill} { background: ${config.progressFillColor} !important; }`);
  if (config.progressShape && config.progressShape !== "theme") {
    const radius = config.progressShape === "square" ? "0" : config.progressShape === "rounded" ? "4px" : config.progressShape === "pill" ? "9999px" : null;
    if (radius) rules.push(`${progressTrack}, ${progressFill} { border-radius: ${radius} !important; }`);
  }

  // 12. Playback Progress
  if (config.showProgress === false) {
    rules.push(`
      ${scope} :is(.mpo-progress, .apple-progress-bar-track, .glass-progress-bar, .cyber-bar-track, .blade-progress-track, .island-progress-track, .split-progress-track, .story-progress-track, .vinyl-progress) {
        display: none !important;
      }
    `);
  }

  // 13. Audio Equalizer Visualizer
  if (config.showVisualizer === false) {
    rules.push(`
      ${scope} :is(.mpo-visualizer, .apple-eq-container, .zen-bars, .island-waves, .cyber-visualizer, .split-visualizer) {
        display: none !important;
      }
    `);
  } else {
    const visStyles: string[] = [];
    // The shared visualizer owns its container height. Forcing each bar to
    // that height overrides dots/pulse shapes and authored percentage heights.
    if (config.visualizerColor) {
      visStyles.push(`background: ${config.visualizerColor} !important; background-color: ${config.visualizerColor} !important;`);
    }
    if (visStyles.length > 0) {
      rules.push(`
        ${scope} :is(.mpo-vis-bar, .apple-eq-bar, .zen-bars span, .island-waves span, .cyber-visualizer span, .split-visualizer span) {
          ${visStyles.join("\n")}
        }
      `);
    }

    // Freeze all continuous keyframe animations and transitions during games to ensure 0 FPS swapchain presentation
    rules.push(`
      :is(.eco-gpu-mode, .game-mode-active) ${scope} * {
        animation-play-state: paused !important;
      }
      :is(.eco-gpu-mode, .game-mode-active) ${scope} :is(.mpo-vis-bar, .apple-eq-bar, .zen-bars span, .island-waves span, .cyber-visualizer span, .split-visualizer span, .vinyl-disc, .orb-glow) {
        animation: none !important;
        transform: none !important;
      }
      /* Hardware-accelerated smooth progress interpolation */
      ${scope} :is(.mpo-progress-fill, .glass-progress-fill, .apple-progress-bar-fill, .cyber-bar-fill, .blade-progress-fill, .island-progress-fill, .story-progress-fill, .split-progress-fill) {
        transition: transform 0.2s linear !important;
      }
    `);
  }

  // SDK roles use the very same layer controls as native themes. Attribute
  // selectors avoid injecting the legacy .mpo-card layout into authored themes.
  const role = (name: string) => name === "artwork"
    ? `${scope} :is([data-theme-role="artwork"], [data-theme-role="artwork-image"]:not([data-theme-role="artwork"] *))`
    : `${scope} [data-theme-role="${name}"]`;
  const sdkFrame = role("frame");
  const colorValue = (value?: string) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
  if (Number.isFinite(config.opacity) || config.highContrast !== undefined) {
    const alpha = Math.max(0, Math.min(1, config.opacity ?? .88));
    const rgb = config.highContrast ? "6,8,13" : "19,22,31";
    rules.push(`${sdkFrame} { background-color: rgba(${rgb},${alpha}) !important; background-image: none !important; }`);
  }
  const visibility = {
    title: config.showTitle, artist: config.showArtist, album: config.showAlbum,
    artwork: config.showArt, badge: config.showBadge, progress: config.showProgress,
    timestamps: config.showTimestamps, status: config.showPlaybackStatus,
    indicator: config.showVisualizer, themeLabel: config.showThemeLabel,
  };
  for (const [name, visible] of Object.entries(visibility)) {
    if (visible === false) rules.push(`${role(name)} { display: none !important; }`);
  }
  const legacyTypography = {
    title: { size: config.titleSize, weight: config.titleWeight, color: config.titleColor, font: config.titleFont || config.fontFamily, transform: config.titleTransform },
    artist: { size: config.artistSize, weight: config.artistWeight, color: config.artistColor, font: config.fontFamily, transform: config.artistTransform },
    album: { size: config.albumSize, font: config.fontFamily },
    themeLabel: { font: config.fontFamily }, badge: { font: config.fontFamily },
    timestamps: { font: config.fontFamily }, status: { font: config.fontFamily },
  };
  for (const name of Object.keys(legacyTypography) as (keyof typeof legacyTypography)[]) {
    const appearance = { ...legacyTypography[name], ...config.typography?.[name] };
    const declarations: string[] = [];
    if (Number.isFinite(appearance.size)) declarations.push(`font-size: ${Math.max(0, appearance.size!)}px !important`);
    if (Number.isFinite(appearance.weight)) declarations.push(`font-weight: ${Math.max(100, Math.min(900, appearance.weight!))} !important`);
    if (colorValue(appearance.color)) declarations.push(`color: ${appearance.color} !important; -webkit-text-fill-color: ${appearance.color} !important`);
    if (appearance.font && /^[a-z0-9 ,'-]+$/i.test(appearance.font)) declarations.push(`font-family: "${appearance.font}", sans-serif !important`);
    if (appearance.transform && ["none", "uppercase", "lowercase", "capitalize"].includes(appearance.transform)) declarations.push(`text-transform: ${appearance.transform} !important`);
    if (appearance.italic !== undefined) declarations.push(`font-style: ${appearance.italic ? "italic" : "normal"} !important`);
    if (declarations.length) rules.push(`${role(name)} { ${declarations.join("; ")} }`);
  }
  if (config.titleGlow !== undefined) rules.push(`${role("title")} { text-shadow: ${config.titleGlow && colorValue(activeAccent) ? `0 0 12px ${activeAccent}88` : "none"} !important; }`);
  const sdkArt = role("artwork");
  if (Number.isFinite(config.artSize) && config.artSize! > 0) {
    rules.push(`${sdkArt} { width: ${config.artSize}px !important; height: ${config.artSize}px !important; min-width: ${config.artSize}px !important; min-height: ${config.artSize}px !important; max-width: none !important; max-height: none !important; flex-shrink: 0; }`);
  }
  if (Number.isFinite(config.artRadius)) rules.push(`${sdkArt}, ${role("artwork-image")} { border-radius: ${Math.max(0, config.artRadius!)}px !important; }`);
  if (Number.isFinite(config.artBorder)) rules.push(`${sdkArt} { border: ${Math.max(0, config.artBorder!)}px solid rgba(255,255,255,.28) !important; }`);
  if (config.artGlow !== undefined) rules.push(`${sdkArt} { box-shadow: ${config.artGlow && colorValue(activeAccent) ? `0 0 14px ${activeAccent}66` : "none"} !important; }`);
  if (config.spinningVinyl) rules.push(`${role("artwork-image")} { animation: mpo-art-spin 12s linear infinite !important; }`);
  const sdkTrack = `${scope} :is([data-theme-role="progress-track"], [data-theme-part="progress-track"])`;
  const sdkFill = role("progress-fill");
  if (Number.isFinite(config.progressHeight)) rules.push(`${sdkTrack} { height: ${Math.max(0, config.progressHeight!)}px !important; }`);
  if (colorValue(config.progressTrackColor)) rules.push(`${sdkTrack} { background: ${config.progressTrackColor} !important; }`);
  if (colorValue(config.progressFillColor)) rules.push(`${sdkFill} { background: ${config.progressFillColor} !important; }`);
  if (config.progressShape && config.progressShape !== "theme") {
    const radius = { square: "0", rounded: "4px", pill: "9999px" }[config.progressShape];
    if (radius) rules.push(`${sdkTrack}, ${sdkFill} { border-radius: ${radius} !important; }`);
  }
  if (Number.isFinite(config.visualizerHeight)) rules.push(`${role("indicator")} { height: ${Math.max(0, config.visualizerHeight!)}px !important; }`);
  if (colorValue(config.visualizerColor)) rules.push(`${role("indicator-bar")} { background: ${config.visualizerColor} !important; }`);
  // Individual transform properties preserve authored rotation/centering and
  // progress scaleX interpolation instead of replacing their transform string.
  for (const [name, position] of Object.entries(config.elementPositions || {})) {
    if (!Object.prototype.hasOwnProperty.call(visibility, name) && name !== "frame") continue;
    const x = Number.isFinite(position.x) ? position.x : 0;
    const y = Number.isFinite(position.y) ? position.y : 0;
    const scale = Number.isFinite(position.scale) ? Math.max(0, position.scale!) : 1;
    const nativeRoles: Record<string, string> = { title: ".mpo-title", artist: ".mpo-artist", album: ".mpo-album", artwork: ".mpo-art", badge: ".mpo-badge", progress: ".mpo-progress", timestamps: ".mpo-universal-timestamps", status: ".mpo-playback-status", indicator: ".mpo-universal-visualizer", themeLabel: ".mpo-theme-label" };
    const standaloneArt = name === "artwork" ? ', [data-theme-role="artwork-image"]:not([data-theme-role="artwork"] *)' : "";
    const selector = name === "frame" ? cardSelector : `${scope} :is([data-theme-role="${name}"]${standaloneArt}${nativeRoles[name] ? `, ${nativeRoles[name]}` : ""})`;
    rules.push(`${selector} { translate: ${x}px ${y}px !important; scale: ${scale} !important; }`);
  }

  // Artwork modes are presentation overrides; manual colors remain intact.
  if (surface) {
    const rgb = parseHex(surface)!;
    const opacity = Math.max(0, Math.min(1, config.opacity ?? 0.9));
    rules.push(`${cardSelector} { background-color: rgba(${rgb.join(", ")}, ${opacity}) !important; background-image: none !important; }`);
  }
  const dynamicText = derive(modes?.text, 4.5);
  if (dynamicText) rules.push(`${scope} :is(.mpo-title,.mpo-artist,.mpo-album,.mpo-theme-label,.mpo-badge,.mpo-universal-timestamps,.mpo-playback-status,.apple-timestamps-row,.aero-times,.cyber-timestamps,.orb-times,.glass-timestamps,.pill-time,.tag-time,.blade-time,.split-times,.streamer-time,.story-times,.vinyl-times,.zen-time) { color: ${dynamicText} !important; -webkit-text-fill-color: ${dynamicText} !important; }`);
  if (dynamicText) rules.push(`${scope} :is(${Object.keys(legacyTypography).map(name => `[data-theme-role="${name}"]`).join(",")}) { color: ${dynamicText} !important; -webkit-text-fill-color: ${dynamicText} !important; }`);
  const border = derive(modes?.border, 3);
  if (border) rules.push(`${cardSelector}, ${scope} .mpo-art { border-color: ${border} !important; }`);
  if (border) rules.push(`${sdkArt} { border-color: ${border} !important; }`);
  const progressColor = derive(modes?.progress, 3);
  if (progressColor) rules.push(`${scope} :is(.mpo-progress-fill,.glass-progress-fill,.apple-progress-bar-fill,.cyber-bar-fill,.blade-progress-fill,.island-progress-fill,.story-progress-fill,.split-progress-fill) { background: ${progressColor} !important; background-color: ${progressColor} !important; }`);
  if (progressColor) rules.push(`${sdkFill} { background: ${progressColor} !important; }`);
  const indicatorColor = derive(modes?.indicator, 3);
  if (indicatorColor) rules.push(`${scope} :is(.mpo-vis-bar,.apple-eq-bar,.zen-bars span,.island-waves span,.cyber-visualizer span,.split-visualizer span) { background: ${indicatorColor} !important; background-color: ${indicatorColor} !important; }`);
  if (indicatorColor) rules.push(`${role("indicator-bar")} { background: ${indicatorColor} !important; }`);

  if(config.widthMode==='content') rules.push(`${cardSelector} { box-sizing:border-box !important; width:var(--mpo-content-width, ${Math.max(config.contentMinWidth||320,config.contentMaxWidth||600)}px) !important; min-width:0 !important; max-width:none !important; flex-shrink:0 !important; } ${scope} :is(.mpo-theme-container,[class*="-root"]):not([data-theme-layout-root]):not(.mpo-sdk-host):not([data-theme-role="host"]):not([data-theme-role="frame"]) {width:max-content !important;max-width:none !important;} ${scope} :is(.mpo-title,.mpo-artist,.mpo-album,[data-theme-role="title"],[data-theme-role="artist"],[data-theme-role="album"]) {white-space:nowrap !important;overflow:hidden !important;text-overflow:ellipsis !important;min-width:0;}`);
  if(config.layoutBoundary && config.layoutBoundary!=='legacy') rules.push(`${cardSelector} { overflow:${config.layoutBoundary==='constrain'?'hidden':'visible'} !important; }`);
  rules.push(`${scope} [data-mpo-grow-frame] { background:transparent !important; border-color:transparent !important; box-shadow:none !important; backdrop-filter:none !important; -webkit-backdrop-filter:none !important; }`);
  rules.push(`${scope} [data-mpo-constrained] { translate:var(--mpo-constrained-translate) !important; scale:var(--mpo-constrained-scale) !important; }`);
  rules.push(`${scope} [data-mpo-text-overflow="shrink"] { font-size:var(--mpo-fit-font-size) !important; }`);
  rules.push(`${scope} [data-mpo-marquee-active="true"] { -webkit-text-fill-color:transparent !important; text-shadow:none !important; } ${scope} [data-mpo-marquee-active="true"]::after { -webkit-text-fill-color:var(--mpo-marquee-color); } @media(prefers-reduced-motion:reduce) { ${scope} [data-mpo-marquee-active="true"] {color:var(--mpo-marquee-color) !important; -webkit-text-fill-color:var(--mpo-marquee-color) !important;} }`);
  rules.push(scopeElementCss(mergeLegacyCss(customCss, config.elementCss), scope));

  return rules.join("\n\n");
}
