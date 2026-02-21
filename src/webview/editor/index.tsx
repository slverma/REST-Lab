import React from "react";
import { createRoot } from "react-dom/client";
import { FolderEditor } from "./FolderEditor";
import "../tailwind.css";
import "./styles.css";

const container = document.getElementById("root");
if (container) {
  const folderId = container.dataset.folderId || "";
  const folderName = container.dataset.folderName || "";

  const root = createRoot(container);
  root.render(<FolderEditor folderId={folderId} folderName={folderName} />);
}
