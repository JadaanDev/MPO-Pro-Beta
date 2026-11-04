import React from "react";
import * as LucideIcons from "lucide-react";
import * as Motion from "motion/react";
import { transform } from "sucrase";
import type {
  ThemeBundle,
  CompilationResult,
  CompilationDiagnostic,
  MpoThemeProps,
} from "./types";

/**
 * Scopes CSS rules to prevent theme styles from leaking into dashboard UI,
 * while preserving @keyframes, @font-face, and @import at top-level.
 */
export function scopeCss(rawCss: string, scopeClass: string): string {
  if (!rawCss || !rawCss.trim()) return "";
  const normalized = rawCss.replace(/:root\b/g, `.${scopeClass}`);
  const topLevel: string[] = [];
  const scoped: string[] = [];
  let i = 0;
  const len = normalized.length;

  while (i < len) {
    while (i < len && /\s/.test(normalized[i])) i++;
    if (i >= len) break;

    // Check if at-rule that must live at top-level (keyframes, font-face, import)
    if (
      normalized.slice(i).startsWith("@keyframes") || 
      normalized.slice(i).startsWith("@-webkit-keyframes") || 
      normalized.slice(i).startsWith("@font-face") || 
      normalized.slice(i).startsWith("@import")
    ) {
      let start = i;
      let depth = 0;
      let inBraces = false;
      while (i < len) {
        if (normalized[i] === "{") {
          depth++;
          inBraces = true;
        } else if (normalized[i] === "}") {
          depth--;
          if (inBraces && depth === 0) {
            i++;
            break;
          }
        } else if (normalized[i] === ";" && !inBraces) {
          i++;
          break;
        }
        i++;
      }
      topLevel.push(normalized.slice(start, i).trim());
    } else {
      let start = i;
      let depth = 0;
      while (i < len) {
        if (normalized[i] === "{") {
          depth++;
        } else if (normalized[i] === "}") {
          depth--;
          if (depth <= 0) {
            i++;
            break;
          }
        }
        i++;
      }
      scoped.push(normalized.slice(start, i).trim());
    }
  }

  const top = topLevel.filter(Boolean).join("\n\n");
  const inner = scoped.filter(Boolean).join("\n\n");
  return `${top ? top + "\n\n" : ""}.${scopeClass} {\n${inner}\n}\n`;
}

/**
 * In-App compiler: transpiles multi-file TSX/JSX bundles into an executable React component in < 2ms.
 */
interface CacheEntry {
  hash: string;
  result: CompilationResult;
}

const COMPILATION_CACHE = new Map<string, CacheEntry>();

function computeBundleHash(bundle: ThemeBundle): string {
  const parts: string[] = [
    bundle.manifest.id || "",
    bundle.manifest.entryPoint || "",
  ];
  const keys = Object.keys(bundle.files || {}).sort();
  for (const k of keys) {
    parts.push(k, bundle.files[k] || "");
  }
  return parts.join("::");
}

export function compileThemeBundle(bundle: ThemeBundle): CompilationResult {
  const bundleId = bundle.manifest.id || "custom-theme";
  const bundleHash = computeBundleHash(bundle);
  const cached = COMPILATION_CACHE.get(bundleId);
  if (cached && cached.hash === bundleHash) {
    return cached.result;
  }

  const startTime = performance.now();
  const diagnostics: CompilationDiagnostic[] = [];
  const entryFile = bundle.manifest.entryPoint || "Theme.tsx";

  if (!bundle.files[entryFile]) {
    return {
      success: false,
      diagnostics: [
        {
          file: entryFile,
          message: `Entry point "${entryFile}" was not found in theme bundle files.`,
          severity: "error",
        },
      ],
      compilationTimeMs: performance.now() - startTime,
    };
  }

  // 1. Transpile all code files
  const compiledFiles: Record<string, string> = {};
  for (const [filename, sourceCode] of Object.entries(bundle.files)) {
    if (/\.(tsx|ts|jsx|js)$/i.test(filename)) {
      try {
        const result = transform(sourceCode, {
          transforms: ["typescript", "jsx", "imports"],
          jsxRuntime: "classic",
          production: true,
          filePath: filename,
        });
        compiledFiles[filename] = result.code;
      } catch (err: any) {
        const message = err?.message || String(err);
        const lineMatch = message.match(/\((\d+):(\d+)\)/);
        diagnostics.push({
          file: filename,
          message,
          line: lineMatch ? parseInt(lineMatch[1], 10) : undefined,
          column: lineMatch ? parseInt(lineMatch[2], 10) : undefined,
          severity: "error",
        });
      }
    }
  }

  if (diagnostics.some((d) => d.severity === "error")) {
    return {
      success: false,
      diagnostics,
      compilationTimeMs: performance.now() - startTime,
    };
  }

  // 2. Multi-file in-memory module execution cache
  const moduleCache: Record<string, any> = {};

  function resolveModulePath(_currentFile: string, request: string): string {
    const clean = request.replace(/^\.\//, "");
    const candidates = [
      clean,
      `${clean}.tsx`,
      `${clean}.ts`,
      `${clean}.jsx`,
      `${clean}.js`,
    ];
    for (const cand of candidates) {
      if (compiledFiles[cand] !== undefined) return cand;
    }
    return request;
  }

  function virtualRequire(currentFile: string, moduleName: string): any {
    // Standard library dependencies
    if (moduleName === "react" || moduleName === "react/jsx-runtime") {
      return React;
    }
    if (moduleName === "lucide-react") {
      return LucideIcons;
    }
    if (moduleName === "motion" || moduleName === "framer-motion" || moduleName === "motion/react") {
      return Motion;
    }

    // Local file imports (e.g. "./Visualizer")
    if (moduleName.startsWith("./") || moduleName.startsWith("../")) {
      const targetPath = resolveModulePath(currentFile, moduleName);
      if (moduleCache[targetPath]) {
        return moduleCache[targetPath].exports;
      }
      if (compiledFiles[targetPath]) {
        const mod = { exports: {} as any };
        moduleCache[targetPath] = mod;
        try {
          const fn = new Function("React", "require", "exports", "module", compiledFiles[targetPath]);
          fn(React, (req: string) => virtualRequire(targetPath, req), mod.exports, mod);
          return mod.exports;
        } catch (execErr: any) {
          throw new Error(`Error executing module "${targetPath}": ${execErr.message}`);
        }
      }
    }

    // External dependencies declared in manifest
    if (bundle.manifest.dependencies && bundle.manifest.dependencies[moduleName]) {
      // In web environment, if window has this global (e.g. from script tag)
      if (typeof window !== "undefined" && (window as any)[moduleName]) {
        return (window as any)[moduleName];
      }
    }

    // Fallback: check window globals
    if (typeof window !== "undefined" && (window as any)[moduleName]) {
      return (window as any)[moduleName];
    }

    // Return empty mock if not found rather than crashing immediately
    return {};
  }

  // 3. Execute entry point component
  let Component: React.ComponentType<MpoThemeProps> | undefined;
  try {
    const entryCode = compiledFiles[entryFile];
    const mod = { exports: {} as any };
    moduleCache[entryFile] = mod;
    const runner = new Function("React", "require", "exports", "module", entryCode);
    runner(React, (req: string) => virtualRequire(entryFile, req), mod.exports, mod);
    Component = mod.exports.default || mod.exports;
  } catch (err: any) {
    diagnostics.push({
      file: entryFile,
      message: `Runtime instantiation error: ${err?.message || String(err)}`,
      severity: "error",
    });
    return {
      success: false,
      diagnostics,
      compilationTimeMs: performance.now() - startTime,
    };
  }

  // 4. Scope CSS
  const themeId = bundle.manifest.id || "custom-theme";
  const scopeClass = `mpo-theme-scope-${themeId}`;
  const rawCss = bundle.files["style.css"] || "";
  const scopedCss = scopeCss(rawCss, scopeClass);

  const finalResult: CompilationResult = {
    success: true,
    Component,
    scopedCss,
    diagnostics,
    compilationTimeMs: performance.now() - startTime,
  };
  COMPILATION_CACHE.set(bundleId, { hash: bundleHash, result: finalResult });
  return finalResult;
}
