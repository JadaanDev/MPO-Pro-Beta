import type { ThemeDefinition } from "../schema";
import type { ThemeBundle } from "../compiler/types";
import { generateBundleFromDeclarative } from "./bundleGenerator";
import { compileThemeBundle } from "../compiler/themeCompiler";
import { withBundleAuthoringFiles } from "./bundleAuthoring";

export interface MpoThemePackage {
  format: "mpo-theme-package";
  version: 2;
  exportedAt: string;
  theme: ThemeDefinition;
}

/**
 * Serializes a theme into a standalone, portable .mpotheme.json file
 */
export function exportThemePackageJson(theme: ThemeDefinition): string {
  const bundle: ThemeBundle = withBundleAuthoringFiles(theme.bundle || generateBundleFromDeclarative(theme));
  const fullTheme: ThemeDefinition = {
    ...theme,
    bundle,
  };

  const pkg: MpoThemePackage = {
    format: "mpo-theme-package",
    version: 2,
    exportedAt: new Date().toISOString(),
    theme: fullTheme,
  };

  return JSON.stringify(pkg, null, 2);
}

/**
 * Triggers a browser download of the theme file
 */
export function downloadThemePackage(theme: ThemeDefinition) {
  const json = exportThemePackageJson(theme);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${theme.id || "custom-theme"}.mpotheme.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parses and validates an imported .mpotheme.json file
 */
export function parseThemePackageJson(rawJson: string): ThemeDefinition {
  const parsed = JSON.parse(rawJson);
  let theme: ThemeDefinition;

  if (parsed.format === "mpo-theme-package" && parsed.theme) {
    theme = parsed.theme;
  } else if (parsed.schemaVersion === 1 && parsed.id && parsed.elements) {
    theme = parsed as ThemeDefinition;
  } else if (parsed.schemaVersion === 2 && parsed.manifest && parsed.files) {
    const bundle = parsed as ThemeBundle;
    theme = {
      schemaVersion: 1,
      id: bundle.manifest.id || `imported-${Date.now()}`,
      name: bundle.manifest.name || "Imported Theme",
      elements: [],
      bundle,
    };
  } else {
    throw new Error("Unrecognized theme package format. Please import a valid .mpotheme.json file.");
  }

  // If bundle is present, run a verification compile
  if (theme.bundle) {
    const check = compileThemeBundle(theme.bundle);
    if (!check.success) {
      const err = check.diagnostics.find((d) => d.severity === "error");
      throw new Error(`Theme bundle has compilation errors: ${err?.message || "Invalid syntax"}`);
    }
  }

  return theme;
}

/**
 * Reads a File object from input or drop event
 */
export async function readThemeFromFile(file: File): Promise<ThemeDefinition> {
  const text = await file.text();
  return parseThemePackageJson(text);
}

