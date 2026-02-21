import React from "react";
import { createRoot } from "react-dom/client";
// Configure Monaco to use local bundle (must be before any Monaco usage)
import "../config/monaco";
import { RequestEditor } from "./RequestEditor";
import "../tailwind.css";
import "./styles.css";

const container = document.getElementById("root");
if (container) {
  const requestId = container.dataset.requestId || "";
  const requestName = container.dataset.requestName || "";
  const folderId = container.dataset.folderId || "";

  const root = createRoot(container);
  root.render(
    <RequestEditor
      requestId={requestId}
      requestName={requestName}
      folderId={folderId}
    />,
  );
}
