# Request History Design

**Date:** 2026-07-16
**Branch:** feat/request-history (to be created)
**Status:** Approved

## Goal

Let users see and reuse past HTTP requests they've sent — both scoped to a single saved request ("did this endpoint 500 last time I hit it?") and across the whole workspace ("what did I send in the last hour?"). Closes the "Request history" item on the `CHANGELOG.md` Future Roadmap.

## Scope

- Per-request history: a new **History** tab in the request editor, alongside Body/Params/Headers/Auth/Cookies, showing only runs of that specific saved request.
- Global history: a new **History** section in the sidebar (a toggle alongside the existing collection tree) listing every request sent across the whole workspace, newest first.
- Both views share the same underlying store — global history is not a separate cap, it's an unfiltered view over the same list, filtered by `requestId` for the per-request tab.
- Out of scope: configurable retention (no settings UI — caps are constants), a "re-send directly from history" action (restore-then-send covers that), history for FolderEditor or bulk/collection-runner requests (there is no such feature yet).

## Data Model & Storage

New type in `src/webview/types/internal.types.ts`:

```ts
export interface HistoryEntry {
  id: string;
  requestId: string;
  requestName: string;   // snapshot of the name at send time, in case later renamed/deleted
  folderId: string;
  timestamp: number;
  request: {
    method: string;
    url: string;                  // fully resolved URL actually sent, post-interpolation
    headers: Header[];            // interpolated headers actually sent
    body?: string;
    formData?: FormDataItem[];    // file entries kept as { key, fileName } only; fileData stripped
    cookies?: Cookie[];
  };
  response: ResponseData;         // reuses existing type: status, statusText, headers, data, time, size, cookies
  truncated?: boolean;            // true if request.body or response.data was capped before storing
}
```

Stored under a new `globalState` key, `restlab.history`, as `HistoryEntry[]`, newest-first.

### `HistoryManager` (`src/providers/HistoryManager.ts`)

A plain class wrapping `context.globalState`, with no webview of its own:

- `MAX_PER_REQUEST = 20`, `MAX_GLOBAL = 200`, `MAX_BODY_BYTES = 200_000` (constants, not user-configurable).
- `addEntry(input: Omit<HistoryEntry, 'id' | 'timestamp' | 'truncated'>): Promise<HistoryEntry>`
  - Assigns `id` (nonce-based) and `timestamp` (`Date.now()`).
  - Truncates `request.body` and `response.data` independently if either exceeds `MAX_BODY_BYTES`, setting `truncated: true` and appending a marker so the UI can show "response truncated for storage".
  - Prepends to the list, then prunes: first drop the oldest entries sharing this `requestId` beyond `MAX_PER_REQUEST`, then drop the oldest entries overall beyond `MAX_GLOBAL`.
  - Persists via `globalState.update` and returns the stored entry.
- `getAll(): HistoryEntry[]`
- `getForRequest(requestId: string): HistoryEntry[]`
- `deleteEntry(entryId: string): Promise<void>`
- `clearForRequest(requestId: string): Promise<void>`
- `clearAll(): Promise<void>`

## Extension Host Wiring

- `extension.ts` creates one `HistoryManager` instance in `activate()`, passed to `SidebarProvider` (constructor) and to every `RequestEditorProvider.openRequestEditor(...)` call (new required parameter).
- `RequestEditorProvider`'s `sendRequest` handler: after producing `response` (both the success path and the existing catch-block error-response path), call `historyManager.addEntry(...)` with the method/url/headers/body/cookies that were actually sent (i.e. the same values already used to build the axios config) plus the response. Then:
  - `panel.webview.postMessage({ type: 'historyUpdated', entries: historyManager.getForRequest(requestId) })` so that panel's History tab updates live.
  - `sidebarProvider.notifyHistoryChanged()` — pushes `historyManager.getAll()` to the sidebar webview if it is currently resolved/visible.
- New per-panel messages handled in `RequestEditorProvider`:
  - `getRequestHistory` → replies `historyUpdated` with `getForRequest(requestId)`.
  - `restoreHistoryEntry` (`entryId`) → looks up the entry, merges its `request.*` fields into the in-memory `RequestConfig`, saves via `globalState.update`, and replies with a `configLoaded`-shaped refresh so the form updates; the client marks the config unsaved (no auto-send).
  - `deleteHistoryEntry` (`entryId`) → `historyManager.deleteEntry`, replies with refreshed `historyUpdated`.
  - `clearRequestHistory` → `historyManager.clearForRequest(requestId)`, replies with refreshed (empty) `historyUpdated`.
- New messages handled in `SidebarProvider` for the global view:
  - `getHistory` → replies `historyUpdated` with `historyManager.getAll()`.
  - `deleteHistoryEntry` (`entryId`) → deletes, re-pushes `historyUpdated`.
  - `clearAllHistory` → `historyManager.clearAll()`, re-pushes `historyUpdated`.
  - `restoreHistoryEntry` (`entryId`) → checks whether `requestId` still exists in the folder tree. If yes, writes the merged config to `restlab.request.<requestId>` and, if that request's panel is currently open, calls a new `RequestEditorProvider.refreshPanelConfig(requestId)` static method (looks up the single matching panel in `openPanels` and posts a `configLoaded`-shaped refresh to it only — unlike `broadcastToAllPanels`, this never touches unrelated panels). If the request no longer exists, shows `vscode.window.showWarningMessage(...)` instead of restoring.

## Webview UI

### Shared list rendering

A new `HistoryEntryList.tsx` component (used by both the per-request tab and the global panel) renders entries newest-first as expandable rows:

- Collapsed row: method badge, status badge (colored green/yellow/red by 2xx/4xx/5xx, gray for the `status: 0` network-error case), response time, size, relative timestamp. The global variant also shows the request name.
- Expanded row: full read-only request (method, URL, headers, body) and response (status line, headers, body). Bodies are rendered as plain `<pre>` text, JSON-pretty-printed via the existing `formatJson` helper when the content type is JSON — no Monaco instance per row, to keep a 200-row list cheap.
- Row actions: **Restore** and **Delete**.

### Per-request History tab

- `ActiveTab` in `RequestContext.tsx` gains `"history"`.
- `RequestEditor.tsx` gets a new tab button next to Cookies, with a count badge (`historyEntries.length`).
- `RequestContext` gains `historyEntries: HistoryEntry[]` state: populated from the `configLoaded` payload (host includes `getForRequest(requestId)` alongside the config) and refreshed on `historyUpdated` push messages.
- New `HistoryTab.tsx` renders `HistoryEntryList` scoped to the current request, plus a "Clear history for this request" button that posts `clearRequestHistory`.
- Restore/Delete post `restoreHistoryEntry` / `deleteHistoryEntry` directly to this panel's own message handler.

### Global History (sidebar)

- `Sidebar.tsx` gains a small "Collections / History" toggle at the top of `sb-head`. Switching to History swaps the tree body for a new `HistoryPanel.tsx` and swaps the header actions (New Collection / Import) for a **Clear All** button (confirms via `vscode.window.showWarningMessage` Yes/No on the host side before clearing).
- `HistoryPanel.tsx` posts `getHistory` on mount, listens for `historyUpdated`, and renders `HistoryEntryList` unscoped (all requests). Restore/Delete post to the sidebar's message handler.

### Restore semantics

Restoring writes the historic `method`/`url`/`headers`/`body`/`formData`/`cookies` into the live `RequestConfig` and marks it unsaved (`isSaved: false`) — the user must hit Save to persist, matching how every other in-place edit in the editor already behaves. Restore never auto-sends.

## Edge Cases

- **Request deleted after being sent**: history entries persist (they carry their own `requestName`/`folderId` snapshot). The per-request History tab simply won't exist anymore for a deleted request; those entries remain visible and restorable-if-recreated-elsewhere only through the global view, where Restore is disabled with a warning since there's no live request to write into.
- **Network-failure sends** (DNS/timeout/refused): `RequestEditorProvider`'s existing catch-block already builds a `{status: 0, statusText: "Error", ...}` response object — these are recorded like any other entry so failed attempts show up in history too.
- **Large bodies**: capped at `MAX_BODY_BYTES` per field with a `truncated` flag surfaced in the UI, so a handful of huge responses can't blow up `globalState`.
- **Sidebar not visible when a send happens**: `notifyHistoryChanged()` is a no-op if the webview view isn't currently resolved; the global list is re-fetched via `getHistory` next time the sidebar (or its History section) becomes visible, following the existing `foldersUpdated` pattern.

## What Is Not Changed

- `FolderEditorProvider` — untouched.
- Existing `saveConfig`/`getConfig` flows — untouched; history is purely additive.
- Import/export flows — untouched; history is not included in collection export.

## CHANGELOG

On completion, mark `- [ ] Request history` as `- [x] Request history` in the Future Roadmap section (per this repo's `CHANGELOG.md` convention), and add a new release entry describing the feature.
