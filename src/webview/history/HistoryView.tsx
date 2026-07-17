import React, { useEffect, useState } from "react";
import HistoryEntryList from "../components/HistoryEntryList";
import { HistoryEntry } from "../types/internal.types";

declare function acquireVsCodeApi(): {
  postMessage: (message: unknown) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
};

const vscode = acquireVsCodeApi();

export const HistoryView: React.FC = () => {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    vscode.postMessage({ type: "getHistory" });

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === "historyUpdated") {
        setEntries(message.entries || []);
        setEnabled(message.enabled ?? true);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleRestore = (entryId: string) => {
    vscode.postMessage({ type: "restoreHistoryEntry", entryId });
  };

  const handleDelete = (entryId: string) => {
    vscode.postMessage({ type: "deleteHistoryEntry", entryId });
  };

  const handleClearAll = () => {
    vscode.postMessage({ type: "clearAllHistory" });
  };

  const handleToggleEnabled = () => {
    const next = !enabled;
    setEnabled(next);
    vscode.postMessage({ type: "setHistoryEnabled", enabled: next });
  };

  return (
    <div className="history-page">
      <div className="history-page-header">
        <h1>Request History</h1>
        <div className="history-page-header-actions">
          <label className="history-toggle">
            <input
              type="checkbox"
              checked={enabled}
              onChange={handleToggleEnabled}
            />
            <span>Keep tracking</span>
          </label>
          {entries.length > 0 && (
            <button className="add-btn" onClick={handleClearAll}>
              Clear All
            </button>
          )}
        </div>
      </div>
      {!enabled && (
        <p className="empty-hint history-paused-hint">
          Tracking is paused — new requests won't be added to history.
        </p>
      )}
      <div className="history-page-body">
        <HistoryEntryList
          entries={entries}
          showRequestName
          onRestore={handleRestore}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
};
