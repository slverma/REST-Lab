# History Response Viewer & Restore UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give History entries (both the standalone History panel and the per-request History tab) a tabbed, full-size response viewer with Copy/Download/Open-in-Editor actions matching the live Response panel, and replace the unexplained one-click "Restore" button with a tooltip + confirmation dialog.

**Architecture:** Extract the extension-host download/open-in-editor logic into a shared helper so both `RequestEditorProvider` and `HistoryEditorProvider` can serve those messages. On the webview side, add two new shared components — `HistoryResponseViewer` (tabs + actions, reusing the existing `BodyEditor` Monaco component) and a generic `ConfirmDialog` — and wire them into the existing shared `HistoryEntryList`, which both the standalone History panel and the request editor's History tab already render.

**Tech Stack:** TypeScript (strict), React (classic JSX runtime), `@monaco-editor/react` (already a dependency), VS Code Webview API, no test framework.

## Global Constraints

- Strict TypeScript — no `@ts-nocheck`, `@ts-ignore`, or eslint-disable suppression comments (from project CLAUDE.md).
- Keep components under 500 lines; split into a sub-component if a file would grow beyond that (from project CLAUDE.md).
- **Do not run `npm run build` or `npm run watch`** — the project's CLAUDE.md says this is slow and is the developer's job. After each task, verify only with `npx tsc --noEmit`. Each task also lists a manual QA checklist for the developer to run later — do not attempt to launch the Extension Development Host yourself.
- Follow the existing custom-CSS convention already used in `request/styles.css` and `history/styles.css` (plain class names, CSS custom properties like `--rl-sp3`, `--glass-bg`, `--restlab-accent` — **not** Tailwind; Tailwind is only used in the sidebar bundle).
- Work happens on the already-created branch `feat/history-response-viewer` — do not create a new branch.
- Design spec: `docs/superpowers/specs/2026-07-29-history-response-viewer-design.md`.

---

### Task 1: Extract shared response file-action helpers

**Files:**
- Create: `src/utils/responseFileActions.ts`
- Modify: `src/providers/RequestEditorProvider.ts:1-13` (imports), `:420-464` (switch cases)

**Interfaces:**
- Produces: `handleDownloadResponse(message: { content: string; filename: string }): Promise<void>` and `handleOpenResponseInEditor(message: { content: string; extension?: string; mimeType?: string }): Promise<void>`, exported from `src/utils/responseFileActions.ts`. Later tasks (Task 2) import these two functions by name.

This is a pure refactor — behavior must be identical to today. `RequestEditorProvider.ts` currently has this logic inlined (read it first to confirm the exact current text before editing):

```ts
        case "downloadResponse":
          const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(message.filename),
            filters: {
              "All Files": ["*"],
              JSON: ["json"],
              XML: ["xml"],
              Text: ["txt"],
              HTML: ["html"],
            },
          });
          if (uri) {
            await vscode.workspace.fs.writeFile(
              uri,
              Buffer.from(message.content, "utf-8"),
            );
            vscode.window.showInformationMessage(
              `Response saved to ${uri.fsPath}`,
            );
          }
          break;
        case "openResponseInEditor":
          // Determine language ID based on extension or mime type
          let languageId = "plaintext";
          if (message.extension === "json") {
            languageId = "json";
          } else if (message.extension === "xml") {
            languageId = "xml";
          } else if (message.extension === "html") {
            languageId = "html";
          } else if (message.mimeType?.includes("json")) {
            languageId = "json";
          } else if (message.mimeType?.includes("xml")) {
            languageId = "xml";
          } else if (message.mimeType?.includes("html")) {
            languageId = "html";
          }

          // Open a new untitled document with the response content
          const doc = await vscode.workspace.openTextDocument({
            content: message.content,
            language: languageId,
          });
          await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
          break;
```

- [ ] **Step 1: Create `src/utils/responseFileActions.ts`**

```ts
import * as vscode from "vscode";

export async function handleDownloadResponse(message: {
  content: string;
  filename: string;
}): Promise<void> {
  const uri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(message.filename),
    filters: {
      "All Files": ["*"],
      JSON: ["json"],
      XML: ["xml"],
      Text: ["txt"],
      HTML: ["html"],
    },
  });
  if (uri) {
    await vscode.workspace.fs.writeFile(
      uri,
      Buffer.from(message.content, "utf-8"),
    );
    vscode.window.showInformationMessage(`Response saved to ${uri.fsPath}`);
  }
}

export async function handleOpenResponseInEditor(message: {
  content: string;
  extension?: string;
  mimeType?: string;
}): Promise<void> {
  let languageId = "plaintext";
  if (message.extension === "json") {
    languageId = "json";
  } else if (message.extension === "xml") {
    languageId = "xml";
  } else if (message.extension === "html") {
    languageId = "html";
  } else if (message.mimeType?.includes("json")) {
    languageId = "json";
  } else if (message.mimeType?.includes("xml")) {
    languageId = "xml";
  } else if (message.mimeType?.includes("html")) {
    languageId = "html";
  }

  const doc = await vscode.workspace.openTextDocument({
    content: message.content,
    language: languageId,
  });
  await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
}
```

- [ ] **Step 2: Update `src/providers/RequestEditorProvider.ts` imports**

Add this import near the other relative imports at the top of the file (after the `HistoryManager`/`SidebarProvider` imports around line 11-13):

```ts
import {
  handleDownloadResponse,
  handleOpenResponseInEditor,
} from "../utils/responseFileActions";
```

- [ ] **Step 3: Replace the inlined switch cases**

Replace the `case "downloadResponse":` and `case "openResponseInEditor":` blocks shown above with:

```ts
        case "downloadResponse":
          await handleDownloadResponse(message);
          break;
        case "openResponseInEditor":
          await handleOpenResponseInEditor(message);
          break;
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/utils/responseFileActions.ts src/providers/RequestEditorProvider.ts
git commit -m "refactor: extract response download/open-in-editor logic into a shared helper"
```

**Manual QA (developer, later):** Open a request, send it, and confirm Download and Open-in-Editor in the live Response panel still work exactly as before (this task is a pure refactor of existing, already-working behavior).

---

### Task 2: Wire Download/Open-in-Editor/Copy support into the standalone History panel

**Files:**
- Modify: `src/providers/HistoryEditorProvider.ts:1-4` (imports), `:55-90` (message switch)

**Interfaces:**
- Consumes: `handleDownloadResponse`, `handleOpenResponseInEditor` from `src/utils/responseFileActions.ts` (Task 1).

- [ ] **Step 1: Add imports**

At the top of `src/providers/HistoryEditorProvider.ts`, add:

```ts
import {
  handleDownloadResponse,
  handleOpenResponseInEditor,
} from "../utils/responseFileActions";
```

- [ ] **Step 2: Add three new cases to the message switch**

In the `panel.webview.onDidReceiveMessage(async (message) => { switch (message.type) { ... } })` block, add these cases (placement doesn't matter — add them after the existing `setHistoryEnabled` case, before the closing `}`):

```ts
        case "showInfo":
          vscode.window.showInformationMessage(message.message);
          break;
        case "downloadResponse":
          await handleDownloadResponse(message);
          break;
        case "openResponseInEditor":
          await handleOpenResponseInEditor(message);
          break;
```

This requires `vscode` to be imported in this file — it already is (`import * as vscode from "vscode";` at the top).

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/providers/HistoryEditorProvider.ts
git commit -m "feat: support downloading and opening response bodies from the standalone History panel"
```

**Manual QA (developer, later):** Nothing is wired up on the frontend yet (Task 3 does that) — this task alone has nothing to click. Verified by `tsc` only.

---

### Task 3: Tabbed response viewer with Copy/Download/Open-in-Editor in History

**Files:**
- Create: `src/webview/components/HistoryResponseViewer.tsx`
- Modify: `src/webview/components/HistoryEntryList.tsx` (full file — response section + new prop)
- Modify: `src/webview/history/HistoryView.tsx` (pass `vscode` prop down)
- Modify: `src/webview/request/HistoryTab.tsx` (pass `vscode` prop down)
- Modify: `src/webview/history/styles.css` (add tab/action-button classes, new viewer sizing)
- Modify: `src/webview/request/styles.css` (add viewer sizing override only — tab/action classes already exist there)

**Interfaces:**
- Consumes: `BodyEditor` from `src/webview/request/BodyEditor.tsx` (existing, props: `value: string`, `language: string`, `readOnly?: boolean`, `className?: string`, `showHint?: string`); `formatJson`, `getEditorLanguageFromContentType`, `getFileExtension` from `src/webview/helpers/helper.ts` (existing); `Tooltip` from `src/webview/components/Tooltip.tsx` (existing, props `text: string`, `position?: TooltipPosition`); `CopyIcon`/`DownloadIcon`/`PencilIcon` from `src/webview/components/icons/*` (existing, no props); `ResponseData` type from `src/webview/types/internal.types.ts` (existing).
- Produces: `HistoryResponseViewer` component, default export, props `{ response: ResponseData; truncated?: boolean; vscode: { postMessage: (message: unknown) => void } }`. `HistoryEntryList` gains a new required prop `vscode: { postMessage: (message: unknown) => void }`, consumed by Task 4 as well.

#### Step 1: Create `src/webview/components/HistoryResponseViewer.tsx`

- [ ] Write the file:

```tsx
import React, { useState } from "react";
import {
  formatJson,
  getEditorLanguageFromContentType,
  getFileExtension,
} from "../helpers/helper";
import BodyEditor from "../request/BodyEditor";
import { ResponseData } from "../types/internal.types";
import CopyIcon from "./icons/CopyIcon";
import DownloadIcon from "./icons/DownloadIcon";
import PencilIcon from "./icons/PencilIcon";
import Tooltip from "./Tooltip";

type ResponseTab = "body" | "headers" | "cookies";

interface HistoryResponseViewerProps {
  response: ResponseData;
  truncated?: boolean;
  vscode: { postMessage: (message: unknown) => void };
}

const HistoryResponseViewer: React.FC<HistoryResponseViewerProps> = ({
  response,
  truncated,
  vscode,
}) => {
  const [tab, setTab] = useState<ResponseTab>("body");

  const contentType = response.headers["content-type"];

  const getResponseContent = () =>
    tab === "body"
      ? formatJson(response.data)
      : Object.entries(response.headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n");

  const getResponseFileInfo = () => ({
    extension: tab === "body" ? getFileExtension(response.headers) : "txt",
    mimeType: tab === "body" ? contentType || "text/plain" : "text/plain",
  });

  return (
    <div className="history-response-viewer">
      <div className="response-toolbar">
        <div className="tabs">
          <button
            className={`tab ${tab === "body" ? "active" : ""}`}
            onClick={() => setTab("body")}
          >
            Body
          </button>
          <button
            className={`tab ${tab === "headers" ? "active" : ""}`}
            onClick={() => setTab("headers")}
          >
            Headers
            <span className="badge">
              {Object.keys(response.headers).length}
            </span>
          </button>
          {(response.cookies?.length || 0) > 0 && (
            <button
              className={`tab ${tab === "cookies" ? "active" : ""}`}
              onClick={() => setTab("cookies")}
            >
              Cookies
              <span className="badge">{response.cookies!.length}</span>
            </button>
          )}
        </div>
        <div className="response-actions">
          <Tooltip text="Copy response to clipboard">
            <button
              className="action-btn"
              onClick={() => {
                navigator.clipboard.writeText(getResponseContent());
                vscode.postMessage({
                  type: "showInfo",
                  message: "Copied to clipboard!",
                });
              }}
            >
              <CopyIcon />
            </button>
          </Tooltip>
          <Tooltip text="Download response">
            <button
              className="action-btn"
              onClick={() => {
                const { extension, mimeType } = getResponseFileInfo();
                vscode.postMessage({
                  type: "downloadResponse",
                  content: getResponseContent(),
                  filename: `response-${Date.now()}.${extension}`,
                  mimeType,
                });
              }}
            >
              <DownloadIcon />
            </button>
          </Tooltip>
          <Tooltip
            text="Open response in VS Code editor"
            position="top-right"
          >
            <button
              className="action-btn"
              onClick={() => {
                const { extension, mimeType } = getResponseFileInfo();
                vscode.postMessage({
                  type: "openResponseInEditor",
                  content: getResponseContent(),
                  extension,
                  mimeType,
                });
              }}
            >
              <PencilIcon />
            </button>
          </Tooltip>
        </div>
      </div>

      {truncated && (
        <p className="empty-hint history-response-truncated-hint">
          Response content was truncated for storage — actions above use the
          stored (possibly partial) data.
        </p>
      )}

      <div className="response-content">
        {tab === "body" && (
          <BodyEditor
            value={formatJson(response.data)}
            language={getEditorLanguageFromContentType(contentType)}
            readOnly
            className="response-editor"
            showHint="Ctrl+F search"
          />
        )}
        {tab === "headers" && (
          <div className="response-headers">
            {Object.keys(response.headers).length === 0 ? (
              <p className="empty-hint">No headers available</p>
            ) : (
              Object.entries(response.headers).map(([key, value]) => (
                <div key={key} className="response-header-row">
                  <span className="header-name">{key}</span>
                  <span className="header-value">{value}</span>
                </div>
              ))
            )}
          </div>
        )}
        {tab === "cookies" && (
          <div className="response-headers">
            {(response.cookies || []).map((cookie, i) => (
              <div key={i} className="response-header-row">
                <span className="header-name">{cookie.name}</span>
                <span className="header-value">
                  {cookie.value}
                  {cookie.path && (
                    <span style={{ opacity: 0.5, marginLeft: "8px" }}>
                      Path: {cookie.path}
                    </span>
                  )}
                  {cookie.httpOnly && (
                    <span style={{ opacity: 0.5, marginLeft: "8px" }}>
                      HttpOnly
                    </span>
                  )}
                  {cookie.secure && (
                    <span style={{ opacity: 0.5, marginLeft: "8px" }}>
                      Secure
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryResponseViewer;
```

#### Step 2: Update `src/webview/components/HistoryEntryList.tsx`

- [ ] Replace the whole file with:

```tsx
import React, { useState } from "react";
import { formatRelativeTime, getStatusColor } from "../helpers/helper";
import { formatJson } from "../helpers/helper";
import { HistoryEntry } from "../types/internal.types";
import HistoryResponseViewer from "./HistoryResponseViewer";
import Tooltip from "./Tooltip";
import TrashIcon from "./icons/TrashIcon";

interface HistoryEntryListProps {
  entries: HistoryEntry[];
  showRequestName?: boolean;
  vscode: { postMessage: (message: unknown) => void };
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
  vscode,
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
                  <HistoryResponseViewer
                    response={entry.response}
                    truncated={entry.truncated}
                    vscode={vscode}
                  />
                </div>

                <HistoryEntryActions
                  entry={entry}
                  onRestore={onRestore}
                  onDelete={onDelete}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Placeholder for Task 4 — Task 4 replaces this with the real
// restore-confirmation-aware implementation and removes this comment.
const HistoryEntryActions: React.FC<{
  entry: HistoryEntry;
  onRestore: (entryId: string) => void;
  onDelete: (entryId: string) => void;
}> = ({ entry, onRestore, onDelete }) => (
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
    <Tooltip text="Delete this entry" position="top-right">
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
);

export default HistoryEntryList;
```

Note: this step intentionally leaves the Restore button behavior unchanged (extracted into a small `HistoryEntryActions` sub-component so Task 4 can replace just that piece without re-touching the rest of the file). The `entry.truncated` banner that used to sit above the Request section is now handled inside `HistoryResponseViewer` (next to the response actions, per the design spec), so it is not duplicated here.

#### Step 3: Thread the `vscode` prop through both callers

- [ ] In `src/webview/history/HistoryView.tsx`, find the `<HistoryEntryList ... />` usage and add `vscode={vscode}` (the module-level `vscode` from `acquireVsCodeApi()` already declared at the top of that file):

```tsx
        <HistoryEntryList
          entries={entries}
          showRequestName
          vscode={vscode}
          onRestore={handleRestore}
          onDelete={handleDelete}
        />
```

- [ ] In `src/webview/request/HistoryTab.tsx`, destructure `vscode` from `useRequestContext()` and pass it down:

```tsx
const HistoryTab: React.FC = () => {
  const {
    historyEntries,
    vscode,
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
          vscode={vscode}
          onRestore={handleRestoreHistoryEntry}
          onDelete={handleDeleteHistoryEntry}
        />
      </div>
    </div>
  );
};
```

#### Step 4: Add CSS

- [ ] In `src/webview/history/styles.css`, append these new rules at the end of the file (they duplicate the tab/action-button styling that already exists in `request/styles.css`, following this codebase's existing per-bundle CSS duplication convention):

```css
/* ---- Response tabs & actions (duplicated from request/styles.css) ---- */
.tabs {
  display: flex;
  gap: var(--rl-sp1);
  overflow-x: auto;
  scrollbar-width: none;
  position: relative;
}
.tabs::-webkit-scrollbar {
  height: 0;
}

.tab {
  display: flex;
  align-items: center;
  gap: var(--rl-sp2);
  padding: var(--rl-sp2) var(--rl-sp2);
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--vscode-descriptionForeground);
  font-size: 0.92em;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  flex-shrink: 0;
  white-space: nowrap;
}

.tab::before {
  content: "";
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--restlab-gradient);
  transform: scaleX(0);
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 1px;
}

.tab:hover {
  color: var(--vscode-foreground);
  background: var(--glass-bg);
}

.tab.active {
  color: var(--restlab-accent);
}

.tab.active::before {
  transform: scaleX(1);
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.4em;
  height: 1.4em;
  padding: 0 0.42em;
  font-size: 0.72em;
  font-weight: 700;
  background: var(--restlab-gradient);
  color: #ffffff;
  border-radius: 0.8em;
}

.response-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--rl-sp2);
  flex-wrap: wrap;
  gap: var(--rl-sp3);
}

.response-actions {
  display: flex;
  gap: 8px;
}

.response-actions .action-btn {
  display: flex;
  align-items: center;
  gap: var(--rl-sp2);
  height: var(--rl-ctrl);
  padding: 0 var(--rl-sp4);
  border: 1px solid var(--glass-border);
  border-radius: var(--rl-r2);
  background: var(--glass-bg);
  color: var(--vscode-foreground);
  font-size: 0.8em;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.response-actions .action-btn:hover {
  background: var(--restlab-gradient);
  border-color: transparent;
  color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--restlab-accent-glow);
}

.response-actions .action-btn svg {
  flex-shrink: 0;
}

.response-content {
  flex: 1;
  min-height: 0;
  overflow: visible;
  display: flex;
  flex-direction: column;
}

/* ---- History-specific response viewer sizing ---- */
.history-response-viewer {
  display: flex;
  flex-direction: column;
  gap: var(--rl-sp2);
}

.history-response-viewer .response-editor {
  height: 360px;
  border: 1px solid var(--glass-border);
  border-radius: var(--rl-r2);
  overflow: hidden;
}

.history-response-truncated-hint {
  margin: 0;
}
```

- [ ] In `src/webview/request/styles.css`, `.tabs`, `.tab`, `.badge`, `.response-toolbar`, `.response-actions`, and `.response-content` already exist (used by `ResponsePanel.tsx`) — only append the History-specific sizing override, right after the existing `.response-editor` rule (around line 1734):

```css
.history-response-viewer {
  display: flex;
  flex-direction: column;
  gap: var(--rl-sp2);
}

.history-response-viewer .response-editor {
  height: 360px;
  border: 1px solid var(--glass-border);
  border-radius: var(--rl-r2);
  overflow: hidden;
}

.history-response-truncated-hint {
  margin: 0;
}
```

Check `--restlab-accent-glow` is defined in `history/styles.css` before relying on it in the copied `.response-actions .action-btn:hover` rule — if it's missing, add `--restlab-accent-glow: rgba(56, 189, 248, 0.35);` (matching `request/styles.css`'s definition) to the `:root` block near the other `--restlab-*` variables at the top of `history/styles.css`.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/webview/components/HistoryResponseViewer.tsx \
  src/webview/components/HistoryEntryList.tsx \
  src/webview/history/HistoryView.tsx \
  src/webview/request/HistoryTab.tsx \
  src/webview/history/styles.css \
  src/webview/request/styles.css
git commit -m "feat: tabbed response viewer with copy/download/open-in-editor for History entries"
```

**Manual QA (developer, later):**
- In the standalone History panel: expand an entry, confirm Body/Headers/Cookies tabs appear, the body area is noticeably larger than before (360px, was 240px) and scrolls internally, and Copy/Download/Open-in-Editor all work.
- Repeat inside a request's History tab.
- Expand an entry that has `truncated: true` (or force one by sending a request with a very large response, if the pruning logic truncates it) and confirm the truncation note appears next to the actions and the actions remain clickable.

---

### Task 4: Restore button — tooltip and confirmation dialog

**Files:**
- Create: `src/webview/components/ConfirmDialog.tsx`
- Modify: `src/webview/components/HistoryEntryList.tsx` (replace the `HistoryEntryActions` sub-component from Task 3 with the confirmation-aware version)
- Modify: `src/webview/history/styles.css` (append confirm-dialog CSS)
- Modify: `src/webview/request/styles.css` (append confirm-dialog CSS)

**Interfaces:**
- Consumes: nothing from earlier tasks besides the `HistoryEntryActions` sub-component location established in Task 3.
- Produces: `ConfirmDialog` component, default export, props `{ title: string; message: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean; onConfirm: () => void; onCancel: () => void }`. Generic — not History-specific — for reuse elsewhere later.

#### Step 1: Create `src/webview/components/ConfirmDialog.tsx`

- [ ] Write the file:

```tsx
import React from "react";
import { createPortal } from "react-dom";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}) => {
  return createPortal(
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="confirm-dialog-title">{title}</h3>
        <p className="confirm-dialog-message">{message}</p>
        <div className="confirm-dialog-actions">
          <button className="confirm-dialog-cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={`confirm-dialog-confirm ${danger ? "danger" : ""}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ConfirmDialog;
```

#### Step 2: Replace the `HistoryEntryActions` sub-component in `HistoryEntryList.tsx`

- [ ] In `src/webview/components/HistoryEntryList.tsx`, add these imports at the top (alongside the existing ones):

```tsx
import ConfirmDialog from "./ConfirmDialog";
```

- [ ] Replace the `HistoryEntryActions` component (added in Task 3) with:

```tsx
const HistoryEntryActions: React.FC<{
  entry: HistoryEntry;
  onRestore: (entryId: string) => void;
  onDelete: (entryId: string) => void;
}> = ({ entry, onRestore, onDelete }) => {
  const [confirmingRestore, setConfirmingRestore] = useState(false);

  return (
    <div className="history-entry-actions">
      <Tooltip
        text="Restore this request's saved method, URL, headers, params, and body into the editor — overwrites current values"
        position="top-right"
      >
        <button
          className="add-btn"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmingRestore(true);
          }}
        >
          Restore
        </button>
      </Tooltip>
      <Tooltip text="Delete this entry" position="top-right">
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
      {confirmingRestore && (
        <ConfirmDialog
          title="Restore this request?"
          message={`This will overwrite the current method, URL, headers, params, and body of "${entry.requestName}" with the values saved ${formatRelativeTime(entry.timestamp)}. This cannot be undone.`}
          confirmLabel="Restore"
          danger
          onConfirm={() => {
            setConfirmingRestore(false);
            onRestore(entry.id);
          }}
          onCancel={() => setConfirmingRestore(false)}
        />
      )}
    </div>
  );
};
```

This adds a second `useState` import usage in the same file — `useState` is already imported at the top of `HistoryEntryList.tsx` from Task 3's version, so no import change is needed there.

#### Step 3: Add confirm-dialog CSS

- [ ] Append to `src/webview/history/styles.css`:

```css
/* ---- Confirm dialog ---- */
.confirm-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.confirm-dialog {
  width: min(360px, calc(100vw - 32px));
  background: var(--vscode-editor-background);
  border: 1px solid var(--glass-border);
  border-radius: var(--rl-r2);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  padding: var(--rl-sp4);
  display: flex;
  flex-direction: column;
  gap: var(--rl-sp3);
}

.confirm-dialog-title {
  font-size: 14px;
  font-weight: 700;
  margin: 0;
}

.confirm-dialog-message {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  margin: 0;
  line-height: 1.5;
}

.confirm-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--rl-sp2);
  margin-top: var(--rl-sp2);
}

.confirm-dialog-cancel,
.confirm-dialog-confirm {
  height: var(--rl-ctrl);
  padding: 0 var(--rl-sp4);
  border-radius: var(--rl-r2);
  font-size: 0.85em;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.confirm-dialog-cancel {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  color: var(--vscode-foreground);
}

.confirm-dialog-cancel:hover {
  background: var(--glass-border);
}

.confirm-dialog-confirm {
  background: var(--restlab-gradient);
  color: #ffffff;
}

.confirm-dialog-confirm:hover {
  filter: brightness(1.1);
}

.confirm-dialog-confirm.danger {
  background: var(--restlab-danger);
}

.confirm-dialog-confirm.danger:hover {
  background: #dc2626;
}
```

- [ ] Append the identical block to `src/webview/request/styles.css` (the History tab lives in this bundle too, so it needs its own copy per the existing per-bundle CSS convention).

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/webview/components/ConfirmDialog.tsx \
  src/webview/components/HistoryEntryList.tsx \
  src/webview/history/styles.css \
  src/webview/request/styles.css
git commit -m "feat: add tooltip and confirmation dialog to History's Restore button"
```

**Manual QA (developer, later):**
- Hover the Restore button — confirm the tooltip explains what it does.
- Click Restore — confirm a dialog appears naming the request and explaining the overwrite, with Cancel and Restore buttons.
- Click Cancel — confirm nothing changes (no overwrite, dialog closes).
- Click the overlay outside the dialog — confirm it also cancels (same as Cancel).
- Click Restore (confirm) — confirm the request's saved form state is overwritten exactly as it was before this change (same underlying `restoreHistoryEntryById` logic, untouched).

---

## Self-Review Notes

- **Spec coverage:** Bigger/tabbed response area → Task 3. Copy/Download/Open-in-Editor → Tasks 1-3. Restore tooltip + confirmation → Task 4. Truncated-entry handling → Task 3. Shared backend logic (no duplication) → Task 1-2. CSS/component size discipline → noted per task.
- **Deviation from spec, called out explicitly:** the spec said to "remove the `240px` cap on `.history-body`." In practice `.history-body` is also used by the still-unchanged Request-body `<pre>` block, so this plan leaves that class untouched and instead gives the response viewer its own `.history-response-viewer .response-editor { height: 360px }` rule — same effective outcome (response is no longer capped at 240px) without touching the Request section's styling, which the spec says must stay as-is.
- **Type consistency:** `vscode: { postMessage: (message: unknown) => void }` is used identically in `HistoryEntryList`, `HistoryResponseViewer` — matches the shape already used by `EnvironmentModal.tsx` elsewhere in the codebase. `ResponseData` and `HistoryEntry` types are consumed as already defined in `internal.types.ts`, no changes needed there.
