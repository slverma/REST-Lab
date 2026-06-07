import React from "react";
import { AuthConfig } from "../types/internal.types";
import VarInput from "./VarInput";
import ArrowUpIcon from "../components/icons/ArrowIcon";

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
    <fieldset className="form-section">
      <legend className="section-legend"><span>Authentication</span></legend>

      <div className="form-group">
        <label className="field-label">Auth Type</label>
        <select
          className="form-select"
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
            />
          </div>
          <div className="form-group">
            <label className="field-label">Add to</label>
            <select
              className="form-select"
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
        <p className="field-hint inherited-hint">
          <ArrowUpIcon />
          Bearer token inherited from parent folder
        </p>
      )}
      {mode === "inherit" && inheritedAuth?.type === "basic" && (
        <p className="field-hint inherited-hint">
          <ArrowUpIcon />
          Basic Auth inherited from parent folder
        </p>
      )}
      {mode === "inherit" && inheritedAuth?.type === "apikey" && (
        <p className="field-hint inherited-hint">
          <ArrowUpIcon />
          API Key inherited from parent folder
        </p>
      )}
      {mode === "inherit" && (!inheritedAuth || inheritedAuth.type === "none") && (
        <p className="field-hint">
          No auth configured on parent folders
        </p>
      )}
    </fieldset>
  );
};

export default AuthTab;
