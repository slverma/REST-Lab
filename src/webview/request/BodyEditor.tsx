import Editor, { OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import React, { useEffect, useRef, useState } from "react";

// VS Code sets one of these classes on <body> in every webview and keeps it
// live-updated when the user switches color themes — no extension-host
// round trip needed, we just watch the class attribute.
const VSCODE_THEME_CLASS_TO_MONACO_THEME: Record<string, string> = {
  "vscode-light": "vs",
  "vscode-dark": "vs-dark",
  "vscode-high-contrast": "hc-black",
  "vscode-high-contrast-light": "hc-light",
};

const getMonacoThemeFromBody = (): string => {
  for (const [vscodeClass, monacoTheme] of Object.entries(
    VSCODE_THEME_CLASS_TO_MONACO_THEME,
  )) {
    if (document.body.classList.contains(vscodeClass)) return monacoTheme;
  }
  return "vs-dark";
};

type MonacoEditorProps = {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  language: string;
  readOnly?: boolean;
  showHint?: string;
  formatOnChange?: boolean;
  editorInstanceRef?: React.MutableRefObject<Monaco.editor.IStandaloneCodeEditor | null>;
  envVariables?: Record<string, string>;
};

const BodyEditor: React.FC<MonacoEditorProps> = ({
  value,
  onChange,
  placeholder,
  className,
  language,
  readOnly = false,
  showHint,
  formatOnChange = false,
  editorInstanceRef,
  envVariables = {},
}) => {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Keep a ref in sync so the completion provider always reads fresh vars
  const envVarsRef = useRef<Record<string, string>>(envVariables);
  const completionDisposableRef = useRef<Monaco.IDisposable | null>(null);
  const findWidgetListenerRef = useRef<((e: KeyboardEvent) => void) | null>(null);
  const [monacoTheme, setMonacoTheme] = useState(getMonacoThemeFromBody);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setMonacoTheme(getMonacoThemeFromBody());
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    envVarsRef.current = envVariables;
  }, [envVariables]);

  useEffect(() => {
    return () => {
      if (findWidgetListenerRef.current && editorRef.current) {
        const container = editorRef.current.getContainerDomNode();
        container.removeEventListener(
          "keydown",
          findWidgetListenerRef.current,
          true,
        );
      }
    };
  }, []);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Add custom paste action for VS Code webview clipboard support
    // Using addAction instead of addCommand to avoid conflicts between multiple editors
    editor.addAction({
      id: "custom-paste",
      label: "Paste",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV],
      contextMenuGroupId: "9_cutcopypaste",
      contextMenuOrder: 3,
      run: async (ed) => {
        if (readOnly) return;
        try {
          const text = await navigator.clipboard.readText();
          if (text) {
            const selection = ed.getSelection();
            if (selection) {
              ed.executeEdits("paste", [
                {
                  range: selection,
                  text: text,
                  forceMoveMarkers: true,
                },
              ]);
            }
          }
        } catch (err) {
          // Fallback: try using document.execCommand for older API
          console.debug("Clipboard API not available:", err);
        }
      },
    });

    // Fix paste (Ctrl+V / Cmd+V) inside Monaco's built-in find widget
    const container = editor.getContainerDomNode();
    findWidgetListenerRef.current = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inFindWidget =
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA") &&
        !!target.closest(".find-widget");
      if (!inFindWidget) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard
          .readText()
          .then((text) => {
            if (!text) return;
            const inputEl = e.target as HTMLInputElement | HTMLTextAreaElement;
            const start = inputEl.selectionStart ?? inputEl.value.length;
            const end = inputEl.selectionEnd ?? inputEl.value.length;
            inputEl.value =
              inputEl.value.substring(0, start) +
              text +
              inputEl.value.substring(end);
            inputEl.selectionStart = inputEl.selectionEnd = start + text.length;
            inputEl.dispatchEvent(new Event("input", { bubbles: true }));
          })
          .catch((err) => {
            console.debug("Clipboard read failed in find widget:", err);
          });
      }
    };
    container.addEventListener("keydown", findWidgetListenerRef.current, true);

    // Store ref if provided
    if (editorInstanceRef) {
      editorInstanceRef.current = editor;
    }

    // Register {{ variable completion provider (fires when user types `{`)
    if (!readOnly) {
      completionDisposableRef.current =
        monaco.languages.registerCompletionItemProvider(
          editor.getModel()?.getLanguageId() ?? "plaintext",
          {
            triggerCharacters: ["{"],
            provideCompletionItems: (model: Monaco.editor.ITextModel, position: Monaco.Position) => {
              const textBefore = model.getValueInRange({
                startLineNumber: position.lineNumber,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
              });
              // Only suggest when the two preceding chars are `{{`
              if (!textBefore.endsWith("{{")) return { suggestions: [] };
              const vars = envVarsRef.current;
              const varKeys = Object.keys(vars);
              if (varKeys.length === 0) return { suggestions: [] };
              return {
                suggestions: varKeys.map((key) => ({
                  label: `{{${key}}}`,
                  kind: monaco.languages.CompletionItemKind.Variable,
                  insertText: `${key}}}`,
                  detail: vars[key] ? `= ${vars[key]}` : "(empty value)",
                  documentation: {
                    value: `**${key}** = ${vars[key] ?? ""} \n\nEnvironment variable`,
                  },
                  range: {
                    startLineNumber: position.lineNumber,
                    startColumn: position.column,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column,
                  },
                })),
              };
            },
          },
        );
    }
  };

  const handleChange = (newValue: string | undefined) => {
    const val = newValue ?? "";
    onChange?.(val);
  };

  return (
    <div
      ref={containerRef}
      className={`json-editor-container ${className || ""}`}
    >
      <Editor
        height="100%"
        language={language}
        value={value}
        theme={monacoTheme}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        options={{
          readOnly,
          domReadOnly: readOnly,
          lineNumbers: "on",
          folding: true,
          showFoldingControls: "always",
          foldingStrategy: "indentation",
          foldingHighlight: true,
          glyphMargin: false,
          lineDecorationsWidth: 10,
          lineNumbersMinChars: 3,
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
          renderLineHighlight: "all",
          selectionHighlight: true,
          occurrencesHighlight: "singleFile",
          matchBrackets: "always",
          wordWrap: "on",
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
          automaticLayout: true,
          tabSize: 2,
          renderValidationDecorations: "on",
          formatOnType: !readOnly && formatOnChange,
          formatOnPaste: !readOnly && formatOnChange,
          contextmenu: true,
          quickSuggestions: false,
          suggestOnTriggerCharacters: true,
        }}
      />
      {placeholder && !value && (
        <div className="editor-placeholder">{placeholder}</div>
      )}
      {showHint && (
        <div className="json-editor-hint">
          <span>{showHint}</span>
        </div>
      )}
    </div>
  );
};

export default BodyEditor;
