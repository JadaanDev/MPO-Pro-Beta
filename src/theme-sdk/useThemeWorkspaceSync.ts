import { useEffect } from "react";
import { libraryForSync, writeThemeLibrary } from "./library";
import { listAllThemes, setupThemeWatcher } from "./themeStore";
import { validateThemeDefinition } from "./schema";
import { compileThemeBundle } from "./compiler/themeCompiler";

/** After initial server hydration, publish valid disk edits to all linked studios.
 * Invalid/incomplete external saves retain the last working library entry. */
export function useThemeWorkspaceSync(ready: boolean) {
  useEffect(() => {
    if (!ready || !("__TAURI_INTERNALS__" in window)) return;
    let disposed = false, revision = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = async () => {
      const ticket = ++revision;
      try {
        const loaded = await listAllThemes();
        if (disposed || ticket !== revision) return;
        const current = libraryForSync();
        if (!current) return;
        const valid = loaded.filter(theme => !validateThemeDefinition(theme).length && theme.bundle && compileThemeBundle(theme.bundle).success);
        const next = current.map(theme => valid.find(candidate => candidate.id === theme.id) || theme);
        next.push(...valid.filter(theme => !current.some(candidate => candidate.id === theme.id)));
        if (JSON.stringify(next) !== JSON.stringify(current)) writeThemeLibrary(next);
      } catch (error) {
        console.warn("Could not refresh linked disk themes:", error);
      }
    };
    const stop = setupThemeWatcher(() => {
      ++revision;
      clearTimeout(timer);
      timer = setTimeout(() => { void refresh(); }, 150);
    });
    void refresh();
    return () => { disposed = true; ++revision; clearTimeout(timer); stop(); };
  }, [ready]);
}
