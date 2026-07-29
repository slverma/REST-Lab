import * as vscode from "vscode";

export async function handleDownloadResponse(message: {
  content: string;
  filename: string;
}): Promise<void> {
  const uri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(message.filename),
    filters: {
      "All Files": ["*"],
      JSON: ["json"],
      XML: ["xml"],
      Text: ["txt"],
      HTML: ["html"],
    },
  });
  if (uri) {
    await vscode.workspace.fs.writeFile(
      uri,
      Buffer.from(message.content, "utf-8"),
    );
    vscode.window.showInformationMessage(`Response saved to ${uri.fsPath}`);
  }
}

export async function handleOpenResponseInEditor(message: {
  content: string;
  extension?: string;
  mimeType?: string;
}): Promise<void> {
  let languageId = "plaintext";
  if (message.extension === "json") {
    languageId = "json";
  } else if (message.extension === "xml") {
    languageId = "xml";
  } else if (message.extension === "html") {
    languageId = "html";
  } else if (message.mimeType?.includes("json")) {
    languageId = "json";
  } else if (message.mimeType?.includes("xml")) {
    languageId = "xml";
  } else if (message.mimeType?.includes("html")) {
    languageId = "html";
  }

  const doc = await vscode.workspace.openTextDocument({
    content: message.content,
    language: languageId,
  });
  await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
}
