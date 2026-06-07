import React from "react";

type CollectionAddIconProps = {
  className?: string;
};

// Rounded diamond stack with a circle-plus badge on the top face.
// Diamond corners are at: Top(12,2) Left(2,7) Bottom(12,12) Right(22,7).
// Each edge has length 5√5 ≈ 11.18; rounding radius 1.5 → offset ≈ (1.34, 0.67).
const CollectionAddIcon = ({ className }: CollectionAddIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linejoin="round"
    stroke-linecap="round"
    className={className}
  >
    <path d="M2.5 9.5 L8 11.5 L13.5 9.5" />
    <path d="M2.5 12.5 L8 14.5 L13.5 12.5" />

    <line x1="8" y1="1.5" x2="8" y2="7.5" />
    <line x1="5" y1="4.5" x2="11" y2="4.5" />
  </svg>
);

export default CollectionAddIcon;
