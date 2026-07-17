import React, { useEffect, useRef, useState } from "react";
import Tooltip from "../components/Tooltip";
import ChevronIcon from "../components/icons/ChevronIcon";
import CollectionAddIcon from "../components/icons/CollectionAddIcon";
import CollectionIcon from "../components/icons/CollectionIcon";
import FolderIcon from "../components/icons/FolderIcon";
import HistoryIcon from "../components/icons/HistoryIcon";
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

export const vscode = acquireVsCodeApi();

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
  activeRequestId: string | null;
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
  onAddRequestFromCurl: (e: React.MouseEvent, folderId: string) => void;
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
  activeRequestId,
  onToggleFolder,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onAddRequest,
  onAddRequestFromCurl,
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
    <div key={folder.id} className="folder-item" data-folder-id={folder.id}>
      <div
        className={`tree-row${isDropTarget ? " drop-target-active" : ""}${isDragging ? " dragging-active" : ""}`}
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
          className={`tree-icon${expandedFolders.has(folder.id) ? " rotate-90" : ""}`}
        />

        {depth === 0 ? (
          <CollectionIcon className="tree-icon" />
        ) : (
          <FolderIcon className="tree-icon" />
        )}
        <span className="tree-label">
          {folder.name}
        </span>
        <div className="tree-actions">
          <Tooltip text="Add Request">
            <button
              className="action-btn"
              onClick={(e) => onAddRequest(e, folder.id)}
            >
              <PlusIcon />
            </button>
          </Tooltip>
          <FolderActionsDropdown
            folder={folder}
            onAddSubfolder={onAddSubfolder}
            onAddRequestFromCurl={onAddRequestFromCurl}
            onOpenFolder={onOpenFolder}
            onExport={onExportCollection}
            onDuplicate={onDuplicateFolder}
            onRename={onRenameFolder}
            onDelete={onDeleteFolder}
          />
        </div>
      </div>

      {expandedFolders.has(folder.id) && (
        <div className="tree-children">
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
                activeRequestId={activeRequestId}
                onToggleFolder={onToggleFolder}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onAddRequest={onAddRequest}
                onAddRequestFromCurl={onAddRequestFromCurl}
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
            className={`req-zone${isDropTarget ? " drop-zone-highlight" : ""}`}
            style={{ paddingLeft: `${20 + depth * 16}px` }}
            onDragOver={(e) => onDragOver(e, folder.id)}
            onDrop={(e) => onDrop(e, folder.id)}
          >
            {(!folder.requests || folder.requests.length === 0) &&
            (!folder.subfolders || folder.subfolders.length === 0) ? (
              <div
                className={`req-empty-hint${isDropTarget ? " drop-hint-visible" : ""}`}
              >
                <span>
                  {isDropTarget ? "Drop here to add" : "No items yet"}
                </span>
              </div>
            ) : (
              folder.requests?.map((request) => (
                <div
                  key={request.id}
                  className={`req-row${isDragging ? " dragging-active" : ""}${request.id === activeRequestId ? " active" : ""}`}
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
                  <span className="req-label">
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
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const initialLoadDone = useRef(false);

  useEffect(() => {
    vscode.postMessage({ type: "getFolders" });

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === "foldersUpdated") {
        setFolders(message.folders);
        if (!initialLoadDone.current) {
          initialLoadDone.current = true;
          if (message.expandedFolderIds && message.expandedFolderIds.length > 0) {
            setExpandedFolders(new Set<string>(message.expandedFolderIds));
          }
        }
      } else if (message.type === "activeRequestChanged") {
        setActiveRequestId(message.requestId ?? null);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Auto-expand folders containing the active request
  useEffect(() => {
    if (!activeRequestId) return;
    const findPath = (
      items: Folder[],
      id: string,
      path: string[],
    ): string[] | null => {
      for (const folder of items) {
        if (folder.requests?.some((r) => r.id === id)) {
          return [...path, folder.id];
        }
        if (folder.subfolders) {
          const result = findPath(folder.subfolders, id, [...path, folder.id]);
          if (result) return result;
        }
      }
      return null;
    };
    const path = findPath(folders, activeRequestId, []);
    if (path) {
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        path.forEach((fid) => next.add(fid));
        vscode.postMessage({
          type: "saveExpandedFolders",
          expandedFolderIds: [...next],
        });
        return next;
      });
    }
  }, [activeRequestId, folders]);

  const handleCreateFolder = () => {
    vscode.postMessage({ type: "createFolder" });
  };

  const handleImportCollection = (providerId: string) => {
    vscode.postMessage({ type: "importCollection", provider: providerId });
  };

  const handleOpenHistory = () => {
    vscode.postMessage({ type: "openHistory" });
  };

  const handleToggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      vscode.postMessage({
        type: "saveExpandedFolders",
        expandedFolderIds: [...next],
      });
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
    setExpandedFolders((prev) => {
      const next = new Set(prev).add(folderId);
      vscode.postMessage({
        type: "saveExpandedFolders",
        expandedFolderIds: [...next],
      });
      return next;
    });
  };

  const handleAddRequestFromCurl = (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    vscode.postMessage({ type: "createRequestFromCurl", folderId });
    setExpandedFolders((prev) => {
      const next = new Set(prev).add(folderId);
      vscode.postMessage({
        type: "saveExpandedFolders",
        expandedFolderIds: [...next],
      });
      return next;
    });
  };

  const handleAddSubfolder = (e: React.MouseEvent, parentFolderId: string) => {
    e.stopPropagation();
    vscode.postMessage({ type: "createSubfolder", parentFolderId });
    setExpandedFolders((prev) => {
      const next = new Set(prev).add(parentFolderId);
      vscode.postMessage({
        type: "saveExpandedFolders",
        expandedFolderIds: [...next],
      });
      return next;
    });
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
        setExpandedFolders((prev) => {
          const next = new Set(prev).add(targetFolderId);
          vscode.postMessage({
            type: "saveExpandedFolders",
            expandedFolderIds: [...next],
          });
          return next;
        });
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
        setExpandedFolders((prev) => {
          const next = new Set(prev).add(targetFolderId);
          vscode.postMessage({
            type: "saveExpandedFolders",
            expandedFolderIds: [...next],
          });
          return next;
        });
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
    <div className="sb">
      <div className="sb-head">
        <h2 className="sb-title">
          REST Lab
        </h2>
        <div className="sb-head-actions">
          <button
            className="btn-primary"
            onClick={handleCreateFolder}
            title="Create Collection"
          >
            <CollectionAddIcon />
            <span>New Collection</span>
          </button>
          <ImportDropdown onSelect={handleImportCollection} />
          <Tooltip text="View Request History" position="bottom">
            <button className="header-action-btn" onClick={handleOpenHistory}>
              <HistoryIcon />
            </button>
          </Tooltip>
        </div>
      </div>

      <div
        className={`sb-tree${isDragging ? " root-drop-zone" : ""}`}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes(DRAG_TYPE_FOLDER)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }
        }}
        onDrop={handleDropOnRoot}
      >
          {folders.length === 0 ? (
            <div className="empty-state">
              <NoItemsIcon />
              <p className="empty-state-title">No collections yet</p>
              <p className="empty-state-hint">
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
                  activeRequestId={activeRequestId}
                  onToggleFolder={handleToggleFolder}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onAddRequest={handleAddRequest}
                  onAddRequestFromCurl={handleAddRequestFromCurl}
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
