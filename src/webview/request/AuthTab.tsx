import React from "react";
import { AuthConfig } from "../types/internal.types";
import VarInput from "./VarInput";

type AuthMode = "inherit" | "bearer" | "basic" | "apikey" | "none";

function configToMode(auth: AuthConfig | undefined): AuthMode {
  if (auth === undefined) return "inherit";
  if (auth.type === "none") return "none";
  if (auth.type === "bearer") return "bearer";
  if (auth.type === "basic") return "basic";
  return "apikey";
}

interface AuthTabProps {
  auth: AuthConfig | undefined;
  inheritedAuth: AuthConfig | undefined;
  onAuthChange: (auth: AuthConfig | undefined) => void;
}

const AuthTab: React.FC<AuthTabProps> = ({
  auth,
  inheritedAuth,
  onAuthChange,
}) => {
  const mode = configToMode(auth);

  const handleModeChange = (newMode: AuthMode) => {
    if (newMode === "inherit") {
      onAuthChange(undefined);
    } else if (newMode === "none") {
      onAuthChange({ type: "none" });
    } else if (newMode === "bearer") {
      onAuthChange({ type: "bearer", token: "" });
    } else if (newMode === "basic") {
      onAuthChange({ type: "basic", username: "", password: "" });
    } else {
      onAuthChange({ type: "apikey", key: "", value: "", addTo: "header" });
    }
  };

  const basicAuth = auth?.type === "basic" ? auth : null;
  const apikeyAuth = auth?.type === "apikey" ? auth : null;

  return (
    <div className="tab-section">
      <div className="form-group" style={{ marginBottom: "12px" }}>
        <label className="field-label">Auth Type</label>
        <select
          className="method-select"
          value={mode}
          onChange={(e) => handleModeChange(e.target.value as AuthMode)}
        >
          <option value="inherit">inherit from parent</option>
          <option value="bearer">Bearer Token</option>
          <option value="basic">Basic Auth</option>
          <option value="apikey">API Key</option>
          <option value="none">No Auth</option>
        </select>
      </div>

      {mode === "bearer" && auth?.type === "bearer" && (
        <div className="form-group">
          <label className="field-label">Token</label>
          <VarInput
            value={auth.token}
            onChange={(val) => onAuthChange({ type: "bearer", token: val })}
            placeholder="{{token}} or paste token"
            className="url-input"
          />
        </div>
      )}

      {mode === "basic" && basicAuth && (
        <>
          <div className="form-group">
            <label className="field-label">Username</label>
            <VarInput
              value={basicAuth.username}
              onChange={(val) =>
                onAuthChange({ type: "basic", username: val, password: basicAuth.password })
              }
              placeholder="{{username}} or enter username"
              className="url-input"
            />
          </div>
          <div className="form-group">
            <label className="field-label">Password</label>
            <VarInput
              value={basicAuth.password}
              onChange={(val) =>
                onAuthChange({ type: "basic", username: basicAuth.username, password: val })
              }
              placeholder="{{password}} or enter password"
              className="url-input"
            />
          </div>
        </>
      )}

      {mode === "apikey" && apikeyAuth && (
        <>
          <div className="form-group">
            <label className="field-label">Key</label>
            <VarInput
              value={apikeyAuth.key}
              onChange={(val) =>
                onAuthChange({ type: "apikey", key: val, value: apikeyAuth.value, addTo: apikeyAuth.addTo })
              }
              placeholder="X-API-Key"
              className="url-input"
            />
          </div>
          <div className="form-group">
            <label className="field-label">Value</label>
            <VarInput
              value={apikeyAuth.value}
              onChange={(val) =>
                onAuthChange({ type: "apikey", key: apikeyAuth.key, value: val, addTo: apikeyAuth.addTo })
              }
              placeholder="{{api_key}} or enter value"
              className="url-input"
            />
          </div>
          <div className="form-group">
            <label className="field-label">Add to</label>
            <select
              className="method-select"
              value={apikeyAuth.addTo}
              onChange={(e) =>
                onAuthChange({
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

      {mode === "inherit" && inheritedAuth?.type === "bearer" && (
        <p className="field-hint inherited-hint" style={{ marginTop: "8px" }}>
          Inherited: Bearer token is set on the parent folder
        </p>
      )}
      {mode === "inherit" && inheritedAuth?.type === "basic" && (
        <p className="field-hint inherited-hint" style={{ marginTop: "8px" }}>
          Inherited: Basic Auth is set on the parent folder
        </p>
      )}
      {mode === "inherit" && inheritedAuth?.type === "apikey" && (
        <p className="field-hint inherited-hint" style={{ marginTop: "8px" }}>
          Inherited: API Key is set on the parent folder
        </p>
      )}
      {mode === "inherit" && (!inheritedAuth || inheritedAuth.type === "none") && (
        <p className="field-hint" style={{ marginTop: "8px" }}>
          No auth configured on parent folders
        </p>
      )}
    </div>
  );
};

export default AuthTab;
