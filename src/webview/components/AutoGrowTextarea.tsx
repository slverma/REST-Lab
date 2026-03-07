import React, { useRef } from "react";
import { useAutoGrow } from "../helpers/useAutoGrow";

interface AutoGrowTextareaProps extends Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "onChange"
> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

/**
 * Drop-in replacement for <input type="text"> that auto-grows up to 5 lines,
 * then shows a scrollbar. Prevents Enter from inserting newlines.
 */
const AutoGrowTextarea: React.FC<AutoGrowTextareaProps> = ({
  value,
  onChange,
  className,
  onKeyDown,
  ...rest
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  useAutoGrow(ref, value);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") e.preventDefault();
    onKeyDown?.(e);
  };

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      rows={1}
      onKeyDown={handleKeyDown}
      className={`autogrow-textarea${className ? ` ${className}` : ""}`}
      {...rest}
    />
  );
};

export default AutoGrowTextarea;
