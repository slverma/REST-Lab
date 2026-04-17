# Persist Expanded Folders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist the set of expanded folder/collection IDs to `globalState` so the sidebar restores the same expanded layout after a full VS Code restart.

**Architecture:** The webview sends a `saveExpandedFolders` message on every expand/collapse and auto-expand. The extension stores the IDs under `restlab.expandedFolders` in `globalState` and includes them in the `foldersUpdated` message on load. On delete, the extension prunes any deleted folder IDs from the stored set.

**Tech Stack:** TypeScript, VS Code Extension API (`globalState`), React (webview)

---

## File Map

| File | Change |
|------|--------|
| `src/providers/SidebarProvider.ts` | (1) Add `expandedFolderIds` to `_sendFoldersToWebview`; (2) handle `saveExpandedFolders` message; (3) prune deleted IDs in `deleteFolder` |
| `src/webview/sidebar/Sidebar.tsx` | (1) Restore `expandedFolders` from `expandedFolderIds` on initial load; (2) send `saveExpandedFolders` on toggle and auto-expand |

---

### Task 1: Include `expandedFolderIds` in `_sendFoldersToWebview`

**Files:**
- Modify: `src/providers/SidebarProvider.ts`

- [ ] **Step 1: Update `_sendFoldersToWebview` to read and send saved IDs**

  In `SidebarProvider.ts`, replace the `_sendFoldersToWebview` method (currently at the bottom of the file, around line 1094):

  ```typescript
  private _sendFoldersToWebview() {
    if (this._view) {
      const expandedFolderIds = this._context.globalState.get<string[]>(
        "restlab.expandedFolders",
        [],
      );
      this._view.webview.postMessage({
        type: "foldersUpdated",
        folders: this._folders,
        expandedFolderIds,
      });
    }
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npm run build
  ```

  Expected: build completes with no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/providers/SidebarProvider.ts
  git commit -m "feat: include expandedFolderIds in foldersUpdated message"
  ```

---

### Task 2: Handle `saveExpandedFolders` message in the extension

**Files:**
- Modify: `src/providers/SidebarProvider.ts`

- [ ] **Step 1: Add the message handler case**

  In `SidebarProvider.ts`, inside `webviewView.webview.onDidReceiveMessage`, add a new case after the existing `"renameRequest"` case (around line 159):

  ```typescript
  case "saveExpandedFolders":
    await this._context.globalState.update(
      "restlab.expandedFolders",
      message.expandedFolderIds,
    );
    break;
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npm run build
  ```

  Expected: build completes with no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/providers/SidebarProvider.ts
  git commit -m "feat: handle saveExpandedFolders message in SidebarProvider"
  ```

---

### Task 3: Prune deleted folder IDs from stored expanded state

**Files:**
- Modify: `src/providers/SidebarProvider.ts`

- [ ] **Step 1: Add a helper to collect all IDs in a folder subtree**

  In `SidebarProvider.ts`, add this private method after `_removeFolder` (around line 827):

  ```typescript
  private _collectFolderIds(folder: Folder): string[] {
    const ids = [folder.id];
    if (folder.subfolders) {
      for (const sub of folder.subfolders) {
        ids.push(...this._collectFolderIds(sub));
      }
    }
    return ids;
  }
  ```

- [ ] **Step 2: Prune IDs inside `deleteFolder`**

  In `SidebarProvider.ts`, update the `deleteFolder` method (currently around line 213). Add ID collection before deletion and pruning after deletion:

  ```typescript
  public async deleteFolder(folderId: string) {
    // Collect all IDs being deleted (folder + all descendants)
    const folderToDelete = this._findFolder(folderId);
    const deletedIds = folderToDelete
      ? this._collectFolderIds(folderToDelete)
      : [folderId];

    // Delete from top-level folders
    const topLevelIndex = this._folders.findIndex((f) => f.id === folderId);
    if (topLevelIndex >= 0) {
      this._folders.splice(topLevelIndex, 1);
    } else {
      // Delete from subfolders recursively
      const deleteFromSubfolders = (folders: Folder[]): boolean => {
        for (const folder of folders) {
          if (folder.subfolders) {
            const index = folder.subfolders.findIndex((f) => f.id === folderId);
            if (index >= 0) {
              folder.subfolders.splice(index, 1);
              return true;
            }
            if (deleteFromSubfolders(folder.subfolders)) {
              return true;
            }
          }
        }
        return false;
      };
      deleteFromSubfolders(this._folders);
    }

    // Prune deleted IDs from stored expanded state
    const expandedIds = this._context.globalState.get<string[]>(
      "restlab.expandedFolders",
      [],
    );
    const pruned = expandedIds.filter((id) => !deletedIds.includes(id));
    await this._context.globalState.update("restlab.expandedFolders", pruned);

    this._saveFolders();
    this._sendFoldersToWebview();
  }
  ```

  > Note: the original `deleteFolder` was synchronous. It is now `async` because of the `globalState.update` call. Check that all callers handle it correctly — the existing call sites use `this.deleteFolder(message.folderId)` without `await`, which is fine since the caller doesn't need to wait for the result.

- [ ] **Step 3: Verify TypeScript compiles**

  ```bash
  npm run build
  ```

  Expected: build completes with no errors.

- [ ] **Step 4: Commit**

  ```bash
  git add src/providers/SidebarProvider.ts
  git commit -m "feat: prune deleted folder IDs from expanded state on delete"
  ```

---

### Task 4: Restore expanded state in the webview on initial load

**Files:**
- Modify: `src/webview/sidebar/Sidebar.tsx`

- [ ] **Step 1: Add an `initialLoadDone` ref and restore state on first `foldersUpdated`**

  In `Sidebar.tsx`, update the `Sidebar` component. Add a ref just after the state declarations (around line 272):

  ```typescript
  const initialLoadDone = useRef(false);
  ```

  Then update the `handleMessage` function inside the first `useEffect` to restore expanded IDs on the first message only:

  ```typescript
  const handleMessage = (event: MessageEvent) => {
    const message = event.data;
    if (message.type === "foldersUpdated") {
      setFolders(message.folders);
      if (!initialLoadDone.current) {
        initialLoadDone.current = true;
        if (message.expandedFolderIds && message.expandedFolderIds.length > 0) {
          setExpandedFolders(new Set<string>(message.expandedFolderIds));
        }
      }
    } else if (message.type === "activeRequestChanged") {
      setActiveRequestId(message.requestId ?? null);
    }
  };
  ```

  Also add `useRef` to the React import at the top of the file (it is already imported — verify it includes `useRef`):

  ```typescript
  import React, { useEffect, useRef, useState } from "react";
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npm run build
  ```

  Expected: build completes with no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/webview/sidebar/Sidebar.tsx
  git commit -m "feat: restore expanded folders from saved state on sidebar load"
  ```

---

### Task 5: Save expanded state on every toggle and auto-expand

**Files:**
- Modify: `src/webview/sidebar/Sidebar.tsx`

- [ ] **Step 1: Send `saveExpandedFolders` from `handleToggleFolder`**

  Replace the existing `handleToggleFolder` function (around line 333):

  ```typescript
  const handleToggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      vscode.postMessage({
        type: "saveExpandedFolders",
        expandedFolderIds: [...next],
      });
      return next;
    });
  };
  ```

- [ ] **Step 2: Send `saveExpandedFolders` from the auto-expand effect**

  Replace the existing auto-expand `useEffect` (around line 297):

  ```typescript
  useEffect(() => {
    if (!activeRequestId) return;
    const findPath = (
      items: Folder[],
      id: string,
      path: string[],
    ): string[] | null => {
      for (const folder of items) {
        if (folder.requests?.some((r) => r.id === id)) {
          return [...path, folder.id];
        }
        if (folder.subfolders) {
          const result = findPath(folder.subfolders, id, [...path, folder.id]);
          if (result) return result;
        }
      }
      return null;
    };
    const path = findPath(folders, activeRequestId, []);
    if (path) {
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        path.forEach((fid) => next.add(fid));
        vscode.postMessage({
          type: "saveExpandedFolders",
          expandedFolderIds: [...next],
        });
        return next;
      });
    }
  }, [activeRequestId, folders]);
  ```

- [ ] **Step 3: Verify TypeScript compiles**

  ```bash
  npm run build
  ```

  Expected: build completes with no errors.

- [ ] **Step 4: Commit**

  ```bash
  git add src/webview/sidebar/Sidebar.tsx
  git commit -m "feat: save expanded folders state on every toggle and auto-expand"
  ```

---

### Task 6: Manual end-to-end verification

- [ ] **Step 1: Build and install the extension locally**

  In VS Code, press `F5` to launch the Extension Development Host (or run `npm run build` and use the VS Code command palette → "Developer: Reload Window").

- [ ] **Step 2: Verify expand persists across reload**

  1. Open the REST Lab sidebar
  2. Expand one or more collections/folders
  3. Run command palette → "Developer: Reload Window"
  4. Expected: the same folders are still expanded after reload

- [ ] **Step 3: Verify collapse persists across reload**

  1. Collapse a previously expanded folder
  2. Reload the window
  3. Expected: the folder remains collapsed

- [ ] **Step 4: Verify delete cleans up stored state**

  1. Expand a collection that has subfolders
  2. Delete the collection
  3. Reload the window
  4. Expected: no stale IDs cause any visible issue; other collections retain their state

- [ ] **Step 5: Verify new folders start collapsed**

  1. Create a new collection
  2. Reload the window without expanding it
  3. Expected: the new collection is collapsed

- [ ] **Step 6: Commit if everything looks good**

  ```bash
  git add .
  git commit -m "chore: verify persist-expanded-folders feature complete"
  ```
