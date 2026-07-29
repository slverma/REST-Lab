# History Response Viewer & Restore UX Design

**Date:** 2026-07-29
**Branch:** feat/history-response-viewer
**Status:** Approved

## Goal

Fix three related UX problems in the History section (both the standalone History editor panel and the per-request History tab, which share `HistoryEntryList.tsx`):

1. The saved response body area is too small (`<pre>` capped at `max-height: 240px`) and has no Body/Headers/Cookies tabs, unlike the live Response panel.
2. History entries have no Copy / Download / Open-in-Editor actions for the response, unlike the live Response panel.
3. The "Restore" button has no explanation of what it does and no confirmation, even though it silently overwrites the request's saved form state with no undo.

## Architecture

### New component: `src/webview/components/HistoryResponseViewer.tsx`

Replaces the response `<pre>` block in `HistoryEntryList.tsx` (current lines ~98-115) for a single `HistoryEntry`. Mirrors `ResponsePanel.tsx`'s pattern, scoped to that entry's already-persisted `response: ResponseData`:

- Local `tab` state: `"body" | "headers" | "cookies"`.
- Tab bar identical in structure to `ResponsePanel.tsx:137-169` (Body, Headers with count badge, Cookies with count badge — only rendered if `response.cookies?.length`).
- Body tab renders a read-only Monaco `BodyEditor` (replacing the `<pre>`), sized to fill available space instead of the current 240px cap — same `getEditorLanguageFromContentType`/`formatJson` helpers already used elsewhere for language detection and pretty-printing.
- Headers/Cookies tabs reuse the existing `.response-headers` / `.response-header-row` row markup already used both in `ResponsePanel.tsx` and in the current History detail view.
- Action toolbar (`.response-actions`): Copy, Download, Open in Editor — same three buttons, same `Tooltip` wrapping, same message shapes (`showInfo`, `downloadResponse`, `openResponseInEditor`) as `ResponsePanel.tsx:170-214`. Content/extension/mimeType derivation reuses `getFileExtension`/`getEditorLanguageFromContentType` against `entry.response.headers`, mirroring `getResponseContent`/`getResponseFileInfo` in `ResponsePanel.tsx:44-60` but reading from the entry's data instead of live context state.
- If `entry.truncated`, the existing "Some content was truncated for storage." hint is kept, and rendered adjacent to the action toolbar (not just above the Request section) so it's visible without scrolling up. Buttons remain enabled — the entry's stored data is still valid, just possibly incomplete.

The Request section of `HistoryEntryList.tsx` (method/URL/headers/body) is unchanged — out of scope per the original complaint, which was specifically about the response body.

### `HistoryEntryList.tsx` changes

- Add a required prop `vscode: { postMessage: (message: unknown) => void }` (same minimal shape already used by `EnvironmentModal.tsx`), needed by `HistoryResponseViewer` for Copy/Download/Open-in-Editor and by the new confirm dialog flow below.
- Replace the response `<pre>` block with `<HistoryResponseViewer entry={entry} vscode={vscode} />`.
- Restore button:
  - Wrap in `<Tooltip text="Restore this request's saved method, URL, headers, params, and body into the editor — overwrites current values" position="top-right">`.
  - `onClick` no longer calls `onRestore` directly; it sets local state (`confirmRestoreId`) to open a `ConfirmDialog` instead.
  - On confirm, calls `onRestore(entry.id)` and closes the dialog; on cancel, just closes it.

### New component: `src/webview/components/ConfirmDialog.tsx`

Generic, reusable confirm modal — not History-specific — since VS Code webviews can't use the native `window.confirm()`. Props: `title: string`, `message: string`, `confirmLabel?: string` (default "Confirm"), `cancelLabel?: string` (default "Cancel"), `danger?: boolean` (styles the confirm button as destructive), `onConfirm: () => void`, `onCancel: () => void`. Renders a fixed-position overlay + centered panel, following the existing custom-CSS (non-Tailwind) convention used throughout `request/`, `history/`, and the shared `components/` directory (`EnvironmentModal.tsx`'s Tailwind styling is specific to the sidebar bundle and not reused here).

For the Restore flow specifically: title "Restore this request?", message naming what will be overwritten (method/URL/headers/params/body) and that it can't be undone, `danger` styling, confirm label "Restore".

### Callers: `HistoryView.tsx` and `HistoryTab.tsx`

- `HistoryView.tsx`: pass the module-level `vscode` (already `acquireVsCodeApi()`'d there) down as the new `vscode` prop to `HistoryEntryList`.
- `HistoryTab.tsx`: pull `vscode` from `useRequestContext()` (already exposed there per `ResponsePanel.tsx:33`) and pass it down the same way.

## Backend / Message Wiring

- `RequestEditorProvider.ts` already handles `downloadResponse` / `openResponseInEditor` (lines 420-464) and `showInfo` (line 417-419) — the request-panel History tab reuses these unchanged since it shares that panel's message channel.
- `HistoryEditorProvider.ts` (the standalone History panel) has no such handlers today. Rather than duplicating the ~45 lines of `vscode.window.showSaveDialog` / `vscode.workspace.fs.writeFile` / `vscode.workspace.openTextDocument` logic into a second provider, extract it into a shared helper module:
  - **New file `src/utils/responseFileActions.ts`** exporting `handleDownloadResponse(message: { content: string; filename: string }): Promise<void>` and `handleOpenResponseInEditor(message: { content: string; extension?: string; mimeType?: string }): Promise<void>`, containing the exact logic currently inline in `RequestEditorProvider.ts:420-464`.
  - `RequestEditorProvider.ts`'s `downloadResponse`/`openResponseInEditor` cases call these helpers instead of inlining the logic (behavior unchanged).
  - `HistoryEditorProvider.ts` adds three new cases to its `onDidReceiveMessage` switch: `showInfo` (→ `vscode.window.showInformationMessage`), `downloadResponse` (→ `handleDownloadResponse`), `openResponseInEditor` (→ `handleOpenResponseInEditor`).

## Data Model

No changes. `HistoryEntry.response` (`src/webview/types/internal.types.ts:106-125`) already carries the full `ResponseData` shape (`status`, `statusText`, `headers`, `data`, `size`, `time`, `cookies`) that `ResponsePanel` consumes, and `entry.truncated` already exists and is reused as-is.

## CSS

- Remove the `240px` cap on `.history-body` (`history/styles.css:328`) — no longer used once the Body tab moves to `BodyEditor`.
- Add response-viewer sizing rules (min-height, scroll behavior) modeled on `.response-content`/`.response-editor` in `request/styles.css`, added to both `history/styles.css` (standalone panel) and `request/styles.css` (History tab reuses the same component inside that bundle, and each Vite bundle ships its own CSS independently).
- Add `.confirm-dialog-overlay` / `.confirm-dialog` styles to whichever stylesheet is shared by both bundles that mount `ConfirmDialog` (`history/styles.css` and `request/styles.css`, mirroring the existing pattern of some shared component classes being duplicated per bundle, e.g. `.history-*`/`.status-badge`).

## Component Size

`HistoryEntryList.tsx` (currently 148 lines) stays small by delegating to `HistoryResponseViewer.tsx` and `ConfirmDialog.tsx` rather than growing inline, consistent with the CLAUDE.md 500-line guideline. `HistoryEditorProvider.ts` (currently 121 lines) stays small by delegating file-action logic to `responseFileActions.ts` rather than inlining it.

## What Is Not Changed

- `HistoryManager`, `SidebarProvider.restoreHistoryEntryById` (the actual overwrite logic) — unaffected; only the UI trigger path gains a confirmation step.
- The Request section of the history detail view — stays as plain text, not tabbed.
- Any persistence/truncation behavior for how much response data is saved to history.

## Testing

No test suite in this repo. Verification: `npx tsc --noEmit`, plus manual testing in both surfaces (standalone History panel and the request editor's History tab):

- Expand an entry, confirm Body/Headers/Cookies tabs render and the body area is no longer cramped.
- Copy, Download, and Open in Editor all work and match the live Response panel's behavior.
- A truncated entry shows the warning near the actions and buttons remain usable.
- Clicking Restore opens the confirmation dialog with a clear explanation; Cancel does nothing; Confirm performs the restore exactly as before.
