import React from "react";
import { createRoot } from "react-dom/client";
import "./sidebar.css";
import { Sidebar } from "./Sidebar";
import "./drag-drop.css";

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<Sidebar />);
}
