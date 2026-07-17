# History Editor Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the global History view out of the cramped sidebar and into a full-width singleton editor panel, matching how request/folder editors already open — while keeping the feature fully working after every task via an incremental cutover.

**Architecture:** A new `HistoryEditorProvider` (mirroring `FolderEditorProvider`/`RequestEditorProvider`) opens one singleton `WebviewPanel` in the main editor area, backed by a new 4th Vite bundle (`src/webview/history/`) that reuses the already-shared `HistoryEntryList` component. The four history operations currently inlined in `SidebarProvider`'s message switch get extracted into public methods first, so both the (eventually removed) sidebar path and the new panel call the exact same logic — no duplication. The sidebar itself reverts to just the collection tree plus a small button that opens the new panel.

**Tech Stack:** TypeScript (strict), VS Code Extension API, React 18 (classic JSX runtime), Vite (existing `scripts/build.mts` pattern).

## Global Constraints

- Strict TypeScript — never add `@ts-nocheck`, `@ts-ignore`, or eslint-disable comments; fix root causes.
- No test suite/lint script in this repo — every task's verification is `npx tsc --noEmit` (run it yourself) plus a **manual verification** description for the developer (via `npm run watch` + Extension Development Host) — do not run `npm run build`/`npm run watch` yourself, and do not claim the manual step passed.
- `HistoryEntry.request.*` raw-vs-resolved correctness (established in the original history feature) is unaffected by this plan — none of these tasks touch `HistoryManager`, `HistoryEntry`, or the restore data shape.
- Each task must independently type-check. Where a symbol is removed and a caller updated, both edits happen in the SAME task (never leave a dangling reference for tsc to fail on between tasks).
- Spec: `docs/superpowers/specs/2026-07-16-history-editor-panel-design.md`.

---

### Task 1: Extract history operations onto `SidebarProvider` as public methods

**Files:**
- Modify: `src/providers/SidebarProvider.ts`

**Interfaces:**
- Produces: `SidebarProvider.getHistoryEntries(): HistoryEntry[]`, `SidebarProvider.deleteHistoryEntryById(entryId: string): Promise<void>`, `SidebarProvider.clearAllHistoryEntries(): Promise<boolean>` (returns whether the user confirmed and it actually cleared), `SidebarProvider.restoreHistoryEntryById(entryId: string): Promise<void>` — all consumed by Task 2's `HistoryEditorProvider`.
- This task is a pure behavior-preserving refactor: the sidebar's existing in-place History section (still present until Task 4) keeps working exactly as before, just by delegating to these new methods.

- [ ] **Step 1: Import `HistoryEntry`**

Change the type import near the top of `src/providers/SidebarProvider.ts` from:

```ts
import { AuthConfig } from "../webview/types/internal.types";
```

to:

```ts
import { AuthConfig, HistoryEntry } from "../webview/types/internal.types";
```

- [ ] **Step 2: Add the four public methods**

Add these methods to the `SidebarProvider` class, directly before the existing `public notifyHistoryChanged(): void { ... }` method:

```ts
  // ── History operations (shared by the sidebar's own messages and HistoryEditorProvider) ──

  public getHistoryEntries(): HistoryEntry[] {
    return this._historyManager.getAll();
  }

  public async deleteHistoryEntryById(entryId: string): Promise<void> {
    const entryBeingDeleted = this._historyManager
      .getAll()
      .find((e) => e.id === entryId);
    await this._historyManager.deleteEntry(entryId);
    if (entryBeingDeleted) {
      RequestEditorProvider.refreshPanelHistory(
        entryBeingDeleted.requestId,
        this._historyManager,
      );
    }
  }

  /** Returns true if the user confirmed and history was actually cleared. */
  public async clearAllHistoryEntries(): Promise<boolean> {
    const confirm = await vscode.window.showWarningMessage(
      "Clear all request history? This cannot be undone.",
      { modal: true },
      "Clear All",
    );
    if (confirm !== "Clear All") return false;

    const affectedRequestIds = [
      ...new Set(this._historyManager.getAll().map((e) => e.requestId)),
    ];
    await this._historyManager.clearAll();
    for (const requestId of affectedRequestIds) {
      RequestEditorProvider.refreshPanelHistory(requestId, this._historyManager);
    }
    return true;
  }

  public async restoreHistoryEntryById(entryId: string): Promise<void> {
    const entry = this._historyManager.getAll().find((e) => e.id === entryId);
    if (!entry) return;

    const folder = this._findFolder(entry.folderId);
    const requestExists = folder?.requests?.some(
      (r) => r.id === entry.requestId,
    );
    if (!requestExists) {
      vscode.window.showWarningMessage(
        `Cannot restore "${entry.requestName}" — the original request no longer exists.`,
      );
      return;
    }

    const existingConfig =
      this._context.globalState.get<any>(
        `restlab.request.${entry.requestId}`,
      ) || {};
    const restoredConfig = {
      ...existingConfig,
      method: entry.request.method,
      url: entry.request.url,
      headers: entry.request.headers,
      params: entry.request.params,
      body: entry.request.body,
      contentType: entry.request.contentType,
      formData: entry.request.formData,
      cookies: entry.request.cookies,
    };
    await this._context.globalState.update(
      `restlab.request.${entry.requestId}`,
      restoredConfig,
    );
    RequestEditorProvider.refreshPanelConfig(
      this._context,
      entry.requestId,
      entry.folderId,
      this,
      this._historyManager,
    );
    vscode.window.showInformationMessage(
      `Restored "${entry.requestName}" from history`,
    );
  }
```

- [ ] **Step 3: Rewrite the four existing switch cases to call the new methods**

Replace the entire `case "deleteHistoryEntry": { ... }`, `case "clearAllHistory": { ... }`, and `case "restoreHistoryEntry": { ... }` blocks (the `case "getHistory":` block is unchanged) with:

```ts
        case "getHistory":
          this._sendHistoryToWebview();
          break;
        case "deleteHistoryEntry":
          await this.deleteHistoryEntryById(message.entryId);
          this._sendHistoryToWebview();
          break;
        case "clearAllHistory": {
          const cleared = await this.clearAllHistoryEntries();
          if (cleared) {
            this._sendHistoryToWebview();
          }
          break;
        }
        case "restoreHistoryEntry":
          await this.restoreHistoryEntryById(message.entryId);
          break;
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification (developer runs this)**

Run `npm run watch`, launch the Extension Development Host. The sidebar's existing Collections/History toggle and in-place history list should work exactly as before this change (list, expand, restore, delete, clear all) — this task changes nothing observable, it only relocates the logic.

- [ ] **Step 6: Commit**

```bash
git add src/providers/SidebarProvider.ts
git commit -m "ref: extract history operations onto SidebarProvider as public methods"
```

---

### Task 2: `HistoryEditorProvider` + new `history` webview bundle

**Files:**
- Create: `src/providers/HistoryEditorProvider.ts`
- Create: `src/webview/history/index.tsx`
- Create: `src/webview/history/HistoryView.tsx`
- Create: `src/webview/history/styles.css`
- Modify: `scripts/build.mts`

**Interfaces:**
- Consumes: `SidebarProvider.getHistoryEntries()` / `.deleteHistoryEntryById()` / `.clearAllHistoryEntries()` / `.restoreHistoryEntryById()` (Task 1); the shared `HistoryEntryList` component from `src/webview/components/HistoryEntryList.tsx` (already exists).
- Produces: `HistoryEditorProvider.openHistoryPanel(context: vscode.ExtensionContext, sidebarProvider: SidebarProvider): void` and `HistoryEditorProvider.refreshIfOpen(sidebarProvider?: SidebarProvider): void` — both consumed by Task 3.

- [ ] **Step 1: Create the host provider**

```ts
import * as vscode from "vscode";
import { getNonce } from "../utils/getNonce";
import { SidebarProvider } from "./SidebarProvider";

export class HistoryEditorProvider {
  private static panel: vscode.WebviewPanel | undefined;

  /** Push a fresh historyUpdated payload to the History panel, if it's open. */
  public static refreshIfOpen(sidebarProvider?: SidebarProvider): void {
    if (!HistoryEditorProvider.panel || !sidebarProvider) return;
    HistoryEditorProvider.panel.webview.postMessage({
      type: "historyUpdated",
      entries: sidebarProvider.getHistoryEntries(),
    });
  }

  public static openHistoryPanel(
    context: vscode.ExtensionContext,
    sidebarProvider: SidebarProvider,
  ): void {
    if (HistoryEditorProvider.panel) {
      HistoryEditorProvider.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "restlab.historyEditor",
      "History",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [context.extensionUri],
      },
    );

    HistoryEditorProvider.panel = panel;

    panel.onDidDispose(() => {
      HistoryEditorProvider.panel = undefined;
    });

    panel.webview.html = HistoryEditorProvider._getHtmlForWebview(
      panel.webview,
      context,
    );

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
  }

  private static _getHtmlForWebview(
    webview: vscode.Webview,
    context: vscode.ExtensionContext,
  ): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, "dist", "history", "index.js"),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, "dist", "history", "index.css"),
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
        <link href="${styleUri}" rel="stylesheet">
        <title>History</title>
      </head>
      <body>
        <div id="root"></div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
  }
}
```

Save as `src/providers/HistoryEditorProvider.ts`.

- [ ] **Step 2: Create the bundle's root component**

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

  useEffect(() => {
    vscode.postMessage({ type: "getHistory" });

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === "historyUpdated") {
        setEntries(message.entries || []);
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

  return (
    <div className="history-page">
      <div className="history-page-header">
        <h1>Request History</h1>
        {entries.length > 0 && (
          <button className="add-btn" onClick={handleClearAll}>
            Clear All
          </button>
        )}
      </div>
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

Save as `src/webview/history/HistoryView.tsx`.

- [ ] **Step 3: Create the bundle entry point**

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { HistoryView } from "./HistoryView";

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<HistoryView />);
}
```

Save as `src/webview/history/index.tsx`.

- [ ] **Step 4: Create the bundle's stylesheet**

```css
/* ============================================================
   REST-Lab History Panel — Custom CSS
   ============================================================ */

/* ---- Reset ---- */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* ---- Base ---- */
body {
  font-family: var(
    --vscode-font-family,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    sans-serif
  );
  font-size: var(--vscode-font-size, 13px);
  color: var(--vscode-foreground);
  background-color: var(--vscode-editor-background);
  line-height: 1.45;
}

/* ---- Brand & VS Code tokens ---- */
:root {
  --restlab-gradient: linear-gradient(90deg, #38bdf8 0%, #6366f1 100%);
  --restlab-accent: #38bdf8;
  --restlab-accent-hover: #0ea5e9;
  --restlab-accent-subtle: rgba(56, 189, 248, 0.1);
  --restlab-danger: #ef4444;
  --restlab-danger-subtle: rgba(239, 68, 68, 0.1);
  --glass-bg: rgba(255, 255, 255, 0.03);
  --glass-border: rgba(255, 255, 255, 0.08);
  --method-get: #22c55e;
  --method-post: #3b82f6;
  --method-put: #f59e0b;
  --method-patch: #a855f7;
  --method-delete: #ef4444;
  --rl-sp1: 0.30em;
  --rl-sp2: 0.46em;
  --rl-sp3: 0.62em;
  --rl-sp4: 0.92em;
  --rl-sp5: 1.23em;
  --rl-ctrl: 2.35em;
  --rl-icon: 1.25em;
  --rl-r1: 0.35em;
  --rl-r2: 0.50em;
  --rl-r3: 0.65em;
}

/* ============================================================
   PAGE SHELL
   ============================================================ */
.history-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 960px;
  margin: 0 auto;
  padding: var(--rl-sp5);
  overflow: hidden;
}

.history-page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--rl-sp4);
  border-bottom: 1px solid var(--glass-border);
  margin-bottom: var(--rl-sp4);
  flex-shrink: 0;
}

.history-page-header h1 {
  font-size: 1.15em;
  font-weight: 800;
  background: var(--restlab-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.history-page-body {
  flex: 1;
  overflow-y: auto;
}

/* ============================================================
   METHOD BADGE
   ============================================================ */
.method-badge {
  flex-shrink: 0;
  font-size: 0.62em;
  font-weight: 800;
  padding: 0.32em 0.55em;
  border-radius: 0.5em;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border: 1px solid transparent;
  line-height: 1;
  min-width: 3.6em;
  text-align: center;
}
.method-get {
  color: var(--method-get);
  background: rgba(34, 197, 94, 0.14);
  border-color: rgba(34, 197, 94, 0.32);
}
.method-post {
  color: var(--method-post);
  background: rgba(59, 130, 246, 0.14);
  border-color: rgba(59, 130, 246, 0.32);
}
.method-put {
  color: var(--method-put);
  background: rgba(245, 158, 11, 0.14);
  border-color: rgba(245, 158, 11, 0.32);
}
.method-patch {
  color: var(--method-patch);
  background: rgba(168, 85, 247, 0.14);
  border-color: rgba(168, 85, 247, 0.32);
}
.method-delete {
  color: var(--method-delete);
  background: rgba(239, 68, 68, 0.14);
  border-color: rgba(239, 68, 68, 0.32);
}

/* ============================================================
   STATUS & RESPONSE BADGES
   ============================================================ */
.status-badge {
  padding: 0.18em 0.55em;
  border-radius: 1.4em;
  font-size: 0.7em;
  font-weight: 700;
  letter-spacing: 0.3px;
}
.status-success {
  background: linear-gradient(90deg, rgba(34, 197, 94, 0.2) 0%, rgba(74, 222, 128, 0.2) 100%);
  color: #22c55e;
}
.status-redirect {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%);
  color: #3b82f6;
}
.status-client-error {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(251, 191, 36, 0.2) 100%);
  color: #f59e0b;
}
.status-server-error {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(249, 115, 22, 0.2) 100%);
  color: #ef4444;
}
.status-error {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.time-badge {
  padding: 0.18em 0.55em;
  border-radius: 1.4em;
  font-size: 0.7em;
  font-weight: 600;
  background: var(--glass-bg);
  color: var(--vscode-foreground);
}

.empty-hint {
  color: var(--vscode-descriptionForeground);
  font-size: 12px;
  font-style: italic;
}

.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px dashed var(--vscode-panel-border);
  border-radius: 4px;
  background: transparent;
  color: var(--vscode-foreground);
  cursor: pointer;
}
.add-btn:hover {
  border-color: var(--restlab-accent);
  color: var(--restlab-accent);
}

.remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--rl-ctrl);
  height: var(--rl-ctrl);
  border: none;
  background: transparent;
  color: var(--vscode-descriptionForeground);
  border-radius: var(--rl-r2);
  cursor: pointer;
}
.remove-btn:hover {
  background: var(--restlab-danger-subtle);
  color: var(--restlab-danger);
}

.response-header-row {
  display: flex;
  padding: var(--rl-sp2) var(--rl-sp3);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 6px;
  font-size: 12px;
}
.response-header-row .header-name {
  font-weight: 700;
  min-width: 11em;
  background: var(--restlab-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.response-header-row .header-value {
  flex: 1;
  font-family: "SF Mono", "Fira Code", "Consolas", monospace;
  word-break: break-all;
  opacity: 0.9;
}

.response-headers {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: auto;
  flex: 1;
  min-height: 0;
}

/* ============================================================
   HISTORY
   ============================================================ */
.history-list {
  display: flex;
  flex-direction: column;
  gap: var(--rl-sp2);
}

.history-entry {
  border: 1px solid var(--glass-border);
  border-radius: var(--rl-r2);
  background: var(--glass-bg);
  overflow: hidden;
}

.history-entry-row {
  display: flex;
  align-items: center;
  gap: var(--rl-sp3);
  padding: var(--rl-sp3);
  cursor: pointer;
}
.history-entry-row:hover {
  background: rgba(56, 189, 248, 0.05);
}

.history-request-name {
  font-weight: 600;
  font-size: 12px;
}

.history-url {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: "SF Mono", "Fira Code", "Consolas", monospace;
  font-size: 12px;
  opacity: 0.85;
}

.history-timestamp {
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  white-space: nowrap;
}

.history-entry-details {
  border-top: 1px solid var(--glass-border);
  padding: var(--rl-sp3);
  display: flex;
  flex-direction: column;
  gap: var(--rl-sp3);
}

.history-detail-section h4 {
  margin: 0 0 var(--rl-sp2) 0;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.7;
}

.history-detail-line {
  font-size: 12px;
  margin: 0 0 var(--rl-sp2) 0;
  word-break: break-all;
}

.history-body {
  margin: var(--rl-sp2) 0 0 0;
  padding: var(--rl-sp3);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--rl-r2);
  font-family: "SF Mono", "Fira Code", "Consolas", monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 240px;
  overflow: auto;
}

.history-entry-actions {
  display: flex;
  align-items: center;
  gap: var(--rl-sp2);
}
```

Save as `src/webview/history/styles.css`.

- [ ] **Step 5: Add the 4th parallel Vite build**

In `scripts/build.mts`, change:

```ts
  await Promise.all([
    build(createWebviewConfig("sidebar")),
    build(createWebviewConfig("editor")),
    build(createWebviewConfig("request")),
  ]);
```

to:

```ts
  await Promise.all([
    build(createWebviewConfig("sidebar")),
    build(createWebviewConfig("editor")),
    build(createWebviewConfig("request")),
    build(createWebviewConfig("history")),
  ]);
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (`HistoryEditorProvider` is not yet called from anywhere — that's Task 3 — so this compiles standalone.)

- [ ] **Step 7: Manual verification (developer runs this)**

Nothing is wired to open this panel yet (Task 3 registers the command) — this step is compile-only. Note in your report that functional verification is deferred to Task 3.

- [ ] **Step 8: Commit**

```bash
git add src/providers/HistoryEditorProvider.ts src/webview/history/ scripts/build.mts
git commit -m "feat: add HistoryEditorProvider and a new history webview bundle"
```

---

### Task 3: Wire the `restlab.openHistory` command and switch history-change notifications to the new panel

**Files:**
- Modify: `src/extension.ts`
- Modify: `src/providers/RequestEditorProvider.ts`
- Modify: `src/providers/SidebarProvider.ts`

**Interfaces:**
- Consumes: `HistoryEditorProvider.openHistoryPanel`/`.refreshIfOpen` (Task 2).
- Produces: command `restlab.openHistory`, registered but not yet triggered by any UI (Task 4 adds the sidebar button). `SidebarProvider.notifyHistoryChanged()` is removed — nothing outside this file called it except the three sites being updated in the same commit.

- [ ] **Step 1: Register the command in `extension.ts`**

Add an import:

```ts
import { HistoryEditorProvider } from "./providers/HistoryEditorProvider";
```

Add a new command registration, directly after the existing `restlab.openRequest` registration:

```ts
  // Register command to open the global history panel
  context.subscriptions.push(
    vscode.commands.registerCommand("restlab.openHistory", () => {
      HistoryEditorProvider.openHistoryPanel(context, sidebarProvider);
    }),
  );
```

- [ ] **Step 2: Swap `RequestEditorProvider`'s notification calls**

Add an import to `src/providers/RequestEditorProvider.ts`:

```ts
import { HistoryEditorProvider } from "./HistoryEditorProvider";
```

Replace all three occurrences of:

```ts
            sidebarProvider?.notifyHistoryChanged();
```

(inside the `sendRequest` case's `recordHistory` closure) and:

```ts
          sidebarProvider?.notifyHistoryChanged();
```

(inside the `deleteHistoryEntry` case, and inside the `clearRequestHistory` case)

with, respectively:

```ts
            HistoryEditorProvider.refreshIfOpen(sidebarProvider);
```

and (the two per-panel cases):

```ts
          HistoryEditorProvider.refreshIfOpen(sidebarProvider);
```

(Same replacement text in all three places — only the surrounding indentation differs, matching each call site's existing indentation exactly.)

- [ ] **Step 3: Remove the now-unused `notifyHistoryChanged` from `SidebarProvider`**

Remove this method entirely from `src/providers/SidebarProvider.ts` (its only callers were the three sites just updated in Step 2):

```ts
  public notifyHistoryChanged(): void {
    this._sendHistoryToWebview();
  }

```

Leave `_sendHistoryToWebview` (private) in place — it's still called by this file's own `getHistory`/`deleteHistoryEntry`/`clearAllHistory` switch cases until Task 4 removes those cases.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification (developer runs this)**

Run `npm run watch`, launch the Extension Development Host. The sidebar's existing in-place History section should still work exactly as before (unaffected by this task). There's no visible way to open the new panel yet (no button — Task 4 adds it), but you can confirm the command exists via the Command Palette: run "Preferences: Open Keyboard Shortcuts" or just trust `tsc`; there's no user-facing surface for `restlab.openHistory` until Task 4. Skip to Task 4 for the first visibly testable result.

- [ ] **Step 6: Commit**

```bash
git add src/extension.ts src/providers/RequestEditorProvider.ts src/providers/SidebarProvider.ts
git commit -m "feat: wire restlab.openHistory command and notify the History panel on changes"
```

---

### Task 4: Cut the sidebar over to a History button, remove the in-place list

**Files:**
- Modify: `src/webview/sidebar/Sidebar.tsx`
- Modify: `src/providers/SidebarProvider.ts`
- Modify: `src/webview/sidebar/sidebar.css`
- Delete: `src/webview/sidebar/HistoryPanel.tsx`

**Interfaces:**
- Consumes: the `restlab.openHistory` command (Task 3).
- Produces: nothing new — this is the final cutover; after this task, the sidebar's message switch no longer handles `getHistory`/`deleteHistoryEntry`/`clearAllHistory`/`restoreHistoryEntry` at all (only `HistoryEditorProvider` does, via the methods from Task 1).

- [ ] **Step 1: Remove the in-place history cases from `SidebarProvider`, add `openHistory`**

Replace the entire block (from `case "getHistory":` through the end of the `case "restoreHistoryEntry":` case) in `src/providers/SidebarProvider.ts`'s message switch:

```ts
        case "getHistory":
          this._sendHistoryToWebview();
          break;
        case "deleteHistoryEntry":
          await this.deleteHistoryEntryById(message.entryId);
          this._sendHistoryToWebview();
          break;
        case "clearAllHistory": {
          const cleared = await this.clearAllHistoryEntries();
          if (cleared) {
            this._sendHistoryToWebview();
          }
          break;
        }
        case "restoreHistoryEntry":
          await this.restoreHistoryEntryById(message.entryId);
          break;
```

with:

```ts
        case "openHistory":
          vscode.commands.executeCommand("restlab.openHistory");
          break;
```

Then remove the now-fully-unused private method:

```ts
  private _sendHistoryToWebview() {
    if (this._view) {
      this._view.webview.postMessage({
        type: "historyUpdated",
        entries: this._historyManager.getAll(),
      });
    }
  }

```

(Keep `getHistoryEntries`/`deleteHistoryEntryById`/`clearAllHistoryEntries`/`restoreHistoryEntryById` from Task 1 — those are still used by `HistoryEditorProvider`.)

- [ ] **Step 2: Revert `Sidebar.tsx` to tree-only, add the History button**

Remove the `activeView` state:

```ts
  const [activeView, setActiveView] = useState<"collections" | "history">(
    "collections",
  );
```

Remove the `handleClearAllHistory` handler:

```ts
  const handleClearAllHistory = () => {
    vscode.postMessage({ type: "clearAllHistory" });
  };
```

Add a new handler in its place:

```ts
  const handleOpenHistory = () => {
    vscode.postMessage({ type: "openHistory" });
  };
```

Remove the `HistoryPanel` import:

```ts
import HistoryPanel from "./HistoryPanel";
```

Keep the `HistoryIcon` import — it's reused below.

Replace the returned JSX's header block:

```tsx
        <div className="sb-view-toggle">
          <button
            className={`sb-view-btn ${activeView === "collections" ? "active" : ""}`}
            onClick={() => setActiveView("collections")}
            title="Collections"
          >
            <CollectionIcon />
            <span>Collections</span>
          </button>
          <button
            className={`sb-view-btn ${activeView === "history" ? "active" : ""}`}
            onClick={() => setActiveView("history")}
            title="History"
          >
            <HistoryIcon />
            <span>History</span>
          </button>
        </div>
        <div className="sb-head-actions">
          {activeView === "collections" ? (
            <>
              <button
                className="btn-primary"
                onClick={handleCreateFolder}
                title="Create Collection"
              >
                <CollectionAddIcon />
                <span>New Collection</span>
              </button>
              <ImportDropdown onSelect={handleImportCollection} />
            </>
          ) : (
            <button
              className="btn-primary"
              onClick={handleClearAllHistory}
              title="Clear All History"
            >
              <span>Clear All</span>
            </button>
          )}
        </div>
```

with:

```tsx
        <div className="sb-head-actions">
          <button
            className="btn-primary"
            onClick={handleCreateFolder}
            title="Create Collection"
          >
            <CollectionAddIcon />
            <span>New Collection</span>
          </button>
          <ImportDropdown onSelect={handleImportCollection} />
          <Tooltip text="View Request History" position="bottom">
            <button className="header-action-btn" onClick={handleOpenHistory}>
              <HistoryIcon />
            </button>
          </Tooltip>
        </div>
```

Then replace the body's tree/history conditional:

```tsx
      {activeView === "collections" ? (
        <div
          className={`sb-tree${isDragging ? " root-drop-zone" : ""}`}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes(DRAG_TYPE_FOLDER)) {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }
          }}
          onDrop={handleDropOnRoot}
        >
```

...(everything through the matching closing tags)...

```tsx
        </div>
      ) : (
        <HistoryPanel />
      )}
    </div>
  );
};
```

with the tree rendered unconditionally (drop the ternary, keep the tree's own JSX exactly as-is):

```tsx
      <div
        className={`sb-tree${isDragging ? " root-drop-zone" : ""}`}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes(DRAG_TYPE_FOLDER)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }
        }}
        onDrop={handleDropOnRoot}
      >
```

...(everything through the matching closing tags, unchanged)...

```tsx
      </div>
    </div>
  );
};
```

`Tooltip` is already imported at the top of this file (used elsewhere) — no new import needed for it.

- [ ] **Step 3: Delete the now-unused sidebar `HistoryPanel.tsx`**

```bash
rm src/webview/sidebar/HistoryPanel.tsx
```

- [ ] **Step 4: Strip the now-dead history/toggle CSS from `sidebar.css`**

`src/webview/sidebar/sidebar.css` is currently 813 lines. Everything from the `/* STATUS & RESPONSE BADGES (ported from request editor) */` comment (line 581) through the end of the file (line 813) exists solely to support the sidebar's in-place history list and toggle, both removed in Steps 1–3 — confirm via `grep -rn "remove-btn\|add-btn\|response-header-row\|status-badge\|time-badge\|history-\|sb-view-\|sb-history" src/webview/sidebar/*.tsx` that no `.tsx` file in this bundle references any of these classes anymore, then truncate the file to its first 580 lines:

```bash
head -n 580 src/webview/sidebar/sidebar.css > /tmp/sidebar.css.trimmed
mv /tmp/sidebar.css.trimmed src/webview/sidebar/sidebar.css
```

Verify the file now ends cleanly (no trailing dangling rule) by checking the last few lines:

```bash
tail -n 15 src/webview/sidebar/sidebar.css
```

Expected: the `@keyframes sbTooltipFadeIn { ... }` block, with nothing after it.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual verification (developer runs this)**

Run `npm run watch`, launch the Extension Development Host. Confirm:
- The sidebar shows only the collection tree — no Collections/History toggle.
- A small History icon button sits next to New Collection/Import, same height as both.
- Clicking it opens a full-width "History" tab in the main editor area (or refocuses it if already open) listing every request ever sent, newest first, with the same expand/Restore/Delete/Clear-All behavior as before.
- Sending a request from any open request editor updates the History panel's list live if it's open.
- Restoring/deleting/clearing from the History panel correctly updates the affected request's own per-request History tab if that request's panel is also open.
- Opening the History panel a second time (via the button) reveals the same tab rather than creating a duplicate.

- [ ] **Step 7: Commit**

```bash
git add src/webview/sidebar/Sidebar.tsx src/providers/SidebarProvider.ts src/webview/sidebar/sidebar.css
git rm src/webview/sidebar/HistoryPanel.tsx
git commit -m "feat: replace in-sidebar history list with a button that opens the History panel"
```

---

## Self-Review Notes

- **Spec coverage:** singleton editor-panel provider (Task 2), new 4th bundle + build wiring (Task 2), shared-method extraction to avoid duplicating restore/delete/clear logic (Task 1), command registration + live-refresh notification swap (Task 3), sidebar cutover to button + tree-only (Task 4), dead-CSS cleanup (Task 4) — all covered.
- **Placeholder scan:** no TBD/TODO; every step shows exact code.
- **Type consistency:** `HistoryEditorProvider.openHistoryPanel`/`.refreshIfOpen`, `SidebarProvider.getHistoryEntries`/`.deleteHistoryEntryById`/`.clearAllHistoryEntries`/`.restoreHistoryEntryById` are spelled identically everywhere they're produced and consumed.
- **Incremental testability:** Tasks 1–3 keep the existing in-sidebar history UI fully functional throughout (pure refactor + additive-only), so the feature never regresses mid-rollout; Task 4 is the single cutover point, and it's also the first point the new panel becomes visible — matching how the original 8-task plan sequenced per-request-tab-first, global-view-second.
