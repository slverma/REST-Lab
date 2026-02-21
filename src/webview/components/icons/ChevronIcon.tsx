import React from "react";
type ChevronIconProps = {
  className?: string;
};
const ChevronIcon = ({ className }: ChevronIconProps) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={`flex-shrink-0 transition-transform duration-150 opacity-60 ${
      className ?? ""
    }`}
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
);

export default ChevronIcon;
