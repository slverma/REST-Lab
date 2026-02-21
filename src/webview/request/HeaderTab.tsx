import React from "react";
import AutocompleteInput from "../components/AutocompleteInput";
import PlusIcon from "../components/icons/PlusIcon";
import TrashIcon from "../components/icons/TrashIcon";
import { COMMON_HEADERS } from "../config";
import { useRequestContext } from "./RequestContext";

const HeaderTab = () => {
  const {
    folderConfig,
    config,
    handleAddHeader,
    handleUpdateHeader,
    handleRemoveHeader,
  } = useRequestContext();

  return (
    <div className="headers-section">
      {folderConfig.headers && folderConfig.headers.length > 0 && (
        <div className="inherited-headers">
          <h3>Inherited from Collection</h3>
          {folderConfig.headers.map((header, index) => (
            <div key={index} className="header-row inherited">
              <input
                type="text"
                value={header.key}
                disabled
                className="header-key"
              />
              <input
                type="text"
                value={header.value}
                disabled
                className="header-value"
              />
            </div>
          ))}
        </div>
      )}

      <div className="request-headers">
        <div className="section-header">
          <h3>Request Headers</h3>
          <button className="add-btn" onClick={handleAddHeader}>
            <PlusIcon />
            Add
          </button>
        </div>

        {(config.headers || []).length === 0 ? (
          <p className="empty-hint">No custom headers</p>
        ) : (
          (config.headers || []).map((header, index) => (
            <div key={index} className="header-row">
              <AutocompleteInput
                value={header.key}
                onChange={(value) => handleUpdateHeader(index, "key", value)}
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
                placeholder="Value"
                className="header-value"
              />
              <button
                className="remove-btn"
                onClick={() => handleRemoveHeader(index)}
                title="Remove Header"
              >
                <TrashIcon />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
export default HeaderTab;
