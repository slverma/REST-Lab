import React, { useState } from "react";
import {
  formatJson,
  formatRelativeTime,
  formatSize,
  getStatusColor,
} from "../helpers/helper";
import { HistoryEntry } from "../types/internal.types";
import Tooltip from "./Tooltip";
import TrashIcon from "./icons/TrashIcon";

interface HistoryEntryListProps {
  entries: HistoryEntry[];
  showRequestName?: boolean;
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
                {entry.truncated && (
                  <p className="empty-hint">Some content was truncated for storage.</p>
                )}

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
                  <p className="history-detail-line">
                    {entry.response.status} {entry.response.statusText} ·{" "}
                    {formatSize(entry.response.size)}
                  </p>
                  <div className="response-headers">
                    {Object.entries(entry.response.headers).map(([k, v]) => (
                      <div key={k} className="response-header-row">
                        <span className="header-name">{k}</span>
                        <span className="header-value">{v}</span>
                      </div>
                    ))}
                  </div>
                  <pre className="history-body">
                    {renderBody(entry.response.data, entry.response.headers["content-type"])}
                  </pre>
                </div>

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
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default HistoryEntryList;
