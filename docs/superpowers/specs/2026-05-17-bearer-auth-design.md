# Bearer Token Authentication — Design Spec

**Date:** 2026-05-17
**Status:** Approved

---

## Overview

Add a dedicated Auth configuration layer to REST Lab, starting with Bearer Token. Auth is configurable at three levels: collection (root folder), subfolder, and individual request. Inheritance follows the same bottom-up model already used for `baseUrl`, `headers`, and `params` — child values win over parent values.

---

## Data Model

### New type — `AuthConfig`

Added to `src/webview/types/internal.types.ts`:

```ts
type AuthConfig =
  | { type: 'bearer'; token: string }
  | { type: 'none' }
```

- `undefined` on a request or folder means "inherit from parent".
- `{ type: 'none' }` explicitly opts out of inherited auth.
- `{ type: 'bearer', token: string }` sets a token at that level.

### Schema changes

| Type | New field |
|---|---|
| `FolderConfig` | `auth?: AuthConfig` |
| `RequestConfig` | `auth?: AuthConfig` |

No new `globalState` keys — auth is embedded inside the existing `restlab.request.<id>` and `restlab.folder.<id>` entries.

---

## Inheritance Resolution

`SidebarProvider.getInheritedConfig` walks the folder chain from the target item up to the root collection. Auth resolution: return the first `auth` value that is not `undefined`, walking child → root. This mirrors how `baseUrl` is resolved.

The resolved auth is included in the `inheritedConfig` payload sent to the request webview.

---

## UI

### Request Editor — Auth tab

**File:** `src/webview/request/AuthTab.tsx` (new)
**Placement:** New tab between "Headers" and "Body" in `RequestEditor.tsx`

States:
- **Default (`undefined`):** Dropdown shows `Inherit from folder`. A read-only preview line shows the inherited auth type and a masked token if one is resolved.
- **Bearer Token selected:** Dropdown + token input field. Input supports `{{variable}}` autocomplete (same component used in headers/params). Shows `inherited` badge when value originates from a parent.
- **No Auth selected:** Dropdown only. Explicitly blocks inherited auth.

### Folder & Collection Editor — Auth section

**File:** `src/webview/editor/SettingsTab.tsx` (modified)
**Placement:** Collapsible "Authentication" section below Query Parameters.

States:
- **None:** No auth set at this folder level (children may still inherit from a higher ancestor).
- **Bearer Token:** Dropdown + token input with `{{variable}}` autocomplete.

No "Inherit" option at the folder level — folders either set auth or leave it unset.

---

## Request Execution

**File:** `src/providers/RequestEditorProvider.ts`

When building the final headers map for an axios call, auth is resolved and injected after all headers are merged. An explicit `Authorization` header typed by the user always wins over auth config.

Resolution order:
1. If `request.auth.type === 'bearer'` → inject `Authorization: Bearer <token>` using the request token.
2. Else if `inheritedConfig.auth.type === 'bearer'` → inject using the inherited token.
3. Else if `request.auth.type === 'none'` → skip injection entirely.
4. Else → no auth injected.

Variable substitution (`{{var}}` → value from active environment) is applied to the token string before injection, using the same substitution logic already applied to headers and params.

---

## cURL Export

**File:** `src/webview/helpers/curl.ts`

The same resolution order above is applied when generating the cURL command. The resolved `Authorization: Bearer <token>` header is included in the `-H` flags.

---

## Out of Scope (this spec)

- Basic Auth, API Key, OAuth 2.0 — future auth types. The `AuthConfig` discriminated union is designed to accept new members without breaking changes.
- Auth history or token refresh — not in scope.
- Per-environment auth overrides — users can achieve this today via `{{token}}` variable in the token field.
