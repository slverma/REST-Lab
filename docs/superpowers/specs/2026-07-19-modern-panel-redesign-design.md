# Modern Panel Redesign (Rounded Sections + Dotted Divider) Design

**Date:** 2026-07-19
**Branch:** enh/design-change
**Status:** Approved

## Goal

Redesign the request/response split in the request editor webview to match VS Code's newer "experimental modern UI" language: rounded-card sections with no hard separator border between them, a draggable gap between sections marked by a small dot indicator, and a bold highlight line on hover of that gap. Fix the underlying inconsistency that currently makes spacing/borders look mismatched, and separately fix a sidebar UX bug where the drag-cursor covers an entire row instead of a dedicated handle.

## Problem

- `src/webview/request/styles.css` has no shared `Panel`/`Section` primitive. Border-radius values are set ad hoc per element (`.response-section` L1463-1486 uses `12px`; `.tab-section` L936-949 uses `8px`; other elements in the same file use `4px`–`7px` or `var(--rl-r3)`), and spacing between sibling sections is a mix of independently-set `margin-bottom`, `gap`, and `padding`. This is the direct cause of the "spaces are not maintained" complaint.
- `.request-panel` (L781-786) has no border/background at all, while `.response-section` does — the two sides of the split look asymmetric.
- The existing resize handle (`ResponsePanel.tsx` L64-69, styled in `styles.css` L764-933) is a thin 5px strip with a `::before` line that only appears on hover — functional, but has no idle-state affordance (nothing tells the user the gap is draggable until they're already hovering it), and no dot indicator.
- `src/webview/sidebar/Sidebar.tsx` puts `draggable="true"` directly on the entire row `<div>` for both folder rows (L126-137) and request rows (L225-241). `drag-drop.css` L105-112 then applies `cursor: grab` / `grabbing` via a blanket `[draggable="true"]` selector, so the grab cursor — and drag-start behavior — covers the label, icon, and action-button area of the row, not just an intended handle. This reads as "click here to do something" and confuses users, and also means any click on the row can be mistaken for a drag-start.

## Design

### 1. Shared spacing/radius tokens

`src/webview/request/styles.css` already defines a token scale (`--rl-sp0`…`--rl-sp5` spacing, `--rl-r1`/`--rl-r2`/`--rl-r3` border-radius, `--restlab-gradient*`, `--glass-bg`, `--glass-border`) at L3-69, but existing rules don't consistently use them. Standardize:
- All top-level panel corners use a single radius token (`--rl-r3`) instead of the current hardcoded `12px`/`8px` mix.
- Panel padding and the gap between panels use the existing `--rl-sp*` scale, biased toward the smaller end (`--rl-sp1`/`--rl-sp2`) rather than the roomier values used in the exploratory mockups — this keeps the layout usable on small screens and at high editor zoom (verified against 150% zoom during review).
- No new tokens are introduced; this is a consolidation of existing ones.

### 2. Symmetric rounded panels (shallow scope)

- `.request-panel` gets the same treatment `.response-section` already has: `border-radius: var(--rl-r3)`, `border: 1px solid var(--glass-border)`, `background: var(--glass-bg)` — reusing `.response-section`'s existing rule as the shared pattern rather than inventing a new one.
- Scope is **shallow**: only the two top-level panels (request side, response side) get the card treatment. Nested content — Headers/Params/Body tab content, header/param rows — stays flat, no per-row cards. This matches how VS Code's own editor groups look (one border per group, flat rows inside) and avoids visual noise from many small bordered rows.
- `.tab-section` (L936-949) and similar nested elements keep flat backgrounds; only their padding/margins move onto the shared spacing tokens for consistency.

### 3. Divider / resize handle

Replace the current always-thin `.resize-handle` idle state with a dot indicator, keeping the existing hover-line behavior:
- **Idle state:** three small dots centered in the gap between panels (vertically stacked for the side-by-side/horizontal-split layout, horizontally arranged for the stacked/vertical-split layout — mirroring the existing `splitLayout` class toggle already read in `ResponsePanel.tsx`'s `resize-handle` className).
- **Hover/drag state:** dots fade out, a bold line fades in along the full height (or width, for stacked layout) of the gap, using the existing `--restlab-gradient*` tokens already used elsewhere for accents — no new colors introduced.
- No separator border is drawn between the two panels; the gap itself (dots at rest, line on hover/drag) is the only visual divider.
- Implementation stays inside the existing files: markup in `ResponsePanel.tsx` (L64-69 today), styles in `styles.css` (L764-933 today), state/handlers unchanged in `RequestContext.tsx` (`splitLayout`, `isResizing`, `handleResizeStart`, L192-386) — this is a styling/markup change to the existing resize-handle element, not a new resize mechanism.

### 4. Sidebar drag handle

- Add a small grip glyph (⋮⋮) as its own element at the start of each row's markup, in both the folder row (`Sidebar.tsx` L126-137) and request row (L225-241) — hidden by default, faded in on row hover, matching the fade-in pattern already used for the row's `.actions` buttons.
- Move `draggable="true"` off the row `<div>` and onto the grip element only.
- `drag-drop.css` L105-112's blanket `[draggable="true"]` cursor rule is replaced with a rule scoped to the grip element/class; the row itself uses a normal pointer cursor.
- The row's existing `onDragStart`/`onDragOver`/`onDrop` handlers stay attached where they are today (on the row) — native `dragstart` fires on the draggable descendant (the grip) and bubbles up through the row, so handlers reading `e.currentTarget`/row dataset continue to work unchanged. Only the `draggable` attribute placement and the CSS cursor selector move; the row's drop-target handlers (`onDragOver`/`onDrop`) are unaffected since those don't require the element itself to be draggable.
- Net effect: hovering/clicking the label, icon, or action buttons behaves like a normal row (select/open); only pressing on the grip starts a drag. This also removes the current click-vs-drag ambiguity, not just the visual cursor mismatch.

## Out of Scope

- The sidebar-vs-request-editor-panel split (the VS Code-native webview boundary) is not part of this redesign.
- The folder config editor (`src/webview/editor/`) is not part of this redesign.
- No changes to `RequestContext.tsx`'s resize state/logic or the `ResizeObserver`-driven horizontal/vertical layout switch — only the handle's visual treatment changes.
- No new shared `Panel`/`Section` React component is introduced across webview bundles; this pass consolidates CSS tokens within `src/webview/request/styles.css` only. A cross-bundle shared component (given each webview is a separately-built, isolated Vite IIFE bundle with its own duplicated token block) is a larger refactor left for a future pass if the same treatment is extended to the sidebar or folder editor.

## Verification

- Visual check in-browser (via `npm run watch` + Extension Development Host) at default zoom and at 150% editor zoom, at a narrow window width to confirm the stacked (vertical) split layout also gets dots/line correctly, and that panel padding stays usable.
- Confirm sidebar drag-and-drop (folder reorder, request reorder, request-into-folder) still works with `draggable` moved to the grip, and that clicking the row label/icon still selects/opens as before, not just from the grip.
- `npx tsc --noEmit` clean (no test suite/lint script in this repo per project conventions).
