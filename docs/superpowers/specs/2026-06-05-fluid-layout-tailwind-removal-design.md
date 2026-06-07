# Fluid Layout Fix + Sidebar Tailwind Removal

**Date:** 2026-06-05  
**Branch:** `enh/design-revamp`  
**Source:** REST-Lab Direction A – Handoff (claude.ai/design)

---

## Problem

Fixed-pixel spacing in `src/webview/request/styles.css` clips the UI when VS Code's editor font is large (e.g. `"editor.fontSize": 20`). Specifically:

- The 5 request tabs overflow off-screen and get clipped
- The URL bar squashes the Send/Save buttons off to the right
- The method-select, buttons, and env-select have hard-coded `px` heights that don't scale

The root cause: every control height, padding, and gap is set in `px`. VS Code's `--vscode-font-size` is already wired to `body { font-size }`, but the child elements ignore it and stay fixed.

The sidebar (Tailwind-based) has the same class of problem — Tailwind utilities like `py-2.5 px-3` are in `px`, so tree rows and badges don't scale either. Additionally, the sidebar uses Tailwind (v4 with `@import "tailwindcss"`) which the project is gradually moving away from.

---

## Solution: Direction A – Fluid Classic

Replace fixed `px` sizing with `em`-based tokens everywhere that touches text. Because `body { font-size: var(--vscode-font-size, 13px) }` is already set, `em` values automatically scale with the user's VS Code font setting. `flex-wrap` on the request bar and `overflow-x: auto` on the tab strip absorb whatever doesn't fit instead of clipping.

---

## Design Decisions

### Em token scale

One spacing ramp defined in `:root`, referenced everywhere:

| Token | Value | ~px @13 | ~px @19 | Use |
|---|---|---|---|---|
| `--rl-sp1` | `0.30em` | 4 | 6 | hairline gaps |
| `--rl-sp2` | `0.46em` | 6 | 9 | tight / icon↔label |
| `--rl-sp3` | `0.62em` | 8 | 12 | base gap / row padding |
| `--rl-sp4` | `0.92em` | 12 | 17 | control padding |
| `--rl-sp5` | `1.23em` | 16 | 23 | section / side padding |
| `--rl-ctrl` | `2.35em` | ~31 | ~45 | height of every input & button |
| `--rl-icon` | `1.25em` | ~16 | ~24 | icon glyph size |

Rule: **never set a px value that contains text or sits next to text.** Borders stay `1px`.

### Request bar wrapping

`.request-bar` gets `flex-wrap: wrap`. When the URL field can't hold `16em`, it drops to its own row rather than squashing the Send button off screen.

### Scrollable tab strip

`.tabs` becomes `overflow-x: auto; scrollbar-width: none`. Tabs keep `flex-shrink: 0` so they stay full-width rather than squishing. A JS hook in `RequestEditor.tsx` adds a `.tabstrip-wrap` parent and toggles `scroll-start / scroll-mid / scroll-end` state classes that the CSS uses for fade-edge indicators.

### Sidebar: Tailwind removal

The sidebar bundle (`dist/sidebar/`) currently imports `tailwind.css`. We replace that with a new `sidebar.css` that:

1. Carries all the brand/VS Code tokens (same as `tailwind.css :root`)
2. Defines `--rl-*` fluid tokens on `body` (matching font-size anchor)
3. Replaces every Tailwind utility class used in the sidebar components with semantic CSS class names
4. Migrates the component classes from `tailwind.css @layer components` (`btn-primary`, `action-btn`, `header-action-btn`, `dropdown-*`, `method-badge`, `method-*`, `custom-tooltip`, animations) — updated to use `em` sizing

`tailwind.css` is untouched; it continues to serve the editor and folder-settings bundles.

`drag-drop.css` is untouched.

---

## Files

### New
- `src/webview/sidebar/sidebar.css` — complete custom CSS for the sidebar; owns all layout, component, and fluid-sizing rules

### Modified
- `src/webview/request/styles.css` — add `--rl-*` tokens to `:root`; replace px in `.request-bar`, `.method-select`, `.url-input`, `.send-btn`, `.save-btn`, `.request-more-btn`, `.layout-toggle-btn`, `.request-env-select`, `.tabs`, `.tab`, `.badge`, response section (padding, meta pills, toolbar), key-value rows (`.header-key`, `.header-value`, `.form-data-key`, `.form-data-value`, `.content-type-select`, `.remove-btn`, `.type-toggle`); delete the `@media (max-width:700px)` and `@media (max-width:500px)` font-shrink overrides (the wrap behavior replaces them — keep the vertical→horizontal split reflow rule only)
- `src/webview/request/RequestEditor.tsx` — add `useRef` + `useState` for scroll edge; wrap `<div className="tabs">` in `<div className={\`tabstrip-wrap \${edge}\`}>` with `ref={stripRef} onScroll={onScroll}`; add `useEffect(onScroll, [config.method])`
- `src/webview/sidebar/index.tsx` — replace `import "../tailwind.css"` with `import "./sidebar.css"`
- `src/webview/sidebar/Sidebar.tsx` — replace Tailwind utility classnames with new semantic class names from `sidebar.css`
- `src/webview/sidebar/FolderActionsDropdown.tsx` — remove residual Tailwind utility strings (`relative inline-flex`, `min-w-[180px]`, `text-red-500`)
- `src/webview/sidebar/ImportDropdown.tsx` — remove `relative`
- `src/webview/sidebar/RequestActionsDropdown.tsx` — remove `relative inline-flex`, `w-5 h-5`, hover utilities

### Untouched
- `src/webview/tailwind.css`
- `src/webview/sidebar/drag-drop.css`

---

## Sidebar CSS class map

New semantic class names replacing Tailwind utility strings:

| Old (Tailwind) | New (semantic) |
|---|---|
| `flex flex-col h-screen` | `.sb` |
| `p-4 border-b border-glass bg-gradient-to-b ...` | `.sb-head` |
| `flex items-center gap-2 text-[13px] font-bold ...` | `.sb-title` |
| `flex items-center gap-2` (button row) | `.sb-head-actions` |
| `flex-1 overflow-y-auto py-3 px-2 scrollbar-thin` | `.sb-tree` |
| `group flex items-center gap-2.5 py-2.5 px-3 mb-1 ...` | `.tree-row` |
| `tree-row` open state | `.tree-row.open` |
| `relative before:content-[''] before:absolute ...` (children wrap) | `.tree-children` |
| `pl-5 ...` (request zone) | `.req-zone` |
| `group flex items-center gap-2 py-2 px-2.5 ...` (request row) | `.req-row` |
| `req-row` active state | `.req-row.active` |
| `flex flex-col items-center justify-center py-12` | `.empty-state` |
| `relative inline-flex` (dropdown wrapper) | `.dropdown-wrap` |
| `relative` (import wrapper) | `.dropdown-wrap` |
| `text-red-500` on delete item | `.dropdown-item.danger` |
| `w-5 h-5` on action-btn | handled by `.action-btn` sizing directly |

`.mb-0.5` wrapper divs around folder items → `.folder-item`

---

## JS hook (RequestEditor.tsx)

```tsx
const stripRef = useRef<HTMLDivElement>(null);
const [edge, setEdge] = useState("");

const onScroll = () => {
  const el = stripRef.current; if (!el) return;
  const max = el.scrollWidth - el.clientWidth;
  if (max < 2) return setEdge("");
  if (el.scrollLeft < 4) setEdge("scroll-start");
  else if (el.scrollLeft > max - 4) setEdge("scroll-end");
  else setEdge("scroll-mid");
};
useEffect(onScroll, [config.method]);
```

Markup change: wrap `<div className="tabs">` with `<div className={\`tabstrip-wrap \${edge}\`}>`.

---

## Porting checklist (verification)

- [ ] Type-check passes: `npx tsc --noEmit`
- [ ] Sidebar renders with no Tailwind classes in DOM (inspect element)
- [ ] Drag-and-drop still works (drag a request between folders)
- [ ] Dropdown menus open and close correctly
- [ ] Request editor at `editor.fontSize: 13` — no visual regression
- [ ] Request editor at `editor.fontSize: 20` — tabs scroll, bar wraps, nothing clips
- [ ] Sidebar rows and method badges scale visually at large font
- [ ] Light theme still renders (VS Code light theme — test both sidebars and request editor)
