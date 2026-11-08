const esbuild = require("esbuild");
const path = require("node:path");
const fs = require("node:fs");
const assert = require("node:assert/strict");

// 1. Version string verification
const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../package.json"), "utf8"));
assert.equal(pkg.version, "7.0.0-beta.17", "package.json version must be 7.0.0-beta.17");

const pkgLock = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../package-lock.json"), "utf8"));
assert.equal(pkgLock.version, "7.0.0-beta.17", "package-lock.json version must be 7.0.0-beta.17");

const cargoToml = fs.readFileSync(path.resolve(__dirname, "../src-tauri/Cargo.toml"), "utf8");
assert.ok(cargoToml.includes('version = "7.0.0-beta.17"'), "Cargo.toml version must be 7.0.0-beta.17");

const tauriConf = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../src-tauri/tauri.conf.json"), "utf8"));
assert.equal(tauriConf.version, "7.0.0-beta.17", "tauri.conf.json version must be 7.0.0-beta.17");

const sdkDoc = fs.readFileSync(path.resolve(__dirname, "../THEME-SDK.md"), "utf8");
assert.ok(sdkDoc.includes("7.0.0-beta.17"), "THEME-SDK.md must reference 7.0.0-beta.17");

const sdkLlmDoc = fs.readFileSync(path.resolve(__dirname, "../THEME-SDK-LLM.md"), "utf8");
assert.ok(sdkLlmDoc.includes("7.0.0-beta.17"), "THEME-SDK-LLM.md must reference 7.0.0-beta.17");

const modRs = fs.readFileSync(path.resolve(__dirname, "../src-tauri/src/themes/mod.rs"), "utf8");
assert.ok(modRs.includes('assert!(SDK_LLM_CONTRACT.contains("7.0.0-beta.17"))'), "mod.rs test must assert 7.0.0-beta.17");

// 2. System themes SDK compliance check via static rendering
const source = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { THEME_COMPONENTS, THEME_REGISTRY } from "./src/themes/ThemeRegistry";
import { ThemeSupplement } from "./src/themes/ThemeSupplement";
import { DEFAULT_THEME_CONFIG } from "./src/types/themes";

const media = {
  title: "Beta 17 Title",
  artist: "Beta 17 Artist",
  album_title: "Beta 17 Album",
  status: "Playing",
  position_ms: 12000,
  duration_ms: 180000,
  app_name: "Spotify",
  has_art: true,
  art_timestamp: Date.now(),
  updated_at: Date.now(),
};

// Check all 44 themes registered in THEME_COMPONENTS
const themeKeys = Object.keys(THEME_COMPONENTS);
if (themeKeys.length !== 44) {
  throw new Error("Expected 44 system themes, found: " + themeKeys.length);
}

for (const [id, Component] of Object.entries(THEME_COMPONENTS)) {
  const config = {
    ...DEFAULT_THEME_CONFIG,
    themeLabel: "CUSTOM KICKER",
    showThemeLabel: true,
    showTitle: true,
    showArtist: true,
    showAlbum: true,
    showArt: true,
    showBadge: true,
    showProgress: true,
    showTimestamps: true,
    showPlaybackStatus: true,
    showVisualizer: true,
  };

  const html = renderToStaticMarkup(
    React.createElement(Component, {
      media,
      artUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      config,
      format: "horizontal",
    })
  );

  // Every system theme must render an outer container annotated with data-theme-role="frame"
  if (!html.includes('data-theme-role="frame"')) {
    throw new Error(id + ' missing data-theme-role="frame"');
  }

  // Every system theme must render title and artist with explicit roles
  if (!html.includes('data-theme-role="title"')) {
    throw new Error(id + ' missing data-theme-role="title"');
  }
  if (!html.includes('data-theme-role="artist"')) {
    throw new Error(id + ' missing data-theme-role="artist"');
  }

  // Check custom kicker / themeLabel support
  if (!html.includes("CUSTOM KICKER") || !html.includes('data-theme-role="themeLabel"')) {
    throw new Error(id + ' missing custom kicker or data-theme-role="themeLabel"');
  }

  // Artwork wrapper
  if (!html.includes('data-theme-role="artwork"')) {
    throw new Error(id + ' missing data-theme-role="artwork"');
  }
}

// Check ThemeSupplement explicit roles
const suppHtml = renderToStaticMarkup(
  React.createElement(ThemeSupplement, {
    media,
    config: {
      ...DEFAULT_THEME_CONFIG,
      themeLabel: "SUPP KICKER",
      showThemeLabel: true,
      showAlbum: true,
      showBadge: true,
      showPlaybackStatus: true,
      showTimestamps: true,
      showVisualizer: true,
    },
    album: true,
    badge: true,
    label: true,
    currentTime: "0:12",
    durationTime: "3:00",
  })
);

for (const role of ["themeLabel", "album", "badge", "status", "timestamps", "indicator"]) {
  if (!suppHtml.includes('data-theme-role="' + role + '"')) {
    throw new Error('ThemeSupplement missing explicit data-theme-role="' + role + '"');
  }
}

console.log("Beta 17: all 44 system themes + ThemeSupplement comply with explicit SDK data-theme-role semantic contract");
console.log("Beta 17: version strings verified across package.json, Cargo.toml, tauri.conf.json, and documentation");
`;

(async () => {
  const result = await esbuild.build({
    stdin: {
      contents: source,
      resolveDir: path.resolve(__dirname, ".."),
      sourcefile: "test-beta17-runner.tsx",
      loader: "tsx",
    },
    bundle: true,
    platform: "node",
    format: "cjs",
    write: false,
    packages: "external",
    loader: { ".css": "empty", ".md": "text" },
  });

  const mod = { exports: {} };
  new Function("require", "module", "exports", result.outputFiles[0].text)(require, mod, mod.exports);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
