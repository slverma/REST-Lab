import React from "react";
import Tooltip from "../components/Tooltip";
import PlusIcon from "../components/icons/PlusIcon";
import TrashIcon from "../components/icons/TrashIcon";
import { useRequestContext } from "./RequestContext";
import VarInput from "./VarInput";

const CookieTab: React.FC = () => {
  const {
    config,
    handleAddCookie,
    handleUpdateCookie,
    handleRemoveCookie,
    handleToggleCookie,
  } = useRequestContext();

  return (
    <div className="headers-section">
      <div className="request-headers">
        <div className="section-header">
          <h3>Request Cookies</h3>
          <button className="add-btn" onClick={handleAddCookie}>
            <PlusIcon />
            Add
          </button>
        </div>

        {(config.cookies || []).length === 0 ? (
          <p className="empty-hint">No cookies configured</p>
        ) : (
          (config.cookies || []).map((cookie, index) => (
            <div key={index} className="header-row">
              <input
                type="checkbox"
                checked={cookie.enabled !== false}
                onChange={() => handleToggleCookie(index)}
                title="Enable/Disable cookie"
                className="header-checkbox"
              />
              <VarInput
                value={cookie.name}
                onChange={(val) => handleUpdateCookie(index, "name", val)}
                placeholder="name"
                className="header-key"
              />
              <VarInput
                value={cookie.value}
                onChange={(val) => handleUpdateCookie(index, "value", val)}
                placeholder="value"
                className="header-value"
              />
              <Tooltip text="Remove Cookie" position="top-right">
                <button
                  className="remove-btn"
                  onClick={() => handleRemoveCookie(index)}
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

export default CookieTab;
