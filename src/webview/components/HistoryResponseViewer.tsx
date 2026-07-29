import React, { useState } from "react";
import {
  formatJson,
  formatSize,
  getEditorLanguageFromContentType,
  getFileExtension,
} from "../helpers/helper";
import BodyEditor from "../request/BodyEditor";
import { ResponseData } from "../types/internal.types";
import CopyIcon from "./icons/CopyIcon";
import DownloadIcon from "./icons/DownloadIcon";
import PencilIcon from "./icons/PencilIcon";
import Tooltip from "./Tooltip";

type ResponseTab = "body" | "headers" | "cookies";

interface HistoryResponseViewerProps {
  response: ResponseData;
  truncated?: boolean;
  vscode: { postMessage: (message: unknown) => void };
}

const HistoryResponseViewer: React.FC<HistoryResponseViewerProps> = ({
  response,
  truncated,
  vscode,
}) => {
  const [tab, setTab] = useState<ResponseTab>("body");

  const contentType = response.headers["content-type"];

  const getResponseContent = () =>
    tab === "body"
      ? formatJson(response.data)
      : Object.entries(response.headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n");

  const getResponseFileInfo = () => ({
    extension: tab === "body" ? getFileExtension(response.headers) : "txt",
    mimeType: tab === "body" ? contentType || "text/plain" : "text/plain",
  });

  return (
    <div className="history-response-viewer">
      <div className="history-response-meta">
        {response.statusText} · {formatSize(response.size)}
      </div>
      <div className="response-toolbar">
        <div className="tabs">
          <button
            className={`tab ${tab === "body" ? "active" : ""}`}
            onClick={() => setTab("body")}
          >
            Body
          </button>
          <button
            className={`tab ${tab === "headers" ? "active" : ""}`}
            onClick={() => setTab("headers")}
          >
            Headers
            <span className="badge">
              {Object.keys(response.headers).length}
            </span>
          </button>
          {(response.cookies?.length || 0) > 0 && (
            <button
              className={`tab ${tab === "cookies" ? "active" : ""}`}
              onClick={() => setTab("cookies")}
            >
              Cookies
              <span className="badge">{response.cookies!.length}</span>
            </button>
          )}
        </div>
        <div className="response-actions">
          <Tooltip text="Copy response to clipboard">
            <button
              className="action-btn"
              onClick={() => {
                navigator.clipboard.writeText(getResponseContent());
                vscode.postMessage({
                  type: "showInfo",
                  message: "Copied to clipboard!",
                });
              }}
            >
              <CopyIcon />
            </button>
          </Tooltip>
          <Tooltip text="Download response">
            <button
              className="action-btn"
              onClick={() => {
                const { extension, mimeType } = getResponseFileInfo();
                vscode.postMessage({
                  type: "downloadResponse",
                  content: getResponseContent(),
                  filename: `response-${Date.now()}.${extension}`,
                  mimeType,
                });
              }}
            >
              <DownloadIcon />
            </button>
          </Tooltip>
          <Tooltip
            text="Open response in VS Code editor"
            position="top-right"
          >
            <button
              className="action-btn"
              onClick={() => {
                const { extension, mimeType } = getResponseFileInfo();
                vscode.postMessage({
                  type: "openResponseInEditor",
                  content: getResponseContent(),
                  extension,
                  mimeType,
                });
              }}
            >
              <PencilIcon />
            </button>
          </Tooltip>
        </div>
      </div>

      {truncated && (
        <p className="empty-hint history-response-truncated-hint">
          Some content was truncated for storage — actions above use the
          stored (possibly partial) data.
        </p>
      )}

      <div className="response-content">
        {tab === "body" && (
          <BodyEditor
            value={formatJson(response.data)}
            language={getEditorLanguageFromContentType(contentType)}
            readOnly
            className="response-editor"
            showHint="Ctrl+F search"
          />
        )}
        {tab === "headers" && (
          <div className="response-headers">
            {Object.keys(response.headers).length === 0 ? (
              <p className="empty-hint">No headers available</p>
            ) : (
              Object.entries(response.headers).map(([key, value]) => (
                <div key={key} className="response-header-row">
                  <span className="header-name">{key}</span>
                  <span className="header-value">{value}</span>
                </div>
              ))
            )}
          </div>
        )}
        {tab === "cookies" && (
          <div className="response-headers">
            {(response.cookies || []).map((cookie, i) => (
              <div key={i} className="response-header-row">
                <span className="header-name">{cookie.name}</span>
                <span className="header-value">
                  {cookie.value}
                  {cookie.path && (
                    <span style={{ opacity: 0.5, marginLeft: "8px" }}>
                      Path: {cookie.path}
                    </span>
                  )}
                  {cookie.httpOnly && (
                    <span style={{ opacity: 0.5, marginLeft: "8px" }}>
                      HttpOnly
                    </span>
                  )}
                  {cookie.secure && (
                    <span style={{ opacity: 0.5, marginLeft: "8px" }}>
                      Secure
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryResponseViewer;
