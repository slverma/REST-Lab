import React from "react";
import Tooltip from "../components/Tooltip";
import PlusIcon from "../components/icons/PlusIcon";
import TrashIcon from "../components/icons/TrashIcon";
import { useRequestContext } from "./RequestContext";
import VarInput from "./VarInput";

const ParamsTab = () => {
  const {
    folderConfig,
    config,
    handleAddParam,
    handleUpdateParam,
    handleRemoveParam,
    handleToggleParam,
    handleToggleInheritedParam,
  } = useRequestContext();

  return (
    <div className="headers-section">
      {folderConfig.params && folderConfig.params.length > 0 && (
        <div className="inherited-headers">
          <h3>Inherited from Collection</h3>
          {folderConfig.params.map((param) => {
            const isDisabledInRequest = (config.params || []).some(
              (p) =>
                p.key.toLowerCase() === param.key.toLowerCase() &&
                p.enabled === false,
            );
            return (
              <div key={param.key} className="header-row inherited">
                <input
                  type="checkbox"
                  checked={!isDisabledInRequest}
                  onChange={() => handleToggleInheritedParam(param.key)}
                  title="Enable/Disable inherited parameter"
                  className="header-checkbox"
                />
                <span className="header-key">{param.key}</span>
                <span className="header-value">{param.value}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="request-headers">
        <div className="section-header">
          <h3>Query Parameters</h3>
          <button className="add-btn" onClick={handleAddParam}>
            <PlusIcon />
            Add
          </button>
        </div>

        {(config.params || []).length === 0 ? (
          <p className="empty-hint">No query parameters</p>
        ) : (
          (config.params || [])
            .filter((param) => {
              // Don't show disabled overrides of inherited params
              const isInheritedParam = (folderConfig.params || []).some(
                (p) => p.key.toLowerCase() === param.key.toLowerCase(),
              );
              if (isInheritedParam && param.enabled === false) {
                return false;
              }
              return true;
            })
            .map((param, index) => (
              <div key={index} className="header-row">
                <input
                  type="checkbox"
                  checked={param.enabled !== false}
                  onChange={() => handleToggleParam(index)}
                  title="Enable/Disable parameter"
                  className="header-checkbox"
                />
                <input
                  type="text"
                  value={param.key}
                  onChange={(e) =>
                    handleUpdateParam(index, "key", e.target.value)
                  }
                  placeholder="Parameter name"
                  className="header-key"
                />
                <VarInput
                  value={param.value}
                  onChange={(val) => handleUpdateParam(index, "value", val)}
                  placeholder="Value"
                  className="header-value"
                />
                <Tooltip text="Remove Parameter" position="top-right">
                  <button
                    className="remove-btn"
                    onClick={() => handleRemoveParam(index)}
                  >
                    <TrashIcon />
                  </button>
                </Tooltip>
              </div>
            ))
        )}
      </div>
    </div>
  );
};

export default ParamsTab;
