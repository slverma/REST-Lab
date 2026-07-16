# Global History as an Editor Panel Design

**Date:** 2026-07-16
**Branch:** feat/request-history
**Status:** Approved

## Goal

Replace the in-sidebar global History section (added earlier on this same branch) with a full-width editor-panel view, matching how request/folder editors already open. The sidebar is too narrow to comfortably show method/URL/status/headers/body for a list of history entries — moving it to the main editor area gives it the same real estate a request tab has.

## What Changes vs. the Original Design

The original design (`2026-07-16-request-history-design.md`) put global history in a sidebar section with a Collections/History toggle. That shipped, but the in-sidebar list "is not perfect" (cramped). This design supersedes only the *global* history surface — the per-request History tab inside the request editor is unaffected and stays exactly as it is.

## Architecture

- **New provider:** `src/providers/HistoryEditorProvider.ts`, following the same shape as `FolderEditorProvider`/`RequestEditorProvider`:
  - `static openHistoryPanel(context, historyManager, sidebarProvider)` — creates a singleton `vscode.WebviewPanel` in `ViewColumn.One` if none is open, or reveals the existing one (a single module-level `panel: vscode.WebviewPanel | undefined`, not a `Map` — there's only ever one global history, unlike per-request panels).
  - `static refreshIfOpen(historyManager)` — pushes a fresh `historyUpdated` message to the panel if it's currently open. This replaces `SidebarProvider.notifyHistoryChanged()`, which is removed.
  - Its `onDidReceiveMessage` handles `getHistory`, `deleteHistoryEntry`, `clearAllHistory`, `restoreHistoryEntry` — the same four message types the sidebar used to handle — by delegating to new public methods on `SidebarProvider` (see below), so the restore/existence-check logic exists in exactly one place.

- **`SidebarProvider.ts` refactor:** extract the four history operations currently inlined in its message switch into public methods, unchanged in behavior:
  - `getHistoryEntries(): HistoryEntry[]`
  - `async deleteHistoryEntryById(entryId: string): Promise<void>` — keeps looking up the entry's `requestId` before deleting, then calling `RequestEditorProvider.refreshPanelHistory(requestId, historyManager)` for that request's open panel, exactly as the current sidebar case does.
  - `async clearAllHistoryEntries(): Promise<void>` — keeps the modal confirmation (`vscode.window.showWarningMessage`) inside this method, since it's host-side and works identically regardless of which webview triggered it; keeps computing the affected `requestId`s before clearing and calling `RequestEditorProvider.refreshPanelHistory` for each afterward.
  - `async restoreHistoryEntryById(entryId: string): Promise<void>` — keeps the existence check, the "no longer exists" warning, the direct `globalState` write, and the call to `RequestEditorProvider.refreshPanelConfig` for an open request panel.
  - Remove `notifyHistoryChanged()` and `_sendHistoryToWebview()` — no longer needed once the sidebar stops displaying history.
  - Remove the `getHistory`/`deleteHistoryEntry`/`clearAllHistory`/`restoreHistoryEntry` cases from the sidebar's own message switch; add one new case, `openHistory`, which calls `vscode.commands.executeCommand("restlab.openHistory")`.
  - `RequestEditorProvider`'s `recordHistory` (in the `sendRequest` case) and the extracted methods above call `HistoryEditorProvider.refreshIfOpen(historyManager)` directly, instead of `sidebarProvider?.notifyHistoryChanged()`.

- **`extension.ts`:** register `restlab.openHistory` → `HistoryEditorProvider.openHistoryPanel(context, historyManager, sidebarProvider)`. Not added to `package.json`'s command palette contributions — same as `restlab.openRequest`/`restlab.openFolderConfig`, it's triggered only from the sidebar button, not the command palette.

- **`Sidebar.tsx` / `HistoryPanel.tsx`:**
  - Remove `activeView` state, the `.sb-view-toggle` toggle, the tree/HistoryPanel ternary, and the `HistoryPanel` import — the sidebar body goes back to always showing the collection tree.
  - Remove `handleClearAllHistory` (moves into the new bundle).
  - Add a small, always-visible History icon button in `.sb-head-actions` (next to New Collection / Import), posting `{ type: "openHistory" }`.
  - Delete `src/webview/sidebar/HistoryPanel.tsx` — its logic moves into the new bundle's root component.

- **New webview bundle `src/webview/history/`:**
  - `index.tsx` — bundle entry; calls `acquireVsCodeApi()` once (a separate webview panel gets its own separate API instance, so this is unrelated to — and doesn't conflict with — the sidebar's or request editor's own single call).
  - `HistoryView.tsx` — root component: a header (title + "Clear All" button) and a body rendering the shared `HistoryEntryList` (`showRequestName`). On mount, posts `getHistory`; listens for `historyUpdated`; wires Restore/Delete/Clear to `restoreHistoryEntry`/`deleteHistoryEntry`/`clearAllHistory` messages — same message shapes the old `HistoryPanel.tsx` already used.
  - `styles.css` — this bundle's own stylesheet (each Vite-built webview bundle ships its own CSS, per the existing three-bundle pattern), containing the design-token variables plus the `.history-*`/`.status-badge`/`.method-badge`/etc. classes already written twice (once in `request/styles.css`, once in `sidebar/sidebar.css`) — a third copy here, plus new layout rules for a full-page header/toolbar.

- **`scripts/build.mts`:** add a 4th parallel Vite build for the `history` bundle, following the exact pattern already used for `sidebar`/`editor`/`request`.

- **`RequestEditorProvider.ts`:** the `sidebarProvider?.notifyHistoryChanged()` call inside `recordHistory` is replaced with `HistoryEditorProvider.refreshIfOpen(historyManager)`. No signature changes needed elsewhere in this file.

## Data Model / Storage

No changes. `HistoryManager`, the `restlab.history` `globalState` key, and the `HistoryEntry` shape are all unchanged — this is purely a UI-surface relocation plus the DRY refactor it requires.

## What Is Not Changed

- The per-request History tab in the request editor (`HistoryTab.tsx`, `RequestContext.tsx` history state/handlers) — unaffected.
- `HistoryManager`'s pruning/truncation/storage behavior — unaffected.
- The raw-vs-resolved restore correctness property — unaffected; `restoreHistoryEntryById` keeps writing the same raw fields it always did.

## User Experience

- Sidebar: collection tree only, with a small History button in the header actions row.
- Clicking it opens (or refocuses) a full-width "History" tab in the main editor area, showing every request ever sent, newest first, with the same expand/Restore/Delete/Clear-All interactions as before — just with room to breathe.
