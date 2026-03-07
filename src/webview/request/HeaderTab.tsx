import React from "react";
import AutocompleteInput from "../components/AutocompleteInput";
import PlusIcon from "../components/icons/PlusIcon";
import TrashIcon from "../components/icons/TrashIcon";
import { COMMON_HEADERS } from "../config";
import { useRequestContext } from "./RequestContext";
import VarInput from "./VarInput";

const HeaderTab = () => {
  const {
    folderConfig,
    config,
    handleAddHeader,
    handleUpdateHeader,
    handleRemoveHeader,
    handleToggleHeader,
    handleToggleInheritedHeader,
  } = useRequestContext();

  return (
    <div className="headers-section">
      {folderConfig.headers && folderConfig.headers.length > 0 && (
        <div className="inherited-headers">
          <h3>Inherited from Collection</h3>
          {folderConfig.headers.map((header) => {
            const isDisabledInRequest = (config.headers || []).some(
              (h) =>
                h.key.toLowerCase() === header.key.toLowerCase() &&
                h.enabled === false,
            );
            return (
              <div key={header.key} className="header-row inherited">
                <input
                  type="checkbox"
                  checked={!isDisabledInRequest}
                  onChange={() => handleToggleInheritedHeader(header.key)}
                  title="Enable/Disable inherited header"
                  className="header-checkbox"
                />
                <span className="header-key">{header.key}</span>
                <span className="header-value">{header.value}</span>
              </div>
            );
          })}
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
          (config.headers || [])
            .map((header, index) => ({ header, index }))
            .filter(
              (item) =>
                !(
                  (folderConfig.headers || []).some(
                    (h) =>
                      h.key.toLowerCase() === item.header.key.toLowerCase(),
                  ) && item.header.enabled === false
                ),
            )
            .map(({ header, index }) => (
              <div key={index} className="header-row">
                <input
                  type="checkbox"
                  checked={header.enabled !== false}
                  onChange={() => handleToggleHeader(index)}
                  title="Enable/Disable header"
                  className="header-checkbox"
                />
                <AutocompleteInput
                  value={header.key}
                  onChange={(value) => handleUpdateHeader(index, "key", value)}
                  placeholder="Header name"
                  suggestions={COMMON_HEADERS}
                  className="header-key"
                />
                <VarInput
                  value={header.value}
                  onChange={(val) => handleUpdateHeader(index, "value", val)}
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
