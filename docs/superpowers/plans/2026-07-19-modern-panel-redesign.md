# Modern Panel Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the request/response split in the request editor webview a VS Code "modern UI" look — matching rounded-card panels with no separator border, a dot-indicator drag handle between them that turns into a bold gradient line on hover — and fix the sidebar's whole-row grab cursor by scoping drag to a dedicated grip handle.

**Architecture:** All panel/divider changes are CSS + markup only inside `src/webview/request/` (no changes to `RequestContext.tsx`'s resize state/logic or the `ResizeObserver`-driven layout switch). The sidebar fix moves `draggable` off the row `<div>` onto a new grip `<span>`, which also requires extracting `FolderItem` out of `Sidebar.tsx` into its own file to keep `Sidebar.tsx` under the project's 500-line component limit (it's 678 lines before this change).

**Tech Stack:** TypeScript (strict), React 18, plain CSS custom properties (no CSS-in-JS, no Tailwind in these two bundles' relevant files).

## Global Constraints

- Strict TypeScript — never `@ts-nocheck`, `@ts-ignore`, eslint-disable.
- No test suite/lint script in this repo — verification is `npx tsc --noEmit` (run it yourself) plus a manual step for the developer (do not run `npm run build`/`npm run watch` yourself).
- Keep components under 500 lines; extract a sub-component rather than growing a file further (project rule — this is why Task 3 extracts `FolderItem`).
- Keep spacing/padding on the smaller end of the existing `--rl-sp*` scale — confirmed with the user that generous demo-style margins must not be used, so the layout stays usable on small screens and at 150% editor zoom.
- No new CSS custom properties — consolidate onto tokens that already exist in `src/webview/request/styles.css`'s `:root` block (`--rl-sp0`…`--rl-sp5`, `--rl-r1`/`--rl-r2`/`--rl-r3`, `--restlab-gradient*`, `--glass-bg`, `--glass-border`).
- Spec: `docs/superpowers/specs/2026-07-19-modern-panel-redesign-design.md`.

---

### Task 1: Symmetric rounded panels

**Files:**
- Modify: `src/webview/request/styles.css:834-841` (`.request-content`)
- Modify: `src/webview/request/styles.css:1463-1486` (`.response-section`)

**Interfaces:** None — pure CSS, no new classes consumed elsewhere.

- [ ] **Step 1: Give `.request-content` the same card treatment `.response-section` already has**

Change:

```css
/* Request Content */
.request-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
```

to:

```css
/* Request Content */
.request-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  padding: var(--rl-sp0) var(--rl-sp2) var(--rl-sp2);
  border: 1px solid var(--glass-border);
  border-radius: var(--rl-r3);
  background: var(--glass-bg);
  backdrop-filter: blur(8px);
  position: relative;
}

.request-content::before {
  content: "";
  position: absolute;
  top: 0;
  left: 24px;
  right: 24px;
  height: 1px;
  background: var(--restlab-gradient);
  opacity: 0.5;
}
```

This mirrors `.response-section` and `.response-section::before` exactly (same padding/border/radius/background/accent-line pattern), giving the request side the same card look. `overflow: hidden` is kept (unlike `.response-section`'s `overflow: visible`) because `.request-content` relies on it to clip the scrolling tab content — this is an intentional, pre-existing difference, not an inconsistency to fix.

- [ ] **Step 2: Move `.response-section` off its hardcoded radius onto the shared token**

Change:

```css
/* Response Section */
.response-section {
  padding: var(--rl-sp0) var(--rl-sp2) var(--rl-sp2);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  background: var(--glass-bg);
```

to:

```css
/* Response Section */
.response-section {
  padding: var(--rl-sp0) var(--rl-sp2) var(--rl-sp2);
  border: 1px solid var(--glass-border);
  border-radius: var(--rl-r3);
  background: var(--glass-bg);
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors (this task is CSS-only, but confirms nothing else broke).

- [ ] **Step 4: Commit**

```bash
git add src/webview/request/styles.css
git commit -m "style: give the request panel the same rounded-card treatment as the response panel"
```

---

### Task 2: Divider dots + bold hover line

**Files:**
- Modify: `src/webview/request/styles.css:852-933` (`.resize-handle` block)
- Modify: `src/webview/request/ResponsePanel.tsx:64-69`

**Interfaces:** None — the `resize-handle`/`isResizing`/`splitLayout`/`handleResizeStart` wiring from `RequestContext.tsx` is unchanged; only the handle's inner markup and its CSS change.

- [ ] **Step 1: Replace the resize-handle CSS block**

The existing block includes a `.resize-handle-bar` element that is *always* `display: none` regardless of orientation (dead code — both the `.horizontal` and `.vertical` variants hide it), so its hover-only grow/glow rules never fire today. Replace the whole block (lines 852-933) — from:

```css
/* Resize Handle */
.resize-handle {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  user-select: none;
}

/* Horizontal resize handle (for top/bottom split) */
.resize-handle.horizontal {
  height: 5px;
  cursor: row-resize;
  margin: 0;
}

.resize-handle.horizontal::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  background: var(--glass-border);
  transition: background 0.15s ease;
}

.resize-handle.horizontal .resize-handle-bar {
  display: none;
}

/* Vertical resize handle (for left/right split) */
.resize-handle.vertical {
  width: 5px;
  cursor: col-resize;
  margin: 0;
}

.resize-handle.vertical::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  background: var(--glass-border);
  transition: background 0.15s ease;
}

.resize-handle.vertical .resize-handle-bar {
  display: none;
}

.resize-handle:hover::before,
.resize-handle.active::before {
  background: var(--restlab-gradient);
}

.resize-handle-bar {
  border-radius: 2px;
  background: var(--vscode-descriptionForeground);
  opacity: 0.3;
  transition: all 0.15s ease;
  z-index: 1;
}

.resize-handle:hover .resize-handle-bar,
.resize-handle.active .resize-handle-bar {
  background: var(--restlab-gradient);
  opacity: 1;
}

.resize-handle.horizontal:hover .resize-handle-bar,
.resize-handle.horizontal.active .resize-handle-bar {
  width: 64px;
}

.resize-handle.vertical:hover .resize-handle-bar,
.resize-handle.vertical.active .resize-handle-bar {
  height: 64px;
}
```

to:

```css
/* Resize Handle */
.resize-handle {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  user-select: none;
}

/* Horizontal resize handle (for top/bottom split) */
.resize-handle.horizontal {
  height: 8px;
  cursor: row-resize;
  margin: 0;
}

.resize-handle.horizontal::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 2px;
  transform: translateY(-50%);
  border-radius: 1px;
  background: var(--restlab-gradient);
  opacity: 0;
  transition: opacity 0.15s ease;
}

/* Vertical resize handle (for left/right split) */
.resize-handle.vertical {
  width: 8px;
  cursor: col-resize;
  margin: 0;
}

.resize-handle.vertical::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2px;
  transform: translateX(-50%);
  border-radius: 1px;
  background: var(--restlab-gradient);
  opacity: 0;
  transition: opacity 0.15s ease;
}

.resize-handle:hover::before,
.resize-handle.active::before {
  opacity: 1;
}

/* Dot indicator — visible at rest, fades out for the bold line on hover/drag */
.resize-handle-dots {
  display: flex;
  gap: 3px;
  z-index: 1;
  transition: opacity 0.15s ease;
}

.resize-handle.horizontal .resize-handle-dots {
  flex-direction: row;
}

.resize-handle.vertical .resize-handle-dots {
  flex-direction: column;
}

.resize-handle-dots span {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--vscode-descriptionForeground);
  opacity: 0.5;
}

.resize-handle:hover .resize-handle-dots,
.resize-handle.active .resize-handle-dots {
  opacity: 0;
}
```

The handle grows from 5px to 8px (still a slim gap) to give the three dots room without clipping.

- [ ] **Step 2: Swap the resize-handle markup in `ResponsePanel.tsx`**

Change:

```tsx
      <div
        className={`resize-handle ${splitLayout} ${isResizing ? "active" : ""}`}
        onMouseDown={handleResizeStart}
      >
        <div className="resize-handle-bar" />
      </div>
```

to:

```tsx
      <div
        className={`resize-handle ${splitLayout} ${isResizing ? "active" : ""}`}
        onMouseDown={handleResizeStart}
      >
        <div className="resize-handle-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/webview/request/styles.css src/webview/request/ResponsePanel.tsx
git commit -m "style: replace the resize handle's dead bar element with a dot indicator and hover line"
```

---

### Task 3: Sidebar drag handle — icon, `FolderItem` extraction, row wiring

**Files:**
- Create: `src/webview/components/icons/DragHandleIcon.tsx`
- Create: `src/webview/sidebar/FolderItem.tsx`
- Modify: `src/webview/sidebar/Sidebar.tsx:1-267`

**Interfaces:**
- Produces: `DragHandleIcon` (no props, matches the existing icon-component pattern e.g. `PlusIcon`). `FolderItem` — same `FolderItemProps` shape as today, default-exported from its own file instead of being defined inline in `Sidebar.tsx`.
- Consumes (in `FolderItem.tsx`): `Folder`/`Request` from `../types/internal.types`, `FolderActionsDropdown`/`RequestActionsDropdown` from `./`, `Tooltip` from `../components/Tooltip`, existing icon components.

`Sidebar.tsx` is 678 lines before this change, over the project's 500-line component limit — `FolderItem` (currently lines 51-266, ~216 lines) is a self-contained unit with its own props interface and is the exact code this task needs to edit anyway, so extracting it is the natural way to do this task's edit rather than an unrelated refactor.

- [ ] **Step 1: Create the grip icon**

```tsx
import React from "react";
const DragHandleIcon = () => (
  <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
    <circle cx="2.5" cy="2" r="1.4" />
    <circle cx="7.5" cy="2" r="1.4" />
    <circle cx="2.5" cy="7" r="1.4" />
    <circle cx="7.5" cy="7" r="1.4" />
    <circle cx="2.5" cy="12" r="1.4" />
    <circle cx="7.5" cy="12" r="1.4" />
  </svg>
);

export default DragHandleIcon;
```

Save as `src/webview/components/icons/DragHandleIcon.tsx`.

- [ ] **Step 2: Create `FolderItem.tsx`**, moving `getMethodColor`, `FolderItemProps`, and the `FolderItem` component out of `Sidebar.tsx`, with the grip wired onto both the folder row and the request row:

```tsx
import React from "react";
import Tooltip from "../components/Tooltip";
import ChevronIcon from "../components/icons/ChevronIcon";
import CollectionIcon from "../components/icons/CollectionIcon";
import DragHandleIcon from "../components/icons/DragHandleIcon";
import FolderIcon from "../components/icons/FolderIcon";
import PlusIcon from "../components/icons/PlusIcon";
import { Folder, Request } from "../types/internal.types";
import FolderActionsDropdown from "./FolderActionsDropdown";
import RequestActionsDropdown from "./RequestActionsDropdown";

const getMethodColor = (method: string) => {
  switch (method) {
    case "GET":
      return "method-get";
    case "POST":
      return "method-post";
    case "PUT":
      return "method-put";
    case "PATCH":
      return "method-patch";
    case "DELETE":
      return "method-delete";
    default:
      return "";
  }
};

interface FolderItemProps {
  folder: Folder;
  depth?: number;
  isDragging: boolean;
  dragOverFolderId: string | null;
  expandedFolders: Set<string>;
  activeRequestId: string | null;
  onToggleFolder: (folderId: string) => void;
  onDragStart: (
    e: React.DragEvent,
    type: "request" | "folder",
    id: string,
    name: string,
    sourceFolderId?: string,
  ) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, folderId: string) => void;
  onDragLeave: (e: React.DragEvent, folderId: string) => void;
  onDrop: (e: React.DragEvent, targetFolderId: string) => void;
  onAddRequest: (e: React.MouseEvent, folderId: string) => void;
  onAddRequestFromCurl: (e: React.MouseEvent, folderId: string) => void;
  onAddSubfolder: (e: React.MouseEvent, parentFolderId: string) => void;
  onOpenFolder: (e: React.MouseEvent, folder: Folder) => void;
  onExportCollection: (folderId: string, format: string) => void;
  onDuplicateFolder: (e: React.MouseEvent, folderId: string) => void;
  onRenameFolder: (e: React.MouseEvent, folderId: string) => void;
  onDeleteFolder: (e: React.MouseEvent, folderId: string) => void;
  onOpenRequest: (request: Request) => void;
  onRenameRequest: (
    e: React.MouseEvent,
    requestId: string,
    folderId: string,
  ) => void;
  onDuplicateRequest: (
    e: React.MouseEvent,
    requestId: string,
    folderId: string,
  ) => void;
  onDeleteRequest: (
    e: React.MouseEvent,
    requestId: string,
    folderId: string,
  ) => void;
}

const FolderItem: React.FC<FolderItemProps> = ({
  folder,
  depth = 0,
  isDragging,
  dragOverFolderId,
  expandedFolders,
  activeRequestId,
  onToggleFolder,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onAddRequest,
  onAddRequestFromCurl,
  onAddSubfolder,
  onOpenFolder,
  onExportCollection,
  onDuplicateFolder,
  onRenameFolder,
  onDeleteFolder,
  onOpenRequest,
  onRenameRequest,
  onDuplicateRequest,
  onDeleteRequest,
}) => {
  const isDropTarget = dragOverFolderId === folder.id;

  return (
    <div key={folder.id} className="folder-item" data-folder-id={folder.id}>
      <div
        className={`tree-row${isDropTarget ? " drop-target-active" : ""}${isDragging ? " dragging-active" : ""}`}
        onClick={() => onToggleFolder(folder.id)}
        role="button"
        tabIndex={0}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onDragOver={(e) => onDragOver(e, folder.id)}
        onDragLeave={(e) => onDragLeave(e, folder.id)}
        onDrop={(e) => onDrop(e, folder.id)}
      >
        <span
          className="row-grip"
          draggable
          onDragStart={(e) => onDragStart(e, "folder", folder.id, folder.name)}
          onDragEnd={onDragEnd}
          onClick={(e) => e.stopPropagation()}
        >
          <DragHandleIcon />
        </span>
        <ChevronIcon
          className={`tree-icon${expandedFolders.has(folder.id) ? " rotate-90" : ""}`}
        />

        {depth === 0 ? (
          <CollectionIcon className="tree-icon" />
        ) : (
          <FolderIcon className="tree-icon" />
        )}
        <span className="tree-label">
          {folder.name}
        </span>
        <div className="tree-actions">
          <Tooltip text="Add Request">
            <button
              className="action-btn"
              onClick={(e) => onAddRequest(e, folder.id)}
            >
              <PlusIcon />
            </button>
          </Tooltip>
          <FolderActionsDropdown
            folder={folder}
            onAddSubfolder={onAddSubfolder}
            onAddRequestFromCurl={onAddRequestFromCurl}
            onOpenFolder={onOpenFolder}
            onExport={onExportCollection}
            onDuplicate={onDuplicateFolder}
            onRename={onRenameFolder}
            onDelete={onDeleteFolder}
          />
        </div>
      </div>

      {expandedFolders.has(folder.id) && (
        <div className="tree-children">
          {/* Render subfolders first */}
          {folder.subfolders &&
            folder.subfolders.map((subfolder) => (
              <FolderItem
                key={subfolder.id}
                folder={subfolder}
                depth={depth + 1}
                isDragging={isDragging}
                dragOverFolderId={dragOverFolderId}
                expandedFolders={expandedFolders}
                activeRequestId={activeRequestId}
                onToggleFolder={onToggleFolder}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onAddRequest={onAddRequest}
                onAddRequestFromCurl={onAddRequestFromCurl}
                onAddSubfolder={onAddSubfolder}
                onOpenFolder={onOpenFolder}
                onExportCollection={onExportCollection}
                onDuplicateFolder={onDuplicateFolder}
                onRenameFolder={onRenameFolder}
                onDeleteFolder={onDeleteFolder}
                onOpenRequest={onOpenRequest}
                onRenameRequest={onRenameRequest}
                onDuplicateRequest={onDuplicateRequest}
                onDeleteRequest={onDeleteRequest}
              />
            ))}

          {/* Render requests */}
          <div
            className={`req-zone${isDropTarget ? " drop-zone-highlight" : ""}`}
            style={{ paddingLeft: `${20 + depth * 16}px` }}
            onDragOver={(e) => onDragOver(e, folder.id)}
            onDrop={(e) => onDrop(e, folder.id)}
          >
            {(!folder.requests || folder.requests.length === 0) &&
            (!folder.subfolders || folder.subfolders.length === 0) ? (
              <div
                className={`req-empty-hint${isDropTarget ? " drop-hint-visible" : ""}`}
              >
                <span>
                  {isDropTarget ? "Drop here to add" : "No items yet"}
                </span>
              </div>
            ) : (
              folder.requests?.map((request) => (
                <div
                  key={request.id}
                  className={`req-row${isDragging ? " dragging-active" : ""}${request.id === activeRequestId ? " active" : ""}`}
                  onClick={() => onOpenRequest(request)}
                  role="button"
                  tabIndex={0}
                >
                  <span
                    className="row-grip"
                    draggable
                    onDragStart={(e) =>
                      onDragStart(
                        e,
                        "request",
                        request.id,
                        request.name,
                        folder.id,
                      )
                    }
                    onDragEnd={onDragEnd}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DragHandleIcon />
                  </span>
                  <span
                    className={`method-badge ${getMethodColor(request.method)}`}
                  >
                    {request.method}
                  </span>
                  <span className="req-label">
                    {request.name}
                  </span>
                  <RequestActionsDropdown
                    request={request}
                    folderId={folder.id}
                    onRename={onRenameRequest}
                    onDuplicate={onDuplicateRequest}
                    onDelete={onDeleteRequest}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FolderItem;
```

Save as `src/webview/sidebar/FolderItem.tsx`.

Two behavioral changes versus the original inline version, both intentional:
- `draggable`/`onDragStart`/`onDragEnd` moved from the row `<div>` onto the new `.row-grip` `<span>` — only the grip starts a drag now. The row's own `onDragOver`/`onDragLeave`/`onDrop` (it accepting drops as a folder target) stay on the row, since those aren't about the row being draggable.
- Each grip has `onClick={(e) => e.stopPropagation()}` so a plain click on the grip doesn't also bubble up and trigger the row's `onClick` (folder toggle / request open).

- [ ] **Step 3: Trim `Sidebar.tsx`'s head down to the `Sidebar` component, importing `FolderItem`**

Replace lines 1-267 of `src/webview/sidebar/Sidebar.tsx` (everything from the top of the file through the blank line after the old inline `FolderItem` component) with:

```tsx
import React, { useEffect, useRef, useState } from "react";
import CollectionAddIcon from "../components/icons/CollectionAddIcon";
import HistoryIcon from "../components/icons/HistoryIcon";
import NoItemsIcon from "../components/icons/NoItemsIcon";
import Tooltip from "../components/Tooltip";
import { Folder, Request } from "../types/internal.types";
import FolderItem from "./FolderItem";
import ImportDropdown from "./ImportDropdown";

declare function acquireVsCodeApi(): {
  postMessage: (message: unknown) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
};

export const vscode = acquireVsCodeApi();

// Drag data type constants
const DRAG_TYPE_REQUEST = "application/x-restlab-request";
const DRAG_TYPE_FOLDER = "application/x-restlab-folder";

interface DragData {
  type: "request" | "folder";
  id: string;
  sourceFolderId?: string;
  name: string;
}

```

Everything from `export const Sidebar: React.FC = () => {` onward (the rest of the original file, previously starting at line 268) is unchanged — it already only references `FolderItem` by name in JSX, which now resolves via the new import instead of the old inline definition.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. This catches any leftover unused import or missing prop from the extraction.

- [ ] **Step 5: Commit**

```bash
git add src/webview/components/icons/DragHandleIcon.tsx src/webview/sidebar/FolderItem.tsx src/webview/sidebar/Sidebar.tsx
git commit -m "refactor: extract FolderItem from Sidebar.tsx and scope row dragging to a grip handle"
```

---

### Task 4: Sidebar grip styling, cursor scoping fix, final QA

**Files:**
- Modify: `src/webview/sidebar/sidebar.css:195` (insert after)
- Modify: `src/webview/sidebar/drag-drop.css:76-79`
- Modify: `src/webview/sidebar/drag-drop.css:105-112`

**Interfaces:** None — CSS only, closing out Task 3's `.row-grip` markup.

- [ ] **Step 1: Add `.row-grip` styling to `sidebar.css`**

Insert directly after the existing rule (currently at line 195):

```css
.tree-row:hover .tree-icon { color: var(--restlab-accent); }
```

add:

```css

.row-grip {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--rl-icon);
  height: var(--rl-icon);
  color: var(--vscode-descriptionForeground);
  cursor: grab;
  opacity: 0;
  transition: opacity 0.15s ease;
}
.tree-row:hover .row-grip,
.req-row:hover .row-grip {
  opacity: 0.6;
}
.row-grip:active {
  cursor: grabbing;
}
```

This follows the same reserved-space opacity-fade pattern already used for `.action-btn` in this file (`.tree-row:hover .action-btn, .req-row:hover .action-btn { opacity: 0.6; }`), so there's no layout shift when the grip fades in on hover.

- [ ] **Step 2: Scope the cursor rules in `drag-drop.css` to the grip instead of any `[draggable]` element**

Change:

```css
/* Cursor styles during drag */
[draggable="true"] {
  cursor: grab;
}

[draggable="true"]:active {
  cursor: grabbing;
}
```

to:

```css
/* Cursor styles during drag — scoped to the grip handle, not the whole row */
.row-grip {
  cursor: grab;
}

.row-grip:active {
  cursor: grabbing;
}
```

(This duplicates the `.row-grip` cursor rules from Step 1 — that's fine; `drag-drop.css` is the file that owns drag-specific behavior, `sidebar.css` owns the row/grip layout. Keep both.)

- [ ] **Step 3: Fix the now-orphaned `dragging-active[draggable="true"]` selector**

`draggable` no longer lives on the same element as the `.dragging-active` class (it's on the row's child grip now), so this compound selector would stop matching. Change:

```css
/* Make items slightly transparent while dragging */
.dragging-active[draggable="true"]:active {
  opacity: 0.5;
}
```

to:

```css
/* Make items slightly transparent while dragging */
.dragging-active:active {
  opacity: 0.5;
}
```

`:active` still applies to the row while the mouse is pressed on its grip descendant (native CSS `:active`-state bubbling), so this preserves the original visual behavior without requiring `draggable` on the row itself.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors (CSS-only task, but confirms the whole branch still compiles clean).

- [ ] **Step 5: Manual verification (developer runs this)**

Run `npm run watch`, launch the Extension Development Host, and check:

*Panels (Tasks 1-2):*
- Request and response panels both show a rounded border and glass background, no hard line between them.
- At rest, three small dots appear in the gap between the panels; hovering the gap fades the dots out and fades in a bold gradient line along the full length of the gap.
- Drag the handle — the resize still works exactly as before (layout doesn't jump, min/max clamp still applies).
- Toggle the layout button (`SplitIcon`) to switch between side-by-side and stacked — confirm the dots/line orient correctly in both (vertical stack for horizontal dots, horizontal stack for vertical dots).
- Resize the panel narrow enough to hit the `680px` small-screen breakpoint and confirm the panels still look reasonable, not cramped or overlapping.
- Test at 150% editor zoom (`Cmd/Ctrl` + `+` a few times or the zoom setting) — padding inside the panels should stay usable, not overflow.

*Sidebar (Tasks 3-4):*
- Hovering a folder or request row: cursor is a normal pointer over the label/icon/action buttons; only hovering the grip (fades in on the left) shows the grab cursor.
- Clicking the row label still opens the request / toggles the folder, exactly as before.
- Dragging from the grip still lets you reorder requests, move a request into a different folder, reorder folders, and drop at root — all existing drag-and-drop behavior is unchanged, just the initiation point moved.
- Dragging still shows the reduced-opacity effect on the row being dragged.

- [ ] **Step 6: Commit**

```bash
git add src/webview/sidebar/sidebar.css src/webview/sidebar/drag-drop.css
git commit -m "style: fade in the sidebar drag grip on row hover, scope grab cursor to it"
```

---

## Self-Review Notes

- **Spec coverage:** shared radius token + symmetric request/response cards (Task 1); dot indicator + bold hover line, both orientations (Task 2); sidebar grip icon + scoped draggable + click-vs-drag fix (Tasks 3-4); compact spacing per the user's small-screen/150%-zoom feedback (Task 1's token choice + Task 2's 8px handle) — all covered. `FolderItem` extraction wasn't in the spec but is required by the project's 500-line component rule given Task 3 has to edit exactly that code.
- **Placeholder scan:** no TBD/TODO; every step shows exact code or exact before/after diffs.
- **Type consistency:** `DragHandleIcon` (no props) is used identically in `FolderItem.tsx`'s two call sites; `FolderItemProps` is unchanged in shape, just relocated; `.row-grip` class name is consistent across `FolderItem.tsx`, `sidebar.css`, and `drag-drop.css`.
