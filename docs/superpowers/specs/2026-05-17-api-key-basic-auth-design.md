# Design: API Key & Basic Auth

**Date:** 2026-05-17  
**Status:** Approved

---

## Overview

Extend the existing auth system (currently only Bearer token) with two new auth types:
- **Basic Auth** — username + password encoded as `Authorization: Basic base64(username:password)`
- **API Key** — a custom key/value pair injected into a request header or query param

Both types support `{{variable}}` interpolation, inherit from parent folders, and appear in both the request editor Auth tab and the folder/collection settings Auth section.

---

## Type System

Two files share an `AuthConfig` type definition and must be updated together:
- `src/webview/types/internal.types.ts`
- `src/webview/editor/types.ts`

New union variants:

```typescript
export type AuthConfig =
  | { type: 'bearer'; token: string }
  | { type: 'basic'; username: string; password: string }
  | { type: 'apikey'; key: string; value: string; addTo: 'header' | 'query' }
  | { type: 'none' };
```

`addTo` defaults to `'header'` when the user first selects API Key.

---

## Auth Resolution

Replace `resolveAuthToken` in `src/webview/helpers/helper.ts` with `resolveAuth`:

```typescript
interface ResolvedAuth {
  headers: { key: string; value: string }[];
  params: { key: string; value: string }[];
}

function resolveAuth(
  requestAuth: AuthConfig | undefined,
  folderAuth: AuthConfig | undefined,
  envVariables: Record<string, string>,
): ResolvedAuth
```

Resolution rules (unchanged from Bearer): request-level auth takes priority over folder-level; if request auth is `undefined`, folder auth is used.

| Auth type | Output |
|---|---|
| `bearer` | `headers: [{ key: 'Authorization', value: 'Bearer <token>' }]` |
| `basic` | `headers: [{ key: 'Authorization', value: 'Basic btoa(username:password)' }]` |
| `apikey` with `addTo: 'header'` | `headers: [{ key: key, value: value }]` |
| `apikey` with `addTo: 'query'` | `params: [{ key: key, value: value }]` |
| `none` or no auth | `{ headers: [], params: [] }` |

All string fields (token, username, password, key, value) go through `interpolateVariables` before use. `btoa` encoding for Basic Auth runs in the webview (browser context), which has native `btoa`.

All callers of the old `resolveAuthToken` (`RequestContext.tsx`, `curl.ts`) are updated to use `resolveAuth`.

---

## Request Execution (`RequestContext.tsx`)

In `handleSendRequest`, replace the existing Bearer-only auth block:

```typescript
// Before
const bearerToken = resolveAuthToken(config.auth, folderConfig.auth, envVariables);
if (bearerToken !== null) { ... }

// After
const resolvedAuth = resolveAuth(config.auth, folderConfig.auth, envVariables);
// Merge auth headers (auth takes priority, removes duplicate Authorization)
if (resolvedAuth.headers.length > 0) {
  interpolatedHeaders = [
    ...resolvedAuth.headers,
    ...interpolatedHeaders.filter(
      (h) => !resolvedAuth.headers.some(
        (ah) => ah.key.toLowerCase() === h.key.toLowerCase()
      )
    ),
  ];
}
// Merge auth query params (appended after existing params)
// resolvedAuth.params are injected into allParams before URL construction
```

API Key query params from auth are appended to `allParams` before URL construction so they go through the same encoding path.

---

## cURL Export (`helpers/curl.ts`)

Same pattern as `RequestContext.tsx`: replace `resolveAuthToken` call with `resolveAuth`, merge `resolvedAuth.headers` into `allHeaders` (de-dup on key), and append `resolvedAuth.params` to the URL.

---

## UI — Request Auth Tab (`request/AuthTab.tsx`)

Dropdown gains two new options:

```
inherit from parent  (existing)
Bearer Token         (existing)
Basic Auth           (new)
API Key              (new)
No Auth              (existing)
```

`configToMode` updated to map `basic` → `"basic"`, `apikey` → `"apikey"`.

Fields shown per mode:
- **Basic Auth**: `Username` field (`VarInput`) + `Password` field (`VarInput`, `type="password"`)
- **API Key**: `Key` field (`VarInput`) + `Value` field (`VarInput`) + `Add to` select (`Header` / `Query Param`)

Inherit hint block updated:
- Bearer inherited → existing message
- Basic inherited → "Basic Auth is set on the parent folder"
- API Key inherited → "API Key is set on the parent folder"
- No auth inherited → existing "No auth configured" message

---

## UI — Folder Settings Auth Section (`editor/SettingsTab.tsx`)

Same new dropdown options as AuthTab. Fields use `EnvVarInput` (supports autocomplete for `{{variables}}`). The folder editor does not have an "inherit" option (folders set or clear auth independently).

Dropdown:
```
None         (existing)
Bearer Token (existing)
Basic Auth   (new)
API Key      (new)
```

Fields per selection mirror the request Auth Tab layout.

---

## CHANGELOG

Add a new `[Unreleased]` or next-version section entry documenting API Key and Basic Auth under "Authentication".

---

## Files Changed

| File | Change |
|---|---|
| `src/webview/types/internal.types.ts` | Add `basic` and `apikey` variants to `AuthConfig` |
| `src/webview/editor/types.ts` | Same |
| `src/webview/helpers/helper.ts` | Replace `resolveAuthToken` with `resolveAuth` |
| `src/webview/request/AuthTab.tsx` | Add Basic/API Key UI + inherit hints |
| `src/webview/editor/SettingsTab.tsx` | Add Basic/API Key UI |
| `src/webview/request/RequestContext.tsx` | Use `resolveAuth`, inject auth params into URL |
| `src/webview/helpers/curl.ts` | Use `resolveAuth`, inject auth params into URL |
| `CHANGELOG.md` | Document new auth types |
