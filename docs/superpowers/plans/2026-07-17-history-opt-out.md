# History Opt-Out Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users pause request-history recording from a toggle in the History panel, without deleting anything already recorded.

**Architecture:** `HistoryManager` owns a second `globalState` flag (`restlab.history.enabled`, default `true`) and gates `addEntry` on it internally — no caller needs to know the flag exists. `SidebarProvider` exposes thin wrapper methods matching its existing delegation pattern. `HistoryEditorProvider` piggybacks the flag onto every existing `historyUpdated` push (via one new shared payload helper) and adds one new incoming message, `setHistoryEnabled`. The History panel's webview gets a checkbox toggle plus a "paused" hint when recording is off.

**Tech Stack:** TypeScript (strict), VS Code Extension API, React 18.

## Global Constraints

- Strict TypeScript — never `@ts-nocheck`, `@ts-ignore`, eslint-disable.
- No test suite/lint script in this repo — verification is `npx tsc --noEmit` (run it yourself) plus a manual step for the developer (do not run `npm run build`/`npm run watch` yourself).
- Turning the toggle off must never delete existing entries — only `addEntry` is gated; `deleteEntry`/`clearForRequest`/`clearAll` are untouched and still callable regardless of the flag.
- Spec: `docs/superpowers/specs/2026-07-17-history-opt-out-design.md`.

---

### Task 1: Enabled flag on `HistoryManager`, wrapper methods on `SidebarProvider`

**Files:**
- Modify: `src/providers/HistoryManager.ts`
- Modify: `src/providers/SidebarProvider.ts`

**Interfaces:**
- Produces: `HistoryManager.isEnabled(): boolean`, `HistoryManager.setEnabled(enabled: boolean): Promise<void>`, `HistoryManager.addEntry(...): Promise<HistoryEntry | null>` (return type changed from non-nullable — its only caller, `RequestEditorProvider`'s `recordHistory`, already discards the return value, so this is a safe signature widening). `SidebarProvider.isHistoryEnabled(): boolean`, `SidebarProvider.setHistoryEnabled(enabled: boolean): Promise<void>` — both consumed by Task 2's `HistoryEditorProvider`.

- [ ] **Step 1: Add the enabled-flag storage key and methods to `HistoryManager`**

Change the constants block at the top of `src/providers/HistoryManager.ts` from:

```ts
const STORAGE_KEY = "restlab.history";
const MAX_PER_REQUEST = 20;
```

to:

```ts
const STORAGE_KEY = "restlab.history";
const ENABLED_KEY = "restlab.history.enabled";
const MAX_PER_REQUEST = 20;
```

Add two new public methods, directly after the constructor:

```ts
  public isEnabled(): boolean {
    return this.context.globalState.get<boolean>(ENABLED_KEY, true);
  }

  public async setEnabled(enabled: boolean): Promise<void> {
    await this.context.globalState.update(ENABLED_KEY, enabled);
  }
```

- [ ] **Step 2: Gate `addEntry` on the flag**

Change the `addEntry` signature and add an early return. From:

```ts
  public async addEntry(
    input: Omit<HistoryEntry, "id" | "timestamp" | "truncated">,
  ): Promise<HistoryEntry> {
    const bodyResult = truncateIfNeeded(input.request.body);
```

to:

```ts
  public async addEntry(
    input: Omit<HistoryEntry, "id" | "timestamp" | "truncated">,
  ): Promise<HistoryEntry | null> {
    if (!this.isEnabled()) return null;

    const bodyResult = truncateIfNeeded(input.request.body);
```

- [ ] **Step 3: Add wrapper methods to `SidebarProvider`**

In `src/providers/SidebarProvider.ts`, add two methods directly after the existing `getHistoryEntries()` method:

```ts
  public isHistoryEnabled(): boolean {
    return this._historyManager.isEnabled();
  }

  public async setHistoryEnabled(enabled: boolean): Promise<void> {
    await this._historyManager.setEnabled(enabled);
  }
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Write and run a disposable verification script**

No test framework exists in this repo — verify with a throwaway `tsx` script, deleted afterward and never committed.

Create `verify-history-enabled.ts` at the repository root:

```ts
import { HistoryManager } from "./src/providers/HistoryManager";

class FakeMemento {
  private store = new Map<string, unknown>();
  get<T>(key: string, defaultValue?: T): T {
    return (this.store.has(key) ? this.store.get(key) : defaultValue) as T;
  }
  async update(key: string, value: unknown): Promise<void> {
    this.store.set(key, value);
  }
}

async function main() {
  const context = { globalState: new FakeMemento() } as any;
  const manager = new HistoryManager(context);

  console.log("default enabled:", manager.isEnabled(), "expected true");
  if (manager.isEnabled() !== true) throw new Error("FAIL: default should be enabled");

  const entryInput = {
    requestId: "r1",
    requestName: "Test",
    folderId: "f1",
    request: { method: "GET", url: "/x", resolvedUrl: "https://example.com/x", headers: [], params: [] },
    response: { status: 200, statusText: "OK", headers: {}, data: "{}", time: 5, size: 2 },
  };

  const entry1 = await manager.addEntry(entryInput);
  console.log("entry recorded while enabled:", entry1 !== null, "expected true");
  if (entry1 === null) throw new Error("FAIL: addEntry should record while enabled");
  if (manager.getAll().length !== 1) throw new Error("FAIL: expected 1 stored entry");

  await manager.setEnabled(false);
  console.log("isEnabled after disable:", manager.isEnabled(), "expected false");
  if (manager.isEnabled() !== false) throw new Error("FAIL: setEnabled(false) should persist");

  const entry2 = await manager.addEntry(entryInput);
  console.log("entry recorded while disabled:", entry2, "expected null");
  if (entry2 !== null) throw new Error("FAIL: addEntry should no-op while disabled");
  if (manager.getAll().length !== 1) throw new Error("FAIL: disabled addEntry must not add a second entry");

  await manager.deleteEntry(manager.getAll()[0].id);
  console.log("delete still works while disabled, count:", manager.getAll().length, "expected 0");
  if (manager.getAll().length !== 0) throw new Error("FAIL: deleteEntry must work regardless of the flag");

  console.log("ALL CHECKS PASSED");
}

main();
```

Run: `npx tsx verify-history-enabled.ts`
Expected output ends with `ALL CHECKS PASSED` and no thrown error.

- [ ] **Step 6: Delete the disposable script**

```bash
rm verify-history-enabled.ts
```

- [ ] **Step 7: Commit**

```bash
git add src/providers/HistoryManager.ts src/providers/SidebarProvider.ts
git commit -m "feat: add a globalState-backed enable/disable flag for request history"
```

---

### Task 2: Surface the toggle in the History panel

**Files:**
- Modify: `src/providers/HistoryEditorProvider.ts`
- Modify: `src/webview/history/HistoryView.tsx`
- Modify: `src/webview/history/styles.css`

**Interfaces:**
- Consumes: `SidebarProvider.isHistoryEnabled()`/`.setHistoryEnabled()` (Task 1).
- Produces: every `historyUpdated` message now carries `{ type: "historyUpdated", entries: HistoryEntry[], enabled: boolean }`; a new incoming message `{ type: "setHistoryEnabled", enabled: boolean }`.

- [ ] **Step 1: Add a shared payload helper and the `setHistoryEnabled` case to `HistoryEditorProvider`**

Replace the entire `refreshIfOpen` method:

```ts
  /** Push a fresh historyUpdated payload to the History panel, if it's open. */
  public static refreshIfOpen(sidebarProvider?: SidebarProvider): void {
    if (!HistoryEditorProvider.panel || !sidebarProvider) return;
    HistoryEditorProvider.panel.webview.postMessage({
      type: "historyUpdated",
      entries: sidebarProvider.getHistoryEntries(),
    });
  }
```

with:

```ts
  /** Push a fresh historyUpdated payload to the History panel, if it's open. */
  public static refreshIfOpen(sidebarProvider?: SidebarProvider): void {
    if (!HistoryEditorProvider.panel || !sidebarProvider) return;
    HistoryEditorProvider.panel.webview.postMessage(
      HistoryEditorProvider._buildHistoryPayload(sidebarProvider),
    );
  }

  private static _buildHistoryPayload(sidebarProvider: SidebarProvider) {
    return {
      type: "historyUpdated",
      entries: sidebarProvider.getHistoryEntries(),
      enabled: sidebarProvider.isHistoryEnabled(),
    };
  }
```

Then replace the entire `onDidReceiveMessage` switch body:

```ts
    panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case "getHistory":
          panel.webview.postMessage({
            type: "historyUpdated",
            entries: sidebarProvider.getHistoryEntries(),
          });
          break;
        case "deleteHistoryEntry":
          await sidebarProvider.deleteHistoryEntryById(message.entryId);
          panel.webview.postMessage({
            type: "historyUpdated",
            entries: sidebarProvider.getHistoryEntries(),
          });
          break;
        case "clearAllHistory": {
          const cleared = await sidebarProvider.clearAllHistoryEntries();
          if (cleared) {
            panel.webview.postMessage({
              type: "historyUpdated",
              entries: sidebarProvider.getHistoryEntries(),
            });
          }
          break;
        }
        case "restoreHistoryEntry":
          await sidebarProvider.restoreHistoryEntryById(message.entryId);
          panel.webview.postMessage({
            type: "historyUpdated",
            entries: sidebarProvider.getHistoryEntries(),
          });
          break;
      }
    });
```

with:

```ts
    panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case "getHistory":
          panel.webview.postMessage(
            HistoryEditorProvider._buildHistoryPayload(sidebarProvider),
          );
          break;
        case "deleteHistoryEntry":
          await sidebarProvider.deleteHistoryEntryById(message.entryId);
          panel.webview.postMessage(
            HistoryEditorProvider._buildHistoryPayload(sidebarProvider),
          );
          break;
        case "clearAllHistory": {
          const cleared = await sidebarProvider.clearAllHistoryEntries();
          if (cleared) {
            panel.webview.postMessage(
              HistoryEditorProvider._buildHistoryPayload(sidebarProvider),
            );
          }
          break;
        }
        case "restoreHistoryEntry":
          await sidebarProvider.restoreHistoryEntryById(message.entryId);
          panel.webview.postMessage(
            HistoryEditorProvider._buildHistoryPayload(sidebarProvider),
          );
          break;
        case "setHistoryEnabled":
          await sidebarProvider.setHistoryEnabled(message.enabled);
          panel.webview.postMessage(
            HistoryEditorProvider._buildHistoryPayload(sidebarProvider),
          );
          break;
      }
    });
```

- [ ] **Step 2: Add `enabled` state and the toggle to `HistoryView.tsx`**

Replace the entire file:

```tsx
import React, { useEffect, useState } from "react";
import HistoryEntryList from "../components/HistoryEntryList";
import { HistoryEntry } from "../types/internal.types";

declare function acquireVsCodeApi(): {
  postMessage: (message: unknown) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
};

const vscode = acquireVsCodeApi();

export const HistoryView: React.FC = () => {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    vscode.postMessage({ type: "getHistory" });

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === "historyUpdated") {
        setEntries(message.entries || []);
        setEnabled(message.enabled ?? true);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleRestore = (entryId: string) => {
    vscode.postMessage({ type: "restoreHistoryEntry", entryId });
  };

  const handleDelete = (entryId: string) => {
    vscode.postMessage({ type: "deleteHistoryEntry", entryId });
  };

  const handleClearAll = () => {
    vscode.postMessage({ type: "clearAllHistory" });
  };

  const handleToggleEnabled = () => {
    const next = !enabled;
    setEnabled(next);
    vscode.postMessage({ type: "setHistoryEnabled", enabled: next });
  };

  return (
    <div className="history-page">
      <div className="history-page-header">
        <h1>Request History</h1>
        <div className="history-page-header-actions">
          <label className="history-toggle">
            <input
              type="checkbox"
              checked={enabled}
              onChange={handleToggleEnabled}
            />
            <span>Record new requests</span>
          </label>
          {entries.length > 0 && (
            <button className="add-btn" onClick={handleClearAll}>
              Clear All
            </button>
          )}
        </div>
      </div>
      {!enabled && (
        <p className="empty-hint history-paused-hint">
          Recording is paused — new requests won't be added to history.
        </p>
      )}
      <div className="history-page-body">
        <HistoryEntryList
          entries={entries}
          showRequestName
          onRestore={handleRestore}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Add CSS for the header actions group and the toggle**

Append to `src/webview/history/styles.css`:

```css
.history-page-header-actions {
  display: flex;
  align-items: center;
  gap: var(--rl-sp4);
}

.history-toggle {
  display: flex;
  align-items: center;
  gap: var(--rl-sp2);
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  cursor: pointer;
  user-select: none;
}

.history-toggle input[type="checkbox"] {
  accent-color: var(--restlab-accent);
  cursor: pointer;
}

.history-paused-hint {
  margin-bottom: var(--rl-sp3);
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification (developer runs this)**

Run `npm run watch`, launch the Extension Development Host, open the History panel. Confirm:
- The "Record new requests" checkbox is checked by default.
- Sending a request from any request editor still adds a new entry while checked.
- Unchecking it shows the "Recording is paused" hint; sending another request afterward does NOT add a new entry to the list (existing entries stay).
- Re-checking it makes new sends start appearing again.
- Close and reopen the History panel (or restart the Extension Development Host) — the checkbox stays in whatever state you last left it (persisted via `globalState`).
- Clear All and individual Delete/Restore still work regardless of the toggle's state.

- [ ] **Step 6: Commit**

```bash
git add src/providers/HistoryEditorProvider.ts src/webview/history/HistoryView.tsx src/webview/history/styles.css
git commit -m "feat: add a toggle in the History panel to pause/resume request recording"
```

---

## Self-Review Notes

- **Spec coverage:** flag storage + `addEntry` gate (Task 1), wrapper methods (Task 1), payload helper + new message + UI toggle + paused hint (Task 2) — all covered.
- **Placeholder scan:** no TBD/TODO; every step shows exact code.
- **Type consistency:** `isEnabled`/`setEnabled`/`isHistoryEnabled`/`setHistoryEnabled`/`_buildHistoryPayload`/`setHistoryEnabled` message type are spelled identically everywhere produced and consumed.
