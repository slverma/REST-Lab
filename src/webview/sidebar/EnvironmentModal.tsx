import React, { useEffect, useRef, useState } from "react";
import AutoGrowTextarea from "../components/AutoGrowTextarea";
import PlusIcon from "../components/icons/PlusIcon";
import TrashIcon from "../components/icons/TrashIcon";
import { Environment, EnvVariable } from "../types/internal.types";

interface EnvironmentModalProps {
  environments: Environment[];
  activeEnvironmentId: string | null;
  onClose: () => void;
  vscode: { postMessage: (msg: unknown) => void };
}

const newVariable = (): EnvVariable => ({
  key: "",
  value: "",
  enabled: true,
});

export const EnvironmentModal: React.FC<EnvironmentModalProps> = ({
  environments,
  activeEnvironmentId,
  onClose,
  vscode,
}) => {
  // Which env is open for editing variables
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(
    activeEnvironmentId ?? environments[0]?.id ?? null,
  );
  // Local copy of the selected env's variables (for inline editing)
  const [localVars, setLocalVars] = useState<EnvVariable[]>([]);
  // Pending environment name rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  const selectedEnv = environments.find((e) => e.id === selectedEnvId) ?? null;

  // Sync localVars whenever the selected environment changes
  useEffect(() => {
    setLocalVars(selectedEnv ? [...selectedEnv.variables] : []);
  }, [selectedEnvId, environments]);

  // Focus rename input when it appears
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  // ── environment-level actions ──────────────────────────────────────

  const handleCreateEnvironment = () => {
    vscode.postMessage({ type: "createEnvironment" });
  };

  const handleDeleteEnvironment = (id: string) => {
    vscode.postMessage({ type: "deleteEnvironment", id });
    if (selectedEnvId === id) {
      const remaining = environments.filter((e) => e.id !== id);
      setSelectedEnvId(remaining[0]?.id ?? null);
    }
  };

  const handleSelectActive = (id: string | null) => {
    vscode.postMessage({ type: "setActiveEnvironment", id });
  };

  const handleStartRename = (env: Environment) => {
    setRenamingId(env.id);
    setRenameValue(env.name);
  };

  const handleCommitRename = (env: Environment) => {
    if (renameValue.trim() && renameValue !== env.name) {
      const updated: Environment = { ...env, name: renameValue.trim() };
      vscode.postMessage({ type: "updateEnvironment", environment: updated });
    }
    setRenamingId(null);
  };

  // ── variable-level actions ─────────────────────────────────────────

  const saveVars = (vars: EnvVariable[]) => {
    if (!selectedEnv) return;
    const updated: Environment = { ...selectedEnv, variables: vars };
    vscode.postMessage({ type: "updateEnvironment", environment: updated });
  };

  const handleAddVar = () => {
    const next = [...localVars, newVariable()];
    setLocalVars(next);
    saveVars(next);
  };

  const handleUpdateVar = (
    idx: number,
    field: keyof EnvVariable,
    value: string | boolean,
  ) => {
    const next = localVars.map((v, i) =>
      i === idx ? { ...v, [field]: value } : v,
    );
    setLocalVars(next);
    saveVars(next);
  };

  const handleRemoveVar = (idx: number) => {
    const next = localVars.filter((_, i) => i !== idx);
    setLocalVars(next);
    saveVars(next);
  };

  return (
    /* full overlay */
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[var(--vscode-sideBar-background,#1e1e2e)] overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Manage Environments"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-glass shrink-0">
        <h2 className="text-[12px] font-bold uppercase tracking-widest text-gradient">
          Environments
        </h2>
        <button
          className="action-btn hover:bg-red-500/20 hover:text-red-400"
          onClick={onClose}
          title="Close"
          aria-label="Close environments"
        >
          {/* ✕ icon */}
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="1" y1="1" x2="11" y2="11" />
            <line x1="11" y1="1" x2="1" y2="11" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* ── Environment List ── */}
        <div className="px-3 pt-3 pb-1 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-widest text-vscode-muted opacity-70 font-semibold">
              Environments
            </span>
            <button
              className="action-btn hover:bg-sky-500/10 hover:text-sky-400"
              onClick={handleCreateEnvironment}
              title="Add Environment"
            >
              <PlusIcon />
            </button>
          </div>

          {environments.length === 0 ? (
            <p className="text-xs text-vscode-muted opacity-70 italic py-2 px-1">
              No environments yet. Click + to create one.
            </p>
          ) : (
            <div className="space-y-1 max-h-[140px] overflow-y-auto scrollbar-thin">
              {environments.map((env) => {
                const isActive = env.id === activeEnvironmentId;
                const isEditing = selectedEnvId === env.id;
                const isRenaming = renamingId === env.id;

                return (
                  <div
                    key={env.id}
                    className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer transition-all duration-150 border ${
                      isEditing
                        ? "bg-sky-500/10 border-sky-500/30"
                        : "border-transparent hover:bg-glass hover:border-glass"
                    }`}
                    onClick={() => setSelectedEnvId(env.id)}
                  >
                    {/* Active env radio indicator */}
                    <button
                      className={`shrink-0 w-3.5 h-3.5 rounded-full border-2 transition-all ${
                        isActive
                          ? "border-sky-400 bg-sky-400"
                          : "border-white/20 hover:border-sky-400/60"
                      }`}
                      title={isActive ? "Active environment" : "Set as active"}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectActive(isActive ? null : env.id);
                      }}
                    />

                    {/* Name (or rename input) */}
                    {isRenaming ? (
                      <input
                        ref={renameInputRef}
                        className="flex-1 bg-transparent text-xs text-vscode border-b border-sky-400 outline-none py-0.5"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => handleCommitRename(env)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCommitRename(env);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        className="flex-1 text-xs text-vscode overflow-hidden text-ellipsis whitespace-nowrap"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          handleStartRename(env);
                        }}
                        title="Double-click to rename"
                      >
                        {env.name}
                      </span>
                    )}

                    {/* Delete */}
                    <button
                      className="shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 action-btn hover:bg-red-500/20 hover:text-red-400"
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

        {/* ── Divider ── */}
        {selectedEnv && (
          <div className="h-px mx-3 my-2 bg-gradient-to-r from-transparent via-white/10 to-transparent shrink-0" />
        )}

        {/* ── Variables Section ── */}
        {selectedEnv ? (
          <div className="flex flex-col flex-1 overflow-hidden px-3 pb-2">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <span className="text-[10px] uppercase tracking-widest text-vscode-muted opacity-70 font-semibold">
                Variables —{" "}
                <span className="text-sky-400 normal-case">
                  {selectedEnv.name}
                </span>
              </span>
              <button
                className="action-btn hover:bg-sky-500/10 hover:text-sky-400"
                onClick={handleAddVar}
                title="Add Variable"
              >
                <PlusIcon />
              </button>
            </div>

            {localVars.length === 0 ? (
              <p className="text-xs text-vscode-muted opacity-70 italic py-2 px-1">
                No variables. Click + to add one.
              </p>
            ) : (
              <>
                {/* Column header */}
                <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-1.5 px-1 mb-1 shrink-0">
                  <span className="text-[9px] uppercase tracking-wider text-vscode-muted opacity-60 w-4" />
                  <span className="text-[9px] uppercase tracking-wider text-vscode-muted opacity-60">
                    Key
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-vscode-muted opacity-60">
                    Value
                  </span>
                  <span className="w-5" />
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1">
                  {localVars.map((v, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-[auto_1fr_1fr_auto] gap-1.5 items-center"
                    >
                      {/* Enabled toggle */}
                      <button
                        className={`w-4 h-4 rounded-sm border transition-all shrink-0 ${
                          v.enabled
                            ? "bg-sky-500/70 border-sky-400"
                            : "bg-transparent border-white/20"
                        }`}
                        title={
                          v.enabled ? "Disable variable" : "Enable variable"
                        }
                        onClick={() =>
                          handleUpdateVar(idx, "enabled", !v.enabled)
                        }
                      />

                      {/* Key input */}
                      <AutoGrowTextarea
                        className={`w-full bg-white/5 border border-white/10 rounded text-[11px] text-vscode px-1.5 py-1 outline-none focus:border-sky-400/60 focus:bg-sky-500/5 placeholder:text-white/20 transition-all ${!v.enabled ? "opacity-40" : ""}`}
                        placeholder="key"
                        value={v.key}
                        onChange={(e) =>
                          handleUpdateVar(idx, "key", e.target.value)
                        }
                      />

                      {/* Value input */}
                      <AutoGrowTextarea
                        className={`w-full bg-white/5 border border-white/10 rounded text-[11px] text-vscode px-1.5 py-1 outline-none focus:border-sky-400/60 focus:bg-sky-500/5 placeholder:text-white/20 transition-all ${!v.enabled ? "opacity-40" : ""}`}
                        placeholder="value"
                        value={v.value}
                        onChange={(e) =>
                          handleUpdateVar(idx, "value", e.target.value)
                        }
                      />

                      {/* Delete */}
                      <button
                        className="action-btn hover:bg-red-500/20 hover:text-red-400 shrink-0"
                        title="Remove variable"
                        onClick={() => handleRemoveVar(idx)}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center px-4">
            <p className="text-xs text-vscode-muted opacity-60 text-center">
              {environments.length === 0
                ? "Create an environment to manage variables"
                : "Select an environment to manage its variables"}
            </p>
          </div>
        )}
      </div>

      {/* ── Footer hint ── */}
      <div className="px-4 py-2 border-t border-glass shrink-0">
        <p className="text-[9px] text-vscode-muted opacity-50">
          Use{" "}
          <code className="bg-white/5 px-1 rounded text-sky-300/70">
            {"{{variableName}}"}
          </code>{" "}
          in URLs, headers and body
        </p>
      </div>
    </div>
  );
};
