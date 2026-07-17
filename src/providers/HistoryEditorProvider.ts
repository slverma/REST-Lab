import * as vscode from "vscode";
import { getNonce } from "../utils/getNonce";
import { SidebarProvider } from "./SidebarProvider";

export class HistoryEditorProvider {
  private static panel: vscode.WebviewPanel | undefined;

  /** Push a fresh historyUpdated payload to the History panel, if it's open. */
  public static refreshIfOpen(sidebarProvider?: SidebarProvider): void {
    if (!HistoryEditorProvider.panel || !sidebarProvider) return;
    HistoryEditorProvider.panel.webview.postMessage(
      HistoryEditorProvider._buildHistoryPayload(sidebarProvider),
    );
  }

  private static _buildHistoryPayload(sidebarProvider: SidebarProvider) {
    return {
      type: "historyUpdated",
      entries: sidebarProvider.getHistoryEntries(),
      enabled: sidebarProvider.isHistoryEnabled(),
    };
  }

  public static openHistoryPanel(
    context: vscode.ExtensionContext,
    sidebarProvider: SidebarProvider,
  ): void {
    if (HistoryEditorProvider.panel) {
      HistoryEditorProvider.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "restlab.historyEditor",
      "History",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [context.extensionUri],
      },
    );

    HistoryEditorProvider.panel = panel;

    panel.onDidDispose(() => {
      HistoryEditorProvider.panel = undefined;
    });

    panel.webview.html = HistoryEditorProvider._getHtmlForWebview(
      panel.webview,
      context,
    );

    panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case "getHistory":
          panel.webview.postMessage(
            HistoryEditorProvider._buildHistoryPayload(sidebarProvider),
          );
          break;
        case "deleteHistoryEntry":
          await sidebarProvider.deleteHistoryEntryById(message.entryId);
          panel.webview.postMessage(
            HistoryEditorProvider._buildHistoryPayload(sidebarProvider),
          );
          break;
        case "clearAllHistory": {
          const cleared = await sidebarProvider.clearAllHistoryEntries();
          if (cleared) {
            panel.webview.postMessage(
              HistoryEditorProvider._buildHistoryPayload(sidebarProvider),
            );
          }
          break;
        }
        case "restoreHistoryEntry":
          await sidebarProvider.restoreHistoryEntryById(message.entryId);
          panel.webview.postMessage(
            HistoryEditorProvider._buildHistoryPayload(sidebarProvider),
          );
          break;
        case "setHistoryEnabled":
          await sidebarProvider.setHistoryEnabled(message.enabled);
          panel.webview.postMessage(
            HistoryEditorProvider._buildHistoryPayload(sidebarProvider),
          );
          break;
      }
    });
  }

  private static _getHtmlForWebview(
    webview: vscode.Webview,
    context: vscode.ExtensionContext,
  ): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, "dist", "history", "index.js"),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, "dist", "history", "index.css"),
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
        <link href="${styleUri}" rel="stylesheet">
        <title>History</title>
      </head>
      <body>
        <div id="root"></div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
  }
}
