import React, { useEffect, useState } from "react";
import Tooltip from "../components/Tooltip";
import ChevronIcon from "../components/icons/ChevronIcon";
import EmptyGlassIcon from "../components/icons/EmptyGlassIcon";
import FolderIcon from "../components/icons/FolderIcon";
import NoItemsIcon from "../components/icons/NoItemsIcon";
import PlusIcon from "../components/icons/PlusIcon";
import { Folder, Request } from "../types/internal.types";
import FolderActionsDropdown from "./FolderActionsDropdown";
import ImportDropdown from "./ImportDropdown";
import RequestActionsDropdown from "./RequestActionsDropdown";

declare function acquireVsCodeApi(): {
  postMessage: (message: unknown) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
};

const vscode = acquireVsCodeApi();

// Drag data type constants
const DRAG_TYPE_REQUEST = "application/x-restlab-request";
const DRAG_TYPE_FOLDER = "application/x-restlab-folder";

interface DragData {
  type: "request" | "folder";
  id: string;
  sourceFolderId?: string;
  name: string;
}

const getMethodColor = (method: string) => {
  switch (method) {
    case "GET":
      return "method-get";
    case "POST":
      return "method-post";
    case "PUT":
      return "method-put";
    case "PATCH":
      return "method-patch";
    case "DELETE":
      return "method-delete";
    default:
      return "";
  }
};

interface FolderItemProps {
  folder: Folder;
  depth?: number;
  isDragging: boolean;
  dragOverFolderId: string | null;
  expandedFolders: Set<string>;
  onToggleFolder: (folderId: string) => void;
  onDragStart: (
    e: React.DragEvent,
    type: "request" | "folder",
    id: string,
    name: string,
    sourceFolderId?: string,
  ) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, folderId: string) => void;
  onDragLeave: (e: React.DragEvent, folderId: string) => void;
  onDrop: (e: React.DragEvent, targetFolderId: string) => void;
  onAddRequest: (e: React.MouseEvent, folderId: string) => void;
  onAddSubfolder: (e: React.MouseEvent, parentFolderId: string) => void;
  onOpenFolder: (e: React.MouseEvent, folder: Folder) => void;
  onExportCollection: (folderId: string, format: string) => void;
  onDuplicateFolder: (e: React.MouseEvent, folderId: string) => void;
  onRenameFolder: (e: React.MouseEvent, folderId: string) => void;
  onDeleteFolder: (e: React.MouseEvent, folderId: string) => void;
  onOpenRequest: (request: Request) => void;
  onRenameRequest: (
    e: React.MouseEvent,
    requestId: string,
    folderId: string,
  ) => void;
  onDuplicateRequest: (
    e: React.MouseEvent,
    requestId: string,
    folderId: string,
  ) => void;
  onDeleteRequest: (
    e: React.MouseEvent,
    requestId: string,
    folderId: string,
  ) => void;
}

const FolderItem: React.FC<FolderItemProps> = ({
  folder,
  depth = 0,
  isDragging,
  dragOverFolderId,
  expandedFolders,
  onToggleFolder,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onAddRequest,
  onAddSubfolder,
  onOpenFolder,
  onExportCollection,
  onDuplicateFolder,
  onRenameFolder,
  onDeleteFolder,
  onOpenRequest,
  onRenameRequest,
  onDuplicateRequest,
  onDeleteRequest,
}) => {
  const isDropTarget = dragOverFolderId === folder.id;

  return (
    <div key={folder.id} className="mb-0.5" data-folder-id={folder.id}>
      <div
        className={`group flex items-center gap-2.5 py-2.5 px-3 mb-1 cursor-pointer rounded-lg transition-all duration-200 border border-transparent hover:bg-glass hover:border-glass relative before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-0 before:bg-restlab-gradient before:rounded-r before:transition-all before:duration-200 hover:before:h-[60%] focus:outline-none focus:border-sky-400 focus:bg-sky-500/10 focus:before:h-[80%] ${isDropTarget ? "drop-target-active" : ""} ${isDragging ? "dragging-active" : ""}`}
        onClick={() => onToggleFolder(folder.id)}
        role="button"
        tabIndex={0}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        draggable
        onDragStart={(e) => onDragStart(e, "folder", folder.id, folder.name)}
        onDragEnd={onDragEnd}
        onDragOver={(e) => onDragOver(e, folder.id)}
        onDragLeave={(e) => onDragLeave(e, folder.id)}
        onDrop={(e) => onDrop(e, folder.id)}
      >
        <ChevronIcon
          className={expandedFolders.has(folder.id) ? "rotate-90" : ""}
        />

        <FolderIcon className="flex-shrink-0 text-vscode transition-colors duration-150 group-hover:text-sky-400 group-hover:drop-shadow-[0_0_4px_rgba(56,189,248,0.4)]" />
        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-medium">
          {folder.name}
        </span>
        <div className="flex items-center gap-1 ml-auto">
          <Tooltip text="Add Request">
            <button
              className="action-btn group-hover:opacity-60 hover:!opacity-100 hover:bg-sky-500/10 hover:text-sky-400 hover:shadow-glow"
              onClick={(e) => onAddRequest(e, folder.id)}
            >
              <PlusIcon />
            </button>
          </Tooltip>
          <FolderActionsDropdown
            folder={folder}
            onAddSubfolder={onAddSubfolder}
            onOpenFolder={onOpenFolder}
            onExport={onExportCollection}
            onDuplicate={onDuplicateFolder}
            onRename={onRenameFolder}
            onDelete={onDeleteFolder}
          />
        </div>
      </div>

      {expandedFolders.has(folder.id) && (
        <div className="relative before:content-[''] before:absolute before:left-5 before:top-0 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-white/10 before:to-transparent">
          {/* Render subfolders first */}
          {folder.subfolders &&
            folder.subfolders.map((subfolder) => (
              <FolderItem
                key={subfolder.id}
                folder={subfolder}
                depth={depth + 1}
                isDragging={isDragging}
                dragOverFolderId={dragOverFolderId}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onAddRequest={onAddRequest}
                onAddSubfolder={onAddSubfolder}
                onOpenFolder={onOpenFolder}
                onExportCollection={onExportCollection}
                onDuplicateFolder={onDuplicateFolder}
                onRenameFolder={onRenameFolder}
                onDeleteFolder={onDeleteFolder}
                onOpenRequest={onOpenRequest}
                onRenameRequest={onRenameRequest}
                onDuplicateRequest={onDuplicateRequest}
                onDeleteRequest={onDeleteRequest}
              />
            ))}

          {/* Render requests */}
          <div
            className={`pl-5 ${isDropTarget ? "drop-zone-highlight" : ""}`}
            style={{ paddingLeft: `${20 + depth * 16}px` }}
            onDragOver={(e) => onDragOver(e, folder.id)}
            onDrop={(e) => onDrop(e, folder.id)}
          >
            {(!folder.requests || folder.requests.length === 0) &&
            (!folder.subfolders || folder.subfolders.length === 0) ? (
              <div
                className={`py-2 px-3 text-xs text-vscode-muted opacity-70 italic ${isDropTarget ? "drop-hint-visible" : ""}`}
              >
                <span>
                  {isDropTarget ? "Drop here to add" : "No items yet"}
                </span>
              </div>
            ) : (
              folder.requests?.map((request) => (
                <div
                  key={request.id}
                  className={`group flex items-center gap-2 py-2 px-2.5 mb-0.5 cursor-pointer rounded-md transition-all duration-200 border border-transparent ml-2.5 relative before:content-[''] before:absolute before:-left-2 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-0 before:bg-restlab-gradient before:rounded-sm before:transition-all before:duration-200 hover:bg-glass hover:border-glass hover:before:h-1/2 ${isDragging ? "dragging-active" : ""}`}
                  onClick={() => onOpenRequest(request)}
                  role="button"
                  tabIndex={0}
                  draggable
                  onDragStart={(e) =>
                    onDragStart(
                      e,
                      "request",
                      request.id,
                      request.name,
                      folder.id,
                    )
                  }
                  onDragEnd={onDragEnd}
                >
                  <span
                    className={`method-badge ${getMethodColor(request.method)}`}
                  >
                    {request.method}
                  </span>
                  <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs">
                    {request.name}
                  </span>
                  <RequestActionsDropdown
                    request={request}
                    folderId={folder.id}
                    onRename={onRenameRequest}
                    onDuplicate={onDuplicateRequest}
                    onDelete={onDeleteRequest}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    vscode.postMessage({ type: "getFolders" });

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case "foldersUpdated":
          setFolders(message.folders);
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleCreateFolder = () => {
    vscode.postMessage({ type: "createFolder" });
  };

  const handleImportCollection = (providerId: string) => {
    vscode.postMessage({ type: "importCollection", provider: providerId });
  };

  const handleToggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleOpenFolder = (e: React.MouseEvent, folder: Folder) => {
    e.stopPropagation();
    vscode.postMessage({
      type: "openFolder",
      folderId: folder.id,
      folderName: folder.name,
    });
  };

  const handleDeleteFolder = (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    vscode.postMessage({ type: "deleteFolder", folderId });
  };

  const handleAddRequest = (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    vscode.postMessage({ type: "createRequest", folderId });
    setExpandedFolders((prev) => new Set(prev).add(folderId));
  };

  const handleAddSubfolder = (e: React.MouseEvent, parentFolderId: string) => {
    e.stopPropagation();
    vscode.postMessage({ type: "createSubfolder", parentFolderId });
    setExpandedFolders((prev) => new Set(prev).add(parentFolderId));
  };

  const handleOpenRequest = (request: Request) => {
    vscode.postMessage({
      type: "openRequest",
      requestId: request.id,
      requestName: request.name,
      folderId: request.folderId,
    });
  };

  const handleDeleteRequest = (
    e: React.MouseEvent,
    requestId: string,
    folderId: string,
  ) => {
    e.stopPropagation();
    vscode.postMessage({ type: "deleteRequest", requestId, folderId });
  };

  const handleDuplicateRequest = (
    e: React.MouseEvent,
    requestId: string,
    folderId: string,
  ) => {
    e.stopPropagation();
    vscode.postMessage({ type: "duplicateRequest", requestId, folderId });
  };

  const handleDuplicateFolder = (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    vscode.postMessage({ type: "duplicateFolder", folderId });
  };

  const handleRenameFolder = (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    vscode.postMessage({ type: "renameFolder", folderId });
  };

  const handleRenameRequest = (
    e: React.MouseEvent,
    requestId: string,
    folderId: string,
  ) => {
    e.stopPropagation();
    vscode.postMessage({ type: "renameRequest", requestId, folderId });
  };

  const handleExportCollection = (folderId: string, format: string) => {
    vscode.postMessage({ type: "exportCollection", folderId, format });
  };

  // Drag and Drop handlers
  const handleDragStart = (
    e: React.DragEvent,
    type: "request" | "folder",
    id: string,
    name: string,
    sourceFolderId?: string,
  ) => {
    const dragData: DragData = { type, id, sourceFolderId, name };
    e.dataTransfer.setData(
      type === "request" ? DRAG_TYPE_REQUEST : DRAG_TYPE_FOLDER,
      JSON.stringify(dragData),
    );
    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);

    // Create a custom drag image
    const dragElement = document.createElement("div");
    dragElement.className = "drag-preview";
    dragElement.textContent = name;
    document.body.appendChild(dragElement);
    e.dataTransfer.setDragImage(dragElement, 0, 0);
    setTimeout(() => document.body.removeChild(dragElement), 0);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragOverFolderId(null);
  };

  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if we're dragging a valid type
    if (
      e.dataTransfer.types.includes(DRAG_TYPE_REQUEST) ||
      e.dataTransfer.types.includes(DRAG_TYPE_FOLDER)
    ) {
      e.dataTransfer.dropEffect = "move";
      setDragOverFolderId(folderId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Only clear if we're leaving this specific folder
    const relatedTarget = e.relatedTarget as HTMLElement;
    const currentTarget = e.currentTarget as HTMLElement;

    // Check if we're leaving to outside the current folder
    if (!currentTarget.contains(relatedTarget)) {
      setDragOverFolderId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
    setIsDragging(false);

    // Try to get request data
    const requestData = e.dataTransfer.getData(DRAG_TYPE_REQUEST);
    if (requestData) {
      const data: DragData = JSON.parse(requestData);
      if (data.sourceFolderId !== targetFolderId) {
        vscode.postMessage({
          type: "moveRequest",
          requestId: data.id,
          sourceFolderId: data.sourceFolderId,
          targetFolderId,
        });
        // Expand target folder to show the moved request
        setExpandedFolders((prev) => new Set(prev).add(targetFolderId));
      }
      return;
    }

    // Try to get folder data
    const folderData = e.dataTransfer.getData(DRAG_TYPE_FOLDER);
    if (folderData) {
      const data: DragData = JSON.parse(folderData);
      // Prevent dropping folder into itself or its own children
      if (data.id !== targetFolderId) {
        vscode.postMessage({
          type: "moveFolder",
          folderId: data.id,
          targetFolderId,
        });
        // Expand target folder to show the moved folder
        setExpandedFolders((prev) => new Set(prev).add(targetFolderId));
      }
    }
  };

  // Handle drop on root (move to top level)
  const handleDropOnRoot = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverFolderId(null);
    setIsDragging(false);

    const folderData = e.dataTransfer.getData(DRAG_TYPE_FOLDER);
    if (folderData) {
      const data: DragData = JSON.parse(folderData);
      vscode.postMessage({
        type: "moveFolder",
        folderId: data.id,
        targetFolderId: null, // null means root level
      });
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="p-4 border-b border-glass bg-gradient-to-b from-sky-500/5 to-transparent relative after:content-[''] after:absolute after:-bottom-px after:left-4 after:right-4 after:h-px after:bg-restlab-gradient after:opacity-30">
        <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-widest text-gradient mb-4 before:content-[''] before:inline-block before:w-2 before:h-2 before:bg-restlab-gradient before:rounded-sm before:shadow-glow">
          REST Lab
        </h2>
        <div className="flex items-center gap-2">
          <button
            className="btn-primary"
            onClick={handleCreateFolder}
            title="Create Collection"
          >
            <EmptyGlassIcon />
            <span>New Collection</span>
          </button>
          <ImportDropdown onSelect={handleImportCollection} />
        </div>
      </div>

      <div
        className={`flex-1 overflow-y-auto py-3 px-2 scrollbar-thin ${isDragging ? "root-drop-zone" : ""}`}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes(DRAG_TYPE_FOLDER)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }
        }}
        onDrop={handleDropOnRoot}
      >
        {folders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <NoItemsIcon />
            <p className="mb-1 text-vscode font-medium">No collections yet</p>
            <p className="text-xs text-vscode-muted opacity-80">
              Create your first collection to get started
            </p>
          </div>
        ) : (
          <>
            {folders.map((folder) => (
              <FolderItem
                key={folder.id}
                folder={folder}
                depth={0}
                isDragging={isDragging}
                dragOverFolderId={dragOverFolderId}
                expandedFolders={expandedFolders}
                onToggleFolder={handleToggleFolder}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onAddRequest={handleAddRequest}
                onAddSubfolder={handleAddSubfolder}
                onOpenFolder={handleOpenFolder}
                onExportCollection={handleExportCollection}
                onDuplicateFolder={handleDuplicateFolder}
                onRenameFolder={handleRenameFolder}
                onDeleteFolder={handleDeleteFolder}
                onOpenRequest={handleOpenRequest}
                onRenameRequest={handleRenameRequest}
                onDuplicateRequest={handleDuplicateRequest}
                onDeleteRequest={handleDeleteRequest}
              />
            ))}
            {/* Drop zone indicator at root level */}
            {isDragging && (
              <div className="root-drop-indicator">
                <span>Drop here to move to root level</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
