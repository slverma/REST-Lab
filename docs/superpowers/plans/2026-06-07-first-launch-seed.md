# First-Launch Seed Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seed a ready-to-use JSONPlaceholder example collection on first extension activation so new users immediately understand the tool.

**Architecture:** A single `seedDefaultData(context)` async function is added to `src/extension.ts` and called as the first line of `activate()`. It checks if `restlab.folders` is empty in globalState; if so, it writes the full folder tree, folder config (base URL, environments, shared header), six request configs, and pre-expanded folder state. `SidebarProvider` picks up the seeded data transparently since it reads `restlab.folders` in its constructor.

**Tech Stack:** TypeScript (strict), VS Code extension API (`vscode.ExtensionContext.globalState`), existing type interfaces in `src/providers/SidebarProvider.ts` and `src/webview/types/internal.types.ts`.

---

### Task 1: Add `seedDefaultData` to `extension.ts`

**Files:**
- Modify: `src/extension.ts`

The only file that changes. All seed data is defined inline in the function.

**Type notes:**
- `Folder` and `Request` are imported from `./providers/SidebarProvider` (already exported from there — they define the folder tree shape used by globalState).
- `FolderConfig`, `RequestConfig`, `Environment`, `EnvVariable` are imported from `./webview/types/internal.types` — the webview-side `FolderConfig` includes `environments` and `activeEnvironmentId` which the extension-host-side one omits, but globalState must carry the full shape so the FolderEditor webview can read it.

- [ ] **Step 1: Add new imports to `extension.ts`**

Open `src/extension.ts`. The current import block is:

```typescript
import * as vscode from "vscode";
import { SidebarProvider } from "./providers/SidebarProvider";
import { FolderEditorProvider } from "./providers/FolderEditorProvider";
import { RequestEditorProvider } from "./providers/RequestEditorProvider";
```

Replace with:

```typescript
import * as vscode from "vscode";
import { Folder, Request, SidebarProvider } from "./providers/SidebarProvider";
import { FolderEditorProvider } from "./providers/FolderEditorProvider";
import { RequestEditorProvider } from "./providers/RequestEditorProvider";
import {
  FolderConfig,
  RequestConfig,
} from "./webview/types/internal.types";
```

- [ ] **Step 2: Add `seedDefaultData` function before `activate()`**

Insert the following function immediately before the `export function activate(...)` line:

```typescript
async function seedDefaultData(
  context: vscode.ExtensionContext,
): Promise<void> {
  const existing = context.globalState.get<Folder[]>("restlab.folders");
  if (existing && existing.length > 0) return;

  const COLLECTION_ID = "restlab-example-collection";
  const POSTS_ID = "restlab-example-posts";
  const USERS_ID = "restlab-example-users";
  const REQ_GET_POSTS = "restlab-example-req-get-posts";
  const REQ_GET_POST = "restlab-example-req-get-post";
  const REQ_CREATE_POST = "restlab-example-req-create-post";
  const REQ_DELETE_POST = "restlab-example-req-delete-post";
  const REQ_GET_USERS = "restlab-example-req-get-users";
  const REQ_GET_USER = "restlab-example-req-get-user";
  const ENV_DEV_ID = "restlab-example-env-dev";
  const ENV_PROD_ID = "restlab-example-env-prod";
  const now = Date.now();

  const folderTree: Folder[] = [
    {
      id: COLLECTION_ID,
      name: "JSONPlaceholder",
      createdAt: now,
      requests: [],
      subfolders: [
        {
          id: POSTS_ID,
          name: "Posts",
          createdAt: now,
          parentId: COLLECTION_ID,
          requests: [
            { id: REQ_GET_POSTS, name: "Get all posts", folderId: POSTS_ID, method: "GET" } as Request,
            { id: REQ_GET_POST, name: "Get post by ID", folderId: POSTS_ID, method: "GET" } as Request,
            { id: REQ_CREATE_POST, name: "Create post", folderId: POSTS_ID, method: "POST" } as Request,
            { id: REQ_DELETE_POST, name: "Delete post", folderId: POSTS_ID, method: "DELETE" } as Request,
          ],
          subfolders: [],
        },
        {
          id: USERS_ID,
          name: "Users",
          createdAt: now,
          parentId: COLLECTION_ID,
          requests: [
            { id: REQ_GET_USERS, name: "Get all users", folderId: USERS_ID, method: "GET" } as Request,
            { id: REQ_GET_USER, name: "Get user by ID", folderId: USERS_ID, method: "GET" } as Request,
          ],
          subfolders: [],
        },
      ],
    },
  ];

  const folderConfig: FolderConfig = {
    baseUrl: "https://jsonplaceholder.typicode.com",
    headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
    params: [],
    environments: [
      {
        id: ENV_DEV_ID,
        name: "Development",
        variables: [
          { key: "baseUrl", value: "https://jsonplaceholder.typicode.com", enabled: true },
          { key: "userId", value: "1", enabled: true },
        ],
      },
      {
        id: ENV_PROD_ID,
        name: "Production",
        variables: [
          { key: "baseUrl", value: "https://jsonplaceholder.typicode.com", enabled: true },
          { key: "userId", value: "1", enabled: true },
        ],
      },
    ],
    activeEnvironmentId: ENV_DEV_ID,
  };

  const requests: RequestConfig[] = [
    {
      id: REQ_GET_POSTS,
      name: "Get all posts",
      folderId: POSTS_ID,
      method: "GET",
      url: "/posts",
    },
    {
      id: REQ_GET_POST,
      name: "Get post by ID",
      folderId: POSTS_ID,
      method: "GET",
      url: "/posts/1",
    },
    {
      id: REQ_CREATE_POST,
      name: "Create post",
      folderId: POSTS_ID,
      method: "POST",
      url: "/posts",
      contentType: "application/json",
      body: JSON.stringify({ title: "foo", body: "bar", userId: 1 }, null, 2),
    },
    {
      id: REQ_DELETE_POST,
      name: "Delete post",
      folderId: POSTS_ID,
      method: "DELETE",
      url: "/posts/1",
    },
    {
      id: REQ_GET_USERS,
      name: "Get all users",
      folderId: USERS_ID,
      method: "GET",
      url: "/users",
    },
    {
      id: REQ_GET_USER,
      name: "Get user by ID",
      folderId: USERS_ID,
      method: "GET",
      url: "/users/1",
    },
  ];

  await Promise.all([
    context.globalState.update("restlab.folders", folderTree),
    context.globalState.update(`restlab.folder.${COLLECTION_ID}`, folderConfig),
    ...requests.map((r) =>
      context.globalState.update(`restlab.request.${r.id}`, r),
    ),
    context.globalState.update("restlab.expandedFolders", [
      COLLECTION_ID,
      POSTS_ID,
    ]),
  ]);
}
```

- [ ] **Step 3: Call `seedDefaultData` at the top of `activate()`**

In `activate()`, find the first line:

```typescript
  console.log("REST Lab extension is now active!");
```

Add the seed call immediately after it:

```typescript
  console.log("REST Lab extension is now active!");
  await seedDefaultData(context);
```

Also update the function signature to `async`:

```typescript
export async function activate(context: vscode.ExtensionContext) {
```

- [ ] **Step 4: Run type check**

```bash
npx tsc --noEmit
```

Expected: no errors. If you see errors, the most likely causes are:
- `Request` not exported from `SidebarProvider.ts` — add `export` to the interface.
- `FolderConfig.environments` type mismatch — `Environment` from `internal.types.ts` expects `{ id: string; name: string; variables: EnvVariable[] }` — verify the shape matches what you wrote.
- `header.enabled` field — the `SidebarProvider.ts` `FolderConfig` uses `{ key, value }` without `enabled`, but `internal.types.ts` uses `Header = { key, value, enabled? }`. Since we import `FolderConfig` from `internal.types.ts`, `enabled` is valid.

- [ ] **Step 5: Commit**

```bash
git add src/extension.ts
git commit -m "feat: seed example JSONPlaceholder collection on first launch"
```
