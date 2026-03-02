import React from "react";
import { createRoot } from "react-dom/client";
import "../tailwind.css";
import { FolderEditor } from "./FolderEditor";
import "./styles.css";

const container = document.getElementById("root");
if (container) {
  const folderId = container.dataset.folderId || "";
  const folderName = container.dataset.folderName || "";
  const isCollection = container.dataset.isCollection === "true";

  const root = createRoot(container);
  root.render(
    <FolderEditor
      folderId={folderId}
      folderName={folderName}
      isCollection={isCollection}
    />,
  );
}
