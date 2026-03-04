import React, { useEffect, useRef, useState } from "react";
import AutoGrowTextarea from "../components/AutoGrowTextarea";
import ArrowUpIcon from "../components/icons/ArrowIcon";
import CollectionIcon from "../components/icons/CollectionIcon";
import DocumentIcon from "../components/icons/DocumentIcon";
import FolderIcon from "../components/icons/FolderIcon";
import PlusIcon from "../components/icons/PlusIcon";
import SaveIcon from "../components/icons/SaveIcon";
import TrashIcon from "../components/icons/TrashIcon";

interface Header {
  key: string;
  value: string;
}

interface EnvVariable {
  key: string;
  value: string;
  enabled: boolean;
}

interface Environment {
  id: string;
  name: string;
  variables: EnvVariable[];
}

interface FolderConfig {
  id: string;
  name: string;
  baseUrl?: string;
  headers?: Header[];
  environments?: Environment[];
  activeEnvironmentId?: string | null;
}

interface FolderEditorProps {
  folderId: string;
  folderName: string;
  isCollection: boolean;
}

interface InheritedConfig {
  baseUrl?: string;
  headers?: Header[];
  envVariables?: Record<string, string>;
}
const COMMON_HEADERS = [
  "Accept",
  "Accept-Charset",
  "Accept-Encoding",
  "Accept-Language",
  "Authorization",
  "Cache-Control",
  "Content-Type",
  "Content-Length",
  "Content-Encoding",
  "Cookie",
  "Host",
  "If-Match",
  "If-Modified-Since",
  "If-None-Match",
  "Origin",
  "Pragma",
  "Referer",
  "User-Agent",
  "X-Api-Key",
  "X-Auth-Token",
  "X-Correlation-ID",
  "X-Forwarded-For",
  "X-Forwarded-Host",
  "X-Forwarded-Proto",
  "X-Request-ID",
  "X-Requested-With",
];

declare function acquireVsCodeApi(): {
  postMessage: (message: unknown) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
};

const vscode = acquireVsCodeApi();

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  suggestions: string[];
  className?: string;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  value,
  onChange,
  placeholder,
  suggestions,
  className,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    const computed = getComputedStyle(el);
    const lh = parseFloat(computed.lineHeight) || 20;
    const pt = parseFloat(computed.paddingTop) || 0;
    const pb = parseFloat(computed.paddingBottom) || 0;
    const max = lh * 5 + pt + pb;
    const needed = Math.min(el.scrollHeight, max);
    el.style.height = needed + "px";
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }, [value]);

  useEffect(() => {
    if (value) {
      const filtered = suggestions.filter((s) =>
        s.toLowerCase().includes(value.toLowerCase()),
      );
      setFilteredSuggestions(filtered);
    } else {
      setFilteredSuggestions(suggestions);
    }
    setActiveSuggestionIndex(0);
  }, [value, suggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !showSuggestions) {
      e.preventDefault();
      return;
    }
    if (!showSuggestions) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestionIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter" && filteredSuggestions.length > 0) {
      e.preventDefault();
      onChange(filteredSuggestions[activeSuggestionIndex]);
      setShowSuggestions(false);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleSelect = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div className="autocomplete-container">
      <textarea
        ref={inputRef}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`autogrow-textarea${className ? ` ${className}` : ""}`}
        autoComplete="off"
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div ref={suggestionsRef} className="autocomplete-dropdown">
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={suggestion}
              className={`autocomplete-item ${
                index === activeSuggestionIndex ? "active" : ""
              }`}
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => setActiveSuggestionIndex(index)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── EnvVarInput ─────────────────────────────────────────────────────────────────
// A text input that shows a variable-completion popup when the user types `{{`.
// Accepts envVariables directly as a prop (no context needed).
interface EnvVarInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  envVariables: Record<string, string>;
}

const EnvVarInput: React.FC<EnvVarInputProps> = ({
  value,
  onChange,
  placeholder,
  className,
  envVariables,
}) => {
  const varKeys = Object.keys(envVariables);
  const [showPopup, setShowPopup] = React.useState(false);
  const [filterText, setFilterText] = React.useState("");
  const [activeIdx, setActiveIdx] = React.useState(0);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    const computed = getComputedStyle(el);
    const lh = parseFloat(computed.lineHeight) || 20;
    const pt = parseFloat(computed.paddingTop) || 0;
    const pb = parseFloat(computed.paddingBottom) || 0;
    const max = lh * 5 + pt + pb;
    const needed = Math.min(el.scrollHeight, max);
    el.style.height = needed + "px";
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }, [value]);

  const getCursorFilter = (el: HTMLTextAreaElement): string | null => {
    const cursor = el.selectionStart ?? el.value.length;
    const before = el.value.slice(0, cursor);
    const match = before.match(/\{\{(\w*)$/);
    return match ? match[1] : null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    const filter = getCursorFilter(e.target);
    if (filter !== null && varKeys.length > 0) {
      setShowPopup(true);
      setFilterText(filter);
      setActiveIdx(0);
    } else {
      setShowPopup(false);
    }
  };

  const getFiltered = () =>
    varKeys.filter((k) => k.toLowerCase().includes(filterText.toLowerCase()));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !showPopup) {
      e.preventDefault();
      return;
    }
    if (!showPopup) return;
    const filtered = getFiltered();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered.length > 0) {
      e.preventDefault();
      insertVar(filtered[activeIdx]);
    } else if (e.key === "Escape") {
      setShowPopup(false);
    }
  };

  const insertVar = (varKey: string) => {
    const el = inputRef.current;
    if (!el) return;
    const cursor = el.selectionStart ?? el.value.length;
    const before = el.value.slice(0, cursor);
    const after = el.value.slice(cursor);
    const newBefore = before.replace(/\{\{(\w*)$/, `{{${varKey}}}`);
    const newValue = newBefore + after;
    onChange(newValue);
    setShowPopup(false);
    setTimeout(() => {
      if (el) {
        el.setSelectionRange(newBefore.length, newBefore.length);
        el.focus();
      }
    }, 0);
  };

  const filtered = getFiltered();

  return (
    <div className="var-input-container">
      <textarea
        ref={inputRef}
        rows={1}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setShowPopup(false), 150)}
        placeholder={placeholder}
        className={`autogrow-textarea${className ? ` ${className}` : ""}`}
        autoComplete="off"
      />
      {showPopup && filtered.length > 0 && (
        <div className="var-popup">
          {filtered.map((k, i) => (
            <div
              key={k}
              className={`var-popup-item ${i === activeIdx ? "active" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                insertVar(k);
              }}
              onMouseEnter={() => setActiveIdx(i)}
            >
              <span className="var-popup-key">{`{{${k}}}`}</span>
              <span className="var-popup-value">{envVariables[k]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const FolderEditor: React.FC<FolderEditorProps> = ({
  folderId,
  folderName,
  isCollection,
}) => {
  const [config, setConfig] = useState<FolderConfig>({
    id: folderId,
    name: folderName,
    baseUrl: "",
    headers: [],
    environments: [],
    activeEnvironmentId: null,
  });
  const [inheritedConfig, setInheritedConfig] = useState<InheritedConfig>({});
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<"settings" | "environments">(
    "settings",
  );
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [renamingEnvId, setRenamingEnvId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    vscode.postMessage({ type: "getConfig" });
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === "configLoaded") {
        const loaded: FolderConfig = {
          environments: [],
          activeEnvironmentId: null,
          ...message.config,
        };
        setConfig(loaded);
        if (message.inheritedConfig) {
          setInheritedConfig(message.inheritedConfig);
        } else if (message.envVariables) {
          // fallback: backend sends envVariables at top level
          setInheritedConfig((prev) => ({
            ...prev,
            envVariables: message.envVariables,
          }));
        }
        setIsDirty(false);
        const envs: Environment[] = loaded.environments || [];
        setSelectedEnvId(loaded.activeEnvironmentId ?? envs[0]?.id ?? null);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    if (renamingEnvId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingEnvId]);

  // ── Settings handlers ─────────────────────────────────────────────

  const handleChange = (field: keyof FolderConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleAddHeader = () => {
    setConfig((prev) => ({
      ...prev,
      headers: [...(prev.headers || []), { key: "", value: "" }],
    }));
    setIsDirty(true);
  };

  const handleUpdateHeader = (
    index: number,
    field: "key" | "value",
    value: string,
  ) => {
    setConfig((prev) => {
      const newHeaders = [...(prev.headers || [])];
      newHeaders[index] = { ...newHeaders[index], [field]: value };
      return { ...prev, headers: newHeaders };
    });
    setIsDirty(true);
  };

  const handleRemoveHeader = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      headers: (prev.headers || []).filter((_, i) => i !== index),
    }));
    setIsDirty(true);
  };

  // ── Environment helpers ────────────────────────────────────────────

  const getEnvs = () => config.environments || [];

  const handleAddEnvironment = () => {
    const newEnv: Environment = {
      id: `env-${Date.now()}`,
      name: `Environment ${getEnvs().length + 1}`,
      variables: [],
    };
    setConfig((prev) => ({
      ...prev,
      environments: [...(prev.environments || []), newEnv],
    }));
    setSelectedEnvId(newEnv.id);
    setIsDirty(true);
  };

  const handleDeleteEnvironment = (envId: string) => {
    const remaining = getEnvs().filter((e) => e.id !== envId);
    setConfig((prev) => ({
      ...prev,
      environments: remaining,
      activeEnvironmentId:
        prev.activeEnvironmentId === envId ? null : prev.activeEnvironmentId,
    }));
    if (selectedEnvId === envId) {
      setSelectedEnvId(remaining[0]?.id ?? null);
    }
    setIsDirty(true);
  };

  const handleSetActive = (envId: string) => {
    setConfig((prev) => ({
      ...prev,
      activeEnvironmentId: prev.activeEnvironmentId === envId ? null : envId,
    }));
    setIsDirty(true);
  };

  const handleStartRename = (env: Environment) => {
    setRenamingEnvId(env.id);
    setRenameValue(env.name);
  };

  const handleCommitRename = (envId: string) => {
    if (renameValue.trim()) {
      setConfig((prev) => ({
        ...prev,
        environments: (prev.environments || []).map((e) =>
          e.id === envId ? { ...e, name: renameValue.trim() } : e,
        ),
      }));
      setIsDirty(true);
    }
    setRenamingEnvId(null);
  };

  // ── Variable helpers ──────────────────────────────────────────────

  const updateEnvVariables = (envId: string, vars: EnvVariable[]) => {
    setConfig((prev) => ({
      ...prev,
      environments: (prev.environments || []).map((e) =>
        e.id === envId ? { ...e, variables: vars } : e,
      ),
    }));
    setIsDirty(true);
  };

  const selectedEnv = getEnvs().find((e) => e.id === selectedEnvId) ?? null;

  const handleAddVariable = () => {
    if (!selectedEnv) return;
    updateEnvVariables(selectedEnv.id, [
      ...selectedEnv.variables,
      { key: "", value: "", enabled: true },
    ]);
  };

  const handleUpdateVariable = (
    idx: number,
    field: keyof EnvVariable,
    value: string | boolean,
  ) => {
    if (!selectedEnv) return;
    updateEnvVariables(
      selectedEnv.id,
      selectedEnv.variables.map((v, i) =>
        i === idx ? { ...v, [field]: value } : v,
      ),
    );
  };

  const handleRemoveVariable = (idx: number) => {
    if (!selectedEnv) return;
    updateEnvVariables(
      selectedEnv.id,
      selectedEnv.variables.filter((_, i) => i !== idx),
    );
  };

  // ── Save ──────────────────────────────────────────────────────────

  const handleSave = () => {
    vscode.postMessage({ type: "saveConfig", config });
    setIsDirty(false);
  };

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="folder-editor">
      <div className="editor-header">
        <div className="header-content">
          <div className="header-icon">
            {isCollection ? <CollectionIcon /> : <FolderIcon />}
          </div>
          <div className="header-info">
            <h1>{config.name}</h1>
            <span className="subtitle">
              {isCollection ? "Collection" : "Folder"} Configuration
            </span>
          </div>
        </div>
        <button
          className={`save-btn ${isDirty ? "dirty" : ""}`}
          onClick={handleSave}
          disabled={!isDirty}
        >
          <SaveIcon />
          Save Changes
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="editor-tabs">
        <button
          className={`editor-tab ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          Settings
        </button>
        {isCollection && (
          <button
            className={`editor-tab ${activeTab === "environments" ? "active" : ""}`}
            onClick={() => setActiveTab("environments")}
          >
            Environments
            {getEnvs().length > 0 && (
              <span className="tab-badge">{getEnvs().length}</span>
            )}
          </button>
        )}
      </div>

      <div className="editor-content">
        {/* ––– Settings Tab ––– */}
        {activeTab === "settings" && (
          <>
            <div className="form-section">
              <h2>{isCollection ? "Collection" : "Folder"} Name</h2>
              <div className="form-group">
                <AutoGrowTextarea
                  value={config.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder={`Enter ${isCollection ? "collection" : "folder"} name`}
                />
              </div>
            </div>

            <div className="form-section">
              <h2>Base URL</h2>
              <div className="form-group">
                <EnvVarInput
                  value={config.baseUrl || ""}
                  onChange={(val) => handleChange("baseUrl", val)}
                  placeholder={
                    inheritedConfig.baseUrl || "https://api.example.com/v1"
                  }
                  envVariables={(() => {
                    // Use active local environment (for collections) or inherited env variables
                    const activeEnv = (config.environments || []).find(
                      (e) => e.id === config.activeEnvironmentId,
                    );
                    const localVars: Record<string, string> = {};
                    if (activeEnv) {
                      for (const v of activeEnv.variables) {
                        if (v.enabled && v.key.trim()) {
                          localVars[v.key.trim()] = v.value;
                        }
                      }
                    }
                    return {
                      ...(inheritedConfig.envVariables || {}),
                      ...localVars,
                    };
                  })()}
                />
                {inheritedConfig.baseUrl && !config.baseUrl && (
                  <p className="field-hint inherited-hint">
                    <ArrowUpIcon />
                    Inherited from parent:{" "}
                    <code>{inheritedConfig.baseUrl}</code>
                  </p>
                )}
                <p className="field-hint">
                  All requests in this {isCollection ? "collection" : "folder"}{" "}
                  will use this as the base URL
                </p>
              </div>
            </div>

            <div className="form-section">
              <div className="section-header">
                <h2>Headers</h2>
                <button className="add-btn" onClick={handleAddHeader}>
                  <PlusIcon />
                  Add Header
                </button>
              </div>
              {inheritedConfig.headers &&
                inheritedConfig.headers.length > 0 && (
                  <div className="inherited-headers">
                    <p className="inherited-label">
                      <ArrowUpIcon />
                      Inherited from parent folder:
                    </p>
                    <div className="inherited-headers-list">
                      {inheritedConfig.headers.map((header, index) => (
                        <div
                          key={`inherited-${index}`}
                          className="header-row inherited"
                        >
                          <span className="header-key">{header.key}</span>
                          <span className="header-value">{header.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              <div className="headers-list">
                {(config.headers || []).length === 0 ? (
                  <div className="empty-message">
                    <DocumentIcon />
                    <p>No headers configured</p>
                    <span>
                      Headers added here will be included in all requests
                    </span>
                  </div>
                ) : (
                  (config.headers || []).map((header, index) => (
                    <div key={index} className="header-row">
                      <AutocompleteInput
                        value={header.key}
                        onChange={(value) =>
                          handleUpdateHeader(index, "key", value)
                        }
                        placeholder="Header name"
                        suggestions={COMMON_HEADERS}
                        className="header-key"
                      />
                      <EnvVarInput
                        value={header.value}
                        onChange={(val) =>
                          handleUpdateHeader(index, "value", val)
                        }
                        placeholder="Header value"
                        className="header-value"
                        envVariables={(() => {
                          const activeEnv = (config.environments || []).find(
                            (e) => e.id === config.activeEnvironmentId,
                          );
                          const localVars: Record<string, string> = {};
                          if (activeEnv) {
                            for (const v of activeEnv.variables) {
                              if (v.enabled && v.key.trim()) {
                                localVars[v.key.trim()] = v.value;
                              }
                            }
                          }
                          return {
                            ...(inheritedConfig.envVariables || {}),
                            ...localVars,
                          };
                        })()}
                      />
                      <button
                        className="remove-btn"
                        onClick={() => handleRemoveHeader(index)}
                        title="Remove header"
                        aria-label="Remove header"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {/* ––– Environments Tab ––– */}
        {activeTab === "environments" && isCollection && (
          <div className="environments-panel">
            {/* Left: environment list */}
            <div className="env-list-column">
              <div className="env-list-header">
                <span className="env-section-label">Environments</span>
                <button
                  className="add-btn"
                  onClick={handleAddEnvironment}
                  title="Add Environment"
                >
                  <PlusIcon />
                  New
                </button>
              </div>
              {getEnvs().length > 0 && (
                <p className="env-list-hint">
                  ● = active &nbsp;·&nbsp; double-click name to rename
                </p>
              )}
              {getEnvs().length === 0 ? (
                <div className="env-empty-state">
                  <p>No environments yet.</p>
                  <p>Click "New" to create one.</p>
                </div>
              ) : (
                <div className="env-list">
                  {getEnvs().map((env) => {
                    const isActive = config.activeEnvironmentId === env.id;
                    const isSelected = selectedEnvId === env.id;
                    const isRenaming = renamingEnvId === env.id;
                    return (
                      <div
                        key={env.id}
                        className={`env-item ${isSelected ? "selected" : ""}`}
                        onClick={() => setSelectedEnvId(env.id)}
                      >
                        <button
                          className={`env-active-btn ${isActive ? "active" : ""}`}
                          title={
                            isActive
                              ? "Active (click to deactivate)"
                              : "Set as active"
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetActive(env.id);
                          }}
                        />
                        {isRenaming ? (
                          <input
                            ref={renameInputRef}
                            className="env-rename-input"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => handleCommitRename(env.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleCommitRename(env.id);
                              if (e.key === "Escape") setRenamingEnvId(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span
                            className="env-name"
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              handleStartRename(env);
                            }}
                            title="Double-click to rename"
                          >
                            {env.name}
                          </span>
                        )}
                        <button
                          className="env-delete-btn"
                          title="Delete environment"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEnvironment(env.id);
                          }}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: variable table */}
            <div className="env-vars-column">
              {!selectedEnv ? (
                <div className="env-empty-state">
                  <p>
                    {getEnvs().length === 0
                      ? "Create an environment to add variables"
                      : "Select an environment to manage variables"}
                  </p>
                </div>
              ) : (
                <>
                  <div className="env-vars-header">
                    <span className="env-section-label">
                      Variables &mdash;{" "}
                      <span className="env-name-accent">
                        {selectedEnv.name}
                      </span>
                      {config.activeEnvironmentId === selectedEnv.id && (
                        <span className="env-active-badge">&nbsp;Active</span>
                      )}
                    </span>
                    <button
                      className="add-btn"
                      onClick={handleAddVariable}
                      title="Add Variable"
                    >
                      <PlusIcon />
                      Add
                    </button>
                  </div>
                  {selectedEnv.variables.length === 0 ? (
                    <div className="env-empty-state">
                      <p>No variables. Click "Add" to create one.</p>
                      <p className="env-hint">
                        Use <code>{"{{variableName}}"}</code> in URLs, headers
                        and body.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="env-vars-col-header">
                        <span />
                        <span>Key</span>
                        <span>Value</span>
                        <span />
                      </div>
                      <div className="env-vars-list">
                        {selectedEnv.variables.map((v, idx) => (
                          <div key={idx} className="env-var-row">
                            <button
                              className={`env-var-toggle ${v.enabled ? "enabled" : ""}`}
                              title={v.enabled ? "Disable" : "Enable"}
                              onClick={() =>
                                handleUpdateVariable(idx, "enabled", !v.enabled)
                              }
                            />
                            <AutoGrowTextarea
                              className={`env-var-input ${!v.enabled ? "disabled" : ""}`}
                              placeholder="key"
                              value={v.key}
                              onChange={(e) =>
                                handleUpdateVariable(idx, "key", e.target.value)
                              }
                            />
                            <AutoGrowTextarea
                              className={`env-var-input ${!v.enabled ? "disabled" : ""}`}
                              placeholder="value"
                              value={v.value}
                              onChange={(e) =>
                                handleUpdateVariable(
                                  idx,
                                  "value",
                                  e.target.value,
                                )
                              }
                            />
                            <button
                              className="remove-btn"
                              title="Remove variable"
                              onClick={() => handleRemoveVariable(idx)}
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
