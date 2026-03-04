import { RefObject, useEffect } from "react";

const MAX_LINES = 5;

/**
 * Automatically grows a <textarea> from 1 line up to MAX_LINES lines,
 * then switches to scrollable overflow.
 */
export function useAutoGrow(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Reset to recalculate
    el.style.height = "auto";
    const computed = getComputedStyle(el);
    const lineHeight = parseFloat(computed.lineHeight) || 20;
    const paddingTop = parseFloat(computed.paddingTop) || 0;
    const paddingBottom = parseFloat(computed.paddingBottom) || 0;
    const maxHeight = lineHeight * MAX_LINES + paddingTop + paddingBottom;
    const needed = Math.min(el.scrollHeight, maxHeight);
    el.style.height = needed + "px";
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [value, ref]);
}
