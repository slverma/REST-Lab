import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";

// Import worker source code as raw strings to create blob workers
// This avoids cross-origin issues in VS Code webviews
// @ts-ignore
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker.js?worker";
// @ts-ignore
import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker.js?worker";

// Configure Monaco to use inline blob workers
// This is required for VS Code webviews due to CSP/CORS restrictions
(self as any).MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === "json") {
      return new JsonWorker();
    }
    return new EditorWorker();
  },
};

// Configure Monaco to use local bundle instead of CDN
loader.config({ monaco });

// Register a dark theme that matches VS Code
monaco.editor.defineTheme("restlab-dark", {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "6A9955" },
    { token: "keyword", foreground: "569CD6" },
    { token: "string", foreground: "CE9178" },
    { token: "number", foreground: "B5CEA8" },
    { token: "type", foreground: "4EC9B0" },
  ],
  colors: {
    "editor.background": "#1e1e1e",
    "editor.foreground": "#d4d4d4",
    "editor.lineHighlightBackground": "#2d2d2d",
    "editor.selectionBackground": "#264f78",
    "editorCursor.foreground": "#aeafad",
    "editorWhitespace.foreground": "#3b3b3b",
  },
});

export { monaco };
