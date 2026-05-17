# API Key & Basic Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Basic Auth and API Key auth types alongside the existing Bearer Token, in both the request editor and the folder/collection settings editor.

**Architecture:** Extend the `AuthConfig` discriminated union with two new variants (`basic`, `apikey`), replace the Bearer-only `resolveAuthToken` helper with a general `resolveAuth` that returns headers and query params to inject, then update all callers and both UI surfaces. API Key query-param auth is injected before URL construction so it goes through the existing param-encoding path.

**Tech Stack:** TypeScript (strict), React 18 (classic JSX runtime), VS Code Webview API. No test suite — use `npx tsc --noEmit` for verification at every task.

**Branch:** Create `feat/api-key-basic-auth` from `main` before starting.

```bash
git checkout main && git pull
git checkout -b feat/api-key-basic-auth
```

---

## File Map

| File | Change |
|---|---|
| `src/webview/types/internal.types.ts` | Add `basic` and `apikey` variants to `AuthConfig` |
| `src/webview/editor/types.ts` | Same (this file has its own copy of `AuthConfig`) |
| `src/webview/helpers/helper.ts` | Remove `resolveAuthToken`, add `ResolvedAuth` interface + `resolveAuth` |
| `src/webview/request/RequestContext.tsx` | Call `resolveAuth`, inject auth params before URL build |
| `src/webview/helpers/curl.ts` | Call `resolveAuth`, inject auth params before URL build |
| `src/webview/request/AuthTab.tsx` | Add Basic/API Key UI + updated inherit hints |
| `src/webview/editor/SettingsTab.tsx` | Add Basic/API Key UI in folder settings |
| `CHANGELOG.md` | Add new auth types entry, move Future Roadmap to top |

---

## Task 1: Extend AuthConfig types

**Files:**
- Modify: `src/webview/types/internal.types.ts`
- Modify: `src/webview/editor/types.ts`

- [ ] **Step 1: Update `src/webview/types/internal.types.ts`**

Replace the existing `AuthConfig` type:

```typescript
export type AuthConfig =
  | { type: 'bearer'; token: string }
  | { type: 'basic'; username: string; password: string }
  | { type: 'apikey'; key: string; value: string; addTo: 'header' | 'query' }
  | { type: 'none' };
```

- [ ] **Step 2: Update `src/webview/editor/types.ts`**

Replace the `AuthConfig` type at the top of that file with the identical definition:

```typescript
export type AuthConfig =
  | { type: 'bearer'; token: string }
  | { type: 'basic'; username: string; password: string }
  | { type: 'apikey'; key: string; value: string; addTo: 'header' | 'query' }
  | { type: 'none' };
```

- [ ] **Step 3: Verify — type errors are expected in files that call `resolveAuthToken`**

```bash
npx tsc --noEmit
```

Expected: errors in `helpers/helper.ts`, `request/RequestContext.tsx`, `helpers/curl.ts` about `AuthConfig` (those are fixed in later tasks). No errors in `internal.types.ts` or `editor/types.ts` themselves.

- [ ] **Step 4: Commit**

```bash
git add src/webview/types/internal.types.ts src/webview/editor/types.ts
git commit -m "feat: add basic and apikey variants to AuthConfig"
```

---

## Task 2: Replace resolveAuthToken with resolveAuth

**Files:**
- Modify: `src/webview/helpers/helper.ts`

- [ ] **Step 1: Add `ResolvedAuth` interface and `resolveAuth` function**

In `src/webview/helpers/helper.ts`, remove the existing `resolveAuthToken` function entirely (lines 152–165) and replace it with:

```typescript
export interface ResolvedAuth {
  headers: { key: string; value: string }[];
  params: { key: string; value: string }[];
}

/**
 * Returns headers and query params to inject based on effective auth config.
 * Request-level auth takes priority over folder-level auth.
 * All string values go through variable interpolation.
 */
export function resolveAuth(
  requestAuth: AuthConfig | undefined,
  folderAuth: AuthConfig | undefined,
  envVariables: Record<string, string>,
): ResolvedAuth {
  const auth = requestAuth !== undefined ? requestAuth : folderAuth;
  if (!auth || auth.type === 'none') return { headers: [], params: [] };

  if (auth.type === 'bearer') {
    const token = interpolateVariables(auth.token, envVariables);
    return {
      headers: [{ key: 'Authorization', value: `Bearer ${token}` }],
      params: [],
    };
  }

  if (auth.type === 'basic') {
    const username = interpolateVariables(auth.username, envVariables);
    const password = interpolateVariables(auth.password, envVariables);
    const encoded = btoa(`${username}:${password}`);
    return {
      headers: [{ key: 'Authorization', value: `Basic ${encoded}` }],
      params: [],
    };
  }

  if (auth.type === 'apikey') {
    const key = interpolateVariables(auth.key, envVariables);
    const value = interpolateVariables(auth.value, envVariables);
    if (auth.addTo === 'query') {
      return { headers: [], params: [{ key, value }] };
    }
    return { headers: [{ key, value }], params: [] };
  }

  return { headers: [], params: [] };
}
```

- [ ] **Step 2: Verify — errors now only in callers of the removed `resolveAuthToken`**

```bash
npx tsc --noEmit
```

Expected: errors in `request/RequestContext.tsx` and `helpers/curl.ts` reporting `resolveAuthToken` is not found. No errors in `helper.ts` itself.

- [ ] **Step 3: Commit**

```bash
git add src/webview/helpers/helper.ts
git commit -m "feat: replace resolveAuthToken with resolveAuth supporting all auth types"
```

---

## Task 3: Update RequestContext.tsx

**Files:**
- Modify: `src/webview/request/RequestContext.tsx`

- [ ] **Step 1: Update import**

At the top of `RequestContext.tsx`, change the import from `helpers/helper.ts`:

```typescript
// Before
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

// After
import {
  formatJson,
  formDataToBody,
  getEditorLanguageFromContentType,
  hasFileFields,
  interpolateVariables,
  isFormContentType,
  resolveAuth,
  stripJsonComments,
} from "../helpers/helper";
```

- [ ] **Step 2: Inject auth query params before URL construction**

Inside `handleSendRequest`, after `allParams` is built (around line 424), resolve auth immediately and append any auth query params to `allParams` before the URL is constructed. Find this block:

```typescript
    const allParams = [
      ...(folderConfig.params || []).filter(
        (p) => !disabledParamKeys.has(p.key.toLowerCase()),
      ),
      ...(config.params || []).filter(
        (p) => !inheritedParamKeys.has(p.key.toLowerCase()),
      ),
    ].filter((p) => p.key && p.enabled !== false);
    const rawUrlWithParams =
```

Replace with:

```typescript
    const regularParams = [
      ...(folderConfig.params || []).filter(
        (p) => !disabledParamKeys.has(p.key.toLowerCase()),
      ),
      ...(config.params || []).filter(
        (p) => !inheritedParamKeys.has(p.key.toLowerCase()),
      ),
    ].filter((p) => p.key && p.enabled !== false);

    const resolvedAuth = resolveAuth(config.auth, folderConfig.auth, envVariables);
    const allParams = [...regularParams, ...resolvedAuth.params];
    const rawUrlWithParams =
```

- [ ] **Step 3: Replace Bearer auth block with resolveAuth header injection**

Find the existing Bearer-only auth block (after `interpolatedHeaders` is built):

```typescript
    const bearerToken = resolveAuthToken(config.auth, folderConfig.auth, envVariables);
    if (bearerToken !== null) {
      interpolatedHeaders = [
        { key: "Authorization", value: `Bearer ${bearerToken}` },
        ...interpolatedHeaders.filter(
          (h) => h.key.toLowerCase() !== "authorization",
        ),
      ];
    }
```

Replace it with:

```typescript
    if (resolvedAuth.headers.length > 0) {
      const authHeaderKeys = new Set(
        resolvedAuth.headers.map((h) => h.key.toLowerCase()),
      );
      interpolatedHeaders = [
        ...resolvedAuth.headers,
        ...interpolatedHeaders.filter(
          (h) => !authHeaderKeys.has(h.key.toLowerCase()),
        ),
      ];
    }
```

- [ ] **Step 4: Verify — no type errors**

```bash
npx tsc --noEmit
```

Expected: only errors in `helpers/curl.ts` (still uses the old function). `RequestContext.tsx` should be clean.

- [ ] **Step 5: Commit**

```bash
git add src/webview/request/RequestContext.tsx
git commit -m "feat: use resolveAuth in request execution for all auth types"
```

---

## Task 4: Update curl.ts

**Files:**
- Modify: `src/webview/helpers/curl.ts`

- [ ] **Step 1: Update import**

```typescript
// Before
import {
  formDataToBody,
  interpolateVariables,
  isFormContentType,
  resolveAuthToken,
  stripJsonComments,
} from "./helper";

// After
import {
  formDataToBody,
  interpolateVariables,
  isFormContentType,
  resolveAuth,
  stripJsonComments,
} from "./helper";
```

- [ ] **Step 2: Inject auth query params before URL construction**

In `generateCurlCommand`, find where `allParams` is built and the URL is assembled. After building `allParams` (the filtered array), resolve auth and append any auth query params. Find this block:

```typescript
  const allParams = [
    ...(folderConfig.params || []).filter(
      (p) => !disabledParamKeys.has(p.key.toLowerCase()),
    ),
    ...(config.params || []).filter(
      (p) => !inheritedParamKeys.has(p.key.toLowerCase()),
    ),
  ].filter((p) => p.key && p.enabled !== false);
  const rawUrlWithParams =
```

Replace with:

```typescript
  const regularParams = [
    ...(folderConfig.params || []).filter(
      (p) => !disabledParamKeys.has(p.key.toLowerCase()),
    ),
    ...(config.params || []).filter(
      (p) => !inheritedParamKeys.has(p.key.toLowerCase()),
    ),
  ].filter((p) => p.key && p.enabled !== false);

  const resolvedAuth = resolveAuth(config.auth, folderConfig.auth, envVariables);
  const allParams = [...regularParams, ...resolvedAuth.params];
  const rawUrlWithParams =
```

- [ ] **Step 3: Replace Bearer auth block with resolveAuth header injection**

Find the existing Bearer-only auth block:

```typescript
  const bearerToken = resolveAuthToken(config.auth, folderConfig.auth, envVariables);
  if (bearerToken !== null) {
    allHeaders = [
      { key: "Authorization", value: `Bearer ${bearerToken}` },
      ...allHeaders.filter((h) => h.key.toLowerCase() !== "authorization"),
    ];
  }
```

Replace with:

```typescript
  if (resolvedAuth.headers.length > 0) {
    const authHeaderKeys = new Set(
      resolvedAuth.headers.map((h) => h.key.toLowerCase()),
    );
    allHeaders = [
      ...resolvedAuth.headers,
      ...allHeaders.filter((h) => !authHeaderKeys.has(h.key.toLowerCase())),
    ];
  }
```

- [ ] **Step 4: Verify — all type errors resolved**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/webview/helpers/curl.ts
git commit -m "feat: use resolveAuth in cURL export for all auth types"
```

---

## Task 5: Update AuthTab.tsx (request editor UI)

**Files:**
- Modify: `src/webview/request/AuthTab.tsx`

- [ ] **Step 1: Replace the entire file**

```typescript
import React from "react";
import { AuthConfig } from "../types/internal.types";
import VarInput from "./VarInput";

type AuthMode = "inherit" | "bearer" | "basic" | "apikey" | "none";

function configToMode(auth: AuthConfig | undefined): AuthMode {
  if (auth === undefined) return "inherit";
  if (auth.type === "none") return "none";
  if (auth.type === "bearer") return "bearer";
  if (auth.type === "basic") return "basic";
  return "apikey";
}

interface AuthTabProps {
  auth: AuthConfig | undefined;
  inheritedAuth: AuthConfig | undefined;
  onAuthChange: (auth: AuthConfig | undefined) => void;
}

const AuthTab: React.FC<AuthTabProps> = ({
  auth,
  inheritedAuth,
  onAuthChange,
}) => {
  const mode = configToMode(auth);

  const handleModeChange = (newMode: AuthMode) => {
    if (newMode === "inherit") {
      onAuthChange(undefined);
    } else if (newMode === "none") {
      onAuthChange({ type: "none" });
    } else if (newMode === "bearer") {
      onAuthChange({ type: "bearer", token: "" });
    } else if (newMode === "basic") {
      onAuthChange({ type: "basic", username: "", password: "" });
    } else {
      onAuthChange({ type: "apikey", key: "", value: "", addTo: "header" });
    }
  };

  const basicAuth = auth?.type === "basic" ? auth : null;
  const apikeyAuth = auth?.type === "apikey" ? auth : null;

  return (
    <div className="tab-section">
      <div className="form-group" style={{ marginBottom: "12px" }}>
        <label className="field-label">Auth Type</label>
        <select
          className="method-select"
          value={mode}
          onChange={(e) => handleModeChange(e.target.value as AuthMode)}
        >
          <option value="inherit">inherit from parent</option>
          <option value="bearer">Bearer Token</option>
          <option value="basic">Basic Auth</option>
          <option value="apikey">API Key</option>
          <option value="none">No Auth</option>
        </select>
      </div>

      {mode === "bearer" && auth?.type === "bearer" && (
        <div className="form-group">
          <label className="field-label">Token</label>
          <VarInput
            value={auth.token}
            onChange={(val) => onAuthChange({ type: "bearer", token: val })}
            placeholder="{{token}} or paste token"
            className="url-input"
          />
        </div>
      )}

      {mode === "basic" && basicAuth && (
        <>
          <div className="form-group">
            <label className="field-label">Username</label>
            <VarInput
              value={basicAuth.username}
              onChange={(val) =>
                onAuthChange({ type: "basic", username: val, password: basicAuth.password })
              }
              placeholder="{{username}} or enter username"
              className="url-input"
            />
          </div>
          <div className="form-group">
            <label className="field-label">Password</label>
            <VarInput
              value={basicAuth.password}
              onChange={(val) =>
                onAuthChange({ type: "basic", username: basicAuth.username, password: val })
              }
              placeholder="{{password}} or enter password"
              className="url-input"
            />
          </div>
        </>
      )}

      {mode === "apikey" && apikeyAuth && (
        <>
          <div className="form-group">
            <label className="field-label">Key</label>
            <VarInput
              value={apikeyAuth.key}
              onChange={(val) =>
                onAuthChange({ type: "apikey", key: val, value: apikeyAuth.value, addTo: apikeyAuth.addTo })
              }
              placeholder="X-API-Key"
              className="url-input"
            />
          </div>
          <div className="form-group">
            <label className="field-label">Value</label>
            <VarInput
              value={apikeyAuth.value}
              onChange={(val) =>
                onAuthChange({ type: "apikey", key: apikeyAuth.key, value: val, addTo: apikeyAuth.addTo })
              }
              placeholder="{{api_key}} or enter value"
              className="url-input"
            />
          </div>
          <div className="form-group">
            <label className="field-label">Add to</label>
            <select
              className="method-select"
              value={apikeyAuth.addTo}
              onChange={(e) =>
                onAuthChange({
                  type: "apikey",
                  key: apikeyAuth.key,
                  value: apikeyAuth.value,
                  addTo: e.target.value as "header" | "query",
                })
              }
            >
              <option value="header">Header</option>
              <option value="query">Query Param</option>
            </select>
          </div>
        </>
      )}

      {mode === "inherit" && inheritedAuth?.type === "bearer" && (
        <p className="field-hint inherited-hint" style={{ marginTop: "8px" }}>
          Inherited: Bearer token is set on the parent folder
        </p>
      )}
      {mode === "inherit" && inheritedAuth?.type === "basic" && (
        <p className="field-hint inherited-hint" style={{ marginTop: "8px" }}>
          Inherited: Basic Auth is set on the parent folder
        </p>
      )}
      {mode === "inherit" && inheritedAuth?.type === "apikey" && (
        <p className="field-hint inherited-hint" style={{ marginTop: "8px" }}>
          Inherited: API Key is set on the parent folder
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

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/webview/request/AuthTab.tsx
git commit -m "feat: add Basic Auth and API Key to request editor Auth tab"
```

---

## Task 6: Update SettingsTab.tsx (folder editor UI)

**Files:**
- Modify: `src/webview/editor/SettingsTab.tsx`

- [ ] **Step 1: Replace the Authentication section**

Find the `{/* ── Authentication ── */}` block (from `<div className="form-section">` through the closing `</div>`) and replace the entire block with:

```tsx
      {/* ── Authentication ── */}
      <div className="form-section">
        <h2>Authentication</h2>
        {(() => {
          const basicAuth = config.auth?.type === "basic" ? config.auth : null;
          const apikeyAuth = config.auth?.type === "apikey" ? config.auth : null;
          return (
            <>
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
                    } else if (val === "basic") {
                      onChangeAuth({ type: "basic", username: "", password: "" });
                    } else if (val === "apikey") {
                      onChangeAuth({ type: "apikey", key: "", value: "", addTo: "header" });
                    }
                  }}
                >
                  <option value="none">None</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="basic">Basic Auth</option>
                  <option value="apikey">API Key</option>
                </select>
              </div>

              {config.auth?.type === "bearer" && (
                <div className="form-group">
                  <label className="field-label">Token</label>
                  <EnvVarInput
                    value={config.auth.token}
                    onChange={(val) => onChangeAuth({ type: "bearer", token: val })}
                    placeholder="{{token}} or paste token"
                    envVariables={envVars}
                  />
                </div>
              )}

              {basicAuth && (
                <>
                  <div className="form-group">
                    <label className="field-label">Username</label>
                    <EnvVarInput
                      value={basicAuth.username}
                      onChange={(val) =>
                        onChangeAuth({ type: "basic", username: val, password: basicAuth.password })
                      }
                      placeholder="{{username}} or enter username"
                      envVariables={envVars}
                    />
                  </div>
                  <div className="form-group">
                    <label className="field-label">Password</label>
                    <EnvVarInput
                      value={basicAuth.password}
                      onChange={(val) =>
                        onChangeAuth({ type: "basic", username: basicAuth.username, password: val })
                      }
                      placeholder="{{password}} or enter password"
                      envVariables={envVars}
                    />
                  </div>
                </>
              )}

              {apikeyAuth && (
                <>
                  <div className="form-group">
                    <label className="field-label">Key</label>
                    <EnvVarInput
                      value={apikeyAuth.key}
                      onChange={(val) =>
                        onChangeAuth({ type: "apikey", key: val, value: apikeyAuth.value, addTo: apikeyAuth.addTo })
                      }
                      placeholder="X-API-Key"
                      envVariables={envVars}
                    />
                  </div>
                  <div className="form-group">
                    <label className="field-label">Value</label>
                    <EnvVarInput
                      value={apikeyAuth.value}
                      onChange={(val) =>
                        onChangeAuth({ type: "apikey", key: apikeyAuth.key, value: val, addTo: apikeyAuth.addTo })
                      }
                      placeholder="{{api_key}} or enter value"
                      envVariables={envVars}
                    />
                  </div>
                  <div className="form-group">
                    <label className="field-label">Add to</label>
                    <select
                      className="method-select"
                      value={apikeyAuth.addTo}
                      onChange={(e) =>
                        onChangeAuth({
                          type: "apikey",
                          key: apikeyAuth.key,
                          value: apikeyAuth.value,
                          addTo: e.target.value as "header" | "query",
                        })
                      }
                    >
                      <option value="header">Header</option>
                      <option value="query">Query Param</option>
                    </select>
                  </div>
                </>
              )}

              {inheritedConfig.auth?.type === "bearer" && !config.auth && (
                <p className="field-hint inherited-hint">
                  <ArrowUpIcon />
                  Bearer token inherited from parent folder
                </p>
              )}
              {inheritedConfig.auth?.type === "basic" && !config.auth && (
                <p className="field-hint inherited-hint">
                  <ArrowUpIcon />
                  Basic Auth inherited from parent folder
                </p>
              )}
              {inheritedConfig.auth?.type === "apikey" && !config.auth && (
                <p className="field-hint inherited-hint">
                  <ArrowUpIcon />
                  API Key inherited from parent folder
                </p>
              )}
            </>
          );
        })()}
      </div>
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/webview/editor/SettingsTab.tsx
git commit -m "feat: add Basic Auth and API Key to folder settings Auth section"
```

---

## Task 7: Update CHANGELOG.md

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Move Future Roadmap to the top and add more items**

Replace the `## Future Roadmap` section at the bottom of `CHANGELOG.md` with the updated version below, and insert it immediately after the `# Changelog` header and the one-liner about Keep a Changelog (before the first `---`):

```markdown
## Future Roadmap

The following features are being considered for future releases:

- [ ] Request history
- [ ] Pre-request scripts
- [ ] Test scripts / assertions
- [ ] Code generation (JS fetch, Python requests, curl, etc.)
- [ ] OAuth 2.0 (Client Credentials, Authorization Code + PKCE)
- [ ] WebSocket support
- [ ] GraphQL support
- [ ] Response diff / compare
- [ ] Mock server / request stubs
- [ ] Team sync / shared collections
```

Remove the old `## Future Roadmap` block from the bottom of the file.

- [ ] **Step 2: Add a new `[Unreleased]` section above `[0.2.0]`**

```markdown
## [Unreleased]

### Added

#### Authentication — Basic Auth & API Key

- **Basic Auth** — Username and password encoded as `Authorization: Basic base64(username:password)`
  - Supports `{{variable}}` interpolation for both username and password
  - Available on requests and folder/collection settings
  - Inherits from parent folders like Bearer Token
- **API Key** — Custom key/value pair injected into a header or query param
  - "Add to" selector: Header (injects `Key: Value` header) or Query Param (appends `key=value` to URL)
  - Supports `{{variable}}` interpolation for key and value
  - Available on requests and folder/collection settings
  - Inherits from parent folders
- cURL export updated to include Basic Auth and API Key in generated commands
```

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: add Basic Auth and API Key to changelog, move roadmap to top"
```

---

## Self-Review Notes

**Spec coverage:**
- ✅ Basic Auth — Task 1 (types), 2 (resolver), 3 (execution), 4 (curl), 5 (UI), 6 (folder UI)
- ✅ API Key header — same tasks
- ✅ API Key query param — Task 3 & 4 inject auth params before URL construction
- ✅ `{{variable}}` interpolation — handled in `resolveAuth` for all fields
- ✅ Inherit from parent — unchanged priority logic in `resolveAuth`
- ✅ Inherit hints in request AuthTab — Task 5
- ✅ Inherit hints in folder SettingsTab — Task 6
- ✅ cURL export — Task 4
- ✅ CHANGELOG + roadmap — Task 7

**Type consistency:** `resolvedAuth` (type `ResolvedAuth`) used consistently in Tasks 3 and 4. `basicAuth`/`apikeyAuth` local variables used in Tasks 5 and 6 with correct narrowing.

**No placeholders:** all steps contain complete code.
