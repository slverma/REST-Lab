import React, { useRef, useState } from "react";
import CodeIcon from "../components/icons/CodeIcon";
import MoreActionIcon from "../components/icons/MoreActionIcon";
import SaveIcon from "../components/icons/SaveIcon";
import SendIcon from "../components/icons/SendIcon";
import { HTTP_METHODS, METHODS_WITH_BODY } from "../config";
import { interpolateVariables } from "../helpers/helper";
import { RequestConfig, RequestEditorProps } from "../types/internal.types";
import AuthTab from "./AuthTab";
import BodyTab from "./BodyTab";
import CookieTab from "./CookieTab";
import HeaderTab from "./HeaderTab";
import ParamsTab from "./ParamsTab";
import { RequestContextProvider, useRequestContext } from "./RequestContext";
import ResponsePanel from "./ResponsePanel";
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
    isSaved,
    splitLayout,
    requestSize,
    isResponseHidden,
    bodyEditorRef,
    containerRef,
    splitContainerRef,
    requestEditorLanguage,
    setActiveTab,
    handleConfigChange,
    handleSendRequest,
    handleSaveConfig,
    handleCopyCurl,
    handleBeautifyJson,
    handleAuthChange,
    handleSetActiveEnvironment,
  } = useRequestContext();

  return (
    <div className="request-editor" ref={containerRef}>
      <div className="request-bar">
        <select
          value={config.method}
          onChange={(e) => {
            const reqConfig: Partial<RequestConfig> = {
              method: e.target.value,
            };
            // Switch to headers tab if body tab is active and new method doesn't support body
            if (
              !METHODS_WITH_BODY.includes(e.target.value) &&
              activeTab === "body"
            ) {
              setActiveTab("headers");
              reqConfig.body = undefined; // Clear body when switching to a method that doesn't support body
            }
            // Switch to body tab when changing to a method that supports body
            if (
              METHODS_WITH_BODY.includes(e.target.value) &&
              activeTab !== "body"
            ) {
              setActiveTab("body");
            }
            handleConfigChange(reqConfig);
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
          (response || isLoading) && !isResponseHidden ? "has-response" : ""
        }`}
        ref={splitContainerRef}
      >
        <div
          className="request-panel"
          style={
            (response || isLoading) && !isResponseHidden
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
              <button
                className={`tab ${activeTab === "auth" ? "active" : ""}`}
                onClick={() => setActiveTab("auth")}
              >
                Auth
                {config.auth !== undefined && (
                  <span className="badge">•</span>
                )}
              </button>
              <button
                className={`tab ${activeTab === "cookies" ? "active" : ""}`}
                onClick={() => setActiveTab("cookies")}
              >
                Cookies
                {(config.cookies?.filter((c) => c.enabled !== false && c.name.trim() !== "").length || 0) > 0 && (
                  <span className="badge">
                    {config.cookies!.filter((c) => c.enabled !== false && c.name.trim() !== "").length}
                  </span>
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
              {activeTab === "auth" && (
                <AuthTab
                  auth={config.auth}
                  inheritedAuth={folderConfig.auth}
                  onAuthChange={handleAuthChange}
                />
              )}
              {activeTab === "cookies" && <CookieTab />}
            </div>
          </div>
        </div>

        <ResponsePanel />
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
