import axios, { AxiosRequestConfig } from "axios";
import FormData from "form-data";
import * as vscode from "vscode";
import { getNonce } from "../utils/getNonce";
import {
  FormDataItem,
  RequestConfig,
  ResponseCookie,
  ResponseData,
} from "../webview/types/internal.types";
import { HistoryEditorProvider } from "./HistoryEditorProvider";
import { HistoryManager } from "./HistoryManager";
import { SidebarProvider } from "./SidebarProvider";
import {
  handleDownloadResponse,
  handleOpenResponseInEditor,
} from "../utils/responseFileActions";

function parseSetCookie(raw: string): ResponseCookie {
  const parts = raw.split(';').map((p) => p.trim());
  const nameValuePart = parts[0] ?? '';
  const eqIdx = nameValuePart.indexOf('=');
  const name = eqIdx >= 0 ? nameValuePart.slice(0, eqIdx) : nameValuePart;
  const value = eqIdx >= 0 ? nameValuePart.slice(eqIdx + 1) : '';

  const cookie: ResponseCookie = { name, value, httpOnly: false, secure: false };

  for (const attr of parts.slice(1)) {
    const lower = attr.toLowerCase();
    if (lower === 'httponly') { cookie.httpOnly = true; continue; }
    if (lower === 'secure') { cookie.secure = true; continue; }
    const eqI = attr.indexOf('=');
    if (eqI < 0) continue;
    const attrName = attr.slice(0, eqI).trim().toLowerCase();
    const attrVal = attr.slice(eqI + 1).trim();
    if (attrName === 'domain') { cookie.domain = attrVal; }
    else if (attrName === 'path') { cookie.path = attrVal; }
    else if (attrName === 'expires') { cookie.expires = attrVal; }
    else if (attrName === 'samesite') { cookie.sameSite = attrVal; }
  }

  return cookie;
}

export class RequestEditorProvider {
  // Track open panels by request ID
  private static openPanels: Map<string, vscode.WebviewPanel> = new Map();

  constructor(private readonly context: vscode.ExtensionContext) {}

  // Update panel title for an open request editor
  public static updatePanelTitle(requestId: string, newTitle: string): void {
    const panel = RequestEditorProvider.openPanels.get(requestId);
    if (panel) {
      panel.title = newTitle;
      // Sync the webview's in-memory config so a subsequent save (e.g. from
      // Send Request) doesn't post back the stale name and undo the rename.
      panel.webview.postMessage({ type: "requestRenamed", name: newTitle });
    }
  }

  // Close the panel for the given request ID if it is open
  public static closePanel(requestId: string): void {
    const panel = RequestEditorProvider.openPanels.get(requestId);
    if (panel) {
      panel.dispose();
    }
  }

  /** Send a message to every open request-editor panel */
  public static broadcastToAllPanels(message: unknown): void {
    RequestEditorProvider.openPanels.forEach((panel) => {
      panel.webview.postMessage(message);
    });
  }

  /** Push a fresh configLoaded payload to a single open panel, if it exists. Used after a global-history restore, which has no open editor form of its own to update. */
  /** Push a fresh historyUpdated payload to a single open panel, if it exists. Used after a global-history delete/clear affecting that request. */
  public static refreshPanelHistory(requestId: string, historyManager: HistoryManager): void {
    const panel = RequestEditorProvider.openPanels.get(requestId);
    if (!panel) return;
    panel.webview.postMessage({
      type: "historyUpdated",
      entries: historyManager.getForRequest(requestId),
    });
  }

  public static refreshPanelConfig(
    context: vscode.ExtensionContext,
    requestId: string,
    folderId: string,
    sidebarProvider: SidebarProvider,
    historyManager: HistoryManager,
  ): void {
    const panel = RequestEditorProvider.openPanels.get(requestId);
    if (!panel) return;

    const savedRequest = context.globalState.get<RequestConfig>(
      `restlab.request.${requestId}`,
    );
    if (!savedRequest) return;

    const folderConfig = sidebarProvider.getInheritedConfig(folderId);
    const envVariables = sidebarProvider.getActiveEnvVariables(folderId);
    const collectionId = sidebarProvider.getRootCollectionId(folderId);
    const collectionData = sidebarProvider.getCollectionData(folderId);

    panel.webview.postMessage({
      type: "configLoaded",
      config: {
        id: requestId,
        name: savedRequest.name,
        folderId,
        method: savedRequest.method || "GET",
        url: savedRequest.url || "",
        headers: savedRequest.headers || [],
        params: savedRequest.params || [],
        body: savedRequest.body || "",
        contentType: savedRequest.contentType || "",
        formData: savedRequest.formData || [],
        auth: savedRequest.auth,
        cookies: savedRequest.cookies || [],
      },
      folderConfig,
      envVariables,
      collectionId,
      environments: collectionData.environments,
      activeEnvironmentId: collectionData.activeEnvironmentId,
      history: historyManager.getForRequest(requestId),
    });
  }

  public static openRequestEditor(
    context: vscode.ExtensionContext,
    requestId: string,
    requestName: string,
    folderId: string,
    historyManager: HistoryManager,
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
      requestName,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [context.extensionUri],
        enableCommandUris: true,
        enableFindWidget: true,
      },
    );

    panel.iconPath = {
      light: vscode.Uri.joinPath(
        context.extensionUri,
        "resources",
        "request-icon.svg",
      ),
      dark: vscode.Uri.joinPath(
        context.extensionUri,
        "resources",
        "request-icon-dark.svg",
      ),
    };

    // Store the panel reference
    RequestEditorProvider.openPanels.set(requestId, panel);

    // Notify sidebar of the initially active panel
    sidebarProvider?.notifyActiveRequest(requestId);

    // Remove from map when panel is closed
    panel.onDidDispose(() => {
      RequestEditorProvider.openPanels.delete(requestId);
      sidebarProvider?.notifyActiveRequest(null);
    });

    // Refresh folder config when panel becomes visible
    panel.onDidChangeViewState((e) => {
      if (e.webviewPanel.active) {
        sidebarProvider?.notifyActiveRequest(requestId);
      }
      if (e.webviewPanel.visible) {
        // Send updated folder config to webview
        const folderConfig = sidebarProvider
          ? sidebarProvider.getInheritedConfig(folderId)
          : context.globalState.get<{
              baseUrl?: string;
              headers?: { key: string; value: string }[];
            }>(`restlab.folder.${folderId}`) || {};

        const envVariables = sidebarProvider
          ? sidebarProvider.getActiveEnvVariables(folderId)
          : {};

        const collectionData = sidebarProvider
          ? sidebarProvider.getCollectionData(folderId)
          : { environments: [], activeEnvironmentId: null };

        panel.webview.postMessage({
          type: "folderConfigUpdated",
          folderConfig: folderConfig,
          envVariables: envVariables,
          environments: collectionData.environments,
          activeEnvironmentId: collectionData.activeEnvironmentId,
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

          // Get active environment variables
          const envVariables = sidebarProvider
            ? sidebarProvider.getActiveEnvVariables(folderId)
            : {};

          const collectionId = sidebarProvider
            ? sidebarProvider.getRootCollectionId(folderId)
            : folderId;

          const collectionData = sidebarProvider
            ? sidebarProvider.getCollectionData(folderId)
            : { environments: [], activeEnvironmentId: null };

          panel.webview.postMessage({
            type: "configLoaded",
            config: {
              id: requestId,
              name: requestName,
              folderId,
              method: savedRequest?.method || "GET",
              url: savedRequest?.url || "",
              headers: savedRequest?.headers || [],
              params: savedRequest?.params || [],
              body: savedRequest?.body || "",
              contentType: savedRequest?.contentType || "",
              formData: savedRequest?.formData || [],
              auth: savedRequest?.auth,
              cookies: savedRequest?.cookies || [],
            },
            folderConfig: folderConfig,
            envVariables: envVariables,
            collectionId: collectionId,
            environments: collectionData.environments,
            activeEnvironmentId: collectionData.activeEnvironmentId,
            history: historyManager.getForRequest(requestId),
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
            panel.title = message.config.name;
          }
          break;
        case "setActiveEnvironment":
          if (sidebarProvider) {
            await sidebarProvider.setCollectionActiveEnvironment(
              folderId,
              message.envId ?? null,
            );
            const newEnvVars = sidebarProvider.getActiveEnvVariables(folderId);
            const newCollData = sidebarProvider.getCollectionData(folderId);
            const rootId = sidebarProvider.getRootCollectionId(folderId);
            RequestEditorProvider.broadcastToAllPanels({
              type: "environmentUpdated",
              collectionId: rootId,
              envVariables: newEnvVars,
              environments: newCollData.environments,
              activeEnvironmentId: newCollData.activeEnvironmentId,
            });
          }
          break;
        case "sendRequest": {
          const recordHistory = async (response: ResponseData) => {
            const snapshot = message.historySnapshot || {};
            const strippedFormData: FormDataItem[] = (snapshot.formData || []).map(
              (field: FormDataItem) =>
                field.type === "file"
                  ? { key: field.key, type: field.type, value: "", fileName: field.fileName }
                  : field,
            );
            await historyManager.addEntry({
              requestId,
              requestName,
              folderId,
              request: {
                method: snapshot.method || message.method,
                url: snapshot.url || "",
                resolvedUrl: message.url,
                headers: snapshot.headers || [],
                params: snapshot.params || [],
                body: snapshot.body,
                contentType: snapshot.contentType,
                formData: strippedFormData,
                cookies: snapshot.cookies,
              },
              response,
            });
            panel.webview.postMessage({
              type: "historyUpdated",
              entries: historyManager.getForRequest(requestId),
            });
            HistoryEditorProvider.refreshIfOpen(sidebarProvider);
          };

          try {
            const response = await provider._sendHttpRequest(
              message.method,
              message.url,
              message.headers,
              message.body,
              message.formData,
              message.cookies,
            );
            panel.webview.postMessage({
              type: "responseReceived",
              response,
            });
            await recordHistory(response);
          } catch (error: any) {
            const errorResponse: ResponseData = {
              status: 0,
              statusText: "Error",
              headers: {},
              data: error.message || "Request failed",
              time: 0,
              size: 0,
            };
            panel.webview.postMessage({
              type: "responseReceived",
              response: errorResponse,
            });
            await recordHistory(errorResponse);
          }
          break;
        }
        case "getRequestHistory":
          panel.webview.postMessage({
            type: "historyUpdated",
            entries: historyManager.getForRequest(requestId),
          });
          break;
        case "restoreHistoryEntry": {
          const entry = historyManager
            .getForRequest(requestId)
            .find((e) => e.id === message.entryId);
          if (entry) {
            panel.webview.postMessage({
              type: "historyRestored",
              request: entry.request,
            });
          }
          break;
        }
        case "deleteHistoryEntry":
          await historyManager.deleteEntry(message.entryId);
          panel.webview.postMessage({
            type: "historyUpdated",
            entries: historyManager.getForRequest(requestId),
          });
          HistoryEditorProvider.refreshIfOpen(sidebarProvider);
          break;
        case "clearRequestHistory":
          await historyManager.clearForRequest(requestId);
          panel.webview.postMessage({
            type: "historyUpdated",
            entries: historyManager.getForRequest(requestId),
          });
          HistoryEditorProvider.refreshIfOpen(sidebarProvider);
          break;
        case "showInfo":
          vscode.window.showInformationMessage(message.message);
          break;
        case "downloadResponse":
          await handleDownloadResponse(message);
          break;
        case "openResponseInEditor":
          await handleOpenResponseInEditor(message);
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
    cookies?: { name: string; value: string }[],
  ): Promise<{
    status: number;
    statusText: string;
    headers: Record<string, string>;
    data: string;
    time: number;
    size: number;
    cookies: ResponseCookie[];
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

      // Merge request cookies into Cookie header if no explicit Cookie header exists
      if (cookies && cookies.length > 0) {
        const hasCookieHeader = Object.keys(headerObj).some(
          (k) => k.toLowerCase() === 'cookie',
        );
        if (!hasCookieHeader) {
          headerObj['Cookie'] = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
        }
      }

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

      // Extract Set-Cookie before collapsing headers (axios returns it as string[])
      const rawSetCookies: string[] = Array.isArray(response.headers['set-cookie'])
        ? (response.headers['set-cookie'] as string[])
        : [];
      const parsedCookies: ResponseCookie[] = rawSetCookies.map(parseSetCookie);

      // Convert headers to Record<string, string>
      const responseHeaders: Record<string, string> = {};
      Object.entries(response.headers).forEach(([key, value]) => {
        responseHeaders[key] = Array.isArray(value)
          ? value.join(', ')
          : String(value || '');
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
        cookies: parsedCookies,
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
