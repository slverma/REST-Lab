import * as vscode from "vscode";
import { getNonce } from "../utils/getNonce";
import { parseImportedFile, ImportResult } from "../utils/importParser";
import {
  exportToPostman,
  exportToThunderClient,
  exportToRESTLab,
} from "../utils/exportParser";
import { FolderEditorProvider } from "./FolderEditorProvider";
import { RequestEditorProvider } from "./RequestEditorProvider";

export interface Request {
  id: string;
  name: string;
  folderId: string;
  method: string;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
  parentId?: string;
  requests?: Request[];
  subfolders?: Folder[];
}

export interface FolderConfig {
  baseUrl?: string;
  headers?: { key: string; value: string }[];
}

export class SidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _folders: Folder[] = [];

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext,
  ) {
    // Load saved folders from global state
    this._folders = this._context.globalState.get<Folder[]>(
      "restlab.folders",
      [],
    );
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case "createFolder":
          const folderName = await vscode.window.showInputBox({
            prompt: "Enter folder name",
            placeHolder: "New Folder",
          });
          if (folderName) {
            this.addFolder(folderName);
          }
          break;
        case "openFolder":
          vscode.commands.executeCommand(
            "restlab.openFolderConfig",
            message.folderId,
            message.folderName,
          );
          break;
        case "deleteFolder":
          this.deleteFolder(message.folderId);
          break;
        case "getFolders":
          this._sendFoldersToWebview();
          break;
        case "createRequest":
          const requestName = await vscode.window.showInputBox({
            prompt: "Enter request name",
            placeHolder: "New Request",
          });
          if (requestName) {
            this.addRequest(message.folderId, requestName);
          }
          break;
        case "openRequest":
          vscode.commands.executeCommand(
            "restlab.openRequest",
            message.requestId,
            message.requestName,
            message.folderId,
          );
          break;
        case "deleteRequest":
          this.deleteRequest(message.folderId, message.requestId);
          break;
        case "createSubfolder":
          const subfolderName = await vscode.window.showInputBox({
            prompt: "Enter subfolder name",
            placeHolder: "New Subfolder",
          });
          if (subfolderName) {
            this.addSubfolder(message.parentFolderId, subfolderName);
          }
          break;
        case "importCollection":
          await this._handleImportCollection(message.provider);
          break;
        case "exportCollection":
          await this._handleExportCollection(message.folderId, message.format);
          break;
        case "moveRequest":
          this.moveRequest(
            message.requestId,
            message.sourceFolderId,
            message.targetFolderId,
          );
          break;
        case "moveFolder":
          this.moveFolder(message.folderId, message.targetFolderId);
          break;
        case "duplicateRequest":
          await this.duplicateRequest(message.requestId, message.folderId);
          break;
        case "duplicateFolder":
          await this.duplicateFolder(message.folderId);
          break;
        case "renameFolder":
          await this.renameFolder(message.folderId);
          break;
        case "renameRequest":
          await this.renameRequest(message.requestId, message.folderId);
          break;
      }
    });

    // Send initial folders data
    this._sendFoldersToWebview();
  }

  public addFolder(name: string) {
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name,
      createdAt: Date.now(),
      requests: [],
      subfolders: [],
    };
    this._folders.push(newFolder);
    this._saveFolders();
    this._sendFoldersToWebview();
  }

  public addSubfolder(parentFolderId: string, name: string) {
    const newSubfolder: Folder = {
      id: `folder-${Date.now()}`,
      name,
      createdAt: Date.now(),
      parentId: parentFolderId,
      requests: [],
      subfolders: [],
    };

    // Find parent folder recursively and add subfolder
    const addToParent = (folders: Folder[]): boolean => {
      for (const folder of folders) {
        if (folder.id === parentFolderId) {
          if (!folder.subfolders) {
            folder.subfolders = [];
          }
          folder.subfolders.push(newSubfolder);
          return true;
        }
        if (folder.subfolders && addToParent(folder.subfolders)) {
          return true;
        }
      }
      return false;
    };

    addToParent(this._folders);
    this._saveFolders();
    this._sendFoldersToWebview();
  }

  public deleteFolder(folderId: string) {
    // Delete from top-level folders
    const topLevelIndex = this._folders.findIndex((f) => f.id === folderId);
    if (topLevelIndex >= 0) {
      this._folders.splice(topLevelIndex, 1);
    } else {
      // Delete from subfolders recursively
      const deleteFromSubfolders = (folders: Folder[]): boolean => {
        for (const folder of folders) {
          if (folder.subfolders) {
            const index = folder.subfolders.findIndex((f) => f.id === folderId);
            if (index >= 0) {
              folder.subfolders.splice(index, 1);
              return true;
            }
            if (deleteFromSubfolders(folder.subfolders)) {
              return true;
            }
          }
        }
        return false;
      };
      deleteFromSubfolders(this._folders);
    }
    this._saveFolders();
    this._sendFoldersToWebview();
  }

  // Helper to find a folder by ID recursively
  private _findFolder(
    folderId: string,
    folders: Folder[] = this._folders,
  ): Folder | undefined {
    for (const folder of folders) {
      if (folder.id === folderId) {
        return folder;
      }
      if (folder.subfolders) {
        const found = this._findFolder(folderId, folder.subfolders);
        if (found) return found;
      }
    }
    return undefined;
  }

  // Get inherited configuration by walking up the parent chain
  // Child config takes priority over parent config
  public getInheritedConfig(folderId: string): FolderConfig {
    const folder = this._findFolder(folderId);
    if (!folder) {
      return {};
    }

    // Get current folder's config
    const currentConfig =
      this._context.globalState.get<FolderConfig>(
        `restlab.folder.${folderId}`,
      ) || {};

    // If no parent, return current config
    if (!folder.parentId) {
      return currentConfig;
    }

    // Get parent's inherited config (recursive)
    const parentConfig = this.getInheritedConfig(folder.parentId);

    // Merge configs - child takes priority
    const mergedHeaders = [...(parentConfig.headers || [])];

    // Add child headers, replacing any with same key from parent
    if (currentConfig.headers) {
      for (const childHeader of currentConfig.headers) {
        const existingIndex = mergedHeaders.findIndex(
          (h) => h.key.toLowerCase() === childHeader.key.toLowerCase(),
        );
        if (existingIndex >= 0) {
          mergedHeaders[existingIndex] = childHeader;
        } else {
          mergedHeaders.push(childHeader);
        }
      }
    }

    return {
      baseUrl: currentConfig.baseUrl || parentConfig.baseUrl,
      headers: mergedHeaders.length > 0 ? mergedHeaders : undefined,
    };
  }

  // Get the parent folder chain for displaying inherited info
  public getParentChain(folderId: string): Folder[] {
    const chain: Folder[] = [];
    let folder = this._findFolder(folderId);

    while (folder && folder.parentId) {
      const parent = this._findFolder(folder.parentId);
      if (parent) {
        chain.unshift(parent);
        folder = parent;
      } else {
        break;
      }
    }

    return chain;
  }

  public addRequest(folderId: string, name: string) {
    const folder = this._findFolder(folderId);
    if (folder) {
      if (!folder.requests) {
        folder.requests = [];
      }
      const newRequest: Request = {
        id: `request-${Date.now()}`,
        name,
        folderId,
        method: "GET",
      };
      folder.requests.push(newRequest);
      this._saveFolders();
      this._sendFoldersToWebview();
      // Automatically open the new request
      vscode.commands.executeCommand(
        "restlab.openRequest",
        newRequest.id,
        newRequest.name,
        folderId,
      );
    }
  }

  public deleteRequest(folderId: string, requestId: string) {
    const folder = this._findFolder(folderId);
    if (folder && folder.requests) {
      folder.requests = folder.requests.filter((r) => r.id !== requestId);
      this._saveFolders();
      this._sendFoldersToWebview();
    }
  }

  public async renameFolder(folderId: string) {
    const folder = this._findFolder(folderId);
    if (!folder) {
      vscode.window.showErrorMessage("Folder not found");
      return;
    }

    const newName = await vscode.window.showInputBox({
      prompt: "Enter new folder name",
      placeHolder: folder.name,
      value: folder.name,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return "Folder name cannot be empty";
        }
        return null;
      },
    });

    if (newName && newName !== folder.name) {
      folder.name = newName;
      this._saveFolders();
      this._sendFoldersToWebview();
      // Update the panel title if the folder editor is open
      FolderEditorProvider.updatePanelTitle(folderId, newName);
      vscode.window.showInformationMessage(`Renamed folder to "${newName}"`);
    }
  }

  public async renameRequest(requestId: string, folderId: string) {
    const folder = this._findFolder(folderId);
    if (!folder || !folder.requests) {
      vscode.window.showErrorMessage("Request not found");
      return;
    }

    const request = folder.requests.find((r) => r.id === requestId);
    if (!request) {
      vscode.window.showErrorMessage("Request not found");
      return;
    }

    const newName = await vscode.window.showInputBox({
      prompt: "Enter new request name",
      placeHolder: request.name,
      value: request.name,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return "Request name cannot be empty";
        }
        return null;
      },
    });

    if (newName && newName !== request.name) {
      request.name = newName;

      // Also update the stored request config
      const requestConfig = this._context.globalState.get<any>(
        `restlab.request.${requestId}`,
      );
      if (requestConfig) {
        requestConfig.name = newName;
        await this._context.globalState.update(
          `restlab.request.${requestId}`,
          requestConfig,
        );
      }

      this._saveFolders();
      this._sendFoldersToWebview();
      // Update the panel title if the request editor is open
      RequestEditorProvider.updatePanelTitle(requestId, newName);
      vscode.window.showInformationMessage(`Renamed request to "${newName}"`);
    }
  }

  public async duplicateRequest(requestId: string, folderId: string) {
    const folder = this._findFolder(folderId);
    if (!folder || !folder.requests) {
      vscode.window.showErrorMessage("Request not found");
      return;
    }

    const originalRequest = folder.requests.find((r) => r.id === requestId);
    if (!originalRequest) {
      vscode.window.showErrorMessage("Request not found");
      return;
    }

    // Create new request with copied data
    const newRequestId = `request-${Date.now()}`;
    const newRequest: Request = {
      id: newRequestId,
      name: `${originalRequest.name} (Copy)`,
      folderId: folderId,
      method: originalRequest.method,
    };

    // Copy the request config (URL, headers, body, etc.)
    const originalConfig = this._context.globalState.get<any>(
      `restlab.request.${requestId}`,
    );
    if (originalConfig) {
      await this._context.globalState.update(
        `restlab.request.${newRequestId}`,
        {
          ...originalConfig,
          id: newRequestId,
          name: newRequest.name,
          folderId: folderId,
        },
      );
    }

    folder.requests.push(newRequest);
    this._saveFolders();
    this._sendFoldersToWebview();

    vscode.window.showInformationMessage(
      `Duplicated "${originalRequest.name}"`,
    );

    // Optionally open the duplicated request
    vscode.commands.executeCommand(
      "restlab.openRequest",
      newRequestId,
      newRequest.name,
      folderId,
    );
  }

  public async duplicateFolder(folderId: string) {
    const originalFolder = this._findFolder(folderId);
    if (!originalFolder) {
      vscode.window.showErrorMessage("Folder not found");
      return;
    }

    // Deep clone the folder with new IDs
    const duplicatedFolder = await this._deepCloneFolder(
      originalFolder,
      originalFolder.parentId,
    );
    duplicatedFolder.name = `${originalFolder.name} (Copy)`;

    // Add to appropriate location
    if (originalFolder.parentId) {
      const parentFolder = this._findFolder(originalFolder.parentId);
      if (parentFolder) {
        if (!parentFolder.subfolders) {
          parentFolder.subfolders = [];
        }
        parentFolder.subfolders.push(duplicatedFolder);
      }
    } else {
      this._folders.push(duplicatedFolder);
    }

    this._saveFolders();
    this._sendFoldersToWebview();

    vscode.window.showInformationMessage(`Duplicated "${originalFolder.name}"`);
  }

  private async _deepCloneFolder(
    folder: Folder,
    parentId?: string,
  ): Promise<Folder> {
    const newFolderId = `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Clone folder config
    const originalFolderConfig = this._context.globalState.get<FolderConfig>(
      `restlab.folder.${folder.id}`,
    );
    if (originalFolderConfig) {
      await this._context.globalState.update(`restlab.folder.${newFolderId}`, {
        ...originalFolderConfig,
      });
    }

    // Clone requests
    const clonedRequests: Request[] = [];
    if (folder.requests) {
      for (const request of folder.requests) {
        const newRequestId = `request-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Clone request config
        const originalRequestConfig = this._context.globalState.get<any>(
          `restlab.request.${request.id}`,
        );
        if (originalRequestConfig) {
          await this._context.globalState.update(
            `restlab.request.${newRequestId}`,
            {
              ...originalRequestConfig,
              id: newRequestId,
              folderId: newFolderId,
            },
          );
        }

        clonedRequests.push({
          id: newRequestId,
          name: request.name,
          folderId: newFolderId,
          method: request.method,
        });
      }
    }

    // Clone subfolders recursively
    const clonedSubfolders: Folder[] = [];
    if (folder.subfolders) {
      for (const subfolder of folder.subfolders) {
        const clonedSubfolder = await this._deepCloneFolder(
          subfolder,
          newFolderId,
        );
        clonedSubfolders.push(clonedSubfolder);
      }
    }

    return {
      id: newFolderId,
      name: folder.name,
      createdAt: Date.now(),
      parentId: parentId,
      requests: clonedRequests,
      subfolders: clonedSubfolders,
    };
  }

  public moveRequest(
    requestId: string,
    sourceFolderId: string,
    targetFolderId: string,
  ) {
    const sourceFolder = this._findFolder(sourceFolderId);
    const targetFolder = this._findFolder(targetFolderId);

    if (!sourceFolder || !targetFolder) {
      vscode.window.showErrorMessage("Could not find source or target folder");
      return;
    }

    // Find the request in the source folder
    const requestIndex = sourceFolder.requests?.findIndex(
      (r) => r.id === requestId,
    );
    if (requestIndex === undefined || requestIndex < 0) {
      vscode.window.showErrorMessage("Request not found");
      return;
    }

    // Remove request from source folder
    const [request] = sourceFolder.requests!.splice(requestIndex, 1);

    // Update request's folderId
    request.folderId = targetFolderId;

    // Add request to target folder
    if (!targetFolder.requests) {
      targetFolder.requests = [];
    }
    targetFolder.requests.push(request);

    // Also update the stored request config with new folderId
    const requestConfig = this._context.globalState.get<any>(
      `restlab.request.${requestId}`,
    );
    if (requestConfig) {
      requestConfig.folderId = targetFolderId;
      this._context.globalState.update(
        `restlab.request.${requestId}`,
        requestConfig,
      );
    }

    this._saveFolders();
    this._sendFoldersToWebview();
    vscode.window.showInformationMessage(
      `Moved "${request.name}" to "${targetFolder.name}"`,
    );
  }

  public moveFolder(folderId: string, targetFolderId: string | null) {
    const folderToMove = this._findFolder(folderId);
    if (!folderToMove) {
      vscode.window.showErrorMessage("Folder not found");
      return;
    }

    // Prevent moving a folder into itself or its descendants
    if (targetFolderId && this._isDescendant(folderId, targetFolderId)) {
      vscode.window.showErrorMessage(
        "Cannot move a folder into itself or its subfolder",
      );
      return;
    }

    // Remove folder from its current location
    this._removeFolder(folderId);

    if (targetFolderId === null) {
      // Move to root level
      folderToMove.parentId = undefined;
      this._folders.push(folderToMove);
    } else {
      // Move into target folder
      const targetFolder = this._findFolder(targetFolderId);
      if (!targetFolder) {
        vscode.window.showErrorMessage("Target folder not found");
        return;
      }

      folderToMove.parentId = targetFolderId;
      if (!targetFolder.subfolders) {
        targetFolder.subfolders = [];
      }
      targetFolder.subfolders.push(folderToMove);
    }

    // Update parentId for all requests in the moved folder (recursive)
    this._updateRequestFolderIds(folderToMove);

    this._saveFolders();
    this._sendFoldersToWebview();
    vscode.window.showInformationMessage(
      `Moved "${folderToMove.name}" ${targetFolderId === null ? "to root level" : "successfully"}`,
    );
  }

  // Check if targetId is a descendant of parentId
  private _isDescendant(parentId: string, targetId: string): boolean {
    const parent = this._findFolder(parentId);
    if (!parent) return false;

    if (parent.id === targetId) return true;

    if (parent.subfolders) {
      for (const subfolder of parent.subfolders) {
        if (
          subfolder.id === targetId ||
          this._isDescendant(subfolder.id, targetId)
        ) {
          return true;
        }
      }
    }

    return false;
  }

  // Remove folder from its current location (doesn't delete, just removes from tree)
  private _removeFolder(folderId: string): Folder | undefined {
    // Check top-level folders
    const topIndex = this._folders.findIndex((f) => f.id === folderId);
    if (topIndex >= 0) {
      return this._folders.splice(topIndex, 1)[0];
    }

    // Check subfolders recursively
    const removeFromSubfolders = (folders: Folder[]): Folder | undefined => {
      for (const folder of folders) {
        if (folder.subfolders) {
          const index = folder.subfolders.findIndex((f) => f.id === folderId);
          if (index >= 0) {
            return folder.subfolders.splice(index, 1)[0];
          }
          const found = removeFromSubfolders(folder.subfolders);
          if (found) return found;
        }
      }
      return undefined;
    };

    return removeFromSubfolders(this._folders);
  }

  // Update folderId for all requests in a folder tree
  private _updateRequestFolderIds(folder: Folder) {
    if (folder.requests) {
      for (const request of folder.requests) {
        request.folderId = folder.id;
        // Also update stored request config
        const requestConfig = this._context.globalState.get<any>(
          `restlab.request.${request.id}`,
        );
        if (requestConfig) {
          requestConfig.folderId = folder.id;
          this._context.globalState.update(
            `restlab.request.${request.id}`,
            requestConfig,
          );
        }
      }
    }

    if (folder.subfolders) {
      for (const subfolder of folder.subfolders) {
        this._updateRequestFolderIds(subfolder);
      }
    }
  }

  public updateRequestMethod(
    folderId: string,
    requestId: string,
    method: string,
  ) {
    const folder = this._findFolder(folderId);
    if (folder && folder.requests) {
      const request = folder.requests.find((r) => r.id === requestId);
      if (request) {
        request.method = method;
        this._saveFolders();
        this._sendFoldersToWebview();
      }
    }
  }

  public updateRequestName(folderId: string, requestId: string, name: string) {
    const folder = this._findFolder(folderId);
    if (folder && folder.requests) {
      const request = folder.requests.find((r) => r.id === requestId);
      if (request) {
        request.name = name;
        this._saveFolders();
        this._sendFoldersToWebview();
      }
    }
  }

  private async _handleImportCollection(provider?: string) {
    const providerName =
      provider === "restlab"
        ? "REST Lab"
        : provider === "postman"
          ? "Postman"
          : provider === "thunder-client"
            ? "Thunder Client"
            : "Collection";

    const fileUri = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: {
        "JSON files": ["json"],
      },
      title: `Import ${providerName} Collection`,
    });

    if (!fileUri || fileUri.length === 0) {
      return;
    }

    try {
      const fileContent = await vscode.workspace.fs.readFile(fileUri[0]);
      const content = Buffer.from(fileContent).toString("utf-8");
      const fileName = fileUri[0].fsPath.split("/").pop() || "import.json";

      const importResult = parseImportedFile(content, fileName, provider);
      await this._applyImportResult(importResult);

      vscode.window.showInformationMessage(
        `Successfully imported ${importResult.folders.length} collection(s) from ${providerName}`,
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to import collection: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  private async _applyImportResult(importResult: ImportResult) {
    // Add imported folders to the folders list
    for (const folder of importResult.folders) {
      this._folders.push(folder);
    }

    // Save folder configs
    for (const [folderId, config] of importResult.folderConfigs) {
      await this._context.globalState.update(
        `restlab.folder.${folderId}`,
        config,
      );
    }

    // Save request configs
    for (const [requestId, request] of importResult.requests) {
      await this._context.globalState.update(`restlab.request.${requestId}`, {
        method: request.method || "GET",
        url: request.url,
        headers: request.headers || [],
        body: request.body || "",
        contentType: request.contentType || "json",
      });
    }

    this._saveFolders();
    this._sendFoldersToWebview();
  }

  public async importCollection(provider?: string) {
    await this._handleImportCollection(provider);
  }

  private async _handleExportCollection(folderId: string, format: string) {
    const folder = this._findFolder(folderId);
    if (!folder) {
      vscode.window.showErrorMessage("Collection not found");
      return;
    }

    try {
      let exportData: unknown;
      let defaultFileName: string;

      if (format === "restlab") {
        exportData = await exportToRESTLab(folder, this._context);
        defaultFileName = `${folder.name}.restlab.json`;
      } else if (format === "postman") {
        exportData = await exportToPostman(folder, this._context);
        defaultFileName = `${folder.name}.postman_collection.json`;
      } else if (format === "thunder-client") {
        exportData = await exportToThunderClient(folder, this._context);
        defaultFileName = `${folder.name}.thunder_collection.json`;
      } else {
        // Default to RESTLab format
        exportData = await exportToRESTLab(folder, this._context);
        defaultFileName = `${folder.name}.restlab.json`;
      }

      const jsonContent = JSON.stringify(exportData, null, 2);

      // Show save dialog
      const saveUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(defaultFileName),
        filters: {
          "JSON files": ["json"],
        },
        title: "Export Collection",
      });

      if (saveUri) {
        await vscode.workspace.fs.writeFile(
          saveUri,
          Buffer.from(jsonContent, "utf-8"),
        );
        vscode.window.showInformationMessage(
          `Collection exported successfully to ${saveUri.fsPath}`,
        );
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to export collection: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  private _saveFolders() {
    this._context.globalState.update("restlab.folders", this._folders);
  }

  private _sendFoldersToWebview() {
    if (this._view) {
      this._view.webview.postMessage({
        type: "foldersUpdated",
        folders: this._folders,
      });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "dist", "sidebar", "index.js"),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "dist", "sidebar", "index.css"),
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
                <link href="${styleUri}" rel="stylesheet">
                <title>REST Lab</title>
            </head>
            <body>
                <div id="root"></div>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
  }
}
