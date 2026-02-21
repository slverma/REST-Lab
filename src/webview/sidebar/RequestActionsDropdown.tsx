import React, { useState, useEffect, useRef } from "react";
import { Request } from "../types/internal.types";
import Tooltip from "../components/Tooltip";
import TrashIcon from "../components/icons/TrashIcon";
import CopyIcon from "../components/icons/CopyIcon";
import MoreActionIcon from "../components/icons/MoreActionIcon";
import PencilIcon from "../components/icons/PencilIcon";

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
    <div className="relative inline-flex" ref={dropdownRef}>
      <Tooltip text="More Actions" position="left">
        <button
          className="action-btn w-5 h-5 group-hover:opacity-60 hover:!opacity-100 hover:bg-slate-500/10 hover:text-slate-400"
          onClick={handleClick}
        >
          <MoreActionIcon />
        </button>
      </Tooltip>
      {isOpen && (
        <div className="dropdown-menu min-w-[160px]">
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
            className="dropdown-item text-red-500"
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
