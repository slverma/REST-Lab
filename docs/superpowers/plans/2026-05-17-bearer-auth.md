# Bearer Token Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Bearer Token auth configurable at request, folder, and collection level, with bottom-up inheritance mirroring the existing headers/params pattern.

**Architecture:** `AuthConfig` is a discriminated union stored directly inside existing `RequestConfig` and `FolderConfig` globalState entries — no new storage keys. `SidebarProvider.getInheritedConfig` resolves auth by walking child → root and returning the first non-`undefined` value. The request webview applies resolved auth to headers just before sending and when generating cURL. A new `AuthTab` in the request editor and a new "Authentication" section in the folder editor's `SettingsTab` provide the UI.

**Tech Stack:** TypeScript (strict), React 18, VS Code Webview API, axios

---

## File Map

| Action | File | What changes |
|--------|------|-------------|
| Modify | `src/webview/types/internal.types.ts` | Add `AuthConfig`, add `auth?` to `RequestConfig` and `FolderConfig` |
| Modify | `src/webview/editor/types.ts` | Add `AuthConfig`, add `auth?` to `FolderConfig` and `InheritedConfig` |
| Modify | `src/providers/SidebarProvider.ts` | Import `AuthConfig`, add `auth?` to local `FolderConfig`, update `getInheritedConfig` |
| Modify | `src/providers/RequestEditorProvider.ts` | Pass `auth` in `configLoaded` message |
| Create | `src/webview/request/AuthTab.tsx` | Auth tab UI for request editor |
| Modify | `src/webview/request/RequestContext.tsx` | Add `"auth"` to `ActiveTab`, add `handleAuthChange`, apply auth in `handleSendRequest` |
| Modify | `src/webview/request/RequestEditor.tsx` | Add Auth tab button and render `<AuthTab />` |
| Modify | `src/webview/helpers/helper.ts` | Add `resolveAuthToken` helper |
| Modify | `src/webview/helpers/curl.ts` | Apply auth in `generateCurlCommand` |
| Modify | `src/webview/editor/SettingsTab.tsx` | Add Authentication section, add `onChangeAuth` prop |
| Modify | `src/webview/editor/FolderEditor.tsx` | Manage auth state, pass handler to `SettingsTab` |

---

### Task 1: Add `AuthConfig` type to all three type definition files

**Files:**
- Modify: `src/webview/types/internal.types.ts`
- Modify: `src/webview/editor/types.ts`
- Modify: `src/providers/SidebarProvider.ts`

- [ ] **Step 1: Update `src/webview/types/internal.types.ts`**

Add `AuthConfig` before `RequestConfig`, then add `auth?` to both `RequestConfig` and `FolderConfig`:

```ts
export type AuthConfig =
  | { type: 'bearer'; token: string }
  | { type: 'none' };
```

In `RequestConfig`, add after `formData?`:
```ts
  auth?: AuthConfig;
```

In `FolderConfig`, add after `activeEnvironmentId?`:
```ts
  auth?: AuthConfig;
```

- [ ] **Step 2: Update `src/webview/editor/types.ts`**

Add `AuthConfig` at the top of the file (before all interfaces):

```ts
export type AuthConfig =
  | { type: 'bearer'; token: string }
  | { type: 'none' };
```

In `FolderConfig`, add after `activeEnvironmentId?`:
```ts
  auth?: AuthConfig;
```

In `InheritedConfig`, add after `envVariables?`:
```ts
  auth?: AuthConfig;
```

- [ ] **Step 3: Update `src/providers/SidebarProvider.ts`**

Add an import for `AuthConfig` from the webview types at the top of the file, after the existing imports:

```ts
import { AuthConfig } from "../webview/types/internal.types";
```

In the local `FolderConfig` interface (around line 29), add `auth?` after `params?`:

```ts
export interface FolderConfig {
  baseUrl?: string;
  headers?: { key: string; value: string }[];
  params?: { key: string; value: string }[];
  auth?: AuthConfig;
}
```

- [ ] **Step 4: Verify type check passes**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/webview/types/internal.types.ts src/webview/editor/types.ts src/providers/SidebarProvider.ts
git commit -m "feat: add AuthConfig type to RequestConfig, FolderConfig, and InheritedConfig"
```

---

### Task 2: Resolve auth in `SidebarProvider.getInheritedConfig`

**Files:**
- Modify: `src/providers/SidebarProvider.ts:281-338`

- [ ] **Step 1: Update `getInheritedConfig` to resolve auth**

The method currently returns `{ baseUrl, headers, params }`. Change the return to also include `auth`. Auth resolution: return the first non-`undefined` `auth` found walking child → root (same as `baseUrl`). Replace the final return statement:

```ts
return {
  baseUrl: currentConfig.baseUrl || parentConfig.baseUrl,
  headers: mergedHeaders.length > 0 ? mergedHeaders : undefined,
  params: mergedParams.length > 0 ? mergedParams : undefined,
  auth: currentConfig.auth !== undefined ? currentConfig.auth : parentConfig.auth,
};
```

- [ ] **Step 2: Verify type check passes**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/providers/SidebarProvider.ts
git commit -m "feat: resolve auth in getInheritedConfig (child overrides parent)"
```

---

### Task 3: Pass `auth` in `configLoaded` from `RequestEditorProvider`

**Files:**
- Modify: `src/providers/RequestEditorProvider.ts:160-179`

- [ ] **Step 1: Add `auth` to the `configLoaded` message**

In the `getConfig` case handler, the `config` object is built by picking individual fields from `savedRequest`. Add `auth` to that object:

```ts
panel.webview.postMessage({
  type: "configLoaded",
  config: {
    id: requestId,
    name: requestName,
    folderId,
    method: savedRequest?.method || "GET",
    url: savedRequest?.url || "",
    headers: savedRequest?.headers || [],
    params: savedRequest?.params || [],
    body: savedRequest?.body || "",
    contentType: savedRequest?.contentType || "",
    formData: savedRequest?.formData || [],
    auth: savedRequest?.auth,
  },
  folderConfig: folderConfig,
  envVariables: envVariables,
  collectionId: collectionId,
  environments: collectionData.environments,
  activeEnvironmentId: collectionData.activeEnvironmentId,
});
```

- [ ] **Step 2: Verify type check passes**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/providers/RequestEditorProvider.ts
git commit -m "feat: include auth in configLoaded message from RequestEditorProvider"
```

---

### Task 4: Add `resolveAuthToken` helper to `helper.ts`

**Files:**
- Modify: `src/webview/helpers/helper.ts`

- [ ] **Step 1: Add the helper function**

Add an import for `AuthConfig` at the top of `src/webview/helpers/helper.ts`:

```ts
import { AuthConfig } from "../types/internal.types";
```

Then add this function at the end of the file:

```ts
/**
 * Resolves the Bearer token from request-level auth (takes priority) or
 * folder-level auth (inherited). Returns null if no auth applies.
 * Variable interpolation is applied to the token.
 */
export function resolveAuthToken(
  requestAuth: AuthConfig | undefined,
  folderAuth: AuthConfig | undefined,
  envVariables: Record<string, string>,
): string | null {
  const auth = requestAuth !== undefined ? requestAuth : folderAuth;
  if (!auth || auth.type === 'none') return null;
  return interpolateVariables(auth.token, envVariables);
}
```

- [ ] **Step 2: Verify type check passes**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/webview/helpers/helper.ts
git commit -m "feat: add resolveAuthToken helper"
```

---

### Task 5: Create `AuthTab.tsx` for the request editor

**Files:**
- Create: `src/webview/request/AuthTab.tsx`

- [ ] **Step 1: Create the component**

```tsx
import React from "react";
import { AuthConfig } from "../types/internal.types";
import VarInput from "./VarInput";
import { useRequestContext } from "./RequestContext";

type AuthMode = "inherit" | "bearer" | "none";

function configToMode(auth: AuthConfig | undefined): AuthMode {
  if (auth === undefined) return "inherit";
  if (auth.type === "none") return "none";
  return "bearer";
}

const AuthTab: React.FC = () => {
  const { config, folderConfig, envVariables, handleAuthChange } = useRequestContext();
  const mode = configToMode(config.auth);
  const inheritedAuth = folderConfig.auth;

  const handleModeChange = (newMode: AuthMode) => {
    if (newMode === "inherit") {
      handleAuthChange(undefined);
    } else if (newMode === "none") {
      handleAuthChange({ type: "none" });
    } else {
      handleAuthChange({ type: "bearer", token: "" });
    }
  };

  return (
    <div className="tab-section">
      <div className="form-group" style={{ marginBottom: "12px" }}>
        <label className="field-label">Auth Type</label>
        <select
          className="method-select"
          value={mode}
          onChange={(e) => handleModeChange(e.target.value as AuthMode)}
        >
          <option value="inherit">Inherit from folder</option>
          <option value="bearer">Bearer Token</option>
          <option value="none">No Auth</option>
        </select>
      </div>

      {mode === "bearer" && config.auth?.type === "bearer" && (
        <div className="form-group">
          <label className="field-label">Token</label>
          <VarInput
            value={config.auth.token}
            onChange={(val) => handleAuthChange({ type: "bearer", token: val })}
            placeholder="{{token}} or paste token"
            className="url-input"
            envVariables={envVariables}
          />
        </div>
      )}

      {mode === "inherit" && inheritedAuth?.type === "bearer" && (
        <p className="field-hint inherited-hint" style={{ marginTop: "8px" }}>
          Inherited: Bearer token is set on the parent folder
        </p>
      )}

      {mode === "inherit" && (!inheritedAuth || inheritedAuth.type === "none") && (
        <p className="field-hint" style={{ marginTop: "8px" }}>
          No auth configured on parent folders
        </p>
      )}
    </div>
  );
};

export default AuthTab;
```

- [ ] **Step 2: Verify type check passes**

```bash
npx tsc --noEmit
```

Expected: error — `handleAuthChange` is not yet on the context. That is expected at this step; the next task adds it.

---

### Task 6: Wire `AuthTab` into `RequestContext` and `RequestEditor`

**Files:**
- Modify: `src/webview/request/RequestContext.tsx`
- Modify: `src/webview/request/RequestEditor.tsx`

- [ ] **Step 1: Add `"auth"` to `ActiveTab` and `handleAuthChange` to context interface**

In `RequestContext.tsx`, change the `ActiveTab` type (line ~40):

```ts
type ActiveTab = "headers" | "body" | "params" | "auth";
```

Add `handleAuthChange` to the `RequestContextValue` interface after `handleBeautifyJson`:

```ts
  handleAuthChange: (auth: AuthConfig | undefined) => void;
```

Also add the `AuthConfig` import at the top of the file:

```ts
import { AuthConfig, FolderConfig, FormDataItem, RequestConfig, RequestEditorProps, ResponseData } from "../types/internal.types";
```

(Replace the existing import from `../types/internal.types` that doesn't include `AuthConfig`.)

- [ ] **Step 2: Implement `handleAuthChange` in the provider**

Add the handler inside `RequestContextProvider` (alongside the other `useCallback` handlers):

```ts
const handleAuthChange = useCallback((auth: AuthConfig | undefined) => {
  setConfig((prev) => ({ ...prev, auth }));
  setIsSaved(false);
}, []);
```

- [ ] **Step 3: Expose `handleAuthChange` in the context value object**

In the `value` object at the bottom of `RequestContextProvider`, add alongside the other handlers:

```ts
    handleAuthChange,
```

- [ ] **Step 4: Add Auth tab to `RequestEditor.tsx`**

Add the import at the top:

```ts
import AuthTab from "./AuthTab";
```

In the tabs `<div className="tabs">`, add the Auth tab button after the Headers button:

```tsx
<button
  className={`tab ${activeTab === "auth" ? "active" : ""}`}
  onClick={() => setActiveTab("auth")}
>
  Auth
  {config.auth !== undefined && (
    <span className="badge">•</span>
  )}
</button>
```

In the `<div className="tab-content">`, add the AuthTab render after the HeaderTab case:

```tsx
{activeTab === "auth" && <AuthTab />}
```

- [ ] **Step 5: Verify type check passes**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/webview/request/RequestContext.tsx src/webview/request/RequestEditor.tsx src/webview/request/AuthTab.tsx
git commit -m "feat: add Auth tab to request editor with inherit/bearer/none modes"
```

---

### Task 7: Apply auth in request execution and cURL export

**Files:**
- Modify: `src/webview/request/RequestContext.tsx`
- Modify: `src/webview/helpers/curl.ts`

- [ ] **Step 1: Import `resolveAuthToken` in `RequestContext.tsx`**

Add `resolveAuthToken` to the import from `../helpers/helper`:

```ts
import {
  formatJson,
  formDataToBody,
  getEditorLanguageFromContentType,
  hasFileFields,
  interpolateVariables,
  isFormContentType,
  resolveAuthToken,
  stripJsonComments,
} from "../helpers/helper";
```

- [ ] **Step 2: Inject auth header in `handleSendRequest`**

In `handleSendRequest` (in `RequestContext.tsx`), after `interpolatedHeaders` is built and before the `vscode.postMessage({ type: "sendRequest", ... })` call, add:

```ts
const bearerToken = resolveAuthToken(config.auth, folderConfig.auth, envVariables);
if (bearerToken !== null) {
  const hasAuthHeader = interpolatedHeaders.some(
    (h) => h.key.toLowerCase() === "authorization",
  );
  if (!hasAuthHeader) {
    interpolatedHeaders = [
      { key: "Authorization", value: `Bearer ${bearerToken}` },
      ...interpolatedHeaders,
    ];
  }
}
```

Note: `interpolatedHeaders` must be declared with `let` instead of `const` for this mutation to work. Check the current declaration — if it is `const`, change it to `let`.

- [ ] **Step 3: Import `resolveAuthToken` in `curl.ts`**

Add `resolveAuthToken` to the import from `./helper`:

```ts
import {
  formDataToBody,
  interpolateVariables,
  isFormContentType,
  resolveAuthToken,
  stripJsonComments,
} from "./helper";
```

Also import `AuthConfig` from the types (it's already imported via `FolderConfig` and `RequestConfig`—no extra import needed since `resolveAuthToken` handles the type internally).

- [ ] **Step 4: Inject auth header in `generateCurlCommand`**

In `curl.ts`, after `allHeaders` is built and the Content-Type is added, and before the `allHeaders.forEach(...)` loop, add:

```ts
const bearerToken = resolveAuthToken(config.auth, folderConfig.auth, envVariables);
if (bearerToken !== null) {
  const hasAuthHeader = allHeaders.some(
    (h) => h.key.toLowerCase() === "authorization",
  );
  if (!hasAuthHeader) {
    allHeaders = [
      { key: "Authorization", value: `Bearer ${bearerToken}` },
      ...allHeaders,
    ];
  }
}
```

Note: `allHeaders` is already declared with `let` in this function, so no change to its declaration is needed.

- [ ] **Step 5: Verify type check passes**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/webview/request/RequestContext.tsx src/webview/helpers/curl.ts
git commit -m "feat: inject resolved Bearer auth header into request execution and cURL export"
```

---

### Task 8: Add Auth section to the folder editor

**Files:**
- Modify: `src/webview/editor/SettingsTab.tsx`
- Modify: `src/webview/editor/FolderEditor.tsx`

- [ ] **Step 1: Add `onChangeAuth` to `SettingsTabProps` and add Auth section in `SettingsTab.tsx`**

Add `AuthConfig` to the import at the top of `SettingsTab.tsx`:

```ts
import { AuthConfig, FolderConfig, Header, InheritedConfig } from "./types";
```

Add `onChangeAuth` to the `SettingsTabProps` interface:

```ts
  onChangeAuth: (auth: AuthConfig | undefined) => void;
```

Add `onChangeAuth` to the destructured props in `SettingsTab`:

```ts
const SettingsTab: React.FC<SettingsTabProps> = ({
  config,
  inheritedConfig,
  isCollection,
  onChangeName,
  onChangeBaseUrl,
  onAddHeader,
  onUpdateHeader,
  onRemoveHeader,
  onToggleHeader,
  onAddParam,
  onUpdateParam,
  onRemoveParam,
  onToggleParam,
  onChangeAuth,
}) => {
```

Add the Authentication section JSX after the Query Parameters section (before the final `</>`):

```tsx
{/* ── Authentication ── */}
<div className="form-section">
  <h2>Authentication</h2>
  <div className="form-group" style={{ marginBottom: "12px" }}>
    <label className="field-label">Auth Type</label>
    <select
      className="method-select"
      value={config.auth === undefined ? "none" : config.auth.type}
      onChange={(e) => {
        const val = e.target.value;
        if (val === "none") {
          onChangeAuth(undefined);
        } else if (val === "bearer") {
          onChangeAuth({ type: "bearer", token: "" });
        }
      }}
    >
      <option value="none">None</option>
      <option value="bearer">Bearer Token</option>
    </select>
  </div>
  {config.auth?.type === "bearer" && (
    <div className="form-group">
      <label className="field-label">Token</label>
      <EnvVarInput
        value={config.auth.token}
        onChange={(val) =>
          onChangeAuth({ type: "bearer", token: val })
        }
        placeholder="{{token}} or paste token"
        envVariables={envVars}
      />
    </div>
  )}
  {inheritedConfig.auth?.type === "bearer" && !config.auth && (
    <p className="field-hint inherited-hint">
      <ArrowUpIcon />
      Bearer token inherited from parent folder
    </p>
  )}
</div>
```

- [ ] **Step 2: Wire `onChangeAuth` in `FolderEditor.tsx`**

Add a handler after the existing `handleChangeBaseUrl` handler:

```ts
const handleChangeAuth = (auth: AuthConfig | undefined) => {
  setConfig((prev) => ({ ...prev, auth }));
  mark();
};
```

Add the import for `AuthConfig` from `./types`:

```ts
import {
  AuthConfig,
  Environment,
  FolderConfig,
  FolderEditorProps,
  InheritedConfig,
} from "./types";
```

Pass the handler to `<SettingsTab>`. Find the `<SettingsTab ... />` JSX element and add the prop:

```tsx
onChangeAuth={handleChangeAuth}
```

- [ ] **Step 3: Verify type check passes**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/webview/editor/SettingsTab.tsx src/webview/editor/FolderEditor.tsx
git commit -m "feat: add Authentication section to folder/collection editor"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|---|---|
| `AuthConfig` discriminated union | Task 1 |
| `auth?` on `RequestConfig` and `FolderConfig` | Task 1 |
| Auth inheritance in `getInheritedConfig` | Task 2 |
| `auth` passed in `configLoaded` | Task 3 |
| `resolveAuthToken` helper | Task 4 |
| Auth tab in request editor (inherit/bearer/none) | Tasks 5 & 6 |
| `handleAuthChange` wired to context | Task 6 |
| Auth applied in `handleSendRequest` | Task 7 |
| Auth applied in `generateCurlCommand` | Task 7 |
| Auth section in folder editor | Task 8 |
| `type: 'none'` opts out of inherited auth | Task 7 (resolveAuthToken returns null for `none`) |
| `{{var}}` in token field | Tasks 5 (VarInput) & 8 (EnvVarInput) |

**Placeholder scan:** None found.

**Type consistency check:**
- `AuthConfig` is defined in `internal.types.ts` and `editor/types.ts` (parallel type trees for webview vs editor bundles — consistent structure).
- `SidebarProvider.ts` imports `AuthConfig` from `internal.types.ts` to avoid duplication.
- `resolveAuthToken` takes `AuthConfig | undefined` — matches the `auth?` field type everywhere.
- `handleAuthChange` takes `AuthConfig | undefined` — matches `config.auth` type in `RequestConfig`.
- `configToMode` in `AuthTab.tsx` covers all `AuthConfig` union members.
