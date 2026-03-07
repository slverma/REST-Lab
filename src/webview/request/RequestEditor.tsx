import React, { useRef, useState } from "react";
import CodeIcon from "../components/icons/CodeIcon";
import CopyIcon from "../components/icons/CopyIcon";
import DownloadIcon from "../components/icons/DownloadIcon";
import MoreActionIcon from "../components/icons/MoreActionIcon";
import PencilIcon from "../components/icons/PencilIcon";
import SaveIcon from "../components/icons/SaveIcon";
import SendIcon from "../components/icons/SendIcon";
import SplitIcon from "../components/icons/SplitIcon";
import WarningIcon from "../components/icons/WarningIcon";
import Tooltip from "../components/Tooltip";
import { HTTP_METHODS, METHODS_WITH_BODY } from "../config";
import {
  formatJson,
  formatSize,
  getFileExtension,
  getStatusColor,
  interpolateVariables,
} from "../helpers/helper";
import { RequestEditorProps } from "../types/internal.types";
import BodyEditor from "./BodyEditor";
import BodyTab from "./BodyTab";
import HeaderTab from "./HeaderTab";
import ParamsTab from "./ParamsTab";
import { RequestContextProvider, useRequestContext } from "./RequestContext";
import VarInput from "./VarInput";

const RequestEditorContent: React.FC = () => {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!moreOpen) return;
    const handle = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [moreOpen]);

  const {
    config,
    folderConfig,
    envVariables,
    environments,
    activeEnvironmentId,
    response,
    isLoading,
    activeTab,
    responseTab,
    isSaved,
    splitLayout,
    requestSize,
    isResizing,
    bodyEditorRef,
    containerRef,
    splitContainerRef,
    requestEditorLanguage,
    responseEditorLanguage,
    responseBodyValue,
    setActiveTab,
    setResponseTab,
    handleConfigChange,
    handleSendRequest,
    handleSaveConfig,
    handleCopyCurl,
    handleBeautifyJson,
    toggleLayout,
    handleResizeStart,
    handleSetActiveEnvironment,
    vscode,
  } = useRequestContext();

  return (
    <div className="request-editor" ref={containerRef}>
      <div className="request-bar">
        <select
          value={config.method}
          onChange={(e) => {
            handleConfigChange({ method: e.target.value });
            // Switch to headers tab if body tab is active and new method doesn't support body
            if (
              !METHODS_WITH_BODY.includes(e.target.value) &&
              activeTab === "body"
            ) {
              setActiveTab("headers");
            }
            // Switch to body tab when changing to a method that supports body
            if (
              METHODS_WITH_BODY.includes(e.target.value) &&
              activeTab !== "body"
            ) {
              setActiveTab("body");
            }
          }}
          className={`method-select method-${config.method.toLowerCase()}`}
        >
          {HTTP_METHODS.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>
        <VarInput
          value={config.url}
          onChange={(val) => handleConfigChange({ url: val })}
          placeholder={
            folderConfig.baseUrl
              ? "/endpoint"
              : "https://api.example.com/endpoint"
          }
          className="url-input"
        />
        {environments.length > 0 && (
          <select
            className={`request-env-select ${activeEnvironmentId ? "has-active" : ""}`}
            value={activeEnvironmentId || ""}
            onChange={(e) => handleSetActiveEnvironment(e.target.value || null)}
            title="Active environment"
          >
            <option value="">No Env</option>
            {environments.map((env) => (
              <option key={env.id} value={env.id}>
                {env.name}
              </option>
            ))}
          </select>
        )}
        <button
          className="send-btn"
          onClick={handleSendRequest}
          disabled={isLoading}
        >
          {isLoading ? <span className="loading-spinner"></span> : <SendIcon />}
          <span className="btn-text">Send</span>
        </button>
        <button
          className={`save-btn ${isSaved ? "saved" : "unsaved"}`}
          onClick={handleSaveConfig}
          disabled={isSaved}
          title={isSaved ? "All changes saved" : "Save changes"}
        >
          <SaveIcon />
          <span className="btn-text">{isSaved ? "Saved" : "Save"}</span>
        </button>
        <div className="request-more-container" ref={moreRef}>
          <button
            className="request-more-btn"
            title="More actions"
            onClick={() => setMoreOpen((o) => !o)}
          >
            <MoreActionIcon />
          </button>
          {moreOpen && (
            <div className="request-more-dropdown">
              <button
                className="request-more-item"
                onClick={() => {
                  handleCopyCurl();
                  setMoreOpen(false);
                }}
              >
                <CodeIcon />
                <span>Copy as cURL</span>
              </button>
            </div>
          )}
        </div>
        {(response || isLoading) && (
          <button
            className="layout-toggle-btn"
            onClick={toggleLayout}
            title={
              splitLayout === "horizontal"
                ? "Switch to side-by-side view"
                : "Switch to stacked view"
            }
          >
            <SplitIcon splitLayout={splitLayout} />
          </button>
        )}
      </div>

      {(() => {
        const rawUrl = folderConfig.baseUrl
          ? `${folderConfig.baseUrl}${config.url}`
          : config.url;
        const resolvedUrl = interpolateVariables(rawUrl, envVariables);
        const hasVars = /\{\{\w+\}\}/.test(rawUrl);
        if (!folderConfig.baseUrl && !hasVars) return null;
        return (
          <div className="base-url-hint">
            {folderConfig.baseUrl && (
              <>
                <span style={{ opacity: 0.5, marginRight: "4px" }}>
                  Base URL:
                </span>
                <code>{folderConfig.baseUrl}</code>
              </>
            )}
            {hasVars && resolvedUrl && (
              <>
                <span style={{ opacity: 0.5, margin: "0 6px" }}>→</span>
                <code style={{ color: "rgba(56,189,248,0.8)" }}>
                  {resolvedUrl}
                </code>
              </>
            )}
          </div>
        );
      })()}

      <div
        className={`split-container ${splitLayout} ${
          response || isLoading ? "has-response" : ""
        }`}
        ref={splitContainerRef}
      >
        <div
          className="request-panel"
          style={
            response || isLoading
              ? {
                  [splitLayout === "horizontal" ? "height" : "width"]:
                    `${requestSize}%`,
                }
              : undefined
          }
        >
          <div className="request-content">
            <div className="tabs">
              {METHODS_WITH_BODY.includes(config.method) && (
                <button
                  className={`tab ${activeTab === "body" ? "active" : ""}`}
                  onClick={() => setActiveTab("body")}
                >
                  Body
                </button>
              )}
              <button
                className={`tab ${activeTab === "params" ? "active" : ""}`}
                onClick={() => setActiveTab("params")}
              >
                Params
                {(config.params?.length || 0) > 0 && (
                  <span className="badge">{config.params?.length}</span>
                )}
              </button>
              <button
                className={`tab ${activeTab === "headers" ? "active" : ""}`}
                onClick={() => setActiveTab("headers")}
              >
                Headers
                {(config.headers?.length || 0) > 0 && (
                  <span className="badge">{config.headers?.length}</span>
                )}
              </button>
            </div>

            <div className="tab-content">
              {activeTab === "body" && (
                <BodyTab
                  config={config}
                  handleConfigChange={handleConfigChange}
                  handleBeautifyJson={handleBeautifyJson}
                  requestEditorLanguage={requestEditorLanguage}
                  bodyEditorRef={bodyEditorRef}
                  envVariables={envVariables}
                />
              )}
              {activeTab === "params" && <ParamsTab />}
              {activeTab === "headers" && <HeaderTab />}
            </div>
          </div>
        </div>

        {(response || isLoading) && (
          <div
            className={`resize-handle ${splitLayout} ${
              isResizing ? "active" : ""
            }`}
            onMouseDown={handleResizeStart}
          >
            <div className="resize-handle-bar" />
          </div>
        )}

        {(response || isLoading) && (
          <div
            className="response-panel"
            style={{
              [splitLayout === "horizontal" ? "height" : "width"]: `${
                100 - requestSize
              }%`,
            }}
          >
            <div className="response-section">
              <div className="response-header">
                <h2>Response</h2>
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
                              const content =
                                responseTab === "body"
                                  ? formatJson(response.data)
                                  : Object.entries(response.headers)
                                      .map(([k, v]) => `${k}: ${v}`)
                                      .join("\n");
                              navigator.clipboard.writeText(content);
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
                              const content =
                                responseTab === "body"
                                  ? formatJson(response.data)
                                  : Object.entries(response.headers)
                                      .map(([k, v]) => `${k}: ${v}`)
                                      .join("\n");
                              const extension =
                                responseTab === "body"
                                  ? getFileExtension(response.headers)
                                  : "txt";
                              const filename = `response-${Date.now()}.${extension}`;
                              vscode.postMessage({
                                type: "downloadResponse",
                                content,
                                filename,
                                mimeType:
                                  responseTab === "body"
                                    ? response.headers["content-type"] ||
                                      "text/plain"
                                    : "text/plain",
                              });
                            }}
                          >
                            <DownloadIcon />
                          </button>
                        </Tooltip>
                        <Tooltip text="Open response in VS Code editor">
                          <button
                            className="action-btn"
                            title="Open response in VS Code editor"
                            onClick={() => {
                              const content =
                                responseTab === "body"
                                  ? formatJson(response.data)
                                  : Object.entries(response.headers)
                                      .map(([k, v]) => `${k}: ${v}`)
                                      .join("\n");
                              const extension =
                                responseTab === "body"
                                  ? getFileExtension(response.headers)
                                  : "txt";
                              vscode.postMessage({
                                type: "openResponseInEditor",
                                content,
                                extension,
                                mimeType:
                                  responseTab === "body"
                                    ? response.headers["content-type"] ||
                                      "text/plain"
                                    : "text/plain",
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
        )}
      </div>
    </div>
  );
};

export const RequestEditor: React.FC<RequestEditorProps> = (props) => {
  return (
    <RequestContextProvider {...props}>
      <RequestEditorContent />
    </RequestContextProvider>
  );
};
