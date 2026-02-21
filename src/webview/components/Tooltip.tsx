import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";

type TooltipPosition = "top" | "bottom" | "left" | "right";

// Custom Tooltip Component
const Tooltip: React.FC<{
  text: string;
  children: React.ReactNode;
  position?: TooltipPosition;
}> = ({ text, children, position = "top" }) => {
  const [show, setShow] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLDivElement>(null);

  const getPositionStyle = (rect: DOMRect): React.CSSProperties => {
    const offset = 8;

    switch (position) {
      case "top":
        return {
          left: rect.left + rect.width / 2,
          top: rect.top - offset,
          transform: "translate(-50%, -100%)",
        };
      case "bottom":
        return {
          left: rect.left + rect.width / 2,
          top: rect.bottom + offset,
          transform: "translate(-50%, 0)",
        };
      case "left":
        return {
          left: rect.left - offset,
          top: rect.top + rect.height / 2,
          transform: "translate(-100%, -50%)",
        };
      case "right":
        return {
          left: rect.right + offset,
          top: rect.top + rect.height / 2,
          transform: "translate(0, -50%)",
        };
      default:
        return {
          left: rect.left + rect.width / 2,
          top: rect.top - offset,
          transform: "translate(-50%, -100%)",
        };
    }
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setStyle(getPositionStyle(rect));
    setShow(true);
  };

  const handleMouseLeave = () => {
    setShow(false);
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-flex"
      >
        {children}
      </div>
      {show &&
        createPortal(
          <div
            className={`custom-tooltip tooltip-${position}`}
            style={{
              position: "fixed",
              ...style,
            }}
          >
            {text}
          </div>,
          document.body,
        )}
    </>
  );
};

export default Tooltip;
