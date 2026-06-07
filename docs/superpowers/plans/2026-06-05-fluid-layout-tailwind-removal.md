# Fluid Layout Fix + Sidebar Tailwind Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fixed-px sizing in the request editor with em-based fluid tokens, and remove Tailwind from the sidebar entirely, replacing it with a custom `sidebar.css`.

**Architecture:** Two independent tracks — Track A patches `styles.css` and adds one React hook; Track B creates `sidebar.css` and updates six sidebar files. Both tracks land on the same branch. The two tracks do not touch each other's files, so they can be executed in any order.

**Tech Stack:** CSS custom properties, React + TypeScript, VS Code Webview. No test suite — verification is `npx tsc --noEmit` after every TypeScript change.

---

## Track A — Request Editor Fluid Fix

### Task 1: Add `--rl-*` tokens and fluid request bar to `styles.css`

**Files:**
- Modify: `src/webview/request/styles.css`

- [ ] **Step 1: Add fluid spacing tokens to `:root`**

In `src/webview/request/styles.css`, find the `:root` block (starts at line 3). Add these variables at the end of the block, before the closing `}`:

```css
  /* Fluid spacing tokens — all em, scale with --vscode-font-size */
  --rl-sp1: 0.30em;
  --rl-sp2: 0.46em;
  --rl-sp3: 0.62em;
  --rl-sp4: 0.92em;
  --rl-sp5: 1.23em;
  --rl-ctrl: 2.35em;
  --rl-icon: 1.25em;
  --rl-r1: 0.35em;
  --rl-r2: 0.50em;
  --rl-r3: 0.65em;
```

- [ ] **Step 2: Update `.request-editor` side padding**

Find and replace:

```css
/* OLD */
.request-editor {
  display: flex;
  flex-direction: column;
  height: 100vh;
  /* max-width: 1200px; */
  margin: 0 auto;
  padding: 0 24px;
  position: relative;
  overflow: hidden;
}
```

```css
/* NEW */
.request-editor {
  display: flex;
  flex-direction: column;
  height: 100vh;
  /* max-width: 1200px; */
  margin: 0 auto;
  padding: 0 var(--rl-sp5);
  position: relative;
  overflow: hidden;
}
```

- [ ] **Step 3: Update `.request-bar`**

Find and replace:

```css
/* OLD */
.request-bar {
  display: flex;
  gap: 6px;
  padding: 4px 0;
  align-items: center;
}
```

```css
/* NEW */
.request-bar {
  display: flex;
  gap: var(--rl-sp3);
  padding: var(--rl-sp4) 0 var(--rl-sp3);
  align-items: center;
  flex-wrap: wrap;
}
.request-bar > * { min-height: var(--rl-ctrl); }
```

- [ ] **Step 4: Update `.method-select` sizing**

Find and replace:

```css
/* OLD */
.method-select {
  padding: 5px 10px;
  border: 2px solid var(--glass-border);
  border-radius: 7px;
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  min-width: 96px;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
```

```css
/* NEW */
.method-select {
  height: var(--rl-ctrl);
  padding: 0 0.7em;
  border: 2px solid var(--glass-border);
  border-radius: var(--rl-r3);
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  font-family: inherit;
  font-size: 0.92em;
  font-weight: 700;
  cursor: pointer;
  min-width: 6.2em;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

- [ ] **Step 5: Update `.url-input` sizing**

Find and replace:

```css
/* OLD */
.url-input {
  flex: 1;
  min-width: 0;
  padding: 6px 12px;
  border: 1px solid var(--glass-border);
  border-radius: 7px;
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  font-family: "SF Mono", "Fira Code", "Consolas", monospace;
  font-size: 13px;
  transition: all 0.2s ease;
  word-break: break-all;
  overflow-wrap: anywhere;
}
```

```css
/* NEW */
.url-input {
  flex: 1 1 16em;
  min-width: 0;
  height: var(--rl-ctrl);
  padding: 0 var(--rl-sp4);
  border: 1px solid var(--glass-border);
  border-radius: var(--rl-r3);
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  font-family: "SF Mono", "Fira Code", "Consolas", monospace;
  font-size: 0.92em;
  transition: all 0.2s ease;
}
```

- [ ] **Step 6: Update `.send-btn` sizing**

Find and replace only the sizing/spacing properties in `.send-btn`. The rule currently starts with `display: flex; align-items: center; gap: 6px; padding: 7px 10px; border: none; border-radius: 7px; ... font-size: 13px;`. Replace those lines:

```css
/* OLD (top of .send-btn) */
.send-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border: none;
  border-radius: 7px;
  background: var(--restlab-gradient);
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px var(--restlab-accent-glow);
  position: relative;
  overflow: hidden;
}
```

```css
/* NEW */
.send-btn {
  display: flex;
  align-items: center;
  gap: var(--rl-sp2);
  height: var(--rl-ctrl);
  padding: 0 var(--rl-sp4);
  border: none;
  border-radius: var(--rl-r3);
  background: var(--restlab-gradient);
  color: #ffffff;
  font-size: 0.92em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px var(--restlab-accent-glow);
  position: relative;
  overflow: hidden;
}
.send-btn svg { width: var(--rl-icon); height: var(--rl-icon); }
```

- [ ] **Step 7: Update `.save-btn` sizing**

Find and replace:

```css
/* OLD */
.save-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border: 1px solid var(--glass-border);
  border-radius: 7px;
  background: var(--glass-bg);
  color: var(--vscode-foreground);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
}
```

```css
/* NEW */
.save-btn {
  display: flex;
  align-items: center;
  gap: var(--rl-sp2);
  height: var(--rl-ctrl);
  padding: 0 var(--rl-sp4);
  border: 1px solid var(--glass-border);
  border-radius: var(--rl-r3);
  background: var(--glass-bg);
  color: var(--vscode-foreground);
  font-size: 0.92em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
}
.save-btn svg { width: var(--rl-icon); height: var(--rl-icon); }
```

- [ ] **Step 8: Update `.request-more-btn` sizing**

Find and replace:

```css
/* OLD */
.request-more-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid var(--glass-border);
  border-radius: 7px;
  background: var(--glass-bg);
  color: var(--vscode-foreground);
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
  flex-shrink: 0;
}
```

```css
/* NEW */
.request-more-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--rl-ctrl);
  height: var(--rl-ctrl);
  padding: 0;
  border: 1px solid var(--glass-border);
  border-radius: var(--rl-r3);
  background: var(--glass-bg);
  color: var(--vscode-foreground);
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
  flex-shrink: 0;
}
```

- [ ] **Step 9: Update `.layout-toggle-btn` sizing**

Find and replace:

```css
/* OLD */
.layout-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid var(--glass-border);
  border-radius: 7px;
  background: var(--glass-bg);
  color: var(--vscode-foreground);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
}
```

```css
/* NEW */
.layout-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--rl-ctrl);
  height: var(--rl-ctrl);
  padding: 0;
  border: 1px solid var(--glass-border);
  border-radius: var(--rl-r3);
  background: var(--glass-bg);
  color: var(--vscode-foreground);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
}
```

- [ ] **Step 10: Update `.request-env-select` sizing**

Find and replace:

```css
/* OLD */
.request-env-select {
  padding: 6px 8px;
  border: 1px solid var(--glass-border);
  border-radius: 7px;
  background: var(--vscode-input-background);
  color: var(--vscode-descriptionForeground);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s;
  max-width: 130px;
  flex-shrink: 0;
}
```

```css
/* NEW */
.request-env-select {
  height: var(--rl-ctrl);
  padding: 0 0.6em;
  border: 1px solid var(--glass-border);
  border-radius: var(--rl-r3);
  background: var(--vscode-input-background);
  color: var(--vscode-descriptionForeground);
  font-size: 0.82em;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s;
  max-width: 9em;
  flex-shrink: 0;
}
```

- [ ] **Step 11: Update `.base-url-hint` sizing**

Find and replace:

```css
/* OLD */
.base-url-hint {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  padding-bottom: 6px;
}
```

```css
/* NEW */
.base-url-hint {
  font-size: 0.92em;
  color: var(--vscode-descriptionForeground);
  padding-bottom: var(--rl-sp3);
}
```

- [ ] **Step 12: Commit**

```bash
git add src/webview/request/styles.css
git commit -m "feat: add --rl-* fluid tokens and update request bar controls"
```

---

### Task 2: Fluid tabs in `styles.css`

**Files:**
- Modify: `src/webview/request/styles.css`

- [ ] **Step 1: Replace `.tabs` block with tabstrip-wrap + scrollable tabs**

Find and replace:

```css
/* OLD */
.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--glass-border);
  margin-bottom: 16px;
  position: relative;
}
```

```css
/* NEW */
.tabstrip-wrap {
  position: relative;
  border-bottom: 1px solid var(--glass-border);
  margin-bottom: var(--rl-sp5);
}
.tabstrip-wrap::before,
.tabstrip-wrap::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1.6em;
  pointer-events: none;
  z-index: 2;
  opacity: 0;
  transition: opacity 0.15s;
}
.tabstrip-wrap::before {
  left: 0;
  background: linear-gradient(90deg, var(--vscode-editor-background), transparent);
}
.tabstrip-wrap::after {
  right: 0;
  background: linear-gradient(270deg, var(--vscode-editor-background), transparent);
}
.tabstrip-wrap.scroll-start::after { opacity: 1; }
.tabstrip-wrap.scroll-mid::before,
.tabstrip-wrap.scroll-mid::after { opacity: 1; }
.tabstrip-wrap.scroll-end::before { opacity: 1; }

.tabs {
  display: flex;
  gap: var(--rl-sp1);
  overflow-x: auto;
  scrollbar-width: none;
  position: relative;
}
.tabs::-webkit-scrollbar { height: 0; }
```

- [ ] **Step 2: Update `.tab` sizing**

Find and replace:

```css
/* OLD */
.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 18px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--vscode-descriptionForeground);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}
```

```css
/* NEW */
.tab {
  display: flex;
  align-items: center;
  gap: var(--rl-sp2);
  padding: var(--rl-sp3) var(--rl-sp4);
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--vscode-descriptionForeground);
  font-size: 0.92em;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  flex-shrink: 0;
  white-space: nowrap;
}
```

- [ ] **Step 3: Update `.badge` sizing**

Find and replace:

```css
/* OLD */
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  font-size: 10px;
  font-weight: 700;
  background: var(--restlab-gradient);
  color: #ffffff;
  border-radius: 9px;
}
```

```css
/* NEW */
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.4em;
  height: 1.4em;
  padding: 0 0.42em;
  font-size: 0.72em;
  font-weight: 700;
  background: var(--restlab-gradient);
  color: #ffffff;
  border-radius: 0.8em;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/webview/request/styles.css
git commit -m "feat: fluid tab strip with scroll + fade edges"
```

---

### Task 3: Fluid response section and key-value rows in `styles.css`

**Files:**
- Modify: `src/webview/request/styles.css`

- [ ] **Step 1: Update `.response-section` padding**

Find `padding: 16px;` inside `.response-section` and replace that line:

```css
/* OLD line inside .response-section */
  padding: 16px;
```

```css
/* NEW */
  padding: var(--rl-sp5);
```

- [ ] **Step 2: Update `.response-header`**

Find and replace:

```css
/* OLD */
.response-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
```

```css
/* NEW */
.response-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--rl-sp5);
  flex-wrap: wrap;
  gap: var(--rl-sp3);
}
```

- [ ] **Step 3: Update `.response-meta`**

Find and replace:

```css
/* OLD */
.response-meta {
  display: flex;
  gap: 8px;
}
```

```css
/* NEW */
.response-meta {
  display: flex;
  gap: var(--rl-sp2);
  flex-wrap: wrap;
}
```

- [ ] **Step 4: Update `.response-toolbar`**

Find and replace:

```css
/* OLD */
.response-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
```

```css
/* NEW */
.response-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--rl-sp4);
  flex-wrap: wrap;
  gap: var(--rl-sp3);
}
```

- [ ] **Step 5: Update `.response-actions .action-btn`**

Find and replace:

```css
/* OLD */
.response-actions .action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid var(--glass-border);
  border-radius: 6px;
  background: var(--glass-bg);
  color: var(--vscode-foreground);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  opacity: 1;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
```

```css
/* NEW */
.response-actions .action-btn {
  display: flex;
  align-items: center;
  gap: var(--rl-sp2);
  height: var(--rl-ctrl);
  padding: 0 var(--rl-sp4);
  border: 1px solid var(--glass-border);
  border-radius: var(--rl-r2);
  background: var(--glass-bg);
  color: var(--vscode-foreground);
  font-size: 0.8em;
  font-weight: 500;
  cursor: pointer;
  opacity: 1;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
```

- [ ] **Step 6: Update status/time/size badges**

Find and replace `.status-badge`:

```css
/* OLD */
.status-badge {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.3px;
}
```

```css
/* NEW */
.status-badge {
  padding: 0.35em 0.8em;
  border-radius: 1.4em;
  font-size: 0.76em;
  font-weight: 700;
  letter-spacing: 0.3px;
}
```

Find and replace `.time-badge`:

```css
/* OLD */
.time-badge {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background: var(--glass-bg);
  color: var(--vscode-foreground);
  border: 1px solid var(--glass-border);
}
```

```css
/* NEW */
.time-badge {
  padding: 0.35em 0.8em;
  border-radius: 1.4em;
  font-size: 0.76em;
  font-weight: 600;
  background: var(--glass-bg);
  color: var(--vscode-foreground);
  border: 1px solid var(--glass-border);
}
```

Find and replace `.size-badge`:

```css
/* OLD */
.size-badge {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background: linear-gradient(
    90deg,
    rgba(99, 102, 241, 0.1) 0%,
    rgba(168, 85, 247, 0.1) 100%
  );
  color: #a855f7;
  border: 1px solid rgba(168, 85, 247, 0.3);
}
```

```css
/* NEW */
.size-badge {
  padding: 0.35em 0.8em;
  border-radius: 1.4em;
  font-size: 0.76em;
  font-weight: 600;
  background: linear-gradient(
    90deg,
    rgba(99, 102, 241, 0.1) 0%,
    rgba(168, 85, 247, 0.1) 100%
  );
  color: #a855f7;
  border: 1px solid rgba(168, 85, 247, 0.3);
}
```

- [ ] **Step 7: Update `.response-header-row .header-name` min-width**

Find and replace:

```css
/* OLD */
.response-header-row .header-name {
  font-weight: 700;
  min-width: 200px;
```

```css
/* NEW */
.response-header-row .header-name {
  font-weight: 700;
  min-width: 11em;
```

- [ ] **Step 8: Update key-value input fields**

Find and replace `.header-key, .header-value`:

```css
/* OLD */
.header-key,
.header-value {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  font-family: inherit;
  font-size: 13px;
}
```

```css
/* NEW */
.header-key,
.header-value {
  flex: 1;
  height: var(--rl-ctrl);
  padding: 0 var(--rl-sp4);
  border: 1px solid var(--vscode-panel-border);
  border-radius: var(--rl-r2);
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  font-family: inherit;
  font-size: 0.9em;
}
```

Find and replace `.header-row`:

```css
/* OLD */
.header-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin-bottom: 8px;
}
```

```css
/* NEW */
.header-row {
  display: flex;
  gap: var(--rl-sp3);
  align-items: center;
  margin-bottom: var(--rl-sp2);
}
```

Find and replace `.remove-btn`:

```css
/* OLD */
.remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--vscode-descriptionForeground);
  cursor: pointer;
  transition: all 0.15s ease;
}
```

```css
/* NEW */
.remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--rl-ctrl);
  height: var(--rl-ctrl);
  border: none;
  border-radius: var(--rl-r2);
  background: transparent;
  color: var(--vscode-descriptionForeground);
  cursor: pointer;
  transition: all 0.15s ease;
}
```

Find and replace `.content-type-select`:

```css
/* OLD */
.content-type-select {
  flex: 1;
  max-width: 350px;
  padding: 8px 12px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
}
```

```css
/* NEW */
.content-type-select {
  flex: 1;
  max-width: 350px;
  height: var(--rl-ctrl);
  padding: 0 var(--rl-sp4);
  border: 1px solid var(--vscode-panel-border);
  border-radius: var(--rl-r2);
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  font-family: inherit;
  font-size: 0.9em;
  cursor: pointer;
}
```

Find and replace `.form-data-key, .form-data-value`:

```css
/* OLD */
.form-data-key,
.form-data-value {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  font-family: inherit;
  font-size: 13px;
}
```

```css
/* NEW */
.form-data-key,
.form-data-value {
  flex: 1;
  height: var(--rl-ctrl);
  padding: 0 var(--rl-sp4);
  border: 1px solid var(--vscode-panel-border);
  border-radius: var(--rl-r2);
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  font-family: inherit;
  font-size: 0.9em;
}
```

Find and replace `.form-data-row`:

```css
/* OLD */
.form-data-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
```

```css
/* NEW */
.form-data-row {
  display: flex;
  gap: var(--rl-sp3);
  align-items: center;
}
```

Find and replace `.type-toggle`:

```css
/* OLD */
.type-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  background-color: var(--vscode-input-background);
  color: var(--vscode-descriptionForeground);
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}
```

```css
/* NEW */
.type-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--rl-ctrl);
  height: var(--rl-ctrl);
  border: 1px solid var(--vscode-panel-border);
  border-radius: var(--rl-r2);
  background-color: var(--vscode-input-background);
  color: var(--vscode-descriptionForeground);
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}
```

- [ ] **Step 9: Commit**

```bash
git add src/webview/request/styles.css
git commit -m "feat: fluid response section and key-value rows"
```

---

### Task 4: Delete redundant `@media` font-shrink overrides

**Files:**
- Modify: `src/webview/request/styles.css`

- [ ] **Step 1: Delete the entire `@media (max-width: 700px)` block**

Find and delete this entire block (from `@media (max-width: 700px) {` to its closing `}`):

```css
/* DELETE THIS ENTIRE BLOCK */
@media (max-width: 700px) {
  .request-editor {
    padding: 0 16px;
  }

  .request-bar {
    flex-wrap: wrap;
    gap: 8px;
  }

  .method-select {
    min-width: 90px;
    padding: 10px 10px;
    font-size: 12px;
  }

  .url-input {
    flex: 1 1 100%;
    order: -1;
    padding: 10px 12px;
    font-size: 12px;
  }

  .send-btn,
  .save-btn {
    padding: 10px 12px;
    font-size: 12px;
  }

  .send-btn .btn-text,
  .save-btn .btn-text,
  .beautify-btn .btn-text {
    display: none;
  }

  .send-btn,
  .save-btn,
  .beautify-btn {
    gap: 0;
  }
}
```

- [ ] **Step 2: Trim the `@media (max-width: 500px)` block to only the vertical split reflow**

Find the entire `@media (max-width: 500px)` block and replace it with only the vertical-split rules:

```css
/* DELETE everything in this block EXCEPT the vertical split rules below */
/* The entire old block starts at @media (max-width: 500px) { ... } */
```

The replacement (keep only this):

```css
@media (max-width: 500px) {
  /* Force horizontal layout on very small screens */
  .split-container.vertical {
    flex-direction: column;
  }

  .split-container.vertical .request-panel,
  .split-container.vertical .response-panel {
    width: auto !important;
    min-width: auto;
  }

  .split-container.vertical .resize-handle {
    width: auto;
    height: 12px;
    cursor: row-resize;
    margin: 4px 0;
  }

  .split-container.vertical .resize-handle::before {
    top: 50%;
    bottom: auto;
    left: 0;
    right: 0;
    width: auto;
    height: 1px;
  }

  .split-container.vertical .resize-handle-bar {
    width: 48px;
    height: 4px;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/webview/request/styles.css
git commit -m "chore: remove px font-shrink media overrides (fluid sizing replaces them)"
```

---

### Task 5: Add tab scroll hook to `RequestEditor.tsx`

**Files:**
- Modify: `src/webview/request/RequestEditor.tsx`

- [ ] **Step 1: Add `useEffect` to the React import**

Find and replace the first line of the file:

```tsx
/* OLD */
import React, { useRef, useState } from "react";
```

```tsx
/* NEW */
import React, { useEffect, useRef, useState } from "react";
```

- [ ] **Step 2: Add scroll state and handler after `moreRef`**

In `RequestEditorContent`, find this block:

```tsx
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
```

Replace with:

```tsx
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState("");

  const onScroll = () => {
    const el = stripRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max < 2) return setEdge("");
    if (el.scrollLeft < 4) setEdge("scroll-start");
    else if (el.scrollLeft > max - 4) setEdge("scroll-end");
    else setEdge("scroll-mid");
  };

  useEffect(onScroll, [config.method]);
```

- [ ] **Step 3: Wrap the tabs div with `tabstrip-wrap`**

Find:

```tsx
            <div className="tabs">
              {METHODS_WITH_BODY.includes(config.method) && (
```

Replace with:

```tsx
            <div className={`tabstrip-wrap ${edge}`}>
            <div className="tabs" ref={stripRef} onScroll={onScroll}>
              {METHODS_WITH_BODY.includes(config.method) && (
```

Then find the closing tag of the `tabs` div (just before `</div>` that closes `request-content`):

```tsx
            </div>

            <div className="tab-content">
```

Replace with:

```tsx
            </div>
            </div>

            <div className="tab-content">
```

- [ ] **Step 4: Type-check**

Run:

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/webview/request/RequestEditor.tsx
git commit -m "feat: tab strip scroll hook with fade-edge indicators"
```

---

## Track B — Sidebar Tailwind Removal

### Task 6: Create `sidebar.css`

**Files:**
- Create: `src/webview/sidebar/sidebar.css`

- [ ] **Step 1: Create the file with the full CSS**

Create `src/webview/sidebar/sidebar.css` with this content:

```css
/* ============================================================
   REST-Lab Sidebar — Custom CSS (replaces Tailwind)
   All sizing in em relative to body { font-size: var(--vscode-font-size) }
   ============================================================ */

/* ---- Reset ---- */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* ---- Base ---- */
body {
  font-family: var(
    --vscode-font-family,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    sans-serif
  );
  font-size: var(--vscode-font-size, 13px);
  color: var(--vscode-foreground);
  background-color: var(--vscode-sideBar-background);
  line-height: 1.45;
}

/* ---- Brand & VS Code tokens ---- */
:root {
  --restlab-gradient: linear-gradient(90deg, #38bdf8 0%, #6366f1 100%);
  --restlab-gradient-hover: linear-gradient(90deg, #0ea5e9 0%, #4f46e5 100%);
  --restlab-accent: #38bdf8;
  --restlab-accent-hover: #0ea5e9;
  --restlab-accent-subtle: rgba(56, 189, 248, 0.1);
  --restlab-accent-glow: rgba(56, 189, 248, 0.4);
  --restlab-danger: #ef4444;
  --restlab-danger-subtle: rgba(239, 68, 68, 0.1);
  --glass-bg: rgba(255, 255, 255, 0.03);
  --glass-border: rgba(255, 255, 255, 0.08);
  /* Method colors */
  --method-get: #22c55e;
  --method-post: #3b82f6;
  --method-put: #f59e0b;
  --method-patch: #a855f7;
  --method-delete: #ef4444;
  /* Fluid spacing tokens */
  --rl-sp1: 0.30em;
  --rl-sp2: 0.46em;
  --rl-sp3: 0.62em;
  --rl-sp4: 0.92em;
  --rl-sp5: 1.23em;
  --rl-ctrl: 2.35em;
  --rl-icon: 1.25em;
  --rl-r1: 0.35em;
  --rl-r2: 0.50em;
  --rl-r3: 0.65em;
  --rl-tap: 2.1em;
}

/* ============================================================
   SIDEBAR SHELL
   ============================================================ */
.sb {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

/* ---- Header ---- */
.sb-head {
  padding: var(--rl-sp4);
  border-bottom: 1px solid var(--glass-border);
  background: linear-gradient(180deg, rgba(56, 189, 248, 0.05), transparent);
  position: relative;
  flex-shrink: 0;
}
.sb-head::after {
  content: "";
  position: absolute;
  bottom: -1px;
  left: var(--rl-sp4);
  right: var(--rl-sp4);
  height: 1px;
  background: var(--restlab-gradient);
  opacity: 0.3;
}

.sb-title {
  display: flex;
  align-items: center;
  gap: var(--rl-sp2);
  font-size: 0.86em;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  background: var(--restlab-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: var(--rl-sp4);
}
.sb-title::before {
  content: "";
  display: inline-block;
  width: 0.62em;
  height: 0.62em;
  flex-shrink: 0;
  border-radius: 2px;
  background: var(--restlab-gradient);
  box-shadow: 0 0 8px var(--restlab-accent-glow);
  /* Reset gradient-text clip so the dot renders as a solid box */
  -webkit-background-clip: unset;
  background-clip: unset;
  -webkit-text-fill-color: unset;
}

.sb-head-actions {
  display: flex;
  align-items: center;
  gap: var(--rl-sp2);
}

/* ---- Tree ---- */
.sb-tree {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--rl-sp3) var(--rl-sp2);
}
.sb-tree::-webkit-scrollbar { width: 0.54em; }
.sb-tree::-webkit-scrollbar-track { background: transparent; }
.sb-tree::-webkit-scrollbar-thumb {
  background: var(--vscode-scrollbarSlider-background, rgba(121, 121, 121, 0.35));
  border-radius: 0.27em;
}
.sb-tree::-webkit-scrollbar-thumb:hover {
  background: var(--vscode-scrollbarSlider-hoverBackground, rgba(121, 121, 121, 0.55));
}

/* ============================================================
   FOLDER ROW
   ============================================================ */
.folder-item { margin-bottom: 2px; }

.tree-row {
  display: flex;
  align-items: center;
  gap: var(--rl-sp3);
  padding: var(--rl-sp3);
  margin-bottom: var(--rl-sp1);
  cursor: pointer;
  border-radius: var(--rl-r2);
  border: 1px solid transparent;
  position: relative;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.tree-row::before {
  content: "";
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 0;
  border-radius: 0 2px 2px 0;
  background: var(--restlab-gradient);
  transition: height 0.2s ease;
}
.tree-row:hover,
.tree-row:focus-visible {
  background: var(--glass-bg);
  border-color: var(--glass-border);
  outline: none;
}
.tree-row:hover::before,
.tree-row:focus-visible::before { height: 60%; }
.tree-row:focus-visible {
  border-color: var(--restlab-accent);
  background: var(--restlab-accent-subtle);
}

.tree-icon {
  flex-shrink: 0;
  width: var(--rl-icon);
  height: var(--rl-icon);
  color: var(--vscode-descriptionForeground);
  transition: color 0.15s ease;
  display: block;
}
.tree-row:hover .tree-icon { color: var(--restlab-accent); }

.tree-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.95em;
  font-weight: 600;
}

.tree-actions {
  display: flex;
  align-items: center;
  gap: var(--rl-sp1);
  margin-left: auto;
  flex-shrink: 0;
}

/* ---- Tree children connector ---- */
.tree-children {
  position: relative;
}
.tree-children::before {
  content: "";
  position: absolute;
  left: calc(var(--rl-sp4) + 0.3em);
  top: 0;
  bottom: var(--rl-sp3);
  width: 1px;
  background: linear-gradient(var(--glass-border), transparent);
}

/* ============================================================
   REQUEST ROW
   ============================================================ */
.req-zone { /* container only — layout handled by inline paddingLeft */ }

.req-row {
  display: flex;
  align-items: center;
  gap: var(--rl-sp2);
  padding: var(--rl-sp2) var(--rl-sp3);
  margin-bottom: 1px;
  margin-left: 0.6em;
  cursor: pointer;
  border-radius: var(--rl-r2);
  border: 1px solid transparent;
  position: relative;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.req-row::before {
  content: "";
  position: absolute;
  left: -0.6em;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 0;
  border-radius: 0 2px 2px 0;
  background: var(--restlab-gradient);
  transition: height 0.2s ease;
}
.req-row:hover { background: var(--glass-bg); border-color: var(--glass-border); }
.req-row:hover::before { height: 55%; }
.req-row.active {
  background: rgba(56, 189, 248, 0.15);
  border-color: rgba(56, 189, 248, 0.3);
}
.req-row.active::before { height: 55%; }

.req-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.88em;
}

/* ============================================================
   EMPTY STATES
   ============================================================ */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3em 1.5em;
  text-align: center;
  gap: var(--rl-sp3);
}
.empty-state svg {
  width: 3.2em;
  height: 3.2em;
  color: var(--restlab-accent);
  opacity: 0.5;
  margin-bottom: var(--rl-sp2);
}
.empty-state-title {
  font-size: 0.95em;
  font-weight: 600;
  color: var(--vscode-foreground);
  margin-bottom: var(--rl-sp1);
}
.empty-state-hint {
  font-size: 0.82em;
  color: var(--vscode-descriptionForeground);
  opacity: 0.8;
  line-height: 1.5;
  max-width: 18em;
}

.req-empty-hint {
  padding: var(--rl-sp2) var(--rl-sp3);
  font-size: 0.82em;
  color: var(--vscode-descriptionForeground);
  opacity: 0.7;
  font-style: italic;
}

/* ============================================================
   METHOD BADGE
   ============================================================ */
.method-badge {
  flex-shrink: 0;
  font-size: 0.62em;
  font-weight: 800;
  padding: 0.32em 0.55em;
  border-radius: 0.5em;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border: 1px solid transparent;
  line-height: 1;
  min-width: 3.6em;
  text-align: center;
}
.method-get {
  color: var(--method-get);
  background: rgba(34, 197, 94, 0.14);
  border-color: rgba(34, 197, 94, 0.32);
}
.method-post {
  color: var(--method-post);
  background: rgba(59, 130, 246, 0.14);
  border-color: rgba(59, 130, 246, 0.32);
}
.method-put {
  color: var(--method-put);
  background: rgba(245, 158, 11, 0.14);
  border-color: rgba(245, 158, 11, 0.32);
}
.method-patch {
  color: var(--method-patch);
  background: rgba(168, 85, 247, 0.14);
  border-color: rgba(168, 85, 247, 0.32);
}
.method-delete {
  color: var(--method-delete);
  background: rgba(239, 68, 68, 0.14);
  border-color: rgba(239, 68, 68, 0.32);
}

/* ============================================================
   BUTTONS
   ============================================================ */
.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--rl-sp3);
  flex: 1;
  min-height: var(--rl-ctrl);
  padding: 0 var(--rl-sp4);
  border: none;
  border-radius: var(--rl-r3);
  background: var(--restlab-gradient);
  color: #ffffff;
  font: inherit;
  font-size: 0.92em;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 8px var(--restlab-accent-glow);
  position: relative;
  overflow: hidden;
  white-space: nowrap;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.btn-primary::before {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}
.btn-primary:hover::before { left: 100%; }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 24px var(--restlab-accent-glow); }
.btn-primary:active { transform: translateY(0); }
.btn-primary:focus { outline: 2px solid var(--restlab-accent); outline-offset: 2px; }
.btn-primary svg { flex-shrink: 0; width: var(--rl-icon); height: var(--rl-icon); }

.header-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--rl-ctrl);
  height: var(--rl-ctrl);
  flex-shrink: 0;
  padding: 0;
  border: 1px solid var(--glass-border);
  border-radius: var(--rl-r3);
  background: var(--glass-bg);
  color: var(--vscode-foreground);
  cursor: pointer;
  transition: all 0.2s ease;
}
.header-action-btn:hover {
  background: var(--restlab-accent-subtle);
  border-color: var(--restlab-accent);
  color: var(--restlab-accent);
}
.header-action-btn svg { width: var(--rl-icon); height: var(--rl-icon); }

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--rl-tap);
  height: var(--rl-tap);
  flex-shrink: 0;
  border: none;
  border-radius: var(--rl-r1);
  background: transparent;
  color: var(--vscode-icon-foreground, var(--vscode-foreground));
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s ease;
}
.tree-row:hover .action-btn,
.req-row:hover .action-btn { opacity: 0.6; }
.action-btn:hover { opacity: 1 !important; background: var(--restlab-accent-subtle); color: var(--restlab-accent); }
.action-btn svg { width: var(--rl-icon); height: var(--rl-icon); display: block; }

/* ---- Chevron rotation utility ---- */
.rotate-90 { transform: rotate(90deg); transition: transform 0.2s ease; }

/* ============================================================
   DROPDOWN
   ============================================================ */
.dropdown-wrap {
  position: relative;
  display: inline-flex;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 180px;
  background: var(--vscode-dropdown-background, #3c3c3c);
  border: 1px solid var(--vscode-dropdown-border, #454545);
  border-radius: var(--rl-r3);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  z-index: 1000;
  overflow: hidden;
  animation: sbFadeIn 0.15s ease-out;
}

.dropdown-header {
  padding: var(--rl-sp3) var(--rl-sp4);
  font-size: 0.84em;
  font-weight: 600;
  color: var(--vscode-descriptionForeground, #858585);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--vscode-dropdown-border, #454545);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: var(--rl-sp3);
  width: 100%;
  padding: var(--rl-sp3) var(--rl-sp4);
  border: none;
  background: transparent;
  color: var(--vscode-dropdown-foreground, #cccccc);
  font: inherit;
  font-size: 0.92em;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s ease;
}
.dropdown-item:hover { background: var(--vscode-list-hoverBackground, #2a2d2e); }
.dropdown-item:active { background: var(--vscode-list-activeSelectionBackground, #094771); }
.dropdown-item.danger { color: var(--restlab-danger); }
.dropdown-item.danger:hover { background: var(--restlab-danger-subtle); }

.dropdown-divider {
  height: 1px;
  background: var(--vscode-dropdown-border, #454545);
  margin: 2px 0;
}

.dropdown-item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--rl-icon);
  height: var(--rl-icon);
  opacity: 0.8;
  flex-shrink: 0;
}

/* ============================================================
   TOOLTIP
   ============================================================ */
.custom-tooltip {
  padding: 4px 8px;
  margin: 2px;
  border-radius: var(--rl-r1);
  font-size: 0.84em;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
  background: var(--vscode-editorWidget-background, #252526);
  color: var(--vscode-editorWidget-foreground, #cccccc);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--vscode-editorWidget-border, #454545);
  z-index: 2147483647;
  animation: sbTooltipFadeIn 0.15s ease-out;
}
.custom-tooltip.tooltip-top::after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-top-color: var(--vscode-editorWidget-background, #252526);
}
.custom-tooltip.tooltip-bottom::after {
  content: "";
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-bottom-color: var(--vscode-editorWidget-background, #252526);
}
.custom-tooltip.tooltip-left::after {
  content: "";
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  border: 4px solid transparent;
  border-left-color: var(--vscode-editorWidget-background, #252526);
}
.custom-tooltip.tooltip-right::after {
  content: "";
  position: absolute;
  right: 100%;
  top: 50%;
  transform: translateY(-50%);
  border: 4px solid transparent;
  border-right-color: var(--vscode-editorWidget-background, #252526);
}

/* ============================================================
   ANIMATIONS
   ============================================================ */
@keyframes sbFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes sbTooltipFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/webview/sidebar/sidebar.css
git commit -m "feat: create sidebar.css — custom CSS replacing Tailwind"
```

---

### Task 7: Swap Tailwind import in `sidebar/index.tsx`

**Files:**
- Modify: `src/webview/sidebar/index.tsx`

- [ ] **Step 1: Replace the import**

Find and replace:

```tsx
/* OLD */
import "../tailwind.css";
```

```tsx
/* NEW */
import "./sidebar.css";
```

- [ ] **Step 2: Commit**

```bash
git add src/webview/sidebar/index.tsx
git commit -m "feat: sidebar bundle now uses sidebar.css instead of tailwind"
```

---

### Task 8: Update `Sidebar.tsx` class names

**Files:**
- Modify: `src/webview/sidebar/Sidebar.tsx`

- [ ] **Step 1: Update the `Sidebar` component root and header**

Find and replace the entire `return` block inside `Sidebar`:

```tsx
/* OLD: Sidebar return — root and header */
  return (
    <div className="flex flex-col h-screen">
      <div className="p-4 border-b border-glass bg-gradient-to-b from-sky-500/5 to-transparent relative after:content-[''] after:absolute after:-bottom-px after:left-4 after:right-4 after:h-px after:bg-restlab-gradient after:opacity-30">
        <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-widest text-gradient mb-4 before:content-[''] before:inline-block before:w-2 before:h-2 before:bg-restlab-gradient before:rounded-sm before:shadow-glow">
          REST Lab
        </h2>
        <div className="flex items-center gap-2">
```

```tsx
/* NEW */
  return (
    <div className="sb">
      <div className="sb-head">
        <h2 className="sb-title">
          REST Lab
        </h2>
        <div className="sb-head-actions">
```

- [ ] **Step 2: Update the tree div**

Find and replace:

```tsx
/* OLD */
      <div
        className={`flex-1 overflow-y-auto py-3 px-2 scrollbar-thin ${isDragging ? "root-drop-zone" : ""}`}
```

```tsx
/* NEW */
      <div
        className={`sb-tree${isDragging ? " root-drop-zone" : ""}`}
```

- [ ] **Step 3: Update the empty state**

Find and replace:

```tsx
/* OLD */
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <NoItemsIcon />
            <p className="mb-1 text-vscode font-medium">No collections yet</p>
            <p className="text-xs text-vscode-muted opacity-80">
              Create your first collection to get started
            </p>
          </div>
```

```tsx
/* NEW */
          <div className="empty-state">
            <NoItemsIcon />
            <p className="empty-state-title">No collections yet</p>
            <p className="empty-state-hint">
              Create your first collection to get started
            </p>
          </div>
```

- [ ] **Step 4: Update `FolderItem` — folder wrapper and folder row**

Find and replace in `FolderItem`:

```tsx
/* OLD */
    <div key={folder.id} className="mb-0.5" data-folder-id={folder.id}>
      <div
        className={`group flex items-center gap-2.5 py-2.5 px-3 mb-1 cursor-pointer rounded-lg transition-all duration-200 border border-transparent hover:bg-glass hover:border-glass relative before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-0 before:bg-restlab-gradient before:rounded-r before:transition-all before:duration-200 hover:before:h-[60%] focus:outline-none focus:border-sky-400 focus:bg-sky-500/10 focus:before:h-[80%] ${isDropTarget ? "drop-target-active" : ""} ${isDragging ? "dragging-active" : ""}`}
```

```tsx
/* NEW */
    <div key={folder.id} className="folder-item" data-folder-id={folder.id}>
      <div
        className={`tree-row${isDropTarget ? " drop-target-active" : ""}${isDragging ? " dragging-active" : ""}`}
```

- [ ] **Step 5: Update folder row icons and label**

Find and replace the ChevronIcon:

```tsx
/* OLD */
        <ChevronIcon
          className={expandedFolders.has(folder.id) ? "rotate-90" : ""}
        />
```

```tsx
/* NEW */
        <ChevronIcon
          className={`tree-icon${expandedFolders.has(folder.id) ? " rotate-90" : ""}`}
        />
```

Find and replace both icon renders (CollectionIcon and FolderIcon):

```tsx
/* OLD */
        {depth === 0 ? (
          <CollectionIcon className="flex-shrink-0 text-vscode transition-colors duration-150 group-hover:text-sky-400 group-hover:drop-shadow-[0_0_4px_rgba(56,189,248,0.4)]" />
        ) : (
          <FolderIcon className="flex-shrink-0 text-vscode transition-colors duration-150 group-hover:text-sky-400 group-hover:drop-shadow-[0_0_4px_rgba(56,189,248,0.4)]" />
        )}
        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-medium">
          {folder.name}
        </span>
        <div className="flex items-center gap-1 ml-auto">
```

```tsx
/* NEW */
        {depth === 0 ? (
          <CollectionIcon className="tree-icon" />
        ) : (
          <FolderIcon className="tree-icon" />
        )}
        <span className="tree-label">
          {folder.name}
        </span>
        <div className="tree-actions">
```

- [ ] **Step 6: Update children wrapper, request zone, and empty folder hint**

Find and replace the children wrapper div:

```tsx
/* OLD */
        <div className="relative before:content-[''] before:absolute before:left-5 before:top-0 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-white/10 before:to-transparent">
```

```tsx
/* NEW */
        <div className="tree-children">
```

Find and replace the request zone div:

```tsx
/* OLD */
            <div
              className={`pl-5 ${isDropTarget ? "drop-zone-highlight" : ""}`}
              style={{ paddingLeft: `${20 + depth * 16}px` }}
```

```tsx
/* NEW */
            <div
              className={`req-zone${isDropTarget ? " drop-zone-highlight" : ""}`}
              style={{ paddingLeft: `${20 + depth * 16}px` }}
```

Find and replace the empty folder hint:

```tsx
/* OLD */
              <div
                className={`py-2 px-3 text-xs text-vscode-muted opacity-70 italic ${isDropTarget ? "drop-hint-visible" : ""}`}
              >
```

```tsx
/* NEW */
              <div
                className={`req-empty-hint${isDropTarget ? " drop-hint-visible" : ""}`}
              >
```

- [ ] **Step 7: Update request row and request label**

Find and replace the request row div:

```tsx
/* OLD */
                <div
                  key={request.id}
                  className={`group flex items-center gap-2 py-2 px-2.5 mb-0.5 cursor-pointer rounded-md transition-all duration-200 border ml-2.5 relative before:content-[''] before:absolute before:-left-2 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:rounded-sm before:transition-all before:duration-200 hover:bg-glass hover:border-glass hover:before:h-1/2 ${isDragging ? "dragging-active" : ""} ${
                    request.id === activeRequestId
                      ? "bg-sky-500/15 border-sky-500/30 before:h-1/2 before:bg-restlab-gradient"
                      : "border-transparent before:h-0 before:bg-restlab-gradient"
                  }`}
```

```tsx
/* NEW */
                <div
                  key={request.id}
                  className={`req-row${isDragging ? " dragging-active" : ""}${request.id === activeRequestId ? " active" : ""}`}
```

Find and replace the request label span:

```tsx
/* OLD */
                  <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs">
```

```tsx
/* NEW */
                  <span className="req-label">
```

- [ ] **Step 8: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/webview/sidebar/Sidebar.tsx
git commit -m "feat: Sidebar.tsx — replace Tailwind utilities with semantic CSS classes"
```

---

### Task 9: Update `FolderActionsDropdown.tsx`

**Files:**
- Modify: `src/webview/sidebar/FolderActionsDropdown.tsx`

- [ ] **Step 1: Replace wrapper div class**

Find and replace:

```tsx
/* OLD */
    <div className="relative inline-flex" ref={dropdownRef}>
```

```tsx
/* NEW */
    <div className="dropdown-wrap" ref={dropdownRef}>
```

- [ ] **Step 2: Remove `min-w-[180px]` from dropdown menus**

Find and replace both dropdown-menu divs (first the main menu, then the export sub-menu):

```tsx
/* OLD */
        <div className="dropdown-menu min-w-[180px]">
```

```tsx
/* NEW */
        <div className="dropdown-menu">
```

(Apply to both occurrences in the file.)

- [ ] **Step 3: Update delete button to `.danger`**

Find and replace:

```tsx
/* OLD */
          <button
            className="dropdown-item text-red-500"
            onClick={(e) => {
              onDelete(e, folder.id);
              setIsOpen(false);
            }}
          >
```

```tsx
/* NEW */
          <button
            className="dropdown-item danger"
            onClick={(e) => {
              onDelete(e, folder.id);
              setIsOpen(false);
            }}
          >
```

- [ ] **Step 4: Update export format icon wrappers**

Find and replace the icon wrapper span inside the export format map:

```tsx
/* OLD */
              <span className="flex items-center justify-center w-5 h-5 opacity-80">
                {format.icon}
              </span>
```

```tsx
/* NEW */
              <span className="dropdown-item-icon">
                {format.icon}
              </span>
```

- [ ] **Step 5: Type-check and commit**

```bash
npx tsc --noEmit
git add src/webview/sidebar/FolderActionsDropdown.tsx
git commit -m "feat: FolderActionsDropdown — remove Tailwind utility strings"
```

---

### Task 10: Update `ImportDropdown.tsx` and `RequestActionsDropdown.tsx`

**Files:**
- Modify: `src/webview/sidebar/ImportDropdown.tsx`
- Modify: `src/webview/sidebar/RequestActionsDropdown.tsx`

- [ ] **Step 1: Update `ImportDropdown.tsx` wrapper**

Find and replace:

```tsx
/* OLD */
    <div className="relative" ref={dropdownRef}>
```

```tsx
/* NEW */
    <div className="dropdown-wrap" ref={dropdownRef}>
```

Update the provider icon wrapper inside the map:

```tsx
/* OLD */
              <span className="flex items-center justify-center w-5 h-5 opacity-80">
                {provider.icon}
              </span>
```

```tsx
/* NEW */
              <span className="dropdown-item-icon">
                {provider.icon}
              </span>
```

- [ ] **Step 2: Update `RequestActionsDropdown.tsx` wrapper**

Find and replace:

```tsx
/* OLD */
    <div className="relative inline-flex" ref={dropdownRef}>
```

```tsx
/* NEW */
    <div className="dropdown-wrap" ref={dropdownRef}>
```

- [ ] **Step 3: Update `RequestActionsDropdown.tsx` action button**

Find and replace:

```tsx
/* OLD */
        <button
          className="action-btn w-5 h-5 group-hover:opacity-60 hover:!opacity-100 hover:bg-slate-500/10 hover:text-slate-400"
          onClick={handleClick}
        >
```

```tsx
/* NEW */
        <button
          className="action-btn"
          onClick={handleClick}
        >
```

- [ ] **Step 4: Update delete button to `.danger`**

Find and replace:

```tsx
/* OLD */
          <button
            className="dropdown-item text-red-500"
            onClick={(e) => {
              onDelete(e, request.id, folderId);
              setIsOpen(false);
            }}
          >
```

```tsx
/* NEW */
          <button
            className="dropdown-item danger"
            onClick={(e) => {
              onDelete(e, request.id, folderId);
              setIsOpen(false);
            }}
          >
```

- [ ] **Step 5: Also update `min-w-[160px]` from dropdown-menu**

Find and replace in `RequestActionsDropdown.tsx`:

```tsx
/* OLD */
        <div className="dropdown-menu min-w-[160px]">
```

```tsx
/* NEW */
        <div className="dropdown-menu">
```

- [ ] **Step 6: Type-check and commit**

```bash
npx tsc --noEmit
git add src/webview/sidebar/ImportDropdown.tsx src/webview/sidebar/RequestActionsDropdown.tsx
git commit -m "feat: ImportDropdown + RequestActionsDropdown — remove Tailwind utilities"
```

---

### Task 11: Final type-check and verify

**Files:** none

- [ ] **Step 1: Full type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 2: Verify Track A — no Tailwind in request editor**

The request editor (`src/webview/request/`) never imported Tailwind — confirm `styles.css` no longer has any bare `px` values in the rules touched by this plan:

```bash
grep -n "padding: [0-9]*px\|font-size: [0-9]*px\|width: [0-9]*px\|height: [0-9]*px\|gap: [0-9]*px\|min-width: [0-9]*px\|border-radius: [0-9]*px" src/webview/request/styles.css
```

Expected: the only `px` hits should be in `border: 1px`, `height: 1px`, `width: 1px`, and similar hairline/structural rules — **not** in control heights, paddings, or font-sizes.

- [ ] **Step 3: Verify Track B — no Tailwind utilities in sidebar components**

```bash
grep -rn "className=.*py-\|className=.*px-\|className=.*gap-\|className=.*text-\[" src/webview/sidebar/
```

Expected: zero matches (all Tailwind utility strings removed).

- [ ] **Step 4: Commit final state**

```bash
git add -A
git commit -m "chore: verify fluid layout + sidebar Tailwind removal complete"
```
