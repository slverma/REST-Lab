import React, { useState, useEffect, useRef } from "react";
import FolderIcon from "../components/icons/FolderIcon";
import SaveIcon from "../components/icons/SaveIcon";
import ArrowUpIcon from "../components/icons/ArrowIcon";
import PlusIcon from "../components/icons/PlusIcon";
import DocumentIcon from "../components/icons/DocumentIcon";
import TrashIcon from "../components/icons/TrashIcon";

interface Header {
  key: string;
  value: string;
}

interface FolderConfig {
  id: string;
  name: string;
  baseUrl?: string;
  headers?: Header[];
}

interface FolderEditorProps {
  folderId: string;
  folderName: string;
}

// Common HTTP headers for autocomplete
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
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

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
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
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

interface InheritedConfig {
  baseUrl?: string;
  headers?: Header[];
}

export const FolderEditor: React.FC<FolderEditorProps> = ({
  folderId,
  folderName,
}) => {
  const [config, setConfig] = useState<FolderConfig>({
    id: folderId,
    name: folderName,
    baseUrl: "",
    headers: [],
  });
  const [inheritedConfig, setInheritedConfig] = useState<InheritedConfig>({});
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    // Request config from extension
    vscode.postMessage({ type: "getConfig" });

    // Listen for messages from extension
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case "configLoaded":
          setConfig(message.config);
          if (message.inheritedConfig) {
            setInheritedConfig(message.inheritedConfig);
          }
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

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

  const handleSave = () => {
    vscode.postMessage({ type: "saveConfig", config });
    setIsDirty(false);
  };

  return (
    <div className="folder-editor">
      <div className="editor-header">
        <div className="header-content">
          <div className="header-icon">
            <FolderIcon />
          </div>
          <div className="header-info">
            <h1>{config.name}</h1>
            <span className="subtitle">Collection Configuration</span>
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

      <div className="editor-content">
        <div className="form-section">
          <h2>Collection Name</h2>
          <div className="form-group">
            <input
              id="name"
              type="text"
              value={config.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Enter collection name"
            />
          </div>
        </div>

        <div className="form-section">
          <h2>Base URL</h2>
          <div className="form-group">
            <input
              id="baseUrl"
              type="text"
              value={config.baseUrl || ""}
              onChange={(e) => handleChange("baseUrl", e.target.value)}
              placeholder={
                inheritedConfig.baseUrl || "https://api.example.com/v1"
              }
            />
            {inheritedConfig.baseUrl && !config.baseUrl && (
              <p className="field-hint inherited-hint">
                <ArrowUpIcon />
                Inherited from parent: <code>{inheritedConfig.baseUrl}</code>
              </p>
            )}
            <p className="field-hint">
              All requests in this collection will use this as the base URL
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

          {/* Show inherited headers */}
          {inheritedConfig.headers && inheritedConfig.headers.length > 0 && (
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
                <span>Headers added here will be included in all requests</span>
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
                  <input
                    type="text"
                    value={header.value}
                    onChange={(e) =>
                      handleUpdateHeader(index, "value", e.target.value)
                    }
                    placeholder="Header value"
                    className="header-value"
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
      </div>
    </div>
  );
};
