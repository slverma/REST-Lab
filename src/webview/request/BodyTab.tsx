import React from "react";
import BeautifyIcon from "../components/icons/BeautifyIcon";
import { CONTENT_TYPES, METHODS_WITH_BODY } from "../config";
import { getBodyPlaceholder, isFormContentType } from "../helpers/helper";
import { RequestConfig } from "../types/internal.types";
import BodyEditor from "./BodyEditor";
import FormFieldEditor from "./FormFieldEditor";

type BodyTabProps = {
  config: RequestConfig;
  handleConfigChange: (updatedFields: Partial<RequestConfig>) => void;
  handleBeautifyJson: () => void;
  requestEditorLanguage: string;
  bodyEditorRef: React.RefObject<any>;
  envVariables: Record<string, string>;
};
const BodyTab = ({
  config,
  handleConfigChange,
  handleBeautifyJson,
  requestEditorLanguage,
  bodyEditorRef,
  envVariables,
}: BodyTabProps) => {
  if (!METHODS_WITH_BODY.includes(config.method)) {
    return null;
  }

  return (
    <div className="body-section">
      <div className="content-type-selector">
        <label>Content Type:</label>
        <select
          value={config.contentType || ""}
          onChange={(e) => handleConfigChange({ contentType: e.target.value })}
          className="content-type-select"
        >
          {CONTENT_TYPES.map((ct) => (
            <option key={ct.value} value={ct.value}>
              {ct.label}
              {ct.value ? ` (${ct.value})` : ""}
            </option>
          ))}
        </select>
        <button
          className="beautify-btn"
          onClick={handleBeautifyJson}
          disabled={!config.body || config.contentType !== "application/json"}
          title="Format JSON (Beautify)"
        >
          <BeautifyIcon />
          <span className="btn-text">Beautify</span>
        </button>
      </div>

      {isFormContentType(config.contentType) ? (
        <FormFieldEditor />
      ) : (
        <BodyEditor
          value={config.body || ""}
          onChange={(value) => handleConfigChange({ body: value })}
          placeholder={getBodyPlaceholder(config.contentType)}
          className="body-editor"
          language={requestEditorLanguage}
          formatOnChange={config.contentType === "application/json"}
          showHint="Ctrl+F search • Ctrl+/ comment • Alt+Shift+F format"
          editorInstanceRef={bodyEditorRef}
          envVariables={envVariables}
        />
      )}
    </div>
  );
};

export default BodyTab;
