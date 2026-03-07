import React, { useRef } from "react";

interface EnvVarInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  envVariables: Record<string, string>;
}

/**
 * A textarea that auto-grows and shows a `{{variable}}` completion popup
 * when the user types `{{`. Receives envVariables directly as a prop.
 */
const EnvVarInput: React.FC<EnvVarInputProps> = ({
  value,
  onChange,
  placeholder,
  className,
  envVariables,
}) => {
  const varKeys = Object.keys(envVariables);
  const [showPopup, setShowPopup] = React.useState(false);
  const [filterText, setFilterText] = React.useState("");
  const [activeIdx, setActiveIdx] = React.useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    const computed = getComputedStyle(el);
    const lh = parseFloat(computed.lineHeight) || 20;
    const pt = parseFloat(computed.paddingTop) || 0;
    const pb = parseFloat(computed.paddingBottom) || 0;
    const max = lh * 5 + pt + pb;
    const needed = Math.min(el.scrollHeight, max);
    el.style.height = needed + "px";
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }, [value]);

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

  const insertVar = (varKey: string) => {
    const el = inputRef.current;
    if (!el) return;
    const cursor = el.selectionStart ?? el.value.length;
    const before = el.value.slice(0, cursor);
    const after = el.value.slice(cursor);
    const newBefore = before.replace(/\{\{(\w*)$/, `{{${varKey}}}`);
    onChange(newBefore + after);
    setShowPopup(false);
    setTimeout(() => {
      if (el) {
        el.setSelectionRange(newBefore.length, newBefore.length);
        el.focus();
      }
    }, 0);
  };

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

  const filtered = getFiltered();

  return (
    <div className="var-input-container">
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

export default EnvVarInput;
