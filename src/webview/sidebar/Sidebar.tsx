import React, { useEffect, useRef, useState } from "react";
import CollectionAddIcon from "../components/icons/CollectionAddIcon";
import HistoryIcon from "../components/icons/HistoryIcon";
import NoItemsIcon from "../components/icons/NoItemsIcon";
import Tooltip from "../components/Tooltip";
import { Folder, Request } from "../types/internal.types";
import FolderItem from "./FolderItem";
import ImportDropdown from "./ImportDropdown";

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
          <Tooltip text="Create Collection">
            <button className="btn-primary" onClick={handleCreateFolder}>
              <CollectionAddIcon />
              <span>New Collection</span>
            </button>
          </Tooltip>
          <ImportDropdown onSelect={handleImportCollection} />
          <Tooltip text="View Request History" position="top-right">
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
