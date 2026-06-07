# First-Launch Seed Data Design

**Date:** 2026-06-07  
**Branch:** enh/design-revamp  
**Status:** Approved

## Goal

When a user installs REST Lab for the first time, seed a ready-to-use example collection so they can immediately understand how collections, folders, requests, environments, and base URLs work — without needing to read documentation.

## Trigger Condition

Seeding happens once, on first activation, when `restlab.folders` in `globalState` is empty or undefined. If the array has any entries, the seed is skipped entirely and never runs again.

## Approach

A single `seedDefaultData(context: vscode.ExtensionContext)` function in `src/extension.ts`, called as the very first line of `activate()`. No new files, no new classes. The `SidebarProvider` constructor picks up the seeded data transparently since it reads `restlab.folders` from `globalState`.

## Seeded Structure

```
📁 JSONPlaceholder  (collection root)
    baseUrl: https://jsonplaceholder.typicode.com
    header:  Content-Type: application/json
    environments: Development, Production
    activeEnvironment: Development

  📁 Posts
      GET  Get all posts       → /posts
      GET  Get post by ID      → /posts/1
      POST Create post         → /posts  (JSON body)
      DEL  Delete post         → /posts/1

  📁 Users
      GET  Get all users       → /users
      GET  Get user by ID      → /users/1
```

## GlobalState Keys Written

| Key | Value |
|---|---|
| `restlab.folders` | Full nested `Folder[]` tree |
| `restlab.folder.restlab-example-collection` | `FolderConfig` — baseUrl, shared header, 2 environments |
| `restlab.request.restlab-example-<name>` | `RequestConfig` × 6 |
| `restlab.expandedFolders` | `[collectionId, postsFolderId]` — pre-expanded |

## IDs

All seed IDs are hard-coded strings (e.g., `restlab-example-collection`, `restlab-example-posts-folder`) rather than `Date.now()`-based. This makes the seed deterministic and avoids race conditions.

## Environments

**Development**
- `baseUrl`: `https://jsonplaceholder.typicode.com`
- `userId`: `1`

**Production**
- `baseUrl`: `https://jsonplaceholder.typicode.com`
- `userId`: `1`

Both point to the same public API (JSONPlaceholder has no prod equivalent), but the two-environment setup teaches users how environment switching works.

## Request Configs

| Name | Method | URL | Body |
|---|---|---|---|
| Get all posts | GET | `/posts` | — |
| Get post by ID | GET | `/posts/1` | — |
| Create post | POST | `/posts` | `{"title":"foo","body":"bar","userId":1}` |
| Delete post | DELETE | `/posts/1` | — |
| Get all users | GET | `/users` | — |
| Get user by ID | GET | `/users/1` | — |

The `url` field on each request stores only the path (e.g., `/posts`); the collection-level `baseUrl` is prepended at request execution time by the existing inheritance logic.

## User Experience

- The collection appears immediately when the extension opens — Posts and the Posts folder are pre-expanded.
- The example is a plain collection; users can delete, rename, or modify it like any other.
- No notification or prompt is shown.

## What Is Not Changed

- `SidebarProvider` — no modifications needed.
- `RequestEditorProvider` — no modifications needed.
- All existing import/export flows — unaffected.

## Implementation Location

`src/extension.ts` — `seedDefaultData()` function + call at top of `activate()`.
