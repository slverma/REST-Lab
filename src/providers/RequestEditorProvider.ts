import * as vscode from "vscode";
import axios, { AxiosRequestConfig } from "axios";
import FormData from "form-data";
import { getNonce } from "../utils/getNonce";
import { SidebarProvider } from "./SidebarProvider";
import { RequestConfig } from "../webview/types/internal.types";

export class RequestEditorProvider {
  // Track open panels by request ID
  private static openPanels: Map<string, vscode.WebviewPanel> = new Map();

  constructor(private readonly context: vscode.ExtensionContext) {}

  // Update panel title for an open request editor
  public static updatePanelTitle(requestId: string, newTitle: string): void {
    const panel = RequestEditorProvider.openPanels.get(requestId);
    if (panel) {
      panel.title = `🔗 ${newTitle}`;
    }
  }

  public static openRequestEditor(
    context: vscode.ExtensionContext,
    requestId: string,
    requestName: string,
    folderId: string,
    sidebarProvider?: SidebarProvider,
  ) {
    // Check if panel already exists for this request
    const existingPanel = RequestEditorProvider.openPanels.get(requestId);
    if (existingPanel) {
      existingPanel.reveal(vscode.ViewColumn.One);
      return;
    }

    // Create a new panel
    const panel = vscode.window.createWebviewPanel(
      "restlab.requestEditor",
      `🔗 ${requestName}`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [context.extensionUri],
        enableCommandUris: true,
        enableFindWidget: true,
      },
    );

    // Store the panel reference
    RequestEditorProvider.openPanels.set(requestId, panel);

    // Remove from map when panel is closed
    panel.onDidDispose(() => {
      RequestEditorProvider.openPanels.delete(requestId);
    });

    // Refresh folder config when panel becomes visible
    panel.onDidChangeViewState((e) => {
      if (e.webviewPanel.visible) {
        // Send updated folder config to webview
        const folderConfig = sidebarProvider
          ? sidebarProvider.getInheritedConfig(folderId)
          : context.globalState.get<{
              baseUrl?: string;
              headers?: { key: string; value: string }[];
            }>(`restlab.folder.${folderId}`) || {};

        panel.webview.postMessage({
          type: "folderConfigUpdated",
          folderConfig: folderConfig,
        });
      }
    });

    const provider = new RequestEditorProvider(context);
    panel.webview.html = provider._getHtmlForWebview(
      panel.webview,
      requestId,
      requestName,
      folderId,
    );

    // Handle messages from webview
    panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case "getConfig":
          // Always read fresh config from globalState to get latest folder settings
          const savedRequest = context.globalState.get<RequestConfig>(
            `restlab.request.${requestId}`,
          );

          // Get inherited config from sidebar provider (walks up parent chain)
          const folderConfig = sidebarProvider
            ? sidebarProvider.getInheritedConfig(folderId)
            : context.globalState.get<{
                baseUrl?: string;
                headers?: { key: string; value: string }[];
              }>(`restlab.folder.${folderId}`) || {};

          panel.webview.postMessage({
            type: "configLoaded",
            config: {
              id: requestId,
              name: requestName,
              folderId,
              method: savedRequest?.method || "GET",
              url: savedRequest?.url || "",
              headers: savedRequest?.headers || [],
              body: savedRequest?.body || "",
              contentType: savedRequest?.contentType || "",
              formData: savedRequest?.formData || [],
            },
            folderConfig: folderConfig,
          });
          break;
        case "saveConfig":
          await context.globalState.update(
            `restlab.request.${requestId}`,
            message.config,
          );
          // Update method in sidebar if it changed
          if (sidebarProvider && message.config.method) {
            sidebarProvider.updateRequestMethod(
              folderId,
              requestId,
              message.config.method,
            );
          }
          // Update name in sidebar if it changed
          if (sidebarProvider && message.config.name) {
            sidebarProvider.updateRequestName(
              folderId,
              requestId,
              message.config.name,
            );
            // Update panel title
            panel.title = `🔗 ${message.config.name}`;
          }
          break;
        case "sendRequest":
          try {
            const response = await provider._sendHttpRequest(
              message.method,
              message.url,
              message.headers,
              message.body,
              message.formData,
            );
            panel.webview.postMessage({
              type: "responseReceived",
              response,
            });
          } catch (error: any) {
            panel.webview.postMessage({
              type: "responseReceived",
              response: {
                status: 0,
                statusText: "Error",
                headers: {},
                data: error.message || "Request failed",
                time: 0,
              },
            });
          }
          break;
        case "showInfo":
          vscode.window.showInformationMessage(message.message);
          break;
        case "downloadResponse":
          const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(message.filename),
            filters: {
              "All Files": ["*"],
              JSON: ["json"],
              XML: ["xml"],
              Text: ["txt"],
              HTML: ["html"],
            },
          });
          if (uri) {
            await vscode.workspace.fs.writeFile(
              uri,
              Buffer.from(message.content, "utf-8"),
            );
            vscode.window.showInformationMessage(
              `Response saved to ${uri.fsPath}`,
            );
          }
          break;
        case "openResponseInEditor":
          // Determine language ID based on extension or mime type
          let languageId = "plaintext";
          if (message.extension === "json") {
            languageId = "json";
          } else if (message.extension === "xml") {
            languageId = "xml";
          } else if (message.extension === "html") {
            languageId = "html";
          } else if (message.mimeType?.includes("json")) {
            languageId = "json";
          } else if (message.mimeType?.includes("xml")) {
            languageId = "xml";
          } else if (message.mimeType?.includes("html")) {
            languageId = "html";
          }

          // Open a new untitled document with the response content
          const doc = await vscode.workspace.openTextDocument({
            content: message.content,
            language: languageId,
          });
          await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
          break;
      }
    });
  }

  private async _sendHttpRequest(
    method: string,
    url: string,
    headers: { key: string; value: string }[],
    body?: string,
    formData?: {
      key: string;
      value: string;
      type: string;
      fileName?: string;
      fileData?: string;
    }[],
  ): Promise<{
    status: number;
    statusText: string;
    headers: Record<string, string>;
    data: string;
    time: number;
    size: number;
  }> {
    const startTime = Date.now();

    try {
      // Build headers object - exclude Content-Type if we're sending form data
      const headerObj: Record<string, string> = {};
      headers.forEach((h) => {
        if (h.key && h.value) {
          // Skip Content-Type header if form data will be sent (form-data sets its own)
          if (
            formData &&
            formData.length > 0 &&
            h.key.toLowerCase() === "content-type"
          ) {
            return;
          }
          headerObj[h.key] = h.value;
        }
      });

      let requestData: any = body;
      let formHeaders: Record<string, string> = {};

      // Handle multipart form data with files
      if (formData && formData.length > 0) {
        const form = new FormData();

        for (const field of formData) {
          if (!field.key.trim()) continue;

          if (field.type === "file" && field.fileData) {
            // File field - convert base64 to buffer
            const fileBuffer = Buffer.from(field.fileData, "base64");
            form.append(field.key, fileBuffer, {
              filename: field.fileName || "file",
              contentType: "application/octet-stream",
              knownLength: fileBuffer.length,
            });
          } else {
            // Text field
            form.append(field.key, field.value || "");
          }
        }

        requestData = form;
        // Get form headers including content-type with boundary
        formHeaders = form.getHeaders();
      }

      const config: AxiosRequestConfig = {
        method: method.toLowerCase() as any,
        url,
        headers: { ...headerObj, ...formHeaders },
        data: requestData,
        timeout: 30000,
        validateStatus: () => true, // Don't throw on any status code
        transformResponse: [(data) => data], // Keep raw response
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      };

      const response = await axios(config);
      const endTime = Date.now();

      // Convert headers to Record<string, string>
      const responseHeaders: Record<string, string> = {};
      Object.entries(response.headers).forEach(([key, value]) => {
        responseHeaders[key] = Array.isArray(value)
          ? value.join(", ")
          : String(value || "");
      });

      // Calculate response size
      const responseData =
        typeof response.data === "string"
          ? response.data
          : JSON.stringify(response.data);
      const size = Buffer.byteLength(responseData, "utf8");

      return {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        data: responseData,
        time: endTime - startTime,
        size,
      };
    } catch (error: any) {
      // Provide more descriptive error messages for common network errors
      let errorMessage = "Request failed";
      let errorCode = "";

      if (error.code) {
        errorCode = error.code;
        switch (error.code) {
          case "ENOTFOUND":
            errorMessage = `DNS lookup failed: Could not resolve host "${
              error.hostname || url
            }". Check if the domain name is correct.`;
            break;
          case "ECONNREFUSED":
            errorMessage = `Connection refused: The server at "${
              error.address || url
            }" is not accepting connections. Make sure the server is running.`;
            break;
          case "ECONNRESET":
            errorMessage =
              "Connection reset: The server closed the connection unexpectedly.";
            break;
          case "ETIMEDOUT":
            errorMessage =
              "Connection timed out: The server took too long to respond.";
            break;
          case "ECONNABORTED":
            errorMessage = "Request aborted: The connection was aborted.";
            break;
          case "ENETUNREACH":
            errorMessage =
              "Network unreachable: Check your internet connection.";
            break;
          case "EHOSTUNREACH":
            errorMessage = "Host unreachable: The server cannot be reached.";
            break;
          case "CERT_HAS_EXPIRED":
          case "UNABLE_TO_VERIFY_LEAF_SIGNATURE":
          case "SELF_SIGNED_CERT_IN_CHAIN":
            errorMessage = `SSL/TLS Certificate Error: ${error.message}`;
            break;
          case "ERR_INVALID_URL":
            errorMessage = "Invalid URL: Please check the URL format.";
            break;
          default:
            errorMessage = error.message || `Network error: ${error.code}`;
        }
      } else if (error.message) {
        if (error.message.includes("timeout")) {
          errorMessage =
            "Request timed out: The server took too long to respond.";
          errorCode = "TIMEOUT";
        } else {
          errorMessage = error.message;
        }
      }

      throw new Error(
        errorCode ? `[${errorCode}] ${errorMessage}` : errorMessage,
      );
    }
  }

  private _getHtmlForWebview(
    webview: vscode.Webview,
    requestId: string,
    requestName: string,
    folderId: string,
  ): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        "dist",
        "request",
        "index.js",
      ),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        "dist",
        "request",
        "index.css",
      ),
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource} 'unsafe-eval'; font-src ${webview.cspSource} data:; img-src ${webview.cspSource} data: blob:; worker-src blob:;">
        <link href="${styleUri}" rel="stylesheet">
        <title>${requestName}</title>
      </head>
      <body>
        <div id="root" data-request-id="${requestId}" data-request-name="${requestName}" data-folder-id="${folderId}"></div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
  }
}
