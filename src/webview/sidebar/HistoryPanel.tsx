import React, { useEffect, useState } from "react";
import HistoryEntryList from "../components/HistoryEntryList";
import { HistoryEntry } from "../types/internal.types";
import { vscode } from "./Sidebar";

const HistoryPanel: React.FC = () => {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    vscode.postMessage({ type: "getHistory" });

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === "historyUpdated") {
        setEntries(message.entries || []);
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

  return (
    <div className="sb-history">
      <HistoryEntryList
        entries={entries}
        showRequestName
        onRestore={handleRestore}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default HistoryPanel;
