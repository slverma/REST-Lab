import React from "react";
import HistoryEntryList from "../components/HistoryEntryList";
import { useRequestContext } from "./RequestContext";

const HistoryTab: React.FC = () => {
  const {
    historyEntries,
    handleRestoreHistoryEntry,
    handleDeleteHistoryEntry,
    handleClearRequestHistory,
  } = useRequestContext();

  return (
    <div className="headers-section">
      <div className="request-headers">
        <div className="section-header">
          <h3>Request History</h3>
          {historyEntries.length > 0 && (
            <button className="add-btn" onClick={handleClearRequestHistory}>
              Clear
            </button>
          )}
        </div>
        <HistoryEntryList
          entries={historyEntries}
          onRestore={handleRestoreHistoryEntry}
          onDelete={handleDeleteHistoryEntry}
        />
      </div>
    </div>
  );
};

export default HistoryTab;
