# Cookie Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to define cookies on requests via a dedicated Cookies tab, and display parsed Set-Cookie headers from responses in a structured Cookies tab in the response panel.

**Architecture:** Request cookies are stored in `RequestConfig.cookies` (array of `Cookie` objects) and serialized into a `Cookie` header when sending. Response cookies are parsed from `Set-Cookie` headers (which axios returns as a string array) in the extension host before being sent back to the webview as structured `ResponseCookie` objects.

**Tech Stack:** TypeScript (strict), React, axios (Node.js extension host), VS Code webview postMessage

---

## File Map

| File | Change |
|---|---|
| `src/webview/types/internal.types.ts` | Add `Cookie`, `ResponseCookie` interfaces; extend `RequestConfig` and `ResponseData` |
| `src/providers/RequestEditorProvider.ts` | Accept cookies in `sendRequest`, merge into `Cookie` header, parse `Set-Cookie` response headers |
| `src/webview/request/CookieTab.tsx` | **Create new** — request cookie editor component |
| `src/webview/request/RequestContext.tsx` | Extend `ActiveTab`/`ResponseTab` types, add cookie state/handlers, update `handleSendRequest` |
| `src/webview/request/RequestEditor.tsx` | Add Cookies tab button, render `CookieTab` |
| `src/webview/request/ResponsePanel.tsx` | Add Cookies response tab, render parsed cookie rows |

---

## Task 1: Add Cookie Types

**Files:**
- Modify: `src/webview/types/internal.types.ts`

- [ ] **Step 1: Add the two new interfaces and extend existing types**

Open `src/webview/types/internal.types.ts`. Make these four changes:

**Add `Cookie` interface after the `FormDataItem` interface (after line 35):**
```typescript
export interface Cookie {
  name: string;
  value: string;
  enabled?: boolean;
}

export interface ResponseCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite?: string;
}
```

**In `RequestConfig`, add `cookies` after `auth`:**
```typescript
export interface RequestConfig {
  id: string;
  name: string;
  folderId: string;
  method: string;
  url: string;
  headers?: Header[];
  params?: Header[];
  body?: string;
  contentType?: string;
  formData?: FormDataItem[];
  auth?: AuthConfig;
  cookies?: Cookie[];
}
```

**In `ResponseData`, add `cookies` after `size`:**
```typescript
export interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: string;
  time: number;
  size: number;
  cookies?: ResponseCookie[];
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd /Users/shambhu/Projects/personal/restlab && npx tsc --noEmit 2>&1 | head -30
```

Expected: zero errors from `internal.types.ts`. Any errors in other files at this stage are expected (they reference the updated types).

- [ ] **Step 3: Commit**

```bash
cd /Users/shambhu/Projects/personal/restlab
git add src/webview/types/internal.types.ts
git commit -m "feat(types): add Cookie and ResponseCookie types for cookie integration"
```

---

## Task 2: Update Extension Host to Handle Cookies

**Files:**
- Modify: `src/providers/RequestEditorProvider.ts`

- [ ] **Step 1: Add `ResponseCookie` import**

At the top of `RequestEditorProvider.ts`, the existing import is:
```typescript
import { RequestConfig } from "../webview/types/internal.types";
```

Change it to:
```typescript
import { RequestConfig, ResponseCookie } from "../webview/types/internal.types";
```

- [ ] **Step 2: Add `parseSetCookie` helper above the class**

After the imports and before `export class RequestEditorProvider`, add this function:

```typescript
function parseSetCookie(raw: string): ResponseCookie {
  const parts = raw.split(';').map((p) => p.trim());
  const nameValuePart = parts[0] ?? '';
  const eqIdx = nameValuePart.indexOf('=');
  const name = eqIdx >= 0 ? nameValuePart.slice(0, eqIdx) : nameValuePart;
  const value = eqIdx >= 0 ? nameValuePart.slice(eqIdx + 1) : '';

  const cookie: ResponseCookie = { name, value, httpOnly: false, secure: false };

  for (const attr of parts.slice(1)) {
    const lower = attr.toLowerCase();
    if (lower === 'httponly') { cookie.httpOnly = true; continue; }
    if (lower === 'secure') { cookie.secure = true; continue; }
    const eqI = attr.indexOf('=');
    if (eqI < 0) continue;
    const attrName = attr.slice(0, eqI).trim().toLowerCase();
    const attrVal = attr.slice(eqI + 1).trim();
    if (attrName === 'domain') { cookie.domain = attrVal; }
    else if (attrName === 'path') { cookie.path = attrVal; }
    else if (attrName === 'expires') { cookie.expires = attrVal; }
    else if (attrName === 'samesite') { cookie.sameSite = attrVal; }
  }

  return cookie;
}
```

- [ ] **Step 3: Update `_sendHttpRequest` signature to accept cookies and return `ResponseCookie[]`**

The current private method signature at line ~302 is:
```typescript
private async _sendHttpRequest(
  method: string,
  url: string,
  headers: { key: string; value: string }[],
  body?: string,
  formData?: {
    key: string;
    value: string;
    type: string;
    fileName?: string;
    fileData?: string;
  }[],
): Promise<{
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: string;
  time: number;
  size: number;
}>
```

Change it to:
```typescript
private async _sendHttpRequest(
  method: string,
  url: string,
  headers: { key: string; value: string }[],
  body?: string,
  formData?: {
    key: string;
    value: string;
    type: string;
    fileName?: string;
    fileData?: string;
  }[],
  cookies?: { name: string; value: string }[],
): Promise<{
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: string;
  time: number;
  size: number;
  cookies: ResponseCookie[];
}>
```

- [ ] **Step 4: Merge cookies into the Cookie header inside `_sendHttpRequest`**

Inside `_sendHttpRequest`, after building `headerObj` from headers (around line 338 after the `forEach` that builds `headerObj`), add this block:

```typescript
// Merge request cookies into Cookie header if no explicit Cookie header exists
if (cookies && cookies.length > 0) {
  const hasCookieHeader = Object.keys(headerObj).some(
    (k) => k.toLowerCase() === 'cookie',
  );
  if (!hasCookieHeader) {
    headerObj['Cookie'] = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  }
}
```

- [ ] **Step 5: Extract Set-Cookie from the axios response and parse it**

Inside `_sendHttpRequest`, in the success path, the current code that builds `responseHeaders` is:

```typescript
// Convert headers to Record<string, string>
const responseHeaders: Record<string, string> = {};
Object.entries(response.headers).forEach(([key, value]) => {
  responseHeaders[key] = Array.isArray(value)
    ? value.join(", ")
    : String(value || "");
});
```

Replace this block with:

```typescript
// Extract Set-Cookie before collapsing headers (axios returns it as string[])
const rawSetCookies: string[] = Array.isArray(response.headers['set-cookie'])
  ? (response.headers['set-cookie'] as string[])
  : [];
const parsedCookies: ResponseCookie[] = rawSetCookies.map(parseSetCookie);

// Convert headers to Record<string, string>
const responseHeaders: Record<string, string> = {};
Object.entries(response.headers).forEach(([key, value]) => {
  responseHeaders[key] = Array.isArray(value)
    ? value.join(', ')
    : String(value || '');
});
```

- [ ] **Step 6: Include `cookies` in the return value of `_sendHttpRequest`**

Change the return statement in the success path from:

```typescript
return {
  status: response.status,
  statusText: response.statusText,
  headers: responseHeaders,
  data: responseData,
  time: endTime - startTime,
  size,
};
```

To:

```typescript
return {
  status: response.status,
  statusText: response.statusText,
  headers: responseHeaders,
  data: responseData,
  time: endTime - startTime,
  size,
  cookies: parsedCookies,
};
```

- [ ] **Step 7: Update the `sendRequest` message handler to pass cookies**

In the `onDidReceiveMessage` handler, the `case "sendRequest":` block currently calls:

```typescript
const response = await provider._sendHttpRequest(
  message.method,
  message.url,
  message.headers,
  message.body,
  message.formData,
);
```

Change it to:

```typescript
const response = await provider._sendHttpRequest(
  message.method,
  message.url,
  message.headers,
  message.body,
  message.formData,
  message.cookies,
);
```

- [ ] **Step 8: Update `configLoaded` message to include cookies**

In the `case "getConfig":` handler, the `panel.webview.postMessage` call builds a config object. It currently ends with `auth: savedRequest?.auth`. Add `cookies` after `auth`:

```typescript
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
    cookies: savedRequest?.cookies || [],
  },
  folderConfig: folderConfig,
  envVariables: envVariables,
  collectionId: collectionId,
  environments: collectionData.environments,
  activeEnvironmentId: collectionData.activeEnvironmentId,
});
```

- [ ] **Step 9: Check for TypeScript errors**

```bash
cd /Users/shambhu/Projects/personal/restlab && npx tsc --noEmit 2>&1 | head -40
```

Expected: errors only in `RequestContext.tsx`, `RequestEditor.tsx`, `ResponsePanel.tsx` (not yet updated). No errors in `RequestEditorProvider.ts` or `internal.types.ts`.

- [ ] **Step 10: Commit**

```bash
cd /Users/shambhu/Projects/personal/restlab
git add src/providers/RequestEditorProvider.ts
git commit -m "feat(host): parse response Set-Cookie headers and merge request cookies into Cookie header"
```

---

## Task 3: Create CookieTab Component

**Files:**
- Create: `src/webview/request/CookieTab.tsx`

- [ ] **Step 1: Create the file**

Create `src/webview/request/CookieTab.tsx` with this content:

```tsx
import React from "react";
import PlusIcon from "../components/icons/PlusIcon";
import TrashIcon from "../components/icons/TrashIcon";
import { useRequestContext } from "./RequestContext";
import VarInput from "./VarInput";

const CookieTab: React.FC = () => {
  const {
    config,
    handleAddCookie,
    handleUpdateCookie,
    handleRemoveCookie,
    handleToggleCookie,
  } = useRequestContext();

  return (
    <div className="headers-section">
      <div className="request-headers">
        <div className="section-header">
          <h3>Request Cookies</h3>
          <button className="add-btn" onClick={handleAddCookie}>
            <PlusIcon />
            Add
          </button>
        </div>

        {(config.cookies || []).length === 0 ? (
          <p className="empty-hint">No cookies configured</p>
        ) : (
          (config.cookies || []).map((cookie, index) => (
            <div key={index} className="header-row">
              <input
                type="checkbox"
                checked={cookie.enabled !== false}
                onChange={() => handleToggleCookie(index)}
                title="Enable/Disable cookie"
                className="header-checkbox"
              />
              <VarInput
                value={cookie.name}
                onChange={(val) => handleUpdateCookie(index, "name", val)}
                placeholder="name"
                className="header-key"
              />
              <VarInput
                value={cookie.value}
                onChange={(val) => handleUpdateCookie(index, "value", val)}
                placeholder="value"
                className="header-value"
              />
              <button
                className="remove-btn"
                onClick={() => handleRemoveCookie(index)}
                title="Remove Cookie"
              >
                <TrashIcon />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CookieTab;
```

- [ ] **Step 2: Commit**

```bash
cd /Users/shambhu/Projects/personal/restlab
git add src/webview/request/CookieTab.tsx
git commit -m "feat(ui): add CookieTab component for editing request cookies"
```

---

## Task 4: Update RequestContext

**Files:**
- Modify: `src/webview/request/RequestContext.tsx`

- [ ] **Step 1: Extend `ActiveTab` type**

At line 41 in `RequestContext.tsx`, change:

```typescript
type ActiveTab = "headers" | "body" | "params" | "auth";
```

To:

```typescript
type ActiveTab = "headers" | "body" | "params" | "auth" | "cookies";
```

- [ ] **Step 2: Extend `ResponseTab` type**

At line 42, change:

```typescript
type ResponseTab = "body" | "headers";
```

To:

```typescript
type ResponseTab = "body" | "headers" | "cookies";
```

- [ ] **Step 3: Add `Cookie` to the imports**

The current import from `../types/internal.types` at line 25-31 is:

```typescript
import {
  AuthConfig,
  FolderConfig,
  FormDataItem,
  RequestConfig,
  RequestEditorProps,
  ResponseData,
} from "../types/internal.types";
```

Change it to:

```typescript
import {
  AuthConfig,
  Cookie,
  FolderConfig,
  FormDataItem,
  RequestConfig,
  RequestEditorProps,
  ResponseData,
} from "../types/internal.types";
```

- [ ] **Step 4: Add cookie handler signatures to `RequestContextValue` interface**

In the `RequestContextValue` interface (around line 45-124), add these after the `// Form data handlers` block:

```typescript
// Cookie handlers
handleAddCookie: () => void;
handleUpdateCookie: (index: number, field: "name" | "value", value: string) => void;
handleRemoveCookie: (index: number) => void;
handleToggleCookie: (index: number) => void;
```

- [ ] **Step 5: Add `cookies` to the initial config state**

The initial `config` state in `RequestContextProvider` (around line 149-161) currently ends with `formData: []`. Add `cookies`:

```typescript
const [config, setConfig] = useState<RequestConfig>({
  id: requestId,
  name: requestName,
  folderId,
  method: "GET",
  url: "",
  headers: [],
  params: [],
  body: "",
  contentType: "",
  formData: [],
  cookies: [],
});
```

- [ ] **Step 6: Add cookie handler implementations**

Add these four handlers after `handleFileSelect` (around line 784), before the `value` object construction:

```typescript
const handleAddCookie = useCallback(() => {
  setConfig((prev) => ({
    ...prev,
    cookies: [...(prev.cookies || []), { name: "", value: "" }],
  }));
  setIsSaved(false);
}, []);

const handleUpdateCookie = useCallback(
  (index: number, field: "name" | "value", value: string) => {
    setConfig((prev) => {
      const newCookies = [...(prev.cookies || [])];
      newCookies[index] = { ...newCookies[index], [field]: value };
      return { ...prev, cookies: newCookies };
    });
    setIsSaved(false);
  },
  [],
);

const handleRemoveCookie = useCallback((index: number) => {
  setConfig((prev) => ({
    ...prev,
    cookies: (prev.cookies || []).filter((_, i) => i !== index),
  }));
  setIsSaved(false);
}, []);

const handleToggleCookie = useCallback((index: number) => {
  setConfig((prev) => {
    const newCookies = [...(prev.cookies || [])];
    newCookies[index] = {
      ...newCookies[index],
      enabled: newCookies[index].enabled !== false ? false : true,
    };
    return { ...prev, cookies: newCookies };
  });
  setIsSaved(false);
}, []);
```

- [ ] **Step 7: Update `handleSendRequest` to include cookies**

Inside `handleSendRequest`, just before the final `vscode.postMessage({ type: "sendRequest", ... })` call, the `interpolatedHeaders` array has been fully assembled. Add cookie serialization right before that postMessage:

Find the block that starts with:
```typescript
vscode.postMessage({
  type: "sendRequest",
  method: config.method,
  url: fullUrl,
  headers: interpolatedHeaders,
  body: requestBody,
  formData: formDataWithFiles,
});
```

Replace it with:
```typescript
const enabledCookies = (config.cookies || [])
  .filter((c) => c.enabled !== false && c.name.trim() !== "")
  .map((c) => ({
    name: interpolateVariables(c.name, envVariables),
    value: interpolateVariables(c.value, envVariables),
  }));

vscode.postMessage({
  type: "sendRequest",
  method: config.method,
  url: fullUrl,
  headers: interpolatedHeaders,
  body: requestBody,
  formData: formDataWithFiles,
  cookies: enabledCookies,
});
```

- [ ] **Step 8: Add cookie handlers to the `value` object**

In the `value: RequestContextValue` object (around line 786), add cookie handlers after the form data handlers section:

```typescript
// Cookie handlers
handleAddCookie,
handleUpdateCookie,
handleRemoveCookie,
handleToggleCookie,
```

- [ ] **Step 9: Verify TypeScript**

```bash
cd /Users/shambhu/Projects/personal/restlab && npx tsc --noEmit 2>&1 | grep -E "^src/webview/request/RequestContext|^src/webview/request/CookieTab" | head -20
```

Expected: no errors from `RequestContext.tsx` or `CookieTab.tsx`.

- [ ] **Step 10: Commit**

```bash
cd /Users/shambhu/Projects/personal/restlab
git add src/webview/request/RequestContext.tsx
git commit -m "feat(context): add cookie state, handlers, and ActiveTab/ResponseTab extensions"
```

---

## Task 5: Add Cookies Tab to Request Editor

**Files:**
- Modify: `src/webview/request/RequestEditor.tsx`

- [ ] **Step 1: Import CookieTab**

At the top of `RequestEditor.tsx`, the existing imports include `AuthTab`. Add `CookieTab` after it:

```typescript
import CookieTab from "./CookieTab";
```

- [ ] **Step 2: Add the Cookies tab button**

In the `<div className="tabs">` block that renders the request tabs (around line 207), there are four buttons: Body (conditional), Params, Headers, Auth. Add a fifth button after the Auth button:

```tsx
<button
  className={`tab ${activeTab === "cookies" ? "active" : ""}`}
  onClick={() => setActiveTab("cookies")}
>
  Cookies
  {(config.cookies?.filter((c) => c.enabled !== false && c.name.trim() !== "").length || 0) > 0 && (
    <span className="badge">
      {config.cookies!.filter((c) => c.enabled !== false && c.name.trim() !== "").length}
    </span>
  )}
</button>
```

- [ ] **Step 3: Render CookieTab in the tab-content area**

In the `<div className="tab-content">` block (around line 245), add `CookieTab` after the `AuthTab` case:

```tsx
{activeTab === "cookies" && <CookieTab />}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd /Users/shambhu/Projects/personal/restlab && npx tsc --noEmit 2>&1 | grep "src/webview/request/RequestEditor" | head -10
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/shambhu/Projects/personal/restlab
git add src/webview/request/RequestEditor.tsx
git commit -m "feat(ui): add Cookies tab to request editor"
```

---

## Task 6: Add Cookies Tab to Response Panel

**Files:**
- Modify: `src/webview/request/ResponsePanel.tsx`

- [ ] **Step 1: Add Cookies tab button to the response toolbar**

In `ResponsePanel.tsx`, find the `<div className="tabs">` inside the response toolbar (around line 136). Currently it has two buttons: Body and Headers. Add a Cookies button after Headers:

```tsx
<button
  className={`tab ${responseTab === "cookies" ? "active" : ""}`}
  onClick={() => setResponseTab("cookies")}
>
  Cookies
  {(response.cookies?.length || 0) > 0 && (
    <span className="badge">{response.cookies!.length}</span>
  )}
</button>
```

- [ ] **Step 2: Render the cookies list in the response content area**

In the `<div className="response-content">` block, after the `responseTab === "headers"` JSX block (around line 223), add:

```tsx
{responseTab === "cookies" && (
  <div className="response-headers">
    {!response.cookies || response.cookies.length === 0 ? (
      <p className="empty-hint">No cookies in response</p>
    ) : (
      response.cookies.map((cookie, i) => (
        <div key={i} className="response-header-row">
          <span className="header-name">{cookie.name}</span>
          <span className="header-value">
            {cookie.value}
            {cookie.path && (
              <span style={{ opacity: 0.5, marginLeft: "8px" }}>
                Path: {cookie.path}
              </span>
            )}
            {cookie.httpOnly && (
              <span style={{ opacity: 0.5, marginLeft: "8px" }}>HttpOnly</span>
            )}
            {cookie.secure && (
              <span style={{ opacity: 0.5, marginLeft: "8px" }}>Secure</span>
            )}
          </span>
        </div>
      ))
    )}
  </div>
)}
```

- [ ] **Step 3: Verify TypeScript — full project**

```bash
cd /Users/shambhu/Projects/personal/restlab && npx tsc --noEmit 2>&1
```

Expected: zero errors across all files.

- [ ] **Step 4: Commit**

```bash
cd /Users/shambhu/Projects/personal/restlab
git add src/webview/request/ResponsePanel.tsx
git commit -m "feat(ui): add Cookies tab to response panel showing parsed Set-Cookie values"
```

---

## Task 7: Update CHANGELOG

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Mark the cookie roadmap item done and add release notes**

In `CHANGELOG.md`, in the `## Future Roadmap` section, find or add the cookie item:

If `- [ ] Cookie management` or similar exists, change `[ ]` to `[x]`.

If it does not exist, add under Future Roadmap (as already done):
```
- [x] Cookie support — send cookies with requests, view Set-Cookie response cookies
```

Then insert a new `## x.y.z` release entry just below the `---` separator (following the existing structure of the file). Check `package.json` for the current version number first:

```bash
cd /Users/shambhu/Projects/personal/restlab && node -p "require('./package.json').version"
```

- [ ] **Step 2: Commit**

```bash
cd /Users/shambhu/Projects/personal/restlab
git add CHANGELOG.md
git commit -m "chore: update CHANGELOG for cookie integration"
```

---

## Self-Review Checklist

- **Request cookies stored and loaded**: `RequestConfig.cookies` is persisted via `saveConfig`, and `configLoaded` sends `savedRequest?.cookies || []` — covered in Task 2, Step 8.
- **Cookie header merge**: Extension host merges enabled cookies into `Cookie` header, skips if `Cookie` header already set explicitly — covered in Task 2, Step 4.
- **Set-Cookie parsing**: Handles multiple Set-Cookie headers (axios `string[]`), parses name/value/attributes — covered in Task 2, Steps 5–6.
- **Variable interpolation in cookie values**: `handleSendRequest` calls `interpolateVariables` on name and value — covered in Task 4, Step 7.
- **No empty-name cookies sent**: `.filter((c) => c.name.trim() !== "")` in both the badge count and the send logic — covered in Task 4, Step 7 and Task 5, Step 2.
- **Badge only shows enabled, non-empty cookies**: Filter applied before badge count — covered in Task 5, Step 2.
- **Type consistency**: `Cookie` and `ResponseCookie` defined in Task 1 and used consistently throughout. `handleUpdateCookie` uses `"name" | "value"` which matches `CookieTab`'s call sites.
- **Placeholder scan**: No TBD/TODO in any code block. All steps have complete code.
