# MPO-pro backend: detection and streaming roadmap

> Beta 5.1.0 implements loopback binding, browser-origin restrictions, serialized configuration writes with error reporting, reconnect cleanup/backoff, preference for the current playing Windows session, and a basic health endpoint. The remaining recommendations below are future work; see README for limitations.

This report describes proposed backend work. The `demo-new` folder is a frontend copy; none of the changes below are implemented by that demo. The existing Windows/Tauri backend remains in the parent project.

## Current baseline

- `src-tauri/src/media/gsmtc.rs` enumerates Windows Global System Media Transport Controls (GSMTC) sessions, applies app rules, selects the first allowed playing session, then an allowed fallback. It polls and broadcasts media state; artwork and timeline are read from the selected session.
- `src-tauri/src/server/router.rs` serves state, artwork, controls, layers, source rules, and a WebSocket on port 4848. A new socket receives a snapshot before updates. The server currently binds to `0.0.0.0` and allows any CORS origin and methods. This is significant because endpoints include playback control and configuration writes.
- `src/hooks/useMediaState.ts` connects to the socket, fetches an initial snapshot, and falls back to HTTP polling. The repository also contains a separate Python media server; its protocol and lifecycle should not be assumed interchangeable with the Rust server.
- Windows media sessions are metadata supplied by applications, not audio recognition. A player that does not publish a usable session cannot reliably be identified by GSMTC alone. Browser sessions may identify the browser rather than the site; the backend should report that limitation honestly.

## Product goals

1. A solo user opens the app, starts music, sees the right source and can place an unobtrusive desktop HUD.
2. A streamer selects a stable source, previews the exact output, and adds a browser source to supported broadcast software without exposing control endpoints to the network.
3. Missing metadata, a paused source, disconnection, and a genuinely empty session are distinguishable. No stale track should be silently presented as live.

## Detection architecture

Introduce a single `SourceRegistry` with adapters producing normalized session records. Start with GSMTC; add optional adapters only where a documented, authorized API and an identifiable user need exist. Each record should include a stable adapter/session ID, application identity, title, artist, album, artwork reference, playback state, timeline anchor, capabilities, observed time, and freshness/error state. Keep the raw app identity alongside a display name. Never invent track metadata from the process name.

Use GSMTC session-added/removed, current-session, media-properties, playback, and timeline notifications where supported. Subscribe and unsubscribe with session lifetime; debounce bursts and perform bounded periodic reconciliation to recover missed events. Treat event callbacks as signals to fetch fresh state, not as guaranteed complete snapshots. Keep the existing polling fallback with adaptive intervals and backoff; do not block event handling on slow artwork reads. Re-create the manager after failures or session-service restarts, and isolate errors per session.

Replace enumeration-order selection with a transparent policy: explicit pinned session first; otherwise allowed playing sessions ranked by recent actual playback activity, then current Windows session and user priority. Apply a short hysteresis window before automatic switching to avoid jumping between a game video and music. Respect explicit exclusions in every fallback. If a pinned session disappears, expose `source_missing` and let the user choose whether auto fallback is allowed. List all candidates and the reason for selection in diagnostics. Distinguish two sessions from the same browser or app where identifiers permit it; if they cannot be reliably distinguished, say so.

Handle metadata as independently changing fields: distinguish unknown duration from zero, clamp invalid positions, use a monotonic timeline anchor for interpolation, and re-anchor on seek, pause, resume, or rate change. Mark stale data with age and a defined expiry. Fetch and cache artwork asynchronously with size limits, content validation and cancellation; key it by content/version, not only track title. Clear old artwork on source changes and never let a late response overwrite the current source.

Optional future adapters could use player-provided local APIs or browser extensions with explicit consent. Avoid process scraping, window-title parsing, or audio fingerprinting as silent defaults: they are brittle or privacy-sensitive and can return misleading results. Any recognition feature needs a separate opt-in, clear audio handling and retention policy, and its own accuracy evaluation.

## Delivery for desktop and streaming

Create one authoritative local state service shared by the Tauri window and browser feeds. Use a versioned envelope such as `{version, type, sequence, server_time, payload}` for snapshots and updates. Clients should apply only newer sequences, request a snapshot after reconnect or a missed sequence, use exponential backoff with jitter, and show connection and data freshness separately. A bounded latest-state channel is preferable to an unbounded queue; a slow viewer can discard intermediate states and resync. Fix lifecycle cleanup so closing a component cannot schedule an orphaned reconnect.

For desktop, retain a dedicated lightweight window and user-selectable game behavior. Measure frame timing and CPU/GPU cost across fullscreen and borderless games rather than claiming zero impact. Respect motion and transparency preferences and allow a static mode. Persist placement per display and recover safely when a monitor disappears.

For OBS, provide a guided browser-source setup: copy a local read-only feed URL, show recommended dimensions and transparency, preview with sample data, and display connection health. Offer distinct horizontal and vertical layouts, with an explicit layer identifier. Verify browser-source refresh/reconnect and shutdown behavior in supported OBS versions. OBS integration can work through a browser source; optional OBS WebSocket scene automation should be a separately authorized integration with scoped credentials, never a requirement for displaying a feed.

For TikTok LIVE Studio and other broadcast apps, provide the same browser-source URL only where the installed version supports browser sources. Test the actual target versions, transparency, local network access, dimensions, refresh and reconnection. If browser sources are unavailable, offer a documented window-capture fallback and explain its transparency and performance limitations. Avoid promising direct TikTok account or live-chat integration without a supported API, permissions and product review. Platform music licensing remains the creator's responsibility; displaying metadata does not grant music rights.

## Security and privacy: first priority

Change the server default to loopback (`127.0.0.1` and, if deliberately supported, `::1`). Network exposure should be explicit, off by default, and accompanied by a clear address and firewall guidance. Restrict CORS and validate WebSocket `Origin`; CORS alone is not authentication. Separate read-only feed routes from mutation/control routes. Require a random, revocable per-install credential for writes and playback controls, validate requests and content types, limit payload sizes, and prevent a webpage from invoking privileged actions through localhost. Avoid putting privileged tokens in browser-source URLs or logs. For optional LAN access, use authentication and TLS or a secure tunnel, with a documented threat model. Rotate credentials and provide a one-click revoke.

Keep media data on-device by default. Do not log song titles, artwork, app identities, feed URLs or tokens by default. Provide opt-in redacted diagnostics with a preview and retention limit. Rate-limit controls, bound artwork and WebSocket resources, and validate layer imports and CSS according to their trust boundary.

## Suggested API and operational model

- `GET /api/v1/health`: service version, uptime, adapter status and last successful observation; no track details.
- `GET /api/v1/sources`: normalized candidates, freshness, capabilities and selection reason; protect any sensitive detail as appropriate.
- `GET /api/v1/state` and `GET /api/v1/events`: read-only snapshot and sequenced event stream for local feeds.
- Authenticated mutation endpoints for source preference, layers and playback control; validate capabilities and return structured errors.
- Expose explicit states: connecting, ready, no session, source missing, stale, permission denied, unsupported and error. Distinguish transport health from source health.

Version and document the protocol and migrate existing clients with a compatibility period. Make configuration writes atomic and schema-versioned; back up before migration. Surface port conflicts and startup failures in the UI instead of silently failing. Support predictable shutdown and automatic recovery without losing settings.

## Validation and rollout

1. **Foundation:** loopback, access controls, origin validation, limits and startup errors. Test hostile origins, unauthenticated writes, port conflicts and reconnects before expanding integrations.
2. **Reliable detection:** registry, event subscriptions, deterministic selection and diagnostics. Test multiple simultaneous playing/paused sessions, excluded sources, pinned source disappearance, browser tabs, sleep/resume, player crashes, seeks, missing artwork, and service restart. Add deterministic unit tests for ranking, hysteresis and stale-state transitions.
3. **Streaming experience:** read-only versioned feeds, guided setup and recovery. Run end-to-end tests in actual supported OBS and TikTok LIVE Studio versions; record version, dimensions, transparency, latency and failure behavior. Test simultaneous desktop, OBS and vertical feeds.
4. **Performance and accessibility:** profile idle, playback, rapid track changes and gameplay on representative hardware. Track p50/p95 detection-to-render latency, CPU, memory, frame-time changes, reconnect time, incorrect source switches and stale-track duration. Establish budgets from measured baselines, then regress against them.
5. **Optional integrations:** add only after the core is stable; document permissions, capability limits, opt-in and removal path for each adapter.

Use synthetic fixtures for automated tests and a reproducible manual matrix for real players. A successful release should clearly report unsupported or absent metadata rather than substituting a plausible but wrong track.
