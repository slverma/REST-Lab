import React from "react";
import FileIcon from "../components/icons/FileIcon";
import PlusIcon from "../components/icons/PlusIcon";
import TextIcon from "../components/icons/TextIcon";
import TrashIcon from "../components/icons/TrashIcon";
import UploadIcon from "../components/icons/UploadIcon";
import { hasFileFields } from "../helpers/helper";
import { useRequestContext } from "./RequestContext";

const FormFieldEditor = () => {
  const {
    config,
    handleAddFormData,
    handleUpdateFormData,
    handleToggleFormDataType,
    handleFileSelect,
    handleRemoveFormData,
  } = useRequestContext();

  return (
    <div className="form-data-section">
      <div className="section-header">
        <h3>Form Fields</h3>
        <button className="add-btn" onClick={handleAddFormData}>
          <PlusIcon />
          Add Field
        </button>
      </div>

      {(config.formData || []).length === 0 ? (
        <p className="empty-hint">
          No form fields. Click "Add Field" to add one.
        </p>
      ) : (
        (config.formData || []).map((item, index) => (
          <div key={index} className="form-data-row">
            <input
              type="text"
              value={item.key}
              onChange={(e) =>
                handleUpdateFormData(index, "key", e.target.value)
              }
              placeholder="Field name"
              className="form-data-key"
            />

            {config.contentType === "multipart/form-data" && (
              <button
                className={`type-toggle ${
                  item.type === "file" ? "file-type" : "text-type"
                }`}
                onClick={() => handleToggleFormDataType(index)}
                title={
                  item.type === "file" ? "Switch to text" : "Switch to file"
                }
              >
                {item.type === "file" ? <FileIcon /> : <TextIcon />}
              </button>
            )}

            {item.type === "file" ? (
              <div className="file-input-wrapper">
                <input
                  type="file"
                  id={`file-input-${index}`}
                  className="file-input-hidden"
                  onChange={(e) =>
                    handleFileSelect(index, e.target.files?.[0] || null)
                  }
                />
                <label
                  htmlFor={`file-input-${index}`}
                  className="file-input-label"
                >
                  <UploadIcon />
                  {item.fileName || "Choose file"}
                </label>
              </div>
            ) : (
              <input
                type="text"
                value={item.value}
                onChange={(e) =>
                  handleUpdateFormData(index, "value", e.target.value)
                }
                placeholder="Value"
                className="form-data-value"
              />
            )}

            <button
              className="remove-btn"
              onClick={() => handleRemoveFormData(index)}
            >
              <TrashIcon />
            </button>
          </div>
        ))
      )}

      {hasFileFields(config.formData) && (
        <p className="file-warning">
          ⚠️ File uploads require multipart/form-data.
        </p>
      )}
    </div>
  );
};

export default FormFieldEditor;
