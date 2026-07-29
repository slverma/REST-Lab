import React, { useState } from "react";
import { formatRelativeTime, getStatusColor } from "../helpers/helper";
import { formatJson } from "../helpers/helper";
import { HistoryEntry } from "../types/internal.types";
import HistoryResponseViewer from "./HistoryResponseViewer";
import Tooltip from "./Tooltip";
import TrashIcon from "./icons/TrashIcon";

interface HistoryEntryListProps {
  entries: HistoryEntry[];
  showRequestName?: boolean;
  vscode: { postMessage: (message: unknown) => void };
  onRestore: (entryId: string) => void;
  onDelete: (entryId: string) => void;
}

const renderBody = (body: string | undefined, contentType?: string): string => {
  if (!body) return "";
  return contentType?.includes("json") ? formatJson(body) : body;
};

const HistoryEntryList: React.FC<HistoryEntryListProps> = ({
  entries,
  showRequestName = false,
  vscode,
  onRestore,
  onDelete,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (entries.length === 0) {
    return <p className="empty-hint">No history yet</p>;
  }

  return (
    <div className="history-list">
      {entries.map((entry) => {
        const isExpanded = expandedId === entry.id;
        return (
          <div key={entry.id} className="history-entry">
            <div
              className="history-entry-row"
              onClick={() =>
                setExpandedId((prev) => (prev === entry.id ? null : entry.id))
              }
              role="button"
              tabIndex={0}
            >
              <span
                className={`method-badge method-${entry.request.method.toLowerCase()}`}
              >
                {entry.request.method}
              </span>
              {showRequestName && (
                <span className="history-request-name">{entry.requestName}</span>
              )}
              <span className="history-url" title={entry.request.resolvedUrl}>
                {entry.request.url || entry.request.resolvedUrl}
              </span>
              <span className={`status-badge ${getStatusColor(entry.response.status)}`}>
                {entry.response.status === 0 ? "Network Error" : entry.response.status}
              </span>
              <span className="time-badge">{entry.response.time}ms</span>
              <span className="history-timestamp">
                {formatRelativeTime(entry.timestamp)}
              </span>
            </div>

            {isExpanded && (
              <div className="history-entry-details">
                <div className="history-detail-section">
                  <h4>Request</h4>
                  <p className="history-detail-line">
                    <strong>{entry.request.method}</strong> {entry.request.resolvedUrl}
                  </p>
                  {entry.request.headers.length > 0 && (
                    <div className="response-headers">
                      {entry.request.headers.map((h, i) => (
                        <div key={i} className="response-header-row">
                          <span className="header-name">{h.key}</span>
                          <span className="header-value">{h.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {entry.request.body && (
                    <pre className="history-body">
                      {renderBody(entry.request.body, entry.request.contentType)}
                    </pre>
                  )}
                </div>

                <div className="history-detail-section">
                  <h4>Response</h4>
                  <HistoryResponseViewer
                    response={entry.response}
                    truncated={entry.truncated}
                    vscode={vscode}
                  />
                </div>

                <HistoryEntryActions
                  entry={entry}
                  onRestore={onRestore}
                  onDelete={onDelete}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Placeholder for Task 4 — Task 4 replaces this with the real
// restore-confirmation-aware implementation and removes this comment.
const HistoryEntryActions: React.FC<{
  entry: HistoryEntry;
  onRestore: (entryId: string) => void;
  onDelete: (entryId: string) => void;
}> = ({ entry, onRestore, onDelete }) => (
  <div className="history-entry-actions">
    <button
      className="add-btn"
      onClick={(e) => {
        e.stopPropagation();
        onRestore(entry.id);
      }}
    >
      Restore
    </button>
    <Tooltip text="Delete this entry" position="top-right">
      <button
        className="remove-btn"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(entry.id);
        }}
      >
        <TrashIcon />
      </button>
    </Tooltip>
  </div>
);

export default HistoryEntryList;
