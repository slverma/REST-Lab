# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Role

You are a specialist software developer working on a VS Code extension. Apply production-grade engineering standards at all times.

## Git Workflow

- For every feature, create a new branch from `main` before starting work, unless a branch is explicitly specified.
- Branch naming convention: `feat/<short-description>` (e.g., `feat/bearer-auth`, `feat/response-panel`).

## TypeScript Rules

- Always write TypeScript in strict mode — `tsconfig.json` already enforces this.
- Never add `@ts-nocheck`, `@ts-ignore`, or `// eslint-disable` suppression comments to work around type errors. Fix the root cause instead.
- Keep components under 500 lines. When a component grows beyond that, extract a focused sub-component rather than continuing to add to the existing file.

## Build Commands

```bash
npm run build        # development build
npm run watch        # development build with file watching
npm run build:prod   # production build (minified), used before publishing
```

There is no test suite and no lint script. After writing code, **do not run the build** — it is slow. Run `npx tsc --noEmit` to check for type errors only. The developer will build and test.

## Architecture

REST Lab is a VS Code extension that functions as an in-editor HTTP client (similar to Postman/Insomnia).

### Extension host (`src/`)

The VS Code extension host runs in Node.js:

- **`extension.ts`** — activates the extension, registers commands and providers.
- **`providers/SidebarProvider.ts`** — implements `WebviewViewProvider` for the activity-bar sidebar. Owns the entire folder/request tree in memory and persists it to `globalState`. All sidebar mutations (CRUD, rename, duplicate, move, import/export) live here.
- **`providers/RequestEditorProvider.ts`** — creates and manages `WebviewPanel` instances for open requests. Executes HTTP requests via `axios` on the extension host side, then posts the response back to the webview. Tracks open panels in a static `Map<requestId, WebviewPanel>` so duplicate panels are prevented.
- **`providers/FolderEditorProvider.ts`** — manages the folder-settings custom editor (`restlab.folderEditor`).
- **`utils/`** — cURL parsing, collection import/export (Postman, Thunder Client, RESTLab format), nonce generation.

### Data persistence

All data is stored in `vscode.ExtensionContext.globalState` with these keys:

| Key | Value |
|---|---|
| `restlab.folders` | `Folder[]` — the full nested folder/request tree |
| `restlab.folder.<id>` | `FolderConfig` — base URL, headers, params, environments |
| `restlab.request.<id>` | `RequestConfig` — method, URL, headers, params, body, formData |
| `restlab.expandedFolders` | `string[]` — sidebar expand state |

### Webviews (`src/webview/`)

Three independent React apps are built separately by Vite as IIFE bundles and loaded into VS Code webview panels:

| Bundle | Entry | Purpose |
|---|---|---|
| `dist/sidebar/` | `src/webview/sidebar/index.tsx` | Activity-bar sidebar (folder/request tree) |
| `dist/editor/` | `src/webview/editor/index.tsx` | Folder config editor (environments, base URL, shared headers) |
| `dist/request/` | `src/webview/request/index.tsx` | Request editor + response panel |

Each webview communicates with the extension host exclusively via `vscode.postMessage` / `webview.onDidReceiveMessage`. There is no shared module between the extension host and webview code at runtime — types in `src/webview/types/internal.types.ts` are shared at the TypeScript level only.

The webview alias `@` maps to `src/` (configured in `scripts/build.ts`).

### Request webview state

`src/webview/request/RequestContext.tsx` is a React Context that centralises all state and event handlers for the request editor. Every child component consumes it via `useRequestContext()`. When adding new state or handlers to the request editor, add them here rather than in individual components.

### Folder configuration inheritance

`SidebarProvider.getInheritedConfig(folderId)` walks the parent chain and merges `baseUrl`, `headers`, and `params` bottom-up: child values take priority over parent values (same-key headers/params are replaced, not duplicated). Environments are stored only on the root collection (`getRootCollectionId` walks to the top).

### Build system

`scripts/build.ts` runs four parallel Vite builds: one CJS build for the extension host and three IIFE builds for the webviews. The `@vitejs/plugin-react` uses the classic JSX runtime (`React.createElement`). Node built-ins and `vscode` are externalized from the extension build.

## Publishing

CI publishes to the VS Code Marketplace automatically on git tags matching `v*.*.*` using `vsce publish`. To publish manually: `vsce package` to create a `.vsix`, then `vsce publish -p <token>`.
