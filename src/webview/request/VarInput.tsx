import React, { useRef, useState } from "react";
import { useRequestContext } from "./RequestContext";

interface VarInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * A text input that shows a variable-completion popup when the user types `{{`.
 * Reads available env variables from RequestContext.
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
  const inputRef = useRef<HTMLInputElement>(null);

  /** Returns the partial key after `{{` at the cursor, or null if not applicable */
  const getCursorFilter = (el: HTMLInputElement): string | null => {
    const cursor = el.selectionStart ?? el.value.length;
    const before = el.value.slice(0, cursor);
    const match = before.match(/\{\{(\w*)$/);
    return match ? match[1] : null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
    <div className="var-input-container">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setShowPopup(false), 150)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {showPopup && filtered.length > 0 && (
        <div className="var-popup">
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
        </div>
      )}
    </div>
  );
};

export default VarInput;
