# Request History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users view, restore, and delete past sends of an HTTP request, both scoped to a single saved request (a new History tab in the request editor) and across the whole workspace (a new History section in the sidebar).

**Architecture:** A new `HistoryManager` class owns a single `globalState` array (`restlab.history`) of `HistoryEntry` records, capped per-request and globally. `RequestEditorProvider` records one entry every time a request is sent (success or network failure) and serves per-request reads/writes to its own webview panel. `SidebarProvider` serves the unfiltered global list to the sidebar webview and handles restoring into requests that may not have an open panel. Both webviews render history through one shared React component, `HistoryEntryList`.

**Tech Stack:** TypeScript (strict), VS Code Extension API, React 18 (classic JSX runtime), esbuild-based `tsx` for disposable verification scripts (no test framework exists in this repo).

## Global Constraints

- Strict TypeScript — never add `@ts-nocheck`, `@ts-ignore`, or eslint-disable comments; fix root causes.
- This repo has **no test suite and no lint script**. Every task's own verification step is `npx tsc --noEmit` (run it yourself) plus a **manual verification** description (for the developer to run via `npm run watch` + the Extension Development Host — do not run `npm run build` or `npm run watch` yourself, and do not claim the manual step passed).
- Keep components under 500 lines; extract a sub-component rather than growing an existing file past that.
- `HistoryEntry.request.*` fields must stay **raw/pre-interpolation** (as configured, relative to the folder's `baseUrl`, may contain `{{variables}}`) — never the fully-resolved values used to execute the HTTP call. Only `resolvedUrl` carries the resolved value, for display only. This is load-bearing for Restore correctness (see spec's "Why raw, not resolved" note).
- Constants (not user-configurable): `MAX_PER_REQUEST = 20`, `MAX_GLOBAL = 200`, `MAX_BODY_BYTES = 200_000`.
- Spec: `docs/superpowers/specs/2026-07-16-request-history-design.md`.

---

### Task 1: History data model & relative-time helper

**Files:**
- Modify: `src/webview/types/internal.types.ts`
- Modify: `src/webview/helpers/helper.ts`

**Interfaces:**
- Produces: `HistoryEntry` interface (consumed by every later task), `formatRelativeTime(timestamp: number): string` helper (consumed by `HistoryEntryList` in Task 4).

- [ ] **Step 1: Add the `HistoryEntry` interface**

Open `src/webview/types/internal.types.ts` and insert this new interface directly after the existing `ResponseData` interface (after line 104, before `RequestEditorProps`):

```ts
export interface HistoryEntry {
  id: string;
  requestId: string;
  requestName: string;
  folderId: string;
  timestamp: number;
  request: {
    method: string;
    url: string;
    resolvedUrl: string;
    headers: Header[];
    params: Header[];
    body?: string;
    contentType?: string;
    formData?: FormDataItem[];
    cookies?: Cookie[];
  };
  response: ResponseData;
  truncated?: boolean;
}
```

- [ ] **Step 2: Add the relative-time helper**

Open `src/webview/helpers/helper.ts` and append this function at the end of the file:

```ts
// Format a timestamp as a short relative-time string (e.g. "5m ago")
export const formatRelativeTime = (timestamp: number): string => {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 5) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(timestamp).toLocaleDateString();
};
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors (the new interface and function are unused so far — this project's `tsconfig.json` has no `noUnusedLocals`/`noUnusedParameters`, so that alone does not error).

- [ ] **Step 4: Commit**

```bash
git add src/webview/types/internal.types.ts src/webview/helpers/helper.ts
git commit -m "feat: add HistoryEntry type and relative-time helper"
```

---

### Task 2: `HistoryManager` data layer

**Files:**
- Create: `src/providers/HistoryManager.ts`

**Interfaces:**
- Consumes: `HistoryEntry` from `src/webview/types/internal.types.ts` (Task 1).
- Produces: `class HistoryManager` with `constructor(context: vscode.ExtensionContext)` and methods `getAll(): HistoryEntry[]`, `getForRequest(requestId: string): HistoryEntry[]`, `addEntry(input: Omit<HistoryEntry, "id" | "timestamp" | "truncated">): Promise<HistoryEntry>`, `deleteEntry(entryId: string): Promise<void>`, `clearForRequest(requestId: string): Promise<void>`, `clearAll(): Promise<void>` — all consumed by Task 3, 6.

- [ ] **Step 1: Create `HistoryManager.ts`**

```ts
import type * as vscode from "vscode";
import { HistoryEntry } from "../webview/types/internal.types";

const STORAGE_KEY = "restlab.history";
const MAX_PER_REQUEST = 20;
const MAX_GLOBAL = 200;
const MAX_BODY_BYTES = 200_000;

function truncateIfNeeded(value: string | undefined): {
  value: string | undefined;
  truncated: boolean;
} {
  if (!value) return { value, truncated: false };
  const byteLength = Buffer.byteLength(value, "utf8");
  if (byteLength <= MAX_BODY_BYTES) return { value, truncated: false };
  const sliced = value.slice(0, MAX_BODY_BYTES);
  return {
    value: `${sliced}\n...[truncated for storage, original size ${byteLength} bytes]`,
    truncated: true,
  };
}

export class HistoryManager {
  constructor(private readonly context: vscode.ExtensionContext) {}

  private _getAll(): HistoryEntry[] {
    return this.context.globalState.get<HistoryEntry[]>(STORAGE_KEY, []);
  }

  private async _setAll(entries: HistoryEntry[]): Promise<void> {
    await this.context.globalState.update(STORAGE_KEY, entries);
  }

  public getAll(): HistoryEntry[] {
    return this._getAll();
  }

  public getForRequest(requestId: string): HistoryEntry[] {
    return this._getAll().filter((e) => e.requestId === requestId);
  }

  public async addEntry(
    input: Omit<HistoryEntry, "id" | "timestamp" | "truncated">,
  ): Promise<HistoryEntry> {
    const bodyResult = truncateIfNeeded(input.request.body);
    const responseDataResult = truncateIfNeeded(input.response.data);

    const entry: HistoryEntry = {
      ...input,
      id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      request: { ...input.request, body: bodyResult.value },
      response: { ...input.response, data: responseDataResult.value ?? "" },
      truncated: bodyResult.truncated || responseDataResult.truncated,
    };

    let entries = [entry, ...this._getAll()];

    // Cap entries for this specific request first (newest-first order preserved)
    let keptForRequest = 0;
    entries = entries.filter((e) => {
      if (e.requestId !== entry.requestId) return true;
      keptForRequest += 1;
      return keptForRequest <= MAX_PER_REQUEST;
    });

    // Then cap the global list
    if (entries.length > MAX_GLOBAL) {
      entries = entries.slice(0, MAX_GLOBAL);
    }

    await this._setAll(entries);
    return entry;
  }

  public async deleteEntry(entryId: string): Promise<void> {
    await this._setAll(this._getAll().filter((e) => e.id !== entryId));
  }

  public async clearForRequest(requestId: string): Promise<void> {
    await this._setAll(this._getAll().filter((e) => e.requestId !== requestId));
  }

  public async clearAll(): Promise<void> {
    await this._setAll([]);
  }
}
```

Note the `import type * as vscode` (not a plain `import`): `vscode.ExtensionContext` is used only as a type here, never as a runtime value, so marking it `import type` makes esbuild/tsx elide the import entirely. This matters for Step 3 below, where the class is exercised outside the extension host (`vscode` module doesn't exist there) — and it's simply the correct way to import a type-only dependency either way.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Write and run a disposable verification script**

There is no test framework in this repo (per `CLAUDE.md`); verify the pruning/truncation logic with a throwaway script run via the already-installed `tsx` runner, then delete it — it must not be committed.

Create `verify-history-manager.ts` at the repository root:

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

  for (let i = 0; i < 25; i++) {
    await manager.addEntry({
      requestId: "r1",
      requestName: "Test",
      folderId: "f1",
      request: {
        method: "GET",
        url: `/posts/${i}`,
        resolvedUrl: `https://example.com/posts/${i}`,
        headers: [],
        params: [],
      },
      response: { status: 200, statusText: "OK", headers: {}, data: "{}", time: 10, size: 2 },
    });
  }

  const forR1 = manager.getForRequest("r1");
  console.log("count for r1:", forR1.length, "expected 20");
  if (forR1.length !== 20) throw new Error("FAIL: per-request cap not enforced");
  if (forR1[0].request.url !== "/posts/24") {
    throw new Error(`FAIL: newest entry not first, got ${forR1[0].request.url}`);
  }

  const bigBody = "x".repeat(300_000);
  const entry = await manager.addEntry({
    requestId: "r2",
    requestName: "Big",
    folderId: "f1",
    request: { method: "GET", url: "/big", resolvedUrl: "https://example.com/big", headers: [], params: [] },
    response: { status: 200, statusText: "OK", headers: {}, data: bigBody, time: 10, size: bigBody.length },
  });
  console.log("truncated:", entry.truncated, "expected true");
  if (entry.truncated !== true) throw new Error("FAIL: large response should be truncated");

  await manager.deleteEntry(entry.id);
  console.log("after delete, r2 count:", manager.getForRequest("r2").length, "expected 0");
  if (manager.getForRequest("r2").length !== 0) throw new Error("FAIL: deleteEntry did not remove entry");

  console.log("ALL CHECKS PASSED");
}

main();
```

Run: `npx tsx verify-history-manager.ts`
Expected output ends with `ALL CHECKS PASSED` and no thrown error.

- [ ] **Step 4: Delete the disposable script**

```bash
rm verify-history-manager.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/providers/HistoryManager.ts
git commit -m "feat: add HistoryManager for capped, truncated request history storage"
```

---

### Task 3: Record history from `RequestEditorProvider`, wire `HistoryManager` through the extension host

**Files:**
- Modify: `src/providers/RequestEditorProvider.ts`
- Modify: `src/providers/SidebarProvider.ts`
- Modify: `src/extension.ts`
- Modify: `src/webview/request/RequestContext.tsx`

**Interfaces:**
- Consumes: `HistoryManager` (Task 2), `HistoryEntry` (Task 1).
- Produces: `RequestEditorProvider.openRequestEditor(context, requestId, requestName, folderId, historyManager, sidebarProvider?)` (new signature — the `historyManager` param is inserted before `sidebarProvider`), `RequestEditorProvider.refreshPanelConfig(context, requestId, folderId, sidebarProvider)` static method (consumed by Task 6), `SidebarProvider` constructor now takes `historyManager` as a third argument, `SidebarProvider.notifyHistoryChanged(): void` (consumed by this task and available to future callers), webview messages `historyUpdated` (`{type, entries}`) and `historyRestored` (`{type, request}`) posted to the request-editor panel, and a new `historySnapshot` field on the outgoing `sendRequest` webview message.

- [ ] **Step 1: Send a raw config snapshot alongside every `sendRequest` message**

In `src/webview/request/RequestContext.tsx`, find the `vscode.postMessage` call inside `handleSendRequest` (near the end of that callback):

```ts
    vscode.postMessage({
      type: "sendRequest",
      method: config.method,
      url: fullUrl,
      headers: interpolatedHeaders,
      body: requestBody,
      formData: formDataWithFiles,
      cookies: enabledCookies,
    });
```

Replace it with:

```ts
    vscode.postMessage({
      type: "sendRequest",
      method: config.method,
      url: fullUrl,
      headers: interpolatedHeaders,
      body: requestBody,
      formData: formDataWithFiles,
      cookies: enabledCookies,
      historySnapshot: {
        method: config.method,
        url: config.url,
        headers: config.headers || [],
        params: config.params || [],
        body: config.body,
        contentType: config.contentType,
        formData: config.formData,
        cookies: config.cookies,
      },
    });
```

`historySnapshot` carries the raw, pre-interpolation, request-level-only config — exactly what Restore will later write back — separate from the interpolated `headers`/`body`/`url` used to actually execute the call.

- [ ] **Step 2: Update `RequestEditorProvider.ts` imports and signature**

Replace the import block at the top of `src/providers/RequestEditorProvider.ts`:

```ts
import axios, { AxiosRequestConfig } from "axios";
import FormData from "form-data";
import * as vscode from "vscode";
import { getNonce } from "../utils/getNonce";
import { RequestConfig, ResponseCookie } from "../webview/types/internal.types";
import { SidebarProvider } from "./SidebarProvider";
```

with:

```ts
import axios, { AxiosRequestConfig } from "axios";
import FormData from "form-data";
import * as vscode from "vscode";
import { getNonce } from "../utils/getNonce";
import {
  FormDataItem,
  RequestConfig,
  ResponseCookie,
  ResponseData,
} from "../webview/types/internal.types";
import { HistoryManager } from "./HistoryManager";
import { SidebarProvider } from "./SidebarProvider";
```

Then change the `openRequestEditor` signature from:

```ts
  public static openRequestEditor(
    context: vscode.ExtensionContext,
    requestId: string,
    requestName: string,
    folderId: string,
    sidebarProvider?: SidebarProvider,
  ) {
```

to:

```ts
  public static openRequestEditor(
    context: vscode.ExtensionContext,
    requestId: string,
    requestName: string,
    folderId: string,
    historyManager: HistoryManager,
    sidebarProvider?: SidebarProvider,
  ) {
```

- [ ] **Step 3: Include history in the `getConfig` response**

In the `case "getConfig":` handler, the `panel.webview.postMessage({ type: "configLoaded", config: {...}, folderConfig: ..., ... })` call currently ends with:

```ts
            folderConfig: folderConfig,
            envVariables: envVariables,
            collectionId: collectionId,
            environments: collectionData.environments,
            activeEnvironmentId: collectionData.activeEnvironmentId,
          });
          break;
```

Add a `history` field:

```ts
            folderConfig: folderConfig,
            envVariables: envVariables,
            collectionId: collectionId,
            environments: collectionData.environments,
            activeEnvironmentId: collectionData.activeEnvironmentId,
            history: historyManager.getForRequest(requestId),
          });
          break;
```

- [ ] **Step 4: Record a history entry on every send, and add per-panel history messages**

Replace the entire `case "sendRequest":` block:

```ts
        case "sendRequest":
          try {
            const response = await provider._sendHttpRequest(
              message.method,
              message.url,
              message.headers,
              message.body,
              message.formData,
              message.cookies,
            );
            panel.webview.postMessage({
              type: "responseReceived",
              response,
            });
          } catch (error: any) {
            panel.webview.postMessage({
              type: "responseReceived",
              response: {
                status: 0,
                statusText: "Error",
                headers: {},
                data: error.message || "Request failed",
                time: 0,
              },
            });
          }
          break;
```

with:

```ts
        case "sendRequest": {
          const recordHistory = async (response: ResponseData) => {
            const snapshot = message.historySnapshot || {};
            const strippedFormData: FormDataItem[] = (snapshot.formData || []).map(
              (field: FormDataItem) =>
                field.type === "file"
                  ? { key: field.key, type: field.type, fileName: field.fileName }
                  : field,
            );
            await historyManager.addEntry({
              requestId,
              requestName,
              folderId,
              request: {
                method: snapshot.method || message.method,
                url: snapshot.url || "",
                resolvedUrl: message.url,
                headers: snapshot.headers || [],
                params: snapshot.params || [],
                body: snapshot.body,
                contentType: snapshot.contentType,
                formData: strippedFormData,
                cookies: snapshot.cookies,
              },
              response,
            });
            panel.webview.postMessage({
              type: "historyUpdated",
              entries: historyManager.getForRequest(requestId),
            });
            sidebarProvider?.notifyHistoryChanged();
          };

          try {
            const response = await provider._sendHttpRequest(
              message.method,
              message.url,
              message.headers,
              message.body,
              message.formData,
              message.cookies,
            );
            panel.webview.postMessage({
              type: "responseReceived",
              response,
            });
            await recordHistory(response);
          } catch (error: any) {
            const errorResponse: ResponseData = {
              status: 0,
              statusText: "Error",
              headers: {},
              data: error.message || "Request failed",
              time: 0,
              size: 0,
            };
            panel.webview.postMessage({
              type: "responseReceived",
              response: errorResponse,
            });
            await recordHistory(errorResponse);
          }
          break;
        }
```

Now add four new cases. Insert them directly after the closing `break;` of the `sendRequest` block above (still inside the same `switch (message.type)`, before `case "showInfo":`):

```ts
        case "getRequestHistory":
          panel.webview.postMessage({
            type: "historyUpdated",
            entries: historyManager.getForRequest(requestId),
          });
          break;
        case "restoreHistoryEntry": {
          const entry = historyManager
            .getForRequest(requestId)
            .find((e) => e.id === message.entryId);
          if (entry) {
            panel.webview.postMessage({
              type: "historyRestored",
              request: entry.request,
            });
          }
          break;
        }
        case "deleteHistoryEntry":
          await historyManager.deleteEntry(message.entryId);
          panel.webview.postMessage({
            type: "historyUpdated",
            entries: historyManager.getForRequest(requestId),
          });
          break;
        case "clearRequestHistory":
          await historyManager.clearForRequest(requestId);
          panel.webview.postMessage({
            type: "historyUpdated",
            entries: historyManager.getForRequest(requestId),
          });
          break;
```

- [ ] **Step 5: Add the `refreshPanelConfig` static method**

Add this new static method to the `RequestEditorProvider` class, directly after the existing `broadcastToAllPanels` static method:

```ts
  /** Push a fresh configLoaded payload to a single open panel, if it exists. Used after a global-history restore, which has no open editor form of its own to update. */
  public static refreshPanelConfig(
    context: vscode.ExtensionContext,
    requestId: string,
    folderId: string,
    sidebarProvider: SidebarProvider,
  ): void {
    const panel = RequestEditorProvider.openPanels.get(requestId);
    if (!panel) return;

    const savedRequest = context.globalState.get<RequestConfig>(
      `restlab.request.${requestId}`,
    );
    if (!savedRequest) return;

    const folderConfig = sidebarProvider.getInheritedConfig(folderId);
    const envVariables = sidebarProvider.getActiveEnvVariables(folderId);
    const collectionId = sidebarProvider.getRootCollectionId(folderId);
    const collectionData = sidebarProvider.getCollectionData(folderId);

    panel.webview.postMessage({
      type: "configLoaded",
      config: {
        id: requestId,
        name: savedRequest.name,
        folderId,
        method: savedRequest.method || "GET",
        url: savedRequest.url || "",
        headers: savedRequest.headers || [],
        params: savedRequest.params || [],
        body: savedRequest.body || "",
        contentType: savedRequest.contentType || "",
        formData: savedRequest.formData || [],
        auth: savedRequest.auth,
        cookies: savedRequest.cookies || [],
      },
      folderConfig,
      envVariables,
      collectionId,
      environments: collectionData.environments,
      activeEnvironmentId: collectionData.activeEnvironmentId,
    });
  }
```

- [ ] **Step 6: Wire `HistoryManager` into `SidebarProvider`'s constructor**

In `src/providers/SidebarProvider.ts`, add an import (keep alphabetical with the existing `./FolderEditorProvider` / `./RequestEditorProvider` imports):

```ts
import { HistoryManager } from "./HistoryManager";
```

Change the constructor from:

```ts
  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext,
  ) {
```

to:

```ts
  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext,
    private readonly _historyManager: HistoryManager,
  ) {
```

Then add these two methods directly after the existing `notifyActiveRequest` method:

```ts
  public notifyHistoryChanged(): void {
    this._sendHistoryToWebview();
  }

  private _sendHistoryToWebview() {
    if (this._view) {
      this._view.webview.postMessage({
        type: "historyUpdated",
        entries: this._historyManager.getAll(),
      });
    }
  }
```

(`_sendHistoryToWebview` is deliberately private and reused by the message-handling cases added in Task 6, so both paths push the exact same payload shape.)

- [ ] **Step 7: Wire everything together in `extension.ts`**

Add an import:

```ts
import { HistoryManager } from "./providers/HistoryManager";
```

Change the top of `activate()` from:

```ts
export async function activate(context: vscode.ExtensionContext) {
  console.log("REST Lab extension is now active!");
  await seedDefaultData(context);

  // Initialize the sidebar provider
  const sidebarProvider = new SidebarProvider(context.extensionUri, context);
```

to:

```ts
export async function activate(context: vscode.ExtensionContext) {
  console.log("REST Lab extension is now active!");
  await seedDefaultData(context);

  // Initialize the history manager and sidebar provider
  const historyManager = new HistoryManager(context);
  const sidebarProvider = new SidebarProvider(
    context.extensionUri,
    context,
    historyManager,
  );
```

Then update the `restlab.openRequest` command registration from:

```ts
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "restlab.openRequest",
      (requestId: string, requestName: string, folderId: string) => {
        RequestEditorProvider.openRequestEditor(
          context,
          requestId,
          requestName,
          folderId,
          sidebarProvider,
        );
      },
    ),
  );
```

to:

```ts
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "restlab.openRequest",
      (requestId: string, requestName: string, folderId: string) => {
        RequestEditorProvider.openRequestEditor(
          context,
          requestId,
          requestName,
          folderId,
          historyManager,
          sidebarProvider,
        );
      },
    ),
  );
```

- [ ] **Step 8: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (`SidebarProvider`'s `notifyHistoryChanged`/`_sendHistoryToWebview` compile even though nothing calls `notifyHistoryChanged` externally yet besides `RequestEditorProvider` — that call already exists from Step 4.)

- [ ] **Step 9: Manual verification (developer runs this)**

This step has no visible UI yet (that's Task 5), so it's a regression check only: run `npm run watch`, launch the Extension Development Host, confirm the sidebar still loads its collections, opening a request still loads its config, and sending a request still shows a response exactly as before. No new UI should appear yet.

- [ ] **Step 10: Commit**

```bash
git add src/providers/RequestEditorProvider.ts src/providers/SidebarProvider.ts src/extension.ts src/webview/request/RequestContext.tsx
git commit -m "feat: record request history on every send and wire HistoryManager through the extension host"
```

---

### Task 4: Shared history UI components

**Files:**
- Create: `src/webview/components/icons/HistoryIcon.tsx`
- Create: `src/webview/components/HistoryEntryList.tsx`
- Modify: `src/webview/request/styles.css`
- Modify: `src/webview/sidebar/sidebar.css`

**Interfaces:**
- Consumes: `HistoryEntry` (Task 1), `formatJson`/`formatSize`/`getStatusColor`/`formatRelativeTime` from `../helpers/helper` (Task 1 adds the last one; the others already exist).
- Produces: `HistoryEntryList` component with props `{ entries: HistoryEntry[]; showRequestName?: boolean; onRestore: (entryId: string) => void; onDelete: (entryId: string) => void; }`, consumed by Task 5 (`HistoryTab.tsx`) and Task 7 (`HistoryPanel.tsx`). `HistoryIcon` consumed by Task 7 (`Sidebar.tsx`).

- [ ] **Step 1: Create the history icon**

```tsx
import React from "react";

type HistoryIconProps = {
  className?: string;
};

const HistoryIcon = ({ className }: HistoryIconProps) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 7 12 12 16 14" />
  </svg>
);

export default HistoryIcon;
```

Save as `src/webview/components/icons/HistoryIcon.tsx`.

- [ ] **Step 2: Create the shared `HistoryEntryList` component**

```tsx
import React, { useState } from "react";
import {
  formatJson,
  formatRelativeTime,
  formatSize,
  getStatusColor,
} from "../helpers/helper";
import { HistoryEntry } from "../types/internal.types";
import Tooltip from "./Tooltip";
import TrashIcon from "./icons/TrashIcon";

interface HistoryEntryListProps {
  entries: HistoryEntry[];
  showRequestName?: boolean;
  onRestore: (entryId: string) => void;
  onDelete: (entryId: string) => void;
}

const renderBody = (body: string | undefined, contentType?: string): string => {
  if (!body) return "";
  return contentType?.includes("json") ? formatJson(body) : body;
};

const HistoryEntryList: React.FC<HistoryEntryListProps> = ({
  entries,
  showRequestName = false,
  onRestore,
  onDelete,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (entries.length === 0) {
    return <p className="empty-hint">No history yet</p>;
  }

  return (
    <div className="history-list">
      {entries.map((entry) => {
        const isExpanded = expandedId === entry.id;
        return (
          <div key={entry.id} className="history-entry">
            <div
              className="history-entry-row"
              onClick={() =>
                setExpandedId((prev) => (prev === entry.id ? null : entry.id))
              }
              role="button"
              tabIndex={0}
            >
              <span
                className={`method-badge method-${entry.request.method.toLowerCase()}`}
              >
                {entry.request.method}
              </span>
              {showRequestName && (
                <span className="history-request-name">{entry.requestName}</span>
              )}
              <span className="history-url" title={entry.request.resolvedUrl}>
                {entry.request.url || entry.request.resolvedUrl}
              </span>
              <span className={`status-badge ${getStatusColor(entry.response.status)}`}>
                {entry.response.status === 0 ? "Network Error" : entry.response.status}
              </span>
              <span className="time-badge">{entry.response.time}ms</span>
              <span className="history-timestamp">
                {formatRelativeTime(entry.timestamp)}
              </span>
            </div>

            {isExpanded && (
              <div className="history-entry-details">
                {entry.truncated && (
                  <p className="empty-hint">Some content was truncated for storage.</p>
                )}

                <div className="history-detail-section">
                  <h4>Request</h4>
                  <p className="history-detail-line">
                    <strong>{entry.request.method}</strong> {entry.request.resolvedUrl}
                  </p>
                  {entry.request.headers.length > 0 && (
                    <div className="response-headers">
                      {entry.request.headers.map((h, i) => (
                        <div key={i} className="response-header-row">
                          <span className="header-name">{h.key}</span>
                          <span className="header-value">{h.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {entry.request.body && (
                    <pre className="history-body">
                      {renderBody(entry.request.body, entry.request.contentType)}
                    </pre>
                  )}
                </div>

                <div className="history-detail-section">
                  <h4>Response</h4>
                  <p className="history-detail-line">
                    {entry.response.status} {entry.response.statusText} ·{" "}
                    {formatSize(entry.response.size)}
                  </p>
                  <div className="response-headers">
                    {Object.entries(entry.response.headers).map(([k, v]) => (
                      <div key={k} className="response-header-row">
                        <span className="header-name">{k}</span>
                        <span className="header-value">{v}</span>
                      </div>
                    ))}
                  </div>
                  <pre className="history-body">
                    {renderBody(entry.response.data, entry.response.headers["content-type"])}
                  </pre>
                </div>

                <div className="history-entry-actions">
                  <button
                    className="add-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestore(entry.id);
                    }}
                  >
                    Restore
                  </button>
                  <Tooltip text="Delete this entry">
                    <button
                      className="remove-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(entry.id);
                      }}
                    >
                      <TrashIcon />
                    </button>
                  </Tooltip>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default HistoryEntryList;
```

Save as `src/webview/components/HistoryEntryList.tsx`.

- [ ] **Step 3: Add history-specific CSS to `request/styles.css`**

Append to the end of `src/webview/request/styles.css` (this bundle already has `.status-badge`, `.time-badge`, `.response-header-row`, `.empty-hint`, `.add-btn`, `.remove-btn` — it's only missing the standalone method-badge pill and the history-specific classes):

```css
/* ============================================================
   METHOD BADGE (standalone pill, distinct from .method-select)
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
   HISTORY
   ============================================================ */
.history-list {
  display: flex;
  flex-direction: column;
  gap: var(--rl-sp2);
  padding: var(--rl-sp3);
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

- [ ] **Step 4: Add the equivalent CSS to `sidebar/sidebar.css`**

This bundle already has `.method-badge` + `.method-get/post/put/patch/delete` (used by the request tree). It's missing `.status-badge`, `.time-badge`, `.response-header-row`, `.empty-hint`, `.add-btn`, `.remove-btn`, plus the history-specific classes. Append to the end of `src/webview/sidebar/sidebar.css`:

```css
/* ============================================================
   STATUS & RESPONSE BADGES (ported from request editor)
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

/* ============================================================
   HISTORY
   ============================================================ */
.history-list {
  display: flex;
  flex-direction: column;
  gap: var(--rl-sp2);
  padding: var(--rl-sp3);
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

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (`HistoryEntryList` is unused until Task 5/7 import it — fine, same reasoning as Task 1.)

- [ ] **Step 6: Commit**

```bash
git add src/webview/components/icons/HistoryIcon.tsx src/webview/components/HistoryEntryList.tsx src/webview/request/styles.css src/webview/sidebar/sidebar.css
git commit -m "feat: add shared HistoryEntryList component and history styles"
```

---

### Task 5: Per-request History tab

**Files:**
- Modify: `src/webview/request/RequestContext.tsx`
- Modify: `src/webview/request/RequestEditor.tsx`
- Create: `src/webview/request/HistoryTab.tsx`

**Interfaces:**
- Consumes: `HistoryEntryList` (Task 4), `HistoryEntry` (Task 1), the `historyUpdated`/`historyRestored`/`configLoaded` messages produced by Task 3.
- Produces: `useRequestContext().historyEntries: HistoryEntry[]`, `.handleRestoreHistoryEntry(entryId)`, `.handleDeleteHistoryEntry(entryId)`, `.handleClearRequestHistory()` — consumed only within this task's own `HistoryTab.tsx`, but exposed on the shared context for consistency with every other tab.

- [ ] **Step 1: Add `historyEntries` state and the `"history"` tab to `RequestContext.tsx`**

Change the type import to include `HistoryEntry`:

```ts
import {
  AuthConfig,
  Cookie,
  FolderConfig,
  FormDataItem,
  HistoryEntry,
  RequestConfig,
  RequestEditorProps,
  ResponseData,
} from "../types/internal.types";
```

Change the `ActiveTab` type from:

```ts
type ActiveTab = "headers" | "body" | "params" | "auth" | "cookies";
```

to:

```ts
type ActiveTab = "headers" | "body" | "params" | "auth" | "cookies" | "history";
```

Add `historyEntries` to the `RequestContextValue` interface, under the existing `// State` section (near `isSaved`):

```ts
  isSaved: boolean;
  historyEntries: HistoryEntry[];
```

Add three handler signatures to the interface (near `handleSetActiveEnvironment`):

```ts
  handleSetActiveEnvironment: (envId: string | null) => void;
  handleRestoreHistoryEntry: (entryId: string) => void;
  handleDeleteHistoryEntry: (entryId: string) => void;
  handleClearRequestHistory: () => void;
```

Add the state declaration next to `isSaved`'s `useState`:

```ts
  const [isSaved, setIsSaved] = useState(true);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
```

- [ ] **Step 2: Handle the new incoming messages**

In the `handleMessage` switch inside the message-handling `useEffect`, add `history` to the `configLoaded` case:

```ts
        case "configLoaded":
          setConfig(message.config);
          setFolderConfig(message.folderConfig || {});
          setEnvVariables(message.envVariables || {});
          setEnvironments(message.environments || []);
          setActiveEnvironmentId(message.activeEnvironmentId ?? null);
          setCollectionId(message.collectionId ?? null);
          collectionIdRef.current = message.collectionId ?? null;
          setHistoryEntries(message.history || []);
          setIsSaved(true);
```

(this only adds the `setHistoryEntries(message.history || []);` line — everything else in that case is unchanged).

Then add two new cases right after the existing `case "responseReceived":` block:

```ts
        case "historyUpdated":
          setHistoryEntries(message.entries || []);
          break;
        case "historyRestored":
          setConfig((prev) => ({
            ...prev,
            method: message.request.method,
            url: message.request.url,
            headers: message.request.headers,
            params: message.request.params,
            body: message.request.body,
            contentType: message.request.contentType,
            formData: message.request.formData,
            cookies: message.request.cookies,
          }));
          setIsSaved(false);
          break;
```

- [ ] **Step 3: Add the three handlers**

Add these next to `handleSetActiveEnvironment`:

```ts
  const handleRestoreHistoryEntry = useCallback((entryId: string) => {
    vscode.postMessage({ type: "restoreHistoryEntry", entryId });
  }, []);

  const handleDeleteHistoryEntry = useCallback((entryId: string) => {
    vscode.postMessage({ type: "deleteHistoryEntry", entryId });
  }, []);

  const handleClearRequestHistory = useCallback(() => {
    vscode.postMessage({ type: "clearRequestHistory" });
  }, []);
```

- [ ] **Step 4: Expose the new state and handlers in the context value**

In the `value: RequestContextValue = { ... }` object at the bottom of the file, add `historyEntries` under `// State`:

```ts
    isSaved,
    historyEntries,
```

and the three handlers under `// Handlers`, near `handleSetActiveEnvironment`:

```ts
    handleSetActiveEnvironment,
    handleRestoreHistoryEntry,
    handleDeleteHistoryEntry,
    handleClearRequestHistory,
```

- [ ] **Step 5: Create `HistoryTab.tsx`**

```tsx
import React from "react";
import HistoryEntryList from "../components/HistoryEntryList";
import { useRequestContext } from "./RequestContext";

const HistoryTab: React.FC = () => {
  const {
    historyEntries,
    handleRestoreHistoryEntry,
    handleDeleteHistoryEntry,
    handleClearRequestHistory,
  } = useRequestContext();

  return (
    <div className="headers-section">
      <div className="request-headers">
        <div className="section-header">
          <h3>Request History</h3>
          {historyEntries.length > 0 && (
            <button className="add-btn" onClick={handleClearRequestHistory}>
              Clear
            </button>
          )}
        </div>
        <HistoryEntryList
          entries={historyEntries}
          onRestore={handleRestoreHistoryEntry}
          onDelete={handleDeleteHistoryEntry}
        />
      </div>
    </div>
  );
};

export default HistoryTab;
```

Save as `src/webview/request/HistoryTab.tsx`.

- [ ] **Step 6: Wire the tab button and content into `RequestEditor.tsx`**

Add the import:

```ts
import HistoryTab from "./HistoryTab";
```

Add `historyEntries` to the destructuring from `useRequestContext()` (near `isSaved`):

```ts
    isSaved,
    historyEntries,
```

Add a new tab button directly after the existing Cookies tab button:

```tsx
              <button
                className={`tab ${activeTab === "cookies" ? "active" : ""}`}
                onClick={() => setActiveTab("cookies")}
              >
                Cookies
                {(config.cookies?.filter((c) => c.enabled !== false && c.name.trim() !== "").length || 0) > 0 && (
                  <span className="badge">
                    {config.cookies!.filter((c) => c.enabled !== false && c.name.trim() !== "").length}
                  </span>
                )}
              </button>
              <button
                className={`tab ${activeTab === "history" ? "active" : ""}`}
                onClick={() => setActiveTab("history")}
              >
                History
                {historyEntries.length > 0 && (
                  <span className="badge">{historyEntries.length}</span>
                )}
              </button>
```

Add the tab content directly after the existing `{activeTab === "cookies" && <CookieTab />}` line:

```tsx
              {activeTab === "cookies" && <CookieTab />}
              {activeTab === "history" && <HistoryTab />}
```

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Manual verification (developer runs this)**

Run `npm run watch`, launch the Extension Development Host, open any request, send it 2-3 times (mix a couple of successful calls and, e.g., a request to an unreachable host to produce a network-error entry). Open the **History** tab: confirm entries appear newest-first with correct method/status/time/relative-timestamp badges. Click an entry to expand it and confirm request headers/body and response headers/body render. Click **Restore** on an older entry and confirm the form's method/URL/headers/body update and the Save button switches to "unsaved" — without any request being sent. Click **Delete** on one entry and confirm only that entry disappears. Click **Clear** and confirm the list empties.

- [ ] **Step 9: Commit**

```bash
git add src/webview/request/RequestContext.tsx src/webview/request/RequestEditor.tsx src/webview/request/HistoryTab.tsx
git commit -m "feat: add per-request History tab to the request editor"
```

---

### Task 6: Global history message handling in `SidebarProvider`

**Files:**
- Modify: `src/providers/SidebarProvider.ts`

**Interfaces:**
- Consumes: `HistoryManager` (Task 2, already wired into the constructor in Task 3), `RequestEditorProvider.refreshPanelConfig` (Task 3).
- Produces: handles incoming webview messages `getHistory`, `deleteHistoryEntry`, `clearAllHistory`, `restoreHistoryEntry` — consumed by Task 7's `HistoryPanel.tsx`.

- [ ] **Step 1: Add the four new message cases**

In `resolveWebviewView`'s `onDidReceiveMessage` switch, add these cases directly after the existing `case "saveExpandedFolders":` block (still before the switch's closing brace):

```ts
        case "getHistory":
          this._sendHistoryToWebview();
          break;
        case "deleteHistoryEntry":
          await this._historyManager.deleteEntry(message.entryId);
          this._sendHistoryToWebview();
          break;
        case "clearAllHistory": {
          const confirm = await vscode.window.showWarningMessage(
            "Clear all request history? This cannot be undone.",
            { modal: true },
            "Clear All",
          );
          if (confirm === "Clear All") {
            await this._historyManager.clearAll();
            this._sendHistoryToWebview();
          }
          break;
        }
        case "restoreHistoryEntry": {
          const entry = this._historyManager
            .getAll()
            .find((e) => e.id === message.entryId);
          if (!entry) break;

          const folder = this._findFolder(entry.folderId);
          const requestExists = folder?.requests?.some(
            (r) => r.id === entry.requestId,
          );
          if (!requestExists) {
            vscode.window.showWarningMessage(
              `Cannot restore "${entry.requestName}" — the original request no longer exists.`,
            );
            break;
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
          );
          vscode.window.showInformationMessage(
            `Restored "${entry.requestName}" from history`,
          );
          break;
        }
```

`RequestEditorProvider` is already imported in this file (used elsewhere for `closePanel`/`updatePanelTitle`), so no new import is needed.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification (developer runs this)**

There's no sidebar UI to trigger these messages yet (that's Task 7) — this step is a type-check-only task. Defer functional verification to Task 7.

- [ ] **Step 4: Commit**

```bash
git add src/providers/SidebarProvider.ts
git commit -m "feat: handle global history messages (list, delete, clear, restore) in SidebarProvider"
```

---

### Task 7: Global History section in the sidebar

**Files:**
- Modify: `src/webview/sidebar/Sidebar.tsx`
- Create: `src/webview/sidebar/HistoryPanel.tsx`
- Modify: `src/webview/sidebar/sidebar.css`

**Interfaces:**
- Consumes: `HistoryEntryList` (Task 4), the `historyUpdated` message and `getHistory`/`deleteHistoryEntry`/`clearAllHistory`/`restoreHistoryEntry` message handling (Task 6).
- Produces: the sidebar's `vscode` singleton is now exported from `Sidebar.tsx` for `HistoryPanel.tsx` to reuse (VS Code only allows `acquireVsCodeApi()` to be called once per webview).

- [ ] **Step 1: Export the existing `vscode` singleton from `Sidebar.tsx`**

`Sidebar.tsx` already calls `acquireVsCodeApi()` once at module scope — `HistoryPanel.tsx` must reuse that same instance rather than calling `acquireVsCodeApi()` again (VS Code throws if it's called twice in the same webview). Change:

```ts
const vscode = acquireVsCodeApi();
```

to:

```ts
export const vscode = acquireVsCodeApi();
```

- [ ] **Step 2: Create `HistoryPanel.tsx`**

```tsx
import React, { useEffect, useState } from "react";
import HistoryEntryList from "../components/HistoryEntryList";
import { HistoryEntry } from "../types/internal.types";
import { vscode } from "./Sidebar";

const HistoryPanel: React.FC = () => {
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

  return (
    <div className="sb-history">
      <HistoryEntryList
        entries={entries}
        showRequestName
        onRestore={handleRestore}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default HistoryPanel;
```

Save as `src/webview/sidebar/HistoryPanel.tsx`.

- [ ] **Step 3: Add the Collections/History toggle to `Sidebar.tsx`**

Add imports:

```ts
import HistoryIcon from "../components/icons/HistoryIcon";
import HistoryPanel from "./HistoryPanel";
```

Add state, next to the existing `isDragging` state declaration:

```ts
  const [isDragging, setIsDragging] = useState(false);
  const [activeView, setActiveView] = useState<"collections" | "history">(
    "collections",
  );
```

Add a handler next to `handleImportCollection`:

```ts
  const handleClearAllHistory = () => {
    vscode.postMessage({ type: "clearAllHistory" });
  };
```

Replace the returned JSX's `<div className="sb-head">...</div>` block:

```tsx
      <div className="sb-head">
        <h2 className="sb-title">
          REST Lab
        </h2>
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
        </div>
      </div>
```

with:

```tsx
      <div className="sb-head">
        <h2 className="sb-title">
          REST Lab
        </h2>
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
      </div>
```

Then wrap the existing `<div className={`sb-tree...`}>...</div>` tree block (everything from `<div className={`sb-tree...` through its matching closing `</div>`) in a conditional, and add the `HistoryPanel` alternative. The block currently reads:

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
        {folders.length === 0 ? (
          ...
        ) : (
          ...
        )}
      </div>
    </div>
  );
};
```

Change the opening to add the conditional, and add the `else` branch just before the component's own closing `</div>`:

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
          {folders.length === 0 ? (
            <div className="empty-state">
              <NoItemsIcon />
              <p className="empty-state-title">No collections yet</p>
              <p className="empty-state-hint">
                Create your first collection to get started
              </p>
            </div>
          ) : (
            <>
              {folders.map((folder) => (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  depth={0}
                  isDragging={isDragging}
                  dragOverFolderId={dragOverFolderId}
                  expandedFolders={expandedFolders}
                  activeRequestId={activeRequestId}
                  onToggleFolder={handleToggleFolder}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onAddRequest={handleAddRequest}
                  onAddRequestFromCurl={handleAddRequestFromCurl}
                  onAddSubfolder={handleAddSubfolder}
                  onOpenFolder={handleOpenFolder}
                  onExportCollection={handleExportCollection}
                  onDuplicateFolder={handleDuplicateFolder}
                  onRenameFolder={handleRenameFolder}
                  onDeleteFolder={handleDeleteFolder}
                  onOpenRequest={handleOpenRequest}
                  onRenameRequest={handleRenameRequest}
                  onDuplicateRequest={handleDuplicateRequest}
                  onDeleteRequest={handleDeleteRequest}
                />
              ))}
              {isDragging && (
                <div className="root-drop-indicator">
                  <span>Drop here to move to root level</span>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <HistoryPanel />
      )}
    </div>
  );
};
```

- [ ] **Step 4: Add toggle CSS**

Append to `src/webview/sidebar/sidebar.css`:

```css
.sb-view-toggle {
  display: flex;
  gap: 4px;
  padding: 0 var(--rl-sp4);
  margin-top: var(--rl-sp2);
}

.sb-view-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid transparent;
  border-radius: var(--rl-r2);
  background: transparent;
  color: var(--vscode-descriptionForeground);
  font-size: 12px;
  cursor: pointer;
}

.sb-view-btn.active {
  background: var(--glass-bg);
  border-color: var(--glass-border);
  color: var(--vscode-foreground);
}

.sb-history {
  flex: 1;
  overflow-y: auto;
}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual verification (developer runs this)**

Run `npm run watch`, launch the Extension Development Host. Send a couple of requests from two different saved requests. In the sidebar, click **History**: confirm entries from both requests appear, newest-first, each showing its request name. Expand one and click **Restore** — confirm an info toast appears, and if that request's panel is open, its form updates; reopen the request if the panel was closed and confirm the saved config reflects the restored values. Click **Delete** on an entry and confirm it disappears from both the sidebar list and that request's own History tab (if open). Click **Clear All**, confirm the modal warning, confirm accepting empties the list (and confirm cancelling leaves it untouched). Finally, delete the underlying request itself (via the tree), go back to History, and confirm attempting to Restore its orphaned entry shows the "no longer exists" warning instead of restoring anything.

- [ ] **Step 7: Commit**

```bash
git add src/webview/sidebar/Sidebar.tsx src/webview/sidebar/HistoryPanel.tsx src/webview/sidebar/sidebar.css
git commit -m "feat: add global History section to the sidebar"
```

---

### Task 8: Update CHANGELOG roadmap

**Files:**
- Modify: `CHANGELOG.md`

**Interfaces:** None — this is a documentation-only change.

- [ ] **Step 1: Mark the roadmap item done**

In `CHANGELOG.md`'s `## Future Roadmap` section, change:

```markdown
- [ ] Request history
```

to:

```markdown
- [x] Request history
```

Do not add a hand-authored `## x.y.z` release section — every existing one in this file (e.g. `## 1.6.0`, `## 1.6.1`) was generated by `semantic-release` from conventional commit messages at release time (see the `chore(release)` commits in `git log`), not hand-written in a feature branch.

- [ ] **Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: mark request history roadmap item done"
```

---

## Self-Review Notes

- **Spec coverage:** data model + storage/pruning (Task 1-2), extension host recording + per-panel messages + `refreshPanelConfig` (Task 3), shared list UI (Task 4), per-request History tab (Task 5), global history message handling (Task 6) and sidebar UI (Task 7), restore-writes-raw-not-resolved correctness (Task 3 Step 1 + Global Constraints), truncation safeguard (Task 2), orphaned-request restore warning (Task 6/7), CHANGELOG (Task 8) — all covered.
- **Placeholder scan:** no TBD/TODO, no "add appropriate handling" — every step shows the exact code to write.
- **Type consistency:** `HistoryEntry`, `HistoryManager`, `historySnapshot`, `historyUpdated`, `historyRestored`, `refreshPanelConfig`, `notifyHistoryChanged` are spelled identically everywhere they're produced and consumed across tasks.
