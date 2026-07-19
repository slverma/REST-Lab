import React from "react";
import Tooltip from "../components/Tooltip";
import AutoGrowTextarea from "../components/AutoGrowTextarea";
import AutocompleteInput from "../components/AutocompleteInput";
import ArrowUpIcon from "../components/icons/ArrowIcon";
import DocumentIcon from "../components/icons/DocumentIcon";
import PlusIcon from "../components/icons/PlusIcon";
import TrashIcon from "../components/icons/TrashIcon";
import { COMMON_HEADERS } from "../config";
import EnvVarInput from "./EnvVarInput";
import { AuthConfig, FolderConfig, Header, InheritedConfig } from "./types";

interface SettingsTabProps {
  config: FolderConfig;
  inheritedConfig: InheritedConfig;
  isCollection: boolean;
  onChangeName: (value: string) => void;
  onChangeBaseUrl: (value: string) => void;
  onAddHeader: () => void;
  onUpdateHeader: (
    index: number,
    field: "key" | "value",
    value: string,
  ) => void;
  onRemoveHeader: (index: number) => void;
  onToggleHeader: (index: number) => void;
  onAddParam: () => void;
  onUpdateParam: (index: number, field: "key" | "value", value: string) => void;
  onRemoveParam: (index: number) => void;
  onToggleParam: (index: number) => void;
  onChangeAuth: (auth: AuthConfig | undefined) => void;
}

/** Builds the env-variable map for the active local environment merged with inherited vars. */
function buildEnvVars(
  config: FolderConfig,
  inheritedConfig: InheritedConfig,
): Record<string, string> {
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
  return { ...(inheritedConfig.envVariables || {}), ...localVars };
}

const InheritedList: React.FC<{ items: Header[]; label: string }> = ({
  items,
  label,
}) => (
  <div className="inherited-headers">
    <p className="inherited-label">
      <ArrowUpIcon />
      {label}
    </p>
    <div className="inherited-headers-list">
      {items.map((item, index) => (
        <div key={`inherited-${index}`} className="header-row inherited">
          <span className="header-key">{item.key}</span>
          <span className="header-value">{item.value}</span>
        </div>
      ))}
    </div>
  </div>
);

const SettingsTab: React.FC<SettingsTabProps> = ({
  config,
  inheritedConfig,
  isCollection,
  onChangeName,
  onChangeBaseUrl,
  onAddHeader,
  onUpdateHeader,
  onRemoveHeader,
  onToggleHeader,
  onAddParam,
  onUpdateParam,
  onRemoveParam,
  onToggleParam,
  onChangeAuth,
}) => {
  const envVars = buildEnvVars(config, inheritedConfig);
  const entityLabel = isCollection ? "collection" : "folder";
  const basicAuth = config.auth?.type === "basic" ? config.auth : null;
  const apikeyAuth = config.auth?.type === "apikey" ? config.auth : null;

  return (
    <>
      {/* ── Name ── */}
      <fieldset className="form-section">
        <legend className="section-legend"><span>{isCollection ? "Collection" : "Folder"} Name</span></legend>
        <div className="form-group">
          <AutoGrowTextarea
            value={config.name}
            onChange={(e) => onChangeName(e.target.value)}
            placeholder={`Enter ${entityLabel} name`}
          />
        </div>
      </fieldset>

      {/* ── Base URL ── */}
      <fieldset className="form-section">
        <legend className="section-legend"><span>Base URL</span></legend>
        <div className="form-group">
          <EnvVarInput
            value={config.baseUrl || ""}
            onChange={onChangeBaseUrl}
            placeholder={
              inheritedConfig.baseUrl || "https://api.example.com/v1"
            }
            envVariables={envVars}
          />
          {inheritedConfig.baseUrl && !config.baseUrl && (
            <p className="field-hint inherited-hint">
              <ArrowUpIcon />
              Inherited from parent: <code>{inheritedConfig.baseUrl}</code>
            </p>
          )}
          <p className="field-hint">
            All requests in this {entityLabel} will use this as the base URL
          </p>
        </div>
      </fieldset>

      {/* ── Headers ── */}
      <fieldset className="form-section">
        <legend className="section-legend">
          <span>Headers</span>
          <button className="add-btn legend-add-btn" onClick={onAddHeader}><PlusIcon />Add Header</button>
        </legend>
        {inheritedConfig.headers && inheritedConfig.headers.length > 0 && (
          <InheritedList
            items={inheritedConfig.headers}
            label="Inherited from parent folder:"
          />
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
                <input
                  type="checkbox"
                  checked={header.enabled !== false}
                  onChange={() => onToggleHeader(index)}
                  title="Enable/Disable header"
                  className="header-checkbox"
                />
                <AutocompleteInput
                  value={header.key}
                  onChange={(value) => onUpdateHeader(index, "key", value)}
                  placeholder="Header name"
                  suggestions={COMMON_HEADERS}
                  className="header-key"
                />
                <EnvVarInput
                  value={header.value}
                  onChange={(val) => onUpdateHeader(index, "value", val)}
                  placeholder="Header value"
                  className="header-value"
                  envVariables={envVars}
                />
                <Tooltip text="Remove header" position="top-right">
                  <button
                    className="remove-btn"
                    onClick={() => onRemoveHeader(index)}
                  >
                    <TrashIcon />
                  </button>
                </Tooltip>
              </div>
            ))
          )}
        </div>
      </fieldset>

      {/* ── Query Parameters ── */}
      <fieldset className="form-section">
        <legend className="section-legend">
          <span>Query Parameters</span>
          <button className="add-btn legend-add-btn" onClick={onAddParam}><PlusIcon />Add Param</button>
        </legend>
        {inheritedConfig.params && inheritedConfig.params.length > 0 && (
          <InheritedList
            items={inheritedConfig.params}
            label="Inherited from parent folder:"
          />
        )}
        <div className="headers-list">
          {(config.params || []).length === 0 ? (
            <div className="empty-message">
              <DocumentIcon />
              <p>No query parameters configured</p>
              <span>Params added here will be appended to all requests</span>
            </div>
          ) : (
            (config.params || []).map((param, index) => (
              <div key={index} className="header-row">
                <input
                  type="checkbox"
                  checked={param.enabled !== false}
                  onChange={() => onToggleParam(index)}
                  title="Enable/Disable parameter"
                  className="header-checkbox"
                />
                <input
                  type="text"
                  value={param.key}
                  onChange={(e) => onUpdateParam(index, "key", e.target.value)}
                  placeholder="Parameter name"
                  className="header-key"
                />
                <EnvVarInput
                  value={param.value}
                  onChange={(val) => onUpdateParam(index, "value", val)}
                  placeholder="Parameter value"
                  className="header-value"
                  envVariables={envVars}
                />
                <Tooltip text="Remove parameter" position="top-right">
                  <button
                    className="remove-btn"
                    onClick={() => onRemoveParam(index)}
                  >
                    <TrashIcon />
                  </button>
                </Tooltip>
              </div>
            ))
          )}
        </div>
      </fieldset>

      {/* ── Authentication ── */}
      <fieldset className="form-section">
        <legend className="section-legend"><span>Authentication</span></legend>
        <div className="form-group">
          <label className="field-label">Auth Type</label>
          <select
            className="form-select"
            value={config.auth === undefined ? (isCollection ? "none" : "inherit") : config.auth.type}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "inherit") {
                onChangeAuth(undefined);
              } else if (val === "none") {
                onChangeAuth({ type: "none" });
              } else if (val === "bearer") {
                onChangeAuth({ type: "bearer", token: "" });
              } else if (val === "basic") {
                onChangeAuth({ type: "basic", username: "", password: "" });
              } else if (val === "apikey") {
                onChangeAuth({ type: "apikey", key: "", value: "", addTo: "header" });
              }
            }}
          >
            {!isCollection && <option value="inherit">Inherit from parent</option>}
            <option value="none">None</option>
            <option value="bearer">Bearer Token</option>
            <option value="basic">Basic Auth</option>
            <option value="apikey">API Key</option>
          </select>
        </div>

        {config.auth?.type === "bearer" && (
          <div className="form-group">
            <label className="field-label">Token</label>
            <EnvVarInput
              value={config.auth.token}
              onChange={(val) => onChangeAuth({ type: "bearer", token: val })}
              placeholder="{{token}} or paste token"
              envVariables={envVars}
            />
          </div>
        )}

        {basicAuth && (
          <>
            <div className="form-group">
              <label className="field-label">Username</label>
              <EnvVarInput
                value={basicAuth.username}
                onChange={(val) =>
                  onChangeAuth({ type: "basic", username: val, password: basicAuth.password })
                }
                placeholder="{{username}} or enter username"
                envVariables={envVars}
              />
            </div>
            <div className="form-group">
              <label className="field-label">Password</label>
              <EnvVarInput
                value={basicAuth.password}
                onChange={(val) =>
                  onChangeAuth({ type: "basic", username: basicAuth.username, password: val })
                }
                placeholder="{{password}} or enter password"
                envVariables={envVars}
              />
            </div>
          </>
        )}

        {apikeyAuth && (
          <>
            <div className="form-group">
              <label className="field-label">Key</label>
              <EnvVarInput
                value={apikeyAuth.key}
                onChange={(val) =>
                  onChangeAuth({ type: "apikey", key: val, value: apikeyAuth.value, addTo: apikeyAuth.addTo })
                }
                placeholder="X-API-Key"
                envVariables={envVars}
              />
            </div>
            <div className="form-group">
              <label className="field-label">Value</label>
              <EnvVarInput
                value={apikeyAuth.value}
                onChange={(val) =>
                  onChangeAuth({ type: "apikey", key: apikeyAuth.key, value: val, addTo: apikeyAuth.addTo })
                }
                placeholder="{{api_key}} or enter value"
                envVariables={envVars}
              />
            </div>
            <div className="form-group">
              <label className="field-label">Add to</label>
              <select
                className="form-select"
                value={apikeyAuth.addTo}
                onChange={(e) =>
                  onChangeAuth({
                    type: "apikey",
                    key: apikeyAuth.key,
                    value: apikeyAuth.value,
                    addTo: e.target.value as "header" | "query",
                  })
                }
              >
                <option value="header">Header</option>
                <option value="query">Query Param</option>
              </select>
            </div>
          </>
        )}

        {inheritedConfig.auth?.type === "bearer" && !config.auth && (
          <p className="field-hint inherited-hint">
            <ArrowUpIcon />
            Bearer token inherited from parent folder
          </p>
        )}
        {inheritedConfig.auth?.type === "basic" && !config.auth && (
          <p className="field-hint inherited-hint">
            <ArrowUpIcon />
            Basic Auth inherited from parent folder
          </p>
        )}
        {inheritedConfig.auth?.type === "apikey" && !config.auth && (
          <p className="field-hint inherited-hint">
            <ArrowUpIcon />
            API Key inherited from parent folder
          </p>
        )}
      </fieldset>
    </>
  );
};

export default SettingsTab;
