import React, { useRef } from "react";
import Tooltip from "../components/Tooltip";
import AutoGrowTextarea from "../components/AutoGrowTextarea";
import PlusIcon from "../components/icons/PlusIcon";
import TrashIcon from "../components/icons/TrashIcon";
import { Environment, FolderConfig } from "./types";

interface EnvironmentsTabProps {
  config: FolderConfig;
  selectedEnvId: string | null;
  renamingEnvId: string | null;
  renameValue: string;
  onSelectEnv: (id: string) => void;
  onSetActive: (id: string) => void;
  onAddEnvironment: () => void;
  onDeleteEnvironment: (id: string) => void;
  onStartRename: (env: Environment) => void;
  onCommitRename: (id: string) => void;
  onCancelRename: () => void;
  onRenameValueChange: (value: string) => void;
  onAddVariable: () => void;
  onUpdateVariable: (
    idx: number,
    field: "key" | "value" | "enabled",
    value: string | boolean,
  ) => void;
  onRemoveVariable: (idx: number) => void;
}

const EnvironmentsTab: React.FC<EnvironmentsTabProps> = ({
  config,
  selectedEnvId,
  renamingEnvId,
  renameValue,
  onSelectEnv,
  onSetActive,
  onAddEnvironment,
  onDeleteEnvironment,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onRenameValueChange,
  onAddVariable,
  onUpdateVariable,
  onRemoveVariable,
}) => {
  const renameInputRef = useRef<HTMLInputElement>(null);
  const envs = config.environments || [];
  const selectedEnv = envs.find((e) => e.id === selectedEnvId) ?? null;

  React.useEffect(() => {
    if (renamingEnvId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingEnvId]);

  return (
    <div className="environments-panel">
      {/* ── Left: environment list ── */}
      <div className="env-list-column">
        <div className="env-list-header">
          <span className="env-section-label">Environments</span>
          <button
            className="add-btn"
            onClick={onAddEnvironment}
            title="Add Environment"
          >
            <PlusIcon />
            New
          </button>
        </div>
        {envs.length > 0 && (
          <p className="env-list-hint">
            ● = active &nbsp;·&nbsp; double-click name to rename
          </p>
        )}
        {envs.length === 0 ? (
          <div className="env-empty-state">
            <p>No environments yet.</p>
            <p>Click "New" to create one.</p>
          </div>
        ) : (
          <div className="env-list">
            {envs.map((env) => {
              const isActive = config.activeEnvironmentId === env.id;
              const isSelected = selectedEnvId === env.id;
              const isRenaming = renamingEnvId === env.id;
              return (
                <div
                  key={env.id}
                  className={`env-item ${isSelected ? "selected" : ""}`}
                  onClick={() => onSelectEnv(env.id)}
                >
                  <Tooltip
                    text={isActive ? "Active (click to deactivate)" : "Set as active"}
                  >
                    <button
                      className={`env-active-btn ${isActive ? "active" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetActive(env.id);
                      }}
                    />
                  </Tooltip>
                  {isRenaming ? (
                    <input
                      ref={renameInputRef}
                      className="env-rename-input"
                      value={renameValue}
                      onChange={(e) => onRenameValueChange(e.target.value)}
                      onBlur={() => onCommitRename(env.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") onCommitRename(env.id);
                        if (e.key === "Escape") onCancelRename();
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      className="env-name"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        onStartRename(env);
                      }}
                      title="Double-click to rename"
                    >
                      {env.name}
                    </span>
                  )}
                  <Tooltip text="Delete environment">
                    <button
                      className="env-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteEnvironment(env.id);
                      }}
                    >
                      <TrashIcon />
                    </button>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Right: variable table ── */}
      <div className="env-vars-column">
        {!selectedEnv ? (
          <div className="env-empty-state">
            <p>
              {envs.length === 0
                ? "Create an environment to add variables"
                : "Select an environment to manage variables"}
            </p>
          </div>
        ) : (
          <>
            <div className="env-vars-header">
              <span className="env-section-label">
                Variables &mdash;{" "}
                <span className="env-name-accent">{selectedEnv.name}</span>
                {config.activeEnvironmentId === selectedEnv.id && (
                  <span className="env-active-badge">&nbsp;Active</span>
                )}
              </span>
              <button
                className="add-btn"
                onClick={onAddVariable}
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
                  Use <code>{"{{variableName}}"}</code> in URLs, headers and
                  body.
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
                      <Tooltip text={v.enabled ? "Disable" : "Enable"}>
                        <button
                          className={`env-var-toggle ${v.enabled ? "enabled" : ""}`}
                          onClick={() =>
                            onUpdateVariable(idx, "enabled", !v.enabled)
                          }
                        />
                      </Tooltip>
                      <AutoGrowTextarea
                        className={`env-var-input ${!v.enabled ? "disabled" : ""}`}
                        placeholder="key"
                        value={v.key}
                        onChange={(e) =>
                          onUpdateVariable(idx, "key", e.target.value)
                        }
                      />
                      <AutoGrowTextarea
                        className={`env-var-input ${!v.enabled ? "disabled" : ""}`}
                        placeholder="value"
                        value={v.value}
                        onChange={(e) =>
                          onUpdateVariable(idx, "value", e.target.value)
                        }
                      />
                      <Tooltip text="Remove variable">
                        <button
                          className="remove-btn"
                          onClick={() => onRemoveVariable(idx)}
                        >
                          <TrashIcon />
                        </button>
                      </Tooltip>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EnvironmentsTab;
