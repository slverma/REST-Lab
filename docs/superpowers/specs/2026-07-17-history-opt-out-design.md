# History Enable/Disable Toggle Design

**Date:** 2026-07-17
**Branch:** feat/request-history
**Status:** Approved

## Goal

Let users pause request-history recording without leaving the extension. Turning it off stops new entries from being recorded; it never deletes what's already there (Clear All remains the separate, explicit way to do that).

## Storage

`HistoryManager` (`src/providers/HistoryManager.ts`) gains a second `globalState` key, `ENABLED_KEY = "restlab.history.enabled"`, alongside the existing `restlab.history` entries key:

- `public isEnabled(): boolean` — `this.context.globalState.get<boolean>(ENABLED_KEY, true)` (on by default — this is an opt-out, not opt-in).
- `public async setEnabled(enabled: boolean): Promise<void>` — writes the flag.
- `addEntry(...)` gains an early guard: if `!this.isEnabled()`, return `null` immediately without touching storage. Its return type changes from `Promise<HistoryEntry>` to `Promise<HistoryEntry | null>`. Its only caller (`RequestEditorProvider`'s `recordHistory`) already discards the return value, so no caller-side change is needed — the entire "should we record" decision is encapsulated inside `HistoryManager`, invisible to every caller.

This is deliberately NOT a check callers make themselves (e.g. `RequestEditorProvider` asking "is history enabled?" before calling `addEntry`) — `HistoryManager` is the single owner of both the entries store and the enabled flag, so it's the only place that needs to know about the relationship between them.

## Surface

A toggle switch in the History panel's header (`src/webview/history/HistoryView.tsx`), next to Clear All. No toggle is added to the per-request History tab — the flag is global, and the user chose to keep the control in one place (the global panel).

**Wire format:** every existing `historyUpdated` message (`{type, entries}`) gains an `enabled: boolean` field, so the panel's toggle state is always in sync with the same push/pull messages it already uses for entries — no extra round-trip message type for reading state. A new message, `setHistoryEnabled` (`{type: "setHistoryEnabled", enabled: boolean}`), is the only new wire message, sent webview → host when the user flips the switch.

**Host wiring:**
- `SidebarProvider` gains two thin wrapper methods, matching the existing delegation pattern (`getHistoryEntries` etc.): `isHistoryEnabled(): boolean` and `async setHistoryEnabled(enabled: boolean): Promise<void>`, both wrapping the same-named `HistoryManager` methods.
- `HistoryEditorProvider`'s message switch gains a `setHistoryEnabled` case, and every existing `historyUpdated` post (there are 4 in the switch, plus `refreshIfOpen`) includes `enabled: sidebarProvider.isHistoryEnabled()` alongside `entries`. Since this field is now added to every post, factor the payload construction into one small private helper inside `HistoryEditorProvider` to avoid repeating `{ type: "historyUpdated", entries: ..., enabled: ... }` five times.

**Webview UI:** `HistoryView.tsx` gains `enabled` state (from the `historyUpdated` message), a toggle control in `.history-page-header`, and — when `enabled` is `false` — a small inline note in `.history-page-body` ("Recording is paused — new requests won't be added to history") so it's clear why the list has stopped growing, without needing to check the toggle's visual state to understand why.

## What Is Not Changed

- Entry pruning/truncation/restore logic in `HistoryManager` — untouched.
- The per-request History tab (`HistoryTab.tsx`) — no toggle added there; it still shows whatever entries exist, growing only while recording is enabled.
- Clear All — still a fully separate, explicit action; the toggle never triggers it.
