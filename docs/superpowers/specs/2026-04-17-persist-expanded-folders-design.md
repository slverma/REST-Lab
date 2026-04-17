# Persist Expanded Folders State

**Date:** 2026-04-17  
**Status:** Approved

## Problem

`expandedFolders` is a `Set<string>` held in React state in `Sidebar.tsx`. It resets to empty every time the webview loads, which happens on every VS Code restart. Users lose their expanded collection/folder layout each session.

## Goal

Persist the set of expanded folder IDs across full VS Code restarts, so the sidebar restores the same expanded/collapsed layout the user left it in.

## Storage

A new `globalState` key `restlab.expandedFolders` stores a `string[]` of expanded folder IDs. UI state is kept separate from folder data — no changes to the `Folder` type.

## Data Flow

### On load
`SidebarProvider._sendFoldersToWebview()` reads `restlab.expandedFolders` from `globalState` and includes it as `expandedFolderIds: string[]` in the `foldersUpdated` message.

The webview initialises `expandedFolders` state as `new Set(expandedFolderIds)` instead of `new Set()`.

### On toggle
`handleToggleFolder` updates the `Set` as before. After each update, the webview sends a `saveExpandedFolders` message with the new array of IDs. `SidebarProvider` handles this by writing the array to `globalState`.

### Auto-expand (active request)
The existing effect that expands ancestor folders when an active request changes also sends a `saveExpandedFolders` message after expanding.

### On folder delete
Before removing a folder from the tree, `SidebarProvider.deleteFolder` collects all IDs being deleted (the target folder + all descendant subfolder IDs, gathered recursively). After deletion it reads `restlab.expandedFolders`, filters out all collected IDs, and writes the cleaned array back to `globalState`. This prevents stale IDs from accumulating.

## Affected Files

| File | Change |
|------|--------|
| `src/providers/SidebarProvider.ts` | Handle `saveExpandedFolders` message; include `expandedFolderIds` in `_sendFoldersToWebview`; prune deleted IDs in `deleteFolder` |
| `src/webview/sidebar/Sidebar.tsx` | Initialise `expandedFolders` from `expandedFolderIds` in `foldersUpdated` message; send `saveExpandedFolders` on every toggle and auto-expand |

## Edge Cases

- **Folder deleted:** all descendant IDs are pruned from storage in the same operation
- **Folder moved:** IDs remain valid (IDs don't change on move), no cleanup needed
- **Folder renamed:** IDs remain valid, no cleanup needed
- **Empty state:** if `restlab.expandedFolders` is not set, defaults to `[]` — all folders collapsed, same as current behaviour
