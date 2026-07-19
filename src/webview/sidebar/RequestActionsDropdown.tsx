import React, { useEffect, useRef, useState } from "react";
import Tooltip from "../components/Tooltip";
import CopyIcon from "../components/icons/CopyIcon";
import MoreActionIcon from "../components/icons/MoreActionIcon";
import PencilIcon from "../components/icons/PencilIcon";
import TrashIcon from "../components/icons/TrashIcon";
import { Request } from "../types/internal.types";

// Request Actions Dropdown Component
const RequestActionsDropdown: React.FC<{
  request: Request;
  folderId: string;
  onRename: (e: React.MouseEvent, requestId: string, folderId: string) => void;
  onDuplicate: (
    e: React.MouseEvent,
    requestId: string,
    folderId: string,
  ) => void;
  onDelete: (e: React.MouseEvent, requestId: string, folderId: string) => void;
}> = ({ request, folderId, onRename, onDuplicate, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div className="dropdown-wrap" ref={dropdownRef}>
      <Tooltip text="More Actions" position="top-right">
        <button
          className="action-btn"
          onClick={handleClick}
        >
          <MoreActionIcon />
        </button>
      </Tooltip>
      {isOpen && (
        <div className="dropdown-menu">
          <button
            className="dropdown-item"
            onClick={(e) => {
              onRename(e, request.id, folderId);
              setIsOpen(false);
            }}
          >
            <PencilIcon />
            <span>Rename</span>
          </button>
          <button
            className="dropdown-item"
            onClick={(e) => {
              onDuplicate(e, request.id, folderId);
              setIsOpen(false);
            }}
          >
            <CopyIcon />
            <span>Duplicate</span>
          </button>
          <div className="dropdown-divider" />
          <button
            className="dropdown-item danger"
            onClick={(e) => {
              onDelete(e, request.id, folderId);
              setIsOpen(false);
            }}
          >
            <TrashIcon />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default RequestActionsDropdown;
