import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { HistoryView } from "./HistoryView";

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<HistoryView />);
}
