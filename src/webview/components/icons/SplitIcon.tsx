import React from "react";
const SplitIcon = ({ splitLayout = "horizontal" }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    {splitLayout === "vertical" && <line x1="3" y1="12" x2="21" y2="12" />}
    {splitLayout === "horizontal" && <line x1="12" y1="3" x2="12" y2="21" />}
  </svg>
);

export default SplitIcon;
