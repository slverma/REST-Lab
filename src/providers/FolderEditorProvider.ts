import * as vscode from "vscode";
import { getNonce } from "../utils/getNonce";
import {
  SidebarProvider,
  FolderConfig as SidebarFolderConfig,
} from "./SidebarProvider";

interface FolderConfig {
  id: string;
  name: string;
  description?: string;
  baseUrl?: string;
  headers?: { key: string; value: string }[];
}

export class FolderEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = "restlab.folderEditor";

  // Track open panels by folder ID
  private static openPanels: Map<string, vscode.WebviewPanel> = new Map();

  constructor(private readonly context: vscode.ExtensionContext) {}

  // Update panel title for an open folder editor
  public static updatePanelTitle(folderId: string, newTitle: string): void {
    const panel = FolderEditorProvider.openPanels.get(folderId);
    if (panel) {
      panel.title = `📁 ${newTitle}`;
    }
  }

  public static openFolderEditor(
    context: vscode.ExtensionContext,
    folderId: string,
    folderName: string,
    sidebarProvider?: SidebarProvider,
  ) {
    // Check if panel already exists for this folder
    const existingPanel = FolderEditorProvider.openPanels.get(folderId);
    if (existingPanel) {
      // Reveal the existing panel instead of creating a new one
      existingPanel.reveal(vscode.ViewColumn.One);
      return;
    }

    // Create a virtual document for the folder configuration
    const panel = vscode.window.createWebviewPanel(
      "restlab.folderConfig",
      `📁 ${folderName}`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [context.extensionUri],
      },
    );

    // Store the panel reference
    FolderEditorProvider.openPanels.set(folderId, panel);

    // Remove from map when panel is closed
    panel.onDidDispose(() => {
      FolderEditorProvider.openPanels.delete(folderId);
    });

    const provider = new FolderEditorProvider(context);
    panel.webview.html = provider._getHtmlForWebview(
      panel.webview,
      folderId,
      folderName,
    );

    // Load saved config
    const savedConfig = context.globalState.get<FolderConfig>(
      `restlab.folder.${folderId}`,
    );

    // Handle messages from webview
    panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case "getConfig":
          // Get inherited config from parent folders (without current folder's config)
          let inheritedConfig: SidebarFolderConfig = {};
          if (sidebarProvider) {
            const parentChain = sidebarProvider.getParentChain(folderId);
            if (parentChain.length > 0) {
              // Get the last parent's inherited config
              const lastParent = parentChain[parentChain.length - 1];
              inheritedConfig = sidebarProvider.getInheritedConfig(
                lastParent.id,
              );
            }
          }

          panel.webview.postMessage({
            type: "configLoaded",
            config: savedConfig || { id: folderId, name: folderName },
            inheritedConfig: inheritedConfig,
          });
          break;
        case "saveConfig":
          await context.globalState.update(
            `restlab.folder.${folderId}`,
            message.config,
          );
          vscode.window.showInformationMessage(
            `Folder "${folderName}" configuration saved!`,
          );
          break;
      }
    });
  }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };

    webviewPanel.webview.html = this._getHtmlForWebview(
      webviewPanel.webview,
      "",
      "",
    );
  }

  private _getHtmlForWebview(
    webview: vscode.Webview,
    folderId: string,
    folderName: string,
  ): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        "dist",
        "editor",
        "index.js",
      ),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        "dist",
        "editor",
        "index.css",
      ),
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
                <link href="${styleUri}" rel="stylesheet">
                <title>${folderName}</title>
            </head>
            <body>
                <div id="root" data-folder-id="${folderId}" data-folder-name="${folderName}"></div>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
  }
}
