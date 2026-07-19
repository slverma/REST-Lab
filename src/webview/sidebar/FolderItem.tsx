import React from "react";
import Tooltip from "../components/Tooltip";
import ChevronIcon from "../components/icons/ChevronIcon";
import CollectionIcon from "../components/icons/CollectionIcon";
import DragHandleIcon from "../components/icons/DragHandleIcon";
import FolderIcon from "../components/icons/FolderIcon";
import PlusIcon from "../components/icons/PlusIcon";
import { Folder, Request } from "../types/internal.types";
import FolderActionsDropdown from "./FolderActionsDropdown";
import RequestActionsDropdown from "./RequestActionsDropdown";

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
        onDragOver={(e) => onDragOver(e, folder.id)}
        onDragLeave={(e) => onDragLeave(e, folder.id)}
        onDrop={(e) => onDrop(e, folder.id)}
      >
        <span
          className="row-grip"
          draggable
          onDragStart={(e) => onDragStart(e, "folder", folder.id, folder.name)}
          onDragEnd={onDragEnd}
          onClick={(e) => e.stopPropagation()}
        >
          <DragHandleIcon />
        </span>
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
                >
                  <span
                    className="row-grip"
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
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DragHandleIcon />
                  </span>
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

export default FolderItem;
