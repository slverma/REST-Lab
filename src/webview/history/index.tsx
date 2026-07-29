import React from "react";
import { createRoot } from "react-dom/client";
// Configure Monaco to use local bundle (must be before any Monaco usage)
import "../config/monaco";
import "./styles.css";
import { HistoryView } from "./HistoryView";

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<HistoryView />);
}
