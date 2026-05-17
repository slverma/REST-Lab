# Response Panel Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix clipboard paste in the Monaco find widget (Ctrl+F), auto-switch layout by container width, move layout toggle into the response header, add a hide/show button for the response panel, and extract all response rendering into a dedicated component.

**Architecture:** Add a ResizeObserver in RequestContext for auto-layout; intercept keydown events on the editor container to enable paste in Monaco's find widget; extract response JSX into ResponsePanel component which owns the layout toggle and the new hide button; drive hide/show state from context.

**Tech Stack:** React, TypeScript, Monaco Editor (`@monaco-editor/react`), CSS (no Tailwind in request styles)

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/webview/request/ResponsePanel.tsx` | All response rendering — resize handle, response section, tabs, toolbar, hide button, layout toggle |
| Create | `src/webview/components/icons/EyeIcon.tsx` | Eye / eye-off SVG icon for hide-response toggle |
| Modify | `src/webview/request/RequestContext.tsx` | Add `isSmallScreen`, `isResponseHidden`, `toggleResponseHidden` to state + context interface; add ResizeObserver |
| Modify | `src/webview/request/RequestEditor.tsx` | Remove response JSX and layout-toggle-btn from request-bar; import `<ResponsePanel />` |
| Modify | `src/webview/request/BodyEditor.tsx` | Fix clipboard paste in Monaco find widget (Ctrl+F) |
| Modify | `src/webview/request/styles.css` | Styles for hidden response panel, layout toggle in response header, auto-layout override |

---

## Task 1: Add EyeIcon component

**Files:**
- Create: `src/webview/components/icons/EyeIcon.tsx`

- [ ] **Step 1: Create the icon file**

```tsx
import React from "react";

type EyeIconProps = { hidden?: boolean };

const EyeIcon = ({ hidden = false }: EyeIconProps) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {hidden ? (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    ) : (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    )}
  </svg>
);

export default EyeIcon;
```

- [ ] **Step 2: Commit**

```bash
git add src/webview/components/icons/EyeIcon.tsx
git commit -m "feat: add EyeIcon component for response hide/show toggle"
```

---

## Task 2: Extend RequestContext with isSmallScreen, isResponseHidden, and auto-layout

**Files:**
- Modify: `src/webview/request/RequestContext.tsx`

The current context has `splitLayout: SplitLayout` driven by `toggleLayout`. We need to:
- Track `isSmallScreen` via ResizeObserver on `containerRef`
- When small screen: effective layout is always `"horizontal"` regardless of user preference
- Track `isResponseHidden: boolean`
- Add `toggleResponseHidden` handler
- Expose `isSmallScreen` so ResponsePanel can hide the toggle button

- [ ] **Step 1: Add new state and update the context interface**

In `RequestContext.tsx`, add to the `RequestContextValue` interface (after the existing `isResizing` line):

```ts
  isSmallScreen: boolean;
  isResponseHidden: boolean;
  toggleResponseHidden: () => void;
```

- [ ] **Step 2: Add state variables inside RequestContextProvider**

Add after the existing layout state block (after `const [isResizing, setIsResizing] = useState(false);`):

```ts
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [isResponseHidden, setIsResponseHidden] = useState(false);
```

- [ ] **Step 3: Add ResizeObserver effect for auto-layout**

Add a new `useEffect` after the resize mouse-event effect (after the `}, [isResizing, splitLayout]);` closing):

```ts
  const SMALL_BREAKPOINT = 680;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const small = entry.contentRect.width < SMALL_BREAKPOINT;
        setIsSmallScreen((prev) => {
          if (prev !== small) {
            // Reset split size so panels start equal after layout switch
            setSplitLayout(small ? "horizontal" : "vertical");
            setRequestSize(50);
          }
          return small;
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
```

- [ ] **Step 4: Add toggleResponseHidden handler**

Add after the `toggleLayout` callback:

```ts
  const toggleResponseHidden = useCallback(() => {
    setIsResponseHidden((prev) => !prev);
  }, []);
```

- [ ] **Step 5: Add new values to the context value object**

In the `value` object near the bottom of the provider, add after `isResizing`:

```ts
    isSmallScreen,
    isResponseHidden,
    toggleResponseHidden,
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd /Users/shambhu/Projects/personal/restlab && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing unrelated errors).

- [ ] **Step 7: Commit**

```bash
git add src/webview/request/RequestContext.tsx
git commit -m "feat: add isSmallScreen auto-layout and isResponseHidden state to context"
```

---

## Task 3: Create ResponsePanel component

**Files:**
- Create: `src/webview/request/ResponsePanel.tsx`

This component extracts all response-related JSX currently in `RequestEditor.tsx` (lines 283–484), moves the layout-toggle-btn here (removed from request-bar), and adds the new hide button.

- [ ] **Step 1: Create the file with all response rendering**

```tsx
import React from "react";
import CopyIcon from "../components/icons/CopyIcon";
import DownloadIcon from "../components/icons/DownloadIcon";
import EyeIcon from "../components/icons/EyeIcon";
import PencilIcon from "../components/icons/PencilIcon";
import SplitIcon from "../components/icons/SplitIcon";
import WarningIcon from "../components/icons/WarningIcon";
import Tooltip from "../components/Tooltip";
import { formatJson, formatSize, getFileExtension, getStatusColor } from "../helpers/helper";
import BodyEditor from "./BodyEditor";
import { useRequestContext } from "./RequestContext";

const ResponsePanel: React.FC = () => {
  const {
    response,
    isLoading,
    responseTab,
    splitLayout,
    requestSize,
    isResizing,
    isSmallScreen,
    isResponseHidden,
    responseEditorLanguage,
    responseBodyValue,
    setResponseTab,
    toggleLayout,
    toggleResponseHidden,
    handleResizeStart,
    vscode,
  } = useRequestContext();

  if (!response && !isLoading) return null;

  const sizeStyle: React.CSSProperties = isResponseHidden
    ? {}
    : { [splitLayout === "horizontal" ? "height" : "width"]: `${100 - requestSize}%` };

  return (
    <>
      <div
        className={`resize-handle ${splitLayout} ${isResizing ? "active" : ""} ${isResponseHidden ? "hidden" : ""}`}
        onMouseDown={handleResizeStart}
      >
        <div className="resize-handle-bar" />
      </div>

      <div
        className={`response-panel ${isResponseHidden ? "response-panel--hidden" : ""}`}
        style={sizeStyle}
      >
        <div className="response-section">
          <div className="response-header">
            <h2>Response</h2>
            <div className="response-header-right">
              {response && (
                <div className="response-meta">
                  <span className={`status-badge ${getStatusColor(response.status)}`}>
                    {response.status === 0
                      ? "Network Error"
                      : `${response.status} ${response.statusText}`}
                  </span>
                  {response.status !== 0 && (
                    <>
                      <span className="time-badge">{response.time}ms</span>
                      <span className="size-badge">{formatSize(response.size)}</span>
                    </>
                  )}
                </div>
              )}
              <div className="response-header-actions">
                {!isSmallScreen && (
                  <Tooltip text={splitLayout === "horizontal" ? "Switch to side-by-side view" : "Switch to stacked view"}>
                    <button
                      className="layout-toggle-btn"
                      onClick={toggleLayout}
                    >
                      <SplitIcon splitLayout={splitLayout} />
                    </button>
                  </Tooltip>
                )}
                <Tooltip text={isResponseHidden ? "Show response" : "Hide response"}>
                  <button
                    className="response-hide-btn"
                    onClick={toggleResponseHidden}
                  >
                    <EyeIcon hidden={isResponseHidden} />
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>

          {!isResponseHidden && (
            <>
              {isLoading ? (
                <div className="loading-state">
                  <span className="loading-spinner large"></span>
                  <p>Sending request...</p>
                </div>
              ) : (
                response && (
                  <>
                    <div className="response-toolbar">
                      <div className="tabs">
                        <button
                          className={`tab ${responseTab === "body" ? "active" : ""}`}
                          onClick={() => setResponseTab("body")}
                        >
                          Body
                        </button>
                        <button
                          className={`tab ${responseTab === "headers" ? "active" : ""}`}
                          onClick={() => setResponseTab("headers")}
                        >
                          Headers
                          <span className="badge">{Object.keys(response.headers).length}</span>
                        </button>
                      </div>
                      <div className="response-actions">
                        <Tooltip text="Copy response to clipboard">
                          <button
                            className="action-btn"
                            onClick={() => {
                              const content =
                                responseTab === "body"
                                  ? formatJson(response.data)
                                  : Object.entries(response.headers)
                                      .map(([k, v]) => `${k}: ${v}`)
                                      .join("\n");
                              navigator.clipboard.writeText(content);
                              vscode.postMessage({ type: "showInfo", message: "Copied to clipboard!" });
                            }}
                          >
                            <CopyIcon />
                          </button>
                        </Tooltip>
                        <Tooltip text="Download response">
                          <button
                            className="action-btn"
                            onClick={() => {
                              const content =
                                responseTab === "body"
                                  ? formatJson(response.data)
                                  : Object.entries(response.headers)
                                      .map(([k, v]) => `${k}: ${v}`)
                                      .join("\n");
                              const extension =
                                responseTab === "body"
                                  ? getFileExtension(response.headers)
                                  : "txt";
                              const filename = `response-${Date.now()}.${extension}`;
                              vscode.postMessage({
                                type: "downloadResponse",
                                content,
                                filename,
                                mimeType:
                                  responseTab === "body"
                                    ? response.headers["content-type"] || "text/plain"
                                    : "text/plain",
                              });
                            }}
                          >
                            <DownloadIcon />
                          </button>
                        </Tooltip>
                        <Tooltip text="Open response in VS Code editor">
                          <button
                            className="action-btn"
                            onClick={() => {
                              const content =
                                responseTab === "body"
                                  ? formatJson(response.data)
                                  : Object.entries(response.headers)
                                      .map(([k, v]) => `${k}: ${v}`)
                                      .join("\n");
                              const extension =
                                responseTab === "body"
                                  ? getFileExtension(response.headers)
                                  : "txt";
                              vscode.postMessage({
                                type: "openResponseInEditor",
                                content,
                                extension,
                                mimeType:
                                  responseTab === "body"
                                    ? response.headers["content-type"] || "text/plain"
                                    : "text/plain",
                              });
                            }}
                          >
                            <PencilIcon />
                          </button>
                        </Tooltip>
                      </div>
                    </div>

                    <div className="response-content">
                      {responseTab === "body" &&
                        (response.status === 0 ? (
                          <div className="error-display">
                            <div className="error-icon"><WarningIcon /></div>
                            <h3 className="error-title">Request Failed</h3>
                            <p className="error-message">{response.data}</p>
                          </div>
                        ) : (
                          <BodyEditor
                            value={responseBodyValue}
                            language={responseEditorLanguage}
                            readOnly
                            className="response-editor"
                            showHint="Ctrl+F search"
                          />
                        ))}
                      {responseTab === "headers" && (
                        <div className="response-headers">
                          {Object.entries(response.headers).length === 0 ? (
                            <p className="empty-hint">No headers available</p>
                          ) : (
                            Object.entries(response.headers).map(([key, value]) => (
                              <div key={key} className="response-header-row">
                                <span className="header-name">{key}</span>
                                <span className="header-value">{value}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ResponsePanel;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/shambhu/Projects/personal/restlab && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/webview/request/ResponsePanel.tsx src/webview/components/icons/EyeIcon.tsx
git commit -m "feat: create ResponsePanel component with layout toggle and hide button"
```

---

## Task 4: Update RequestEditor to use ResponsePanel and remove response JSX

**Files:**
- Modify: `src/webview/request/RequestEditor.tsx`

- [ ] **Step 1: Add ResponsePanel import at the top**

In `RequestEditor.tsx`, add after the `VarInput` import line:

```ts
import ResponsePanel from "./ResponsePanel";
```

- [ ] **Step 2: Remove the layout-toggle-btn from request-bar**

Find and remove this entire block from the JSX in `RequestEditorContent` (lines 175–187 of the current file):

```tsx
        {(response || isLoading) && (
          <button
            className="layout-toggle-btn"
            onClick={toggleLayout}
            title={
              splitLayout === "horizontal"
                ? "Switch to side-by-side view"
                : "Switch to stacked view"
            }
          >
            <SplitIcon splitLayout={splitLayout} />
          </button>
        )}
```

- [ ] **Step 3: Remove unused imports**

Remove `SplitIcon` from imports (it's now only used in ResponsePanel), and remove `toggleLayout` and `splitLayout` from the destructured context values (they're used in ResponsePanel now). Also remove `isResizing`, `handleResizeStart`, `responseTab`, `setResponseTab`, `responseBodyValue`, `responseEditorLanguage` from the destructured list in `RequestEditorContent` since ResponsePanel handles those.

Keep only what `RequestEditorContent` still needs:
- `config`, `folderConfig`, `envVariables`, `environments`, `activeEnvironmentId`
- `response`, `isLoading` (still needed for `has-response` class on split-container)
- `activeTab`, `isSaved`, `requestSize`
- `bodyEditorRef`, `containerRef`, `splitContainerRef`
- `requestEditorLanguage`
- `setActiveTab`
- `handleConfigChange`, `handleSendRequest`, `handleSaveConfig`, `handleCopyCurl`, `handleBeautifyJson`
- `handleSetActiveEnvironment`
- `vscode`
- `splitLayout` (still needed for `split-container` class and `request-panel` sizing)
- `isResponseHidden` (needed for `request-panel` sizing and `has-response` class)

- [ ] **Step 4: Replace the response panel JSX with ResponsePanel component**

Find the block starting at `{(response || isLoading) && (` that renders the resize handle and response-panel div (currently lines 283–484). Replace the entire second `{(response || isLoading) && ( ... )}` block (the resize handle one AND the response-panel one) with:

```tsx
        <ResponsePanel />
```

- [ ] **Step 5: Update request-panel inline style to not apply when response is hidden**

Find the `request-panel` div's style prop:

```tsx
          style={
            response || isLoading
              ? {
                  [splitLayout === "horizontal" ? "height" : "width"]:
                    `${requestSize}%`,
                }
              : undefined
          }
```

Replace with:

```tsx
          style={
            (response || isLoading) && !isResponseHidden
              ? {
                  [splitLayout === "horizontal" ? "height" : "width"]:
                    `${requestSize}%`,
                }
              : undefined
          }
```

- [ ] **Step 6: Verify TypeScript compiles with no new errors**

```bash
cd /Users/shambhu/Projects/personal/restlab && npx tsc --noEmit 2>&1 | head -40
```

- [ ] **Step 7: Commit**

```bash
git add src/webview/request/RequestEditor.tsx
git commit -m "refactor: use ResponsePanel component, remove layout toggle from request-bar"
```

---

## Task 5: Add CSS for hidden response panel and layout toggle in response header

**Files:**
- Modify: `src/webview/request/styles.css`

- [ ] **Step 1: Add styles for response header layout (right-side controls)**

Find the existing `.response-header` block in `styles.css` and the `.response-meta` block. After the `.response-meta` rule, add:

```css
.response-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.response-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 4px;
}

.response-hide-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--glass-border);
  border-radius: 6px;
  background: var(--glass-bg);
  color: var(--vscode-descriptionForeground);
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
  flex-shrink: 0;
}

.response-hide-btn:hover {
  background: var(--restlab-accent-subtle);
  border-color: var(--restlab-accent);
  color: var(--restlab-accent);
}
```

- [ ] **Step 2: Move layout-toggle-btn style so it works in the response header context**

The existing `.layout-toggle-btn` CSS rule is fine as-is — no changes needed, it works wherever the button is rendered. Verify the rule still exists (it's around line 477 in styles.css).

- [ ] **Step 3: Add hidden response panel styles**

After the `.response-panel` rules, add:

```css
.response-panel--hidden {
  flex: 0 0 auto !important;
  width: auto !important;
  height: auto !important;
  min-width: 0 !important;
  min-height: 0 !important;
}

.response-panel--hidden .response-section {
  min-height: 0;
}

.resize-handle.hidden {
  display: none;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/webview/request/styles.css
git commit -m "feat: add styles for response hide panel and response header actions"
```

---

## Task 6: Fix clipboard paste in Monaco find widget (Ctrl+F)

**Files:**
- Modify: `src/webview/request/BodyEditor.tsx`

The Monaco find widget opens an `<input>` inside a `.find-widget` container. In VS Code webviews, `Ctrl+V` inside that input does not trigger paste from the system clipboard. We fix it by intercepting `keydown` on the editor's container DOM node.

- [ ] **Step 1: Add the find-widget paste fix inside handleEditorDidMount**

In `BodyEditor.tsx`, inside the `handleEditorDidMount` callback, add the following block **after** the existing `editor.addAction({ id: "custom-paste", ... })` block (after its closing `});`):

```ts
    // Fix paste (Ctrl+V / Cmd+V) inside Monaco's built-in find widget
    const container = editor.getContainerDomNode();
    container.addEventListener(
      "keydown",
      (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        const inFindWidget =
          (target.tagName === "INPUT" || target.tagName === "TEXTAREA") &&
          !!target.closest(".find-widget");
        if (!inFindWidget) return;
        if ((e.ctrlKey || e.metaKey) && e.key === "v") {
          e.preventDefault();
          e.stopPropagation();
          navigator.clipboard
            .readText()
            .then((text) => {
              if (text) {
                document.execCommand("insertText", false, text);
              }
            })
            .catch(() => {});
        }
      },
      true,
    );
```

- [ ] **Step 2: Verify TypeScript compiles with no new errors**

```bash
cd /Users/shambhu/Projects/personal/restlab && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/webview/request/BodyEditor.tsx
git commit -m "fix: enable clipboard paste in Monaco find widget (Ctrl+F search)"
```

---

## Task 7: Build and smoke-test

- [ ] **Step 1: Run the build**

```bash
cd /Users/shambhu/Projects/personal/restlab && npm run compile 2>&1 | tail -20
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 2: Manually verify the five features**

Open the extension in VS Code (press F5 or `npm run watch` then reload).

| Feature | How to test |
|---------|-------------|
| Paste in find widget | Open a request with a response body → press Ctrl+F → copy some text from outside → focus find input → press Ctrl+V → should paste |
| Auto stacked layout | Resize the tab to narrow (< 680px wide) → response should automatically stack below request; widen the tab → should return to side-by-side |
| Layout toggle location | Send a request → toggle button should appear inside the Response section header, not in the request bar |
| Hide response | Send a request → click the eye button in the response header → response panel collapses; click again → it expands |
| ResponsePanel component | Code-level: confirm `RequestEditor.tsx` no longer contains the response JSX inline |

- [ ] **Step 3: Final commit if any small fixes were made**

```bash
git add -p
git commit -m "fix: post-build smoke-test corrections"
```

---

## Self-Review

**Spec coverage check:**
1. ✅ Paste in Ctrl+F search — Task 6 (BodyEditor find-widget keydown intercept)
2. ✅ Auto stacked on small / side-by-side on large — Task 2 (ResizeObserver + `SMALL_BREAKPOINT = 680`)
3. ✅ Layout toggle moved from request-bar to response header — Task 3 (ResponsePanel) + Task 4 (remove from RequestEditor)
4. ✅ Hide/show button on response section — Task 1 (EyeIcon) + Task 2 (`isResponseHidden` state) + Task 3 (ResponsePanel renders button) + Task 5 (CSS)
5. ✅ Response code in separate component — Task 3 (ResponsePanel.tsx)
6. ✅ Pure TypeScript (no JavaScript) — all files are `.tsx` / `.ts`

**Placeholder scan:** None found — all steps contain actual code.

**Type consistency:**
- `isSmallScreen: boolean` — added to interface (Task 2) and used in ResponsePanel (Task 3) ✅
- `isResponseHidden: boolean` — added to interface (Task 2), used in ResponsePanel (Task 3) and RequestEditor (Task 4) ✅
- `toggleResponseHidden: () => void` — added to interface (Task 2), called in ResponsePanel (Task 3) ✅
- `EyeIcon` with `hidden?: boolean` prop — created (Task 1), used with `hidden={isResponseHidden}` (Task 3) ✅
- `response-panel--hidden` CSS class — defined (Task 5), applied in ResponsePanel (Task 3) ✅
- `resize-handle.hidden` CSS class — defined (Task 5), applied in ResponsePanel (Task 3) ✅
