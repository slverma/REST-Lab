import React from "react";
import { AuthConfig } from "../types/internal.types";
import VarInput from "./VarInput";

type AuthMode = "inherit" | "bearer" | "none";

function configToMode(auth: AuthConfig | undefined): AuthMode {
  if (auth === undefined) return "inherit";
  if (auth.type === "none") return "none";
  return "bearer";
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
    } else {
      onAuthChange({ type: "bearer", token: "" });
    }
  };

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

      {mode === "inherit" && inheritedAuth?.type === "bearer" && (
        <p className="field-hint inherited-hint" style={{ marginTop: "8px" }}>
          Inherited: Bearer token is set on the parent folder
        </p>
      )}

      {mode === "inherit" &&
        (!inheritedAuth || inheritedAuth.type === "none") && (
          <p className="field-hint" style={{ marginTop: "8px" }}>
            No auth configured on parent folders
          </p>
        )}
    </div>
  );
};

export default AuthTab;
