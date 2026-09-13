import React, { useRef, useState } from "react";
import ReactDOM from "react-dom";
import { useAutoGrow } from "../helpers/useAutoGrow";
import { useRequestContext } from "./RequestContext";

interface VarInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * A textarea that auto-grows up to 5 lines and shows a variable-completion
 * popup when the user types `{{`. Reads available env variables from RequestContext.
 */
const VarInput: React.FC<VarInputProps> = ({
  value,
  onChange,
  placeholder,
  className,
}) => {
  const { envVariables } = useRequestContext();
  const varKeys = Object.keys(envVariables);

  const [showPopup, setShowPopup] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  useAutoGrow(inputRef, value);

  /** Returns the partial key after `{{` at the cursor, or null if not applicable */
  const getCursorFilter = (el: HTMLTextAreaElement): string | null => {
    const cursor = el.selectionStart ?? el.value.length;
    const before = el.value.slice(0, cursor);
    const match = before.match(/\{\{(\w*)$/);
    return match ? match[1] : null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    const filter = getCursorFilter(e.target);
    if (filter !== null && varKeys.length > 0) {
      setShowPopup(true);
      setFilterText(filter);
      setActiveIdx(0);
    } else {
      setShowPopup(false);
    }
  };

  const getFiltered = () =>
    varKeys.filter((k) => k.toLowerCase().includes(filterText.toLowerCase()));

  // Position the popup via a portal anchored to the input's live screen
  // position instead of a locally `position: absolute` element, which would
  // sit inside this input's own stacking context (e.g. an AuthTab fieldset)
  // and get painted over by a later sibling section regardless of z-index.
  React.useEffect(() => {
    if (showPopup && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPopupStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        minWidth: Math.max(rect.width, 280),
      });
    }
  }, [showPopup]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !showPopup) {
      e.preventDefault();
      return;
    }
    if (!showPopup) return;
    const filtered = getFiltered();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered.length > 0) {
      e.preventDefault();
      insertVar(filtered[activeIdx]);
    } else if (e.key === "Escape") {
      setShowPopup(false);
    }
  };

  const insertVar = (varKey: string) => {
    const el = inputRef.current;
    if (!el) return;
    const cursor = el.selectionStart ?? el.value.length;
    const before = el.value.slice(0, cursor);
    const after = el.value.slice(cursor);
    // Replace the trailing `{{partial` with `{{varKey}}`
    const newBefore = before.replace(/\{\{(\w*)$/, `{{${varKey}}}`);
    const newValue = newBefore + after;
    onChange(newValue);
    setShowPopup(false);
    setTimeout(() => {
      if (el) {
        el.setSelectionRange(newBefore.length, newBefore.length);
        el.focus();
      }
    }, 0);
  };

  const filtered = getFiltered();

  return (
    <div ref={containerRef} className="var-input-container">
      <textarea
        ref={inputRef}
        rows={1}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setShowPopup(false), 150)}
        placeholder={placeholder}
        className={`autogrow-textarea${className ? ` ${className}` : ""}`}
        autoComplete="off"
      />
      {showPopup &&
        filtered.length > 0 &&
        ReactDOM.createPortal(
          <div className="var-popup" style={popupStyle}>
            {filtered.map((k, i) => (
              <div
                key={k}
                className={`var-popup-item ${i === activeIdx ? "active" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertVar(k);
                }}
                onMouseEnter={() => setActiveIdx(i)}
              >
                <span className="var-popup-key">{`{{${k}}}`}</span>
                <span className="var-popup-value">{envVariables[k]}</span>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
};

export default VarInput;
