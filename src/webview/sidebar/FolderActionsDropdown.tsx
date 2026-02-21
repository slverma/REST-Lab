import React, { useState, useEffect, useRef } from "react";
import { Folder } from "../types/internal.types";
import Tooltip from "../components/Tooltip";
import ThunderClientIcon from "../components/icons/ThunderClientIcon";
import PostmanIcon from "../components/icons/PostmanIcon";
import RESTLabIcon from "../components/icons/RestLabIcon";
import TrashIcon from "../components/icons/TrashIcon";
import CopyIcon from "../components/icons/CopyIcon";
import MoreActionIcon from "../components/icons/MoreActionIcon";
import PencilIcon from "../components/icons/PencilIcon";
import FolderAddIcon from "../components/icons/FolderAddIcon";
import GearIcon from "../components/icons/GearIcon";
import ExportIcon from "../components/icons/ExportIcon";
import ChevronIcon from "../components/icons/ChevronIcon";

// Export formats for extensibility
export const EXPORT_FORMATS = [
  {
    id: "restlab",
    name: "REST Lab",
    icon: <RESTLabIcon />,
  },
  {
    id: "postman",
    name: "Postman",
    icon: <PostmanIcon />,
  },
  {
    id: "thunder-client",
    name: "Thunder Client",
    icon: <ThunderClientIcon />,
  },
];

// Folder Actions Dropdown Component
const FolderActionsDropdown: React.FC<{
  folder: Folder;
  onAddSubfolder: (e: React.MouseEvent, folderId: string) => void;
  onOpenFolder: (e: React.MouseEvent, folder: Folder) => void;
  onExport: (folderId: string, format: string) => void;
  onDuplicate: (e: React.MouseEvent, folderId: string) => void;
  onRename: (e: React.MouseEvent, folderId: string) => void;
  onDelete: (e: React.MouseEvent, folderId: string) => void;
}> = ({
  folder,
  onAddSubfolder,
  onOpenFolder,
  onExport,
  onDuplicate,
  onRename,
  onDelete,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setShowExport(false);
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
          className="action-btn group-hover:opacity-60 hover:!opacity-100 hover:bg-slate-500/10 hover:text-slate-400"
          onClick={handleClick}
        >
          <MoreActionIcon />
        </button>
      </Tooltip>
      {isOpen && !showExport && (
        <div className="dropdown-menu min-w-[180px]">
          <button
            className="dropdown-item"
            onClick={(e) => {
              onAddSubfolder(e, folder.id);
              setIsOpen(false);
            }}
          >
            <FolderAddIcon />
            <span>Add Subfolder</span>
          </button>
          <button
            className="dropdown-item"
            onClick={(e) => {
              onOpenFolder(e, folder);
              setIsOpen(false);
            }}
          >
            <GearIcon />
            <span>Collection Settings</span>
          </button>
          <button
            className="dropdown-item"
            onClick={(e) => {
              e.stopPropagation();
              setShowExport(true);
            }}
          >
            <ExportIcon />
            <span>Export Collection</span>
            <ChevronIcon />
          </button>
          <button
            className="dropdown-item"
            onClick={(e) => {
              onDuplicate(e, folder.id);
              setIsOpen(false);
            }}
          >
            <CopyIcon />
            <span>Duplicate Collection</span>
          </button>
          <button
            className="dropdown-item"
            onClick={(e) => {
              onRename(e, folder.id);
              setIsOpen(false);
            }}
          >
            <PencilIcon />
            <span>Rename Collection</span>
          </button>
          <div className="dropdown-divider" />
          <button
            className="dropdown-item text-red-500"
            onClick={(e) => {
              onDelete(e, folder.id);
              setIsOpen(false);
            }}
          >
            <TrashIcon />
            <span>Delete Collection</span>
          </button>
        </div>
      )}
      {isOpen && showExport && (
        <div className="dropdown-menu min-w-[180px]">
          <button
            className="dropdown-item"
            onClick={(e) => {
              e.stopPropagation();
              setShowExport(false);
            }}
          >
            <ChevronIcon className="rotate-180" />
            <span>Back</span>
          </button>
          <div className="dropdown-divider" />
          <div className="dropdown-header">Export as</div>
          {EXPORT_FORMATS.map((format) => (
            <button
              key={format.id}
              className="dropdown-item"
              onClick={(e) => {
                e.stopPropagation();
                onExport(folder.id, format.id);
                setIsOpen(false);
                setShowExport(false);
              }}
            >
              <span className="flex items-center justify-center w-5 h-5 opacity-80">
                {format.icon}
              </span>
              <span>{format.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default FolderActionsDropdown;
