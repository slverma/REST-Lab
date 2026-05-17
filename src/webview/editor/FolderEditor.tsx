import React, { useEffect, useState } from "react";
import CollectionIcon from "../components/icons/CollectionIcon";
import FolderIcon from "../components/icons/FolderIcon";
import SaveIcon from "../components/icons/SaveIcon";
import EnvironmentsTab from "./EnvironmentsTab";
import SettingsTab from "./SettingsTab";
import {
  AuthConfig,
  Environment,
  FolderConfig,
  FolderEditorProps,
  InheritedConfig,
} from "./types";

declare function acquireVsCodeApi(): {
  postMessage: (message: unknown) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
};

const vscode = acquireVsCodeApi();

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
    params: [],
    environments: [],
    activeEnvironmentId: null,
  });
  const [inheritedConfig, setInheritedConfig] = useState<InheritedConfig>({});
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<"settings" | "environments">("settings");

  // Environment UI state
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [renamingEnvId, setRenamingEnvId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // ── Message handling ─────────────────────────────────────────────

  useEffect(() => {
    vscode.postMessage({ type: "getConfig" });
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (msg.type !== "configLoaded") return;
      const loaded: FolderConfig = {
        environments: [],
        activeEnvironmentId: null,
        ...msg.config,
      };
      setConfig(loaded);
      if (msg.inheritedConfig) {
        setInheritedConfig(msg.inheritedConfig);
      } else if (msg.envVariables) {
        setInheritedConfig((prev) => ({ ...prev, envVariables: msg.envVariables }));
      }
      setIsDirty(false);
      const envs: Environment[] = loaded.environments || [];
      setSelectedEnvId(loaded.activeEnvironmentId ?? envs[0]?.id ?? null);
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // ── Settings handlers ────────────────────────────────────────────

  const mark = () => setIsDirty(true);

  const handleChangeName = (value: string) => {
    setConfig((prev) => ({ ...prev, name: value }));
    mark();
  };

  const handleChangeBaseUrl = (value: string) => {
    setConfig((prev) => ({ ...prev, baseUrl: value }));
    mark();
  };

  const handleAddHeader = () => {
    setConfig((prev) => ({ ...prev, headers: [...(prev.headers || []), { key: "", value: "" }] }));
    mark();
  };

  const handleUpdateHeader = (index: number, field: "key" | "value", value: string) => {
    setConfig((prev) => {
      const next = [...(prev.headers || [])];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, headers: next };
    });
    mark();
  };

  const handleRemoveHeader = (index: number) => {
    setConfig((prev) => ({ ...prev, headers: (prev.headers || []).filter((_, i) => i !== index) }));
    mark();
  };

  const handleToggleHeader = (index: number) => {
    setConfig((prev) => {
      const next = [...(prev.headers || [])];
      next[index] = { ...next[index], enabled: next[index].enabled !== false ? false : true };
      return { ...prev, headers: next };
    });
    mark();
  };

  const handleAddParam = () => {
    setConfig((prev) => ({ ...prev, params: [...(prev.params || []), { key: "", value: "" }] }));
    mark();
  };

  const handleUpdateParam = (index: number, field: "key" | "value", value: string) => {
    setConfig((prev) => {
      const next = [...(prev.params || [])];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, params: next };
    });
    mark();
  };

  const handleRemoveParam = (index: number) => {
    setConfig((prev) => ({ ...prev, params: (prev.params || []).filter((_, i) => i !== index) }));
    mark();
  };

  const handleChangeAuth = (auth: AuthConfig | undefined) => {
    setConfig((prev) => ({ ...prev, auth }));
    mark();
  };

  const handleToggleParam = (index: number) => {
    setConfig((prev) => {
      const next = [...(prev.params || [])];
      next[index] = { ...next[index], enabled: next[index].enabled !== false ? false : true };
      return { ...prev, params: next };
    });
    mark();
  };

  // ── Environment handlers ─────────────────────────────────────────

  const getEnvs = () => config.environments || [];

  const updateEnvVariables = (envId: string, vars: Environment["variables"]) => {
    setConfig((prev) => ({
      ...prev,
      environments: (prev.environments || []).map((e) =>
        e.id === envId ? { ...e, variables: vars } : e,
      ),
    }));
    mark();
  };

  const handleAddEnvironment = () => {
    const newEnv: Environment = {
      id: `env-${Date.now()}`,
      name: `Environment ${getEnvs().length + 1}`,
      variables: [],
    };
    setConfig((prev) => ({ ...prev, environments: [...(prev.environments || []), newEnv] }));
    setSelectedEnvId(newEnv.id);
    mark();
  };

  const handleDeleteEnvironment = (envId: string) => {
    const remaining = getEnvs().filter((e) => e.id !== envId);
    setConfig((prev) => ({
      ...prev,
      environments: remaining,
      activeEnvironmentId:
        prev.activeEnvironmentId === envId ? null : prev.activeEnvironmentId,
    }));
    if (selectedEnvId === envId) setSelectedEnvId(remaining[0]?.id ?? null);
    mark();
  };

  const handleSetActive = (envId: string) => {
    setConfig((prev) => ({
      ...prev,
      activeEnvironmentId: prev.activeEnvironmentId === envId ? null : envId,
    }));
    mark();
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
      mark();
    }
    setRenamingEnvId(null);
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
    field: "key" | "value" | "enabled",
    value: string | boolean,
  ) => {
    if (!selectedEnv) return;
    updateEnvVariables(
      selectedEnv.id,
      selectedEnv.variables.map((v, i) => (i === idx ? { ...v, [field]: value } : v)),
    );
  };

  const handleRemoveVariable = (idx: number) => {
    if (!selectedEnv) return;
    updateEnvVariables(
      selectedEnv.id,
      selectedEnv.variables.filter((_, i) => i !== idx),
    );
  };

  // ── Save ─────────────────────────────────────────────────────────

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
        {activeTab === "settings" && (
          <SettingsTab
            config={config}
            inheritedConfig={inheritedConfig}
            isCollection={isCollection}
            onChangeName={handleChangeName}
            onChangeBaseUrl={handleChangeBaseUrl}
            onAddHeader={handleAddHeader}
            onUpdateHeader={handleUpdateHeader}
            onRemoveHeader={handleRemoveHeader}
            onToggleHeader={handleToggleHeader}
            onAddParam={handleAddParam}
            onUpdateParam={handleUpdateParam}
            onRemoveParam={handleRemoveParam}
            onToggleParam={handleToggleParam}
            onChangeAuth={handleChangeAuth}
          />
        )}

        {activeTab === "environments" && isCollection && (
          <EnvironmentsTab
            config={config}
            selectedEnvId={selectedEnvId}
            renamingEnvId={renamingEnvId}
            renameValue={renameValue}
            onSelectEnv={setSelectedEnvId}
            onSetActive={handleSetActive}
            onAddEnvironment={handleAddEnvironment}
            onDeleteEnvironment={handleDeleteEnvironment}
            onStartRename={handleStartRename}
            onCommitRename={handleCommitRename}
            onCancelRename={() => setRenamingEnvId(null)}
            onRenameValueChange={setRenameValue}
            onAddVariable={handleAddVariable}
            onUpdateVariable={handleUpdateVariable}
            onRemoveVariable={handleRemoveVariable}
          />
        )}
      </div>
    </div>
  );
};
