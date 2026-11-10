const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const esbuild = require("esbuild");

// 1. Version string verification
const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../package.json"), "utf8"));
assert.equal(pkg.version, "7.0.0-beta.18", "package.json version must be 7.0.0-beta.18");

const pkgLock = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../package-lock.json"), "utf8"));
assert.equal(pkgLock.version, "7.0.0-beta.18", "package-lock.json version must be 7.0.0-beta.18");

const cargoToml = fs.readFileSync(path.resolve(__dirname, "../src-tauri/Cargo.toml"), "utf8");
assert.ok(cargoToml.includes('version = "7.0.0-beta.18"'), "Cargo.toml version must be 7.0.0-beta.18");

const tauriConf = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../src-tauri/tauri.conf.json"), "utf8"));
assert.equal(tauriConf.version, "7.0.0-beta.18", "tauri.conf.json version must be 7.0.0-beta.18");

const sdkDoc = fs.readFileSync(path.resolve(__dirname, "../THEME-SDK.md"), "utf8");
assert.ok(sdkDoc.includes("7.0.0-beta.18"), "THEME-SDK.md must reference 7.0.0-beta.18");

const sdkLlmDoc = fs.readFileSync(path.resolve(__dirname, "../THEME-SDK-LLM.md"), "utf8");
assert.ok(sdkLlmDoc.includes("7.0.0-beta.18"), "THEME-SDK-LLM.md must reference 7.0.0-beta.18");

const modRs = fs.readFileSync(path.resolve(__dirname, "../src-tauri/src/themes/mod.rs"), "utf8");
assert.ok(modRs.includes('assert!(SDK_LLM_CONTRACT.contains("7.0.0-beta.18"))'), "mod.rs test must assert 7.0.0-beta.18");

// 2. CSS & Widget verification
const desktopHudCss = fs.readFileSync(path.resolve(__dirname, "../src/styles/dashboard/overlay/desktop-hud.css"), "utf8");
assert.ok(desktopHudCss.includes("zoom: var(--desktop-hud-scale, 1) !important"), "desktop-hud.css must include layout zoom scaling");
assert.ok(desktopHudCss.includes("transform: none !important"), "desktop-hud.css must override blurry GPU transform");
assert.ok(desktopHudCss.includes("subpixel-antialiased"), "desktop-hud.css must enable subpixel-antialiased");
assert.ok(desktopHudCss.includes("geometricPrecision"), "desktop-hud.css must enable geometricPrecision");
assert.ok(desktopHudCss.includes("image-rendering: high-quality"), "desktop-hud.css must enable high-quality artwork rendering");

const widgetSource = fs.readFileSync(path.resolve(__dirname, "../src/components/overlay/DesktopOverlayWidget.tsx"), "utf8");
assert.ok(widgetSource.includes('["--desktop-hud-scale" as any]:'), "DesktopOverlayWidget must bind --desktop-hud-scale inline");

// 3. ThemeStyleEngine generated CSS verification
const engineTest = `
import { generateEffectiveThemeCss } from "./src/utils/ThemeStyleEngine";
import { DEFAULT_THEME_CONFIG } from "./src/types/themes";

const config = { ...DEFAULT_THEME_CONFIG, scale: 0.65 };
const css = generateEffectiveThemeCss(config, "horizontal");
if (!css.includes("--desktop-hud-scale: 0.65")) throw new Error("ThemeStyleEngine missing --desktop-hud-scale");
if (!css.includes("zoom: var(--desktop-hud-scale, 0.65) !important")) throw new Error("ThemeStyleEngine missing zoom rule");
if (!css.includes("transform: none !important")) throw new Error("ThemeStyleEngine missing transform: none override");
if (!css.includes("subpixel-antialiased")) throw new Error("ThemeStyleEngine missing subpixel-antialiased");
if (!css.includes("geometricPrecision")) throw new Error("ThemeStyleEngine missing geometricPrecision");
if (!css.includes("image-rendering: high-quality")) throw new Error("ThemeStyleEngine missing high-quality image rendering");

console.log("Beta 18: ThemeStyleEngine generates crisp layout zoom and anti-blur rendering rules OK");
`;

(async () => {
  const result = await esbuild.build({
    stdin: {
      contents: engineTest,
      resolveDir: path.resolve(__dirname, ".."),
      sourcefile: "test-beta18-runner.tsx",
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
  console.log("Beta 18: Desktop Overlay clean native vector scaling (anti-blur) & version sync verified OK");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
