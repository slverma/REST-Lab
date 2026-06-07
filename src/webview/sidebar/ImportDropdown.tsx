import React, { useState, useRef, useEffect } from "react";
import Tooltip from "../components/Tooltip";
import { ImportProvider } from "../types/internal.types";
import RESTLabIcon from "../components/icons/RestLabIcon";
import PostmanIcon from "../components/icons/PostmanIcon";
import ThunderClientIcon from "../components/icons/ThunderClientIcon";
import FolderImportIcon from "../components/icons/FolderImportIcon";

const IMPORT_PROVIDERS: ImportProvider[] = [
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

// Import Dropdown Component
const ImportDropdown: React.FC<{
  onSelect: (providerId: string) => void;
}> = ({ onSelect }) => {
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

  return (
    <div className="dropdown-wrap" ref={dropdownRef}>
      <Tooltip text="Import Collection" position="bottom">
        <button
          className="header-action-btn"
          onClick={() => setIsOpen(!isOpen)}
        >
          <FolderImportIcon />
        </button>
      </Tooltip>
      {isOpen && (
        <div className="dropdown-menu">
          <div className="dropdown-header">Import from</div>
          {IMPORT_PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              className="dropdown-item"
              onClick={() => {
                onSelect(provider.id);
                setIsOpen(false);
              }}
            >
              <span className="dropdown-item-icon">
                {provider.icon}
              </span>
              <span>{provider.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImportDropdown;
