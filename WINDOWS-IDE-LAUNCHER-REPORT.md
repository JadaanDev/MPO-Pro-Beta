# Windows IDE/folder launcher: reliability report

**Scope:** MPO-pro beta Theme SDK workspace launcher, with particular attention to opening a generated theme directory in a user-installed IDE.  
**Prepared:** 8 November 2026  
**Recommendation:** replace the command-name allowlist launcher with a discovered, verified **IDE provider** system. Keep File Explorer as the always-available fallback; never claim that Windows has a universal “open this directory in the user's IDE” association.

## Executive finding

There is no dependable Windows API that means “open a folder in whatever code editor the user prefers.” Windows can open a folder in Explorer, launch a registered application, and resolve file/protocol associations, but an IDE's folder-opening command is an IDE-specific contract. The dependable product pattern is therefore:

1. discover known IDE installations and their supported launch forms;
2. show what is actually available on this PC;
3. let the user browse to, validate, and save an executable/arguments override;
4. execute the chosen executable directly, with the workspace path as one argument; and
5. fall back to Explorer with a useful explanation when no editor can be launched.

That supports installed and portable applications, avoids PATH assumptions, and makes an unavailable IDE a normal UI state rather than a failed launch.

## What MPO-pro does today

The relevant native entry point is `beta/src-tauri/src/themes/mod.rs` (`open_theme_in_ide`), invoked from `beta/src/theme-sdk/themeStore.ts` and the Theme Compiler / My Themes UI.

| Current behavior | Consequence |
| --- | --- |
| Presents a fixed list of editor command names in the React UI. | Every listed app looks usable whether it is installed or not. |
| Native code accepts a fixed `ALLOWED_EDITORS` list. | A user cannot select a portable/custom install without a code update. |
| Windows tries `<command>.cmd`, then `<command>`, then `cmd /C start`. | It prioritizes an unverified shell shim, has different quoting/argument rules, and still depends on PATH. |
| `spawn()` success is treated as “Launched”. | A shim can start and fail later; the UI displays a false success. |
| The stored preference is only an ID such as `antigravity`. | It has no resolved executable, version, install source, capability, or last launch result. |
| The folder path is created before launch. | This is good, but it does not prove the selected IDE understands the argument. |

### Why Antigravity currently fails

The UI/native provider uses `antigravity` (and separately permits `agy`) as though those were stable IDE launcher commands. Google documents `agy-ide` as the IDE shell command installed from Antigravity's command palette; `agy` is the Antigravity CLI/TUI, not an interchangeable “open this folder in the IDE” command. The application may also be installed without a shell command, or at a non-PATH location. Thus a working Antigravity installation can correctly fail the current `antigravity.cmd` → `antigravity` → `cmd start` sequence.

Do **not** solve this simply by adding more aliases. Add `agy-ide` as an optional Antigravity launch candidate, but discovery plus a user-selected executable must be the primary solution.

## Windows capabilities and limits

| Windows mechanism | Appropriate use | Limitation |
| --- | --- | --- |
| Direct `CreateProcessW` / Rust `Command` with an absolute `.exe` path | Primary launch mechanism. | MPO-pro needs to discover or be given the path and know the IDE's folder argument. |
| `App Paths` registry keys (HKCU and HKLM) | Locate installed executables registered by their installer. | Optional registration; not every IDE or portable install has one. |
| PATH command / vendor shell command | A secondary candidate, e.g. `code`, `cursor`, `agy-ide`. | It may be absent, point at stale software, or be a script with nonstandard parsing. |
| Start-menu shortcut (`.lnk`) | Additional discovery source. Resolve it to the target executable. | Requires shortcut parsing and should not be used as an opaque command line. |
| Uninstall registry metadata | Candidate discovery only. | `DisplayIcon`/install location are not a launch specification. |
| File associations / `Open With` | Good for files explicitly associated with an application. | There is no standard default *IDE for directories*; do not hijack folder associations. |
| `explorer.exe <folder>` | Universal graceful fallback and recovery action. | Opens Explorer, not an editor. |

This follows Microsoft's application-registration model: installed apps can register per-user or machine `App Paths` entries, and associations are an explicit user-controlled feature rather than a reliable generic editor selector. Rust's `Command` uses `CreateProcessW` on Windows; Rust's own docs also warn that `cmd.exe` and batch files decode arguments non-standardly. Those are reasons to avoid the current `cmd /C start` fallback.

## Proposed product design

### 1. Provider record, not a command string

Create a versioned Rust model returned to the frontend. Example:

```rust
#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct IdeInstallation {
    id: String,                 // "vscode", "antigravity", or UUID for custom
    display_name: String,
    launch: LaunchSpec,
    source: DetectionSource,    // app_paths, path, shortcut, configured
    availability: Availability, // ready, stale, missing, unsupported
    version: Option<String>,
    capabilities: IdeCapabilities,
    diagnostics: Vec<String>,
}

struct LaunchSpec {
    executable: PathBuf,        // canonical absolute *.exe; no shell fragment
    args_before_target: Vec<String>,
    args_after_target: Vec<String>,
    working_directory: Option<PathBuf>,
}
```

For standard Electron/VS Code-family editors, `args_before_target` is normally empty and the target directory is a single, separate argument. Per-provider flags belong in data, not scattered `if` statements. Persist a user-selected provider by immutable installation ID plus its validated `LaunchSpec`; revalidate on startup and before launch.

### 2. Discovery pipeline and precedence

Run discovery in the native process, never in the WebView. Merge de-duplicated candidates by canonical executable path.

1. **Saved override first.** If the executable still exists and passes validation, use it. The user can choose it through a native file picker (“Locate IDE…”).
2. **Known `App Paths` keys.** Query `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths` before HKLM (including WOW6432Node when relevant) for expected executable names such as `Code.exe`, `Cursor.exe`, `Antigravity IDE.exe`, `Zed.exe`, `WebStorm64.exe`.
3. **Known PATH commands.** Resolve using `SearchPathW`/a small well-tested resolver rather than launching it. Candidate set includes `code`, `code-insiders`, `cursor`, `windsurf`, `zed`, `codium`, `agy-ide`; do not treat `agy` as the IDE launcher.
4. **Start-menu shortcuts and vendor locations.** Resolve shortcuts to actual executable paths only if needed. Prefer vendor documentation/installer metadata over broad drive scanning.
5. **Custom executable.** Always expose this escape hatch. Validate that it is an `.exe`, exists, is executable, and is outside a transient MPO theme folder. Show the signed publisher/version when available, but do not mistake that for an authorization boundary.
6. **Explorer only.** If no ready provider exists, make “Open folder in Explorer” the primary action and offer “Locate an IDE” / install instructions.

The list should be refreshed on opening the menu and via an explicit Refresh action, not by expensive continuous registry and disk scanning.

### 3. Separate detection from launch

Add commands along these lines:

```text
discover_ide_installations() -> Vec<IdeInstallation>
set_preferred_ide(installation_id) -> Result<(), LauncherError>
choose_ide_executable() -> IdeInstallation      // native dialog + validation
launch_theme_workspace(theme_id, installation_id) -> LaunchResult
```

`LaunchResult` should contain provider name, canonical executable, source, PID when known, elapsed time, and an action-oriented error. Do not return an unconditional `Ok(())` merely because a process object was created.

### 4. UI behavior

- List **Available editors** with version/source and an installed check; put unavailable known providers in an “Other / not detected” section, not the primary menu.
- Label the actual operation: “Open *theme-name* in Cursor,” not “Open workspace” if it is a single theme folder.
- Use the saved installation as default, but retain a nearby dropdown, **Locate IDE…**, Refresh, Copy path, and Open in Explorer.
- After direct process spawn, say “Launch requested” rather than “Launched.” Offer a Retry / Open folder action if the process reports an immediate failure.
- When an explicit provider needs a shell command (notably `agy-ide`), label it “Shell command detected”; offer “Use executable instead” so users can make the behavior stable.
- Show the exact executable and argument in an expandable diagnostics view. Never expose an editable free-form shell command as the default UX.

## Rust implementation outline

### Safe direct launch

```rust
fn launch_folder(spec: &LaunchSpec, folder: &Path) -> Result<u32, LauncherError> {
    validate_launch_spec(spec)?;
    let folder = folder.canonicalize().map_err(LauncherError::Folder)?;
    let child = Command::new(&spec.executable)
        .args(&spec.args_before_target)
        .arg(&folder)                 // one argument; no shell quoting required
        .args(&spec.args_after_target)
        .current_dir(spec.working_directory.as_deref().unwrap_or(&folder))
        .spawn()
        .map_err(|error| LauncherError::Start {
            executable: spec.executable.clone(), error
        })?;
    Ok(child.id())
}
```

Do not construct `cmd /C`, PowerShell, or an interpolated command-line string. Do not try `.cmd` before an executable. If retaining compatibility with a user-installed `.cmd` shim is desirable, model it as a clearly marked, opt-in legacy provider and invoke it with Windows-appropriate escaping in a constrained adapter—not via a generic fallback.

### Registry/query details

The project already depends on `winreg`, so `App Paths` support needs no new crate. Query default values from both user and machine hives; normalize any quoted executable value, expand environment variables if the registry value requires it, test existence, and canonicalize it. Registry data is discovery input, not trusted executable policy: do not execute arbitrary `command` values from file-association keys.

For PATH candidates, test `SearchPathW` / a dedicated Windows resolver and record the resolved target. Do not infer success from `Command::new("foo").spawn()`. For shortcut discovery use the Shell COM `IShellLink` APIs already compatible with the existing Windows dependency features, or keep it phase two.

### Errors and telemetry

Return structured errors such as `not_detected`, `missing_executable`, `invalid_override`, `access_denied`, `spawn_failed`, and `provider_does_not_support_folder`. Store only local diagnostics by default: provider ID, launch source, Windows error code, and timestamp. Do not log theme source/content or full paths unless the user opts into diagnostic export.

## Antigravity provider plan

1. Rename the current provider command from `antigravity` to a provider ID (`antigravity-ide`); provider IDs are not executables.
2. Detect `agy-ide` as a **secondary** shell-command candidate after asking the resolver to find it. It is the documented IDE command.
3. Detect a configured/registered Antigravity IDE executable as the preferred candidate; support its normal “path as one argument” behavior only after a one-time smoke test on a temporary harmless directory.
4. If neither is present, show “Antigravity IDE not detected” with **Locate IDE…**, **Open folder in Explorer**, and the official install/setup link. Do not show a launch success toast.
5. Keep `agy` distinct as “Antigravity CLI,” and only present it in an Advanced/terminal workflow if MPO intentionally supports a CLI command that opens or acts on the theme directory.

## Delivery plan

| Phase | Work | Acceptance criteria |
| --- | --- | --- |
| 0 — Correctness hotfix | Remove `cmd /C start`; stop forcing `.cmd`; change Antigravity command candidate to `agy-ide`; display spawn as “requested.” | A missing command returns a visible useful error; no false positive launch toast. |
| 1 — Provider foundation | Add models, persisted selected installation, direct executable launch, custom executable picker, Explorer fallback. | A portable IDE selected by the user opens a theme folder after app restart. |
| 2 — Discovery | Implement App Paths + PATH resolution, availability states, Refresh UI, dedupe. | Clean Windows account: only installed editors appear as ready; uninstall/moved app is reported stale. |
| 3 — Polished integrations | Start-menu shortcut resolver, product/version display, optional per-provider folder-open flags, Antigravity smoke test. | Antigravity works using either a detected executable or documented `agy-ide`; `agy` never masquerades as the IDE. |
| 4 — Hardening | Tests, diagnostics export, accessibility, localized errors. | All negative cases preserve the workspace and offer Explorer/custom-picker recovery. |

## Test matrix

- VS Code installed with and without its PATH option.
- Cursor/Windsurf/Antigravity installed under per-user and machine installers.
- Antigravity where only `agy-ide` is configured, and where only the IDE executable is found.
- No supported IDE installed; Explorer and Locate IDE remain usable.
- Portable executable selected from a nonstandard path; moved/deleted after selection.
- Workspace path with spaces, Unicode/Arabic characters, `&`, parentheses, and a long path.
- Access denied / policy-blocked executable, stale PATH shim, and executable that exits immediately.
- Multiple versions (stable/Insiders) and user chooses the preferred one.
- Theme ID path-traversal checks continue to prevent an arbitrary launch target.
- Regression: `open_theme_in_explorer`, external file-watcher refresh, and saved workspace roots still work.

## Files likely to change

- `beta/src-tauri/src/themes/mod.rs` — replace `ALLOWED_EDITORS` and `open_theme_in_ide` with provider discovery/validation/direct-launch commands.
- `beta/src-tauri/src/main.rs` — register the new commands.
- `beta/src/theme-sdk/themeStore.ts` — replace `KnownIde { cmd }` with native discovery results and persisted installation IDs.
- `beta/src/theme-sdk/ThemeCompilerMonitor.tsx` and `beta/src/theme-sdk/pages/MyThemesPage.tsx` — availability-aware picker, Locate/Refresh/Explorer recovery, and accurate status copy.
- New focused Rust unit tests for path/registry parsing and launch-spec validation; a manual Windows integration checklist for actual IDEs.

## Sources

- [Microsoft: Application Registration (App Paths and registered apps)](https://learn.microsoft.com/en-us/windows/win32/shell/app-registration)
- [Microsoft: How File Associations Work](https://learn.microsoft.com/en-us/windows/win32/shell/fa-how-work)
- [Rust `std::process::Command` documentation](https://doc.rust-lang.org/std/process/struct.Command.html)
- [Rust `std::process` Windows behavior](https://doc.rust-lang.org/std/process/)
- [Google Antigravity IDE getting started](https://antigravity.google/docs/ide-getting-started)
- [Google Antigravity IDE Codelab — IDE shell command setup](https://codelabs.developers.google.com/getting-started-agy-ide)

