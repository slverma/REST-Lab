import * as vscode from "vscode";
import { SidebarProvider } from "./providers/SidebarProvider";
import { FolderEditorProvider } from "./providers/FolderEditorProvider";
import { RequestEditorProvider } from "./providers/RequestEditorProvider";

export function activate(context: vscode.ExtensionContext) {
  console.log("REST Lab extension is now active!");

  // Initialize the sidebar provider
  const sidebarProvider = new SidebarProvider(context.extensionUri, context);

  // Register the sidebar webview provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "restlab-sidebar-view",
      sidebarProvider,
    ),
  );

  // Register the folder editor provider
  const folderEditorProvider = new FolderEditorProvider(context);
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      "restlab.folderEditor",
      folderEditorProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      },
    ),
  );

  // Register the request editor provider
  const requestEditorProvider = new RequestEditorProvider(context);

  // Register command to create folder
  context.subscriptions.push(
    vscode.commands.registerCommand("restlab.createFolder", async () => {
      const folderName = await vscode.window.showInputBox({
        prompt: "Enter folder name",
        placeHolder: "New Folder",
      });

      if (folderName) {
        sidebarProvider.addFolder(folderName);
      }
    }),
  );

  // Register command to open folder configuration
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "restlab.openFolderConfig",
      (folderId: string, folderName: string) => {
        FolderEditorProvider.openFolderEditor(
          context,
          folderId,
          folderName,
          sidebarProvider,
        );
      },
    ),
  );

  // Register command to open request editor
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "restlab.openRequest",
      (requestId: string, requestName: string, folderId: string) => {
        RequestEditorProvider.openRequestEditor(
          context,
          requestId,
          requestName,
          folderId,
          sidebarProvider,
        );
      },
    ),
  );

  // Register command to import collection
  context.subscriptions.push(
    vscode.commands.registerCommand("restlab.importCollection", async () => {
      await sidebarProvider.importCollection();
    }),
  );
}

export function deactivate() {}
