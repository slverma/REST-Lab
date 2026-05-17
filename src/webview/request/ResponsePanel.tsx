import React from "react";
import CopyIcon from "../components/icons/CopyIcon";
import DownloadIcon from "../components/icons/DownloadIcon";
import CloseIcon from "../components/icons/CloseIcon";
import PencilIcon from "../components/icons/PencilIcon";
import SplitIcon from "../components/icons/SplitIcon";
import WarningIcon from "../components/icons/WarningIcon";
import Tooltip from "../components/Tooltip";
import {
  formatJson,
  formatSize,
  getFileExtension,
  getStatusColor,
} from "../helpers/helper";
import BodyEditor from "./BodyEditor";
import { useRequestContext } from "./RequestContext";

const ResponsePanel: React.FC = () => {
  const {
    response,
    isLoading,
    responseTab,
    splitLayout,
    requestSize,
    isResizing,
    isSmallScreen,
    isResponseHidden,
    responseEditorLanguage,
    responseBodyValue,
    setResponseTab,
    toggleLayout,
    toggleResponseHidden,
    handleResizeStart,
    vscode,
  } = useRequestContext();

  if ((!response && !isLoading) || isResponseHidden) return null;

  const sizeStyle: React.CSSProperties = {
    [splitLayout === "horizontal" ? "height" : "width"]: `${
      100 - requestSize
    }%`,
  };

  const getResponseContent = () =>
    responseTab === "body"
      ? formatJson(response!.data)
      : Object.entries(response!.headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n");

  const getResponseFileInfo = () => ({
    extension:
      responseTab === "body"
        ? getFileExtension(response!.headers)
        : "txt",
    mimeType:
      responseTab === "body"
        ? response!.headers["content-type"] || "text/plain"
        : "text/plain",
  });

  return (
    <>
      <div
        className={`resize-handle ${splitLayout} ${isResizing ? "active" : ""}`}
        onMouseDown={handleResizeStart}
      >
        <div className="resize-handle-bar" />
      </div>

      <div className="response-panel" style={sizeStyle}>
        <div className="response-section">
          <div className="response-header">
            <h2>Response</h2>
            <div className="response-header-right">
              {response && (
                <div className="response-meta">
                  <span
                    className={`status-badge ${getStatusColor(
                      response.status,
                    )}`}
                  >
                    {response.status === 0
                      ? "Network Error"
                      : `${response.status} ${response.statusText}`}
                  </span>
                  {response.status !== 0 && (
                    <>
                      <span className="time-badge">{response.time}ms</span>
                      <span className="size-badge">
                        {formatSize(response.size)}
                      </span>
                    </>
                  )}
                </div>
              )}
              <div className="response-header-actions">
                {!isSmallScreen && (
                  <Tooltip
                    text={
                      splitLayout === "horizontal"
                        ? "Switch to side-by-side view"
                        : "Switch to stacked view"
                    }
                  >
                    <button
                      className="layout-toggle-btn"
                      onClick={toggleLayout}
                    >
                      <SplitIcon splitLayout={splitLayout} />
                    </button>
                  </Tooltip>
                )}
                <Tooltip text="Hide response">
                  <button
                    className="response-hide-btn"
                    onClick={toggleResponseHidden}
                  >
                    <CloseIcon />
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>

          {isLoading ? (
                <div className="loading-state">
                  <span className="loading-spinner large"></span>
                  <p>Sending request...</p>
                </div>
              ) : (
                response && (
                  <>
                    <div className="response-toolbar">
                      <div className="tabs">
                        <button
                          className={`tab ${
                            responseTab === "body" ? "active" : ""
                          }`}
                          onClick={() => setResponseTab("body")}
                        >
                          Body
                        </button>
                        <button
                          className={`tab ${
                            responseTab === "headers" ? "active" : ""
                          }`}
                          onClick={() => setResponseTab("headers")}
                        >
                          Headers
                          <span className="badge">
                            {Object.keys(response.headers).length}
                          </span>
                        </button>
                      </div>
                      <div className="response-actions">
                        <Tooltip text="Copy response to clipboard">
                          <button
                            className="action-btn"
                            onClick={() => {
                              navigator.clipboard.writeText(getResponseContent());
                              vscode.postMessage({ type: "showInfo", message: "Copied to clipboard!" });
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
                        <Tooltip text="Open response in VS Code editor">
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

                    <div className="response-content">
                      {responseTab === "body" &&
                        (response.status === 0 ? (
                          <div className="error-display">
                            <div className="error-icon">
                              <WarningIcon />
                            </div>
                            <h3 className="error-title">Request Failed</h3>
                            <p className="error-message">{response.data}</p>
                          </div>
                        ) : (
                          <BodyEditor
                            value={responseBodyValue}
                            language={responseEditorLanguage}
                            readOnly
                            className="response-editor"
                            showHint="Ctrl+F search"
                          />
                        ))}
                      {responseTab === "headers" && (
                        <div className="response-headers">
                          {Object.entries(response.headers).length === 0 ? (
                            <p className="empty-hint">No headers available</p>
                          ) : (
                            Object.entries(response.headers).map(
                              ([key, value]) => (
                                <div key={key} className="response-header-row">
                                  <span className="header-name">{key}</span>
                                  <span className="header-value">{value}</span>
                                </div>
                              ),
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )
          )}
        </div>
      </div>
    </>
  );
};

export default ResponsePanel;
