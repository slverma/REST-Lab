import { Folder, Request, FolderConfig } from "../providers/SidebarProvider";

export interface ImportedRequest {
  id: string;
  name: string;
  folderId: string;
  method: string;
  url: string;
  headers?: { key: string; value: string }[];
  body?: string;
  contentType?: string;
}

export interface ImportResult {
  folders: Folder[];
  requests: Map<string, ImportedRequest>;
  folderConfigs: Map<string, FolderConfig>;
}

// Postman Collection v2.1 types
interface PostmanCollection {
  info: {
    name: string;
    schema?: string;
  };
  item: PostmanItem[];
  variable?: PostmanVariable[];
}

interface PostmanItem {
  name: string;
  item?: PostmanItem[];
  request?: PostmanRequest;
}

interface PostmanRequest {
  method: string;
  header?: PostmanHeader[];
  body?: PostmanBody;
  url: string | PostmanUrl;
}

interface PostmanUrl {
  raw: string;
  host?: string[];
  path?: string[];
  query?: { key: string; value: string }[];
}

interface PostmanHeader {
  key: string;
  value: string;
  disabled?: boolean;
}

interface PostmanBody {
  mode: string;
  raw?: string;
  formdata?: { key: string; value: string; type?: string }[];
  urlencoded?: { key: string; value: string }[];
}

interface PostmanVariable {
  key: string;
  value: string;
}

// Thunder Client types
interface ThunderCollection {
  collectionName?: string;
  colName?: string;
  requests?: ThunderRequest[];
  folders?: ThunderFolder[];
}

interface ThunderFolder {
  name: string;
  requests?: ThunderRequest[];
  folders?: ThunderFolder[];
}

interface ThunderRequest {
  name: string;
  method: string;
  url: string;
  headers?: { name: string; value: string }[];
  body?: {
    type?: string;
    raw?: string;
    form?: { name: string; value: string }[];
  };
}

// RESTLab native format
interface RESTLabCollection {
  version: string;
  exportedAt: string;
  type: "restlab-collection";
  folder: Folder;
  folderConfigs: { [folderId: string]: FolderConfig };
  requestConfigs: {
    [requestId: string]: {
      method: string;
      url: string;
      headers?: { key: string; value: string }[];
      body?: string;
      contentType?: string;
      formData?: { key: string; value: string; type: string }[];
    };
  };
}

export function parseImportedFile(
  content: string,
  fileName: string,
  provider?: string,
): ImportResult {
  try {
    const json = JSON.parse(content);

    // If provider is specified, try that format first
    if (provider === "restlab") {
      if (isRESTLabCollection(json)) {
        return parseRESTLabCollection(json);
      }
      throw new Error(
        "The selected file does not appear to be a valid REST Lab collection.",
      );
    }

    if (provider === "postman") {
      if (isPostmanCollection(json)) {
        return parsePostmanCollection(json);
      }
      throw new Error(
        "The selected file does not appear to be a valid Postman collection.",
      );
    }

    if (provider === "thunder-client") {
      if (isThunderClientCollection(json)) {
        return parseThunderClientCollection(json);
      }
      throw new Error(
        "The selected file does not appear to be a valid Thunder Client collection.",
      );
    }

    // Auto-detect format if no provider specified
    if (isRESTLabCollection(json)) {
      return parseRESTLabCollection(json);
    } else if (isPostmanCollection(json)) {
      return parsePostmanCollection(json);
    } else if (isThunderClientCollection(json)) {
      return parseThunderClientCollection(json);
    } else {
      throw new Error(
        "Unknown format. Please import a RESTLab, Postman, or Thunder Client collection.",
      );
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Invalid JSON file. Please check the file format.");
    }
    throw error;
  }
}

function isRESTLabCollection(json: unknown): json is RESTLabCollection {
  return (
    typeof json === "object" &&
    json !== null &&
    "type" in json &&
    (json as RESTLabCollection).type === "restlab-collection" &&
    "folder" in json
  );
}

function parseRESTLabCollection(collection: RESTLabCollection): ImportResult {
  const result: ImportResult = {
    folders: [],
    requests: new Map(),
    folderConfigs: new Map(),
  };

  // Generate new IDs to avoid conflicts
  const idMap = new Map<string, string>();

  // Clone and remap folder with new IDs
  const remapFolder = (folder: Folder, newParentId?: string): Folder => {
    const newId = `folder-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    idMap.set(folder.id, newId);

    const newFolder: Folder = {
      id: newId,
      name: folder.name,
      createdAt: Date.now(),
      parentId: newParentId,
      requests: [],
      subfolders: [],
    };

    // Remap requests
    if (folder.requests) {
      for (const request of folder.requests) {
        const newRequestId = `request-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        idMap.set(request.id, newRequestId);

        newFolder.requests!.push({
          id: newRequestId,
          name: request.name,
          folderId: newId,
          method: request.method,
        });

        // Add request config
        const oldConfig = collection.requestConfigs[request.id];
        if (oldConfig) {
          result.requests.set(newRequestId, {
            id: newRequestId,
            name: request.name,
            folderId: newId,
            method: oldConfig.method || request.method,
            url: oldConfig.url || "",
            headers: oldConfig.headers,
            body: oldConfig.body,
            contentType: oldConfig.contentType,
          });
        }
      }
    }

    // Remap subfolders recursively
    if (folder.subfolders) {
      for (const subfolder of folder.subfolders) {
        newFolder.subfolders!.push(remapFolder(subfolder, newId));
      }
    }

    // Add folder config
    const oldFolderConfig = collection.folderConfigs[folder.id];
    if (oldFolderConfig) {
      result.folderConfigs.set(newId, oldFolderConfig);
    }

    return newFolder;
  };

  const importedFolder = remapFolder(collection.folder);
  result.folders.push(importedFolder);

  return result;
}

function isPostmanCollection(json: unknown): json is PostmanCollection {
  return (
    typeof json === "object" &&
    json !== null &&
    "info" in json &&
    "item" in json
  );
}

function isThunderClientCollection(json: unknown): json is ThunderCollection {
  return (
    typeof json === "object" &&
    json !== null &&
    ("collectionName" in json ||
      "colName" in json ||
      ("requests" in json &&
        Array.isArray((json as ThunderCollection).requests)))
  );
}

function parsePostmanCollection(collection: PostmanCollection): ImportResult {
  const result: ImportResult = {
    folders: [],
    requests: new Map(),
    folderConfigs: new Map(),
  };

  const collectionName = collection.info.name || "Imported Collection";
  const rootFolder: Folder = {
    id: `folder-${Date.now()}`,
    name: collectionName,
    createdAt: Date.now(),
    requests: [],
    subfolders: [],
  };

  // Extract base URL from variables if present
  let baseUrl = "";
  if (collection.variable) {
    const baseUrlVar = collection.variable.find(
      (v) => v.key === "baseUrl" || v.key === "base_url" || v.key === "host",
    );
    if (baseUrlVar) {
      baseUrl = baseUrlVar.value;
    }
  }

  if (baseUrl) {
    result.folderConfigs.set(rootFolder.id, { baseUrl });
  }

  parsePostmanItems(collection.item, rootFolder, result, baseUrl);

  result.folders.push(rootFolder);
  return result;
}

function parsePostmanItems(
  items: PostmanItem[],
  parentFolder: Folder,
  result: ImportResult,
  baseUrl: string,
): void {
  for (const item of items) {
    if (item.item && item.item.length > 0) {
      // This is a folder
      const subfolder: Folder = {
        id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: item.name,
        createdAt: Date.now(),
        parentId: parentFolder.id,
        requests: [],
        subfolders: [],
      };

      if (!parentFolder.subfolders) {
        parentFolder.subfolders = [];
      }
      parentFolder.subfolders.push(subfolder);

      parsePostmanItems(item.item, subfolder, result, baseUrl);
    } else if (item.request) {
      // This is a request
      const request = parsePostmanRequest(item, parentFolder.id, baseUrl);
      if (!parentFolder.requests) {
        parentFolder.requests = [];
      }
      parentFolder.requests.push({
        id: request.id,
        name: request.name,
        folderId: request.folderId,
        method: request.method,
      });
      result.requests.set(request.id, request);
    }
  }
}

function parsePostmanRequest(
  item: PostmanItem,
  folderId: string,
  baseUrl: string,
): ImportedRequest {
  const req = item.request!;
  const requestId = `request-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  // Parse URL
  let url = "";
  if (typeof req.url === "string") {
    url = req.url;
  } else if (req.url) {
    url = req.url.raw || "";
  }

  // Remove base URL from the request URL if it starts with it
  if (baseUrl && url.startsWith(baseUrl)) {
    url = url.substring(baseUrl.length);
  }

  // Replace Postman variables {{var}} with empty string or keep as placeholder
  url = url.replace(/\{\{[^}]+\}\}/g, "");

  // Parse headers
  const headers: { key: string; value: string }[] = [];
  if (req.header) {
    for (const h of req.header) {
      if (!h.disabled) {
        headers.push({ key: h.key, value: h.value });
      }
    }
  }

  // Parse body
  let body = "";
  let contentType = "";
  if (req.body) {
    switch (req.body.mode) {
      case "raw":
        body = req.body.raw || "";
        // Try to detect content type from headers
        const ctHeader = headers.find(
          (h) => h.key.toLowerCase() === "content-type",
        );
        if (ctHeader) {
          contentType = ctHeader.value;
        } else {
          // Assume JSON if body looks like JSON
          if (body.trim().startsWith("{") || body.trim().startsWith("[")) {
            contentType = "application/json";
          }
        }
        break;
      case "urlencoded":
        contentType = "application/x-www-form-urlencoded";
        if (req.body.urlencoded) {
          body = req.body.urlencoded
            .map(
              (p) =>
                `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`,
            )
            .join("&");
        }
        break;
      case "formdata":
        contentType = "multipart/form-data";
        // Form data will be stored differently
        break;
    }
  }

  return {
    id: requestId,
    name: item.name,
    folderId,
    method: req.method || "GET",
    url,
    headers: headers.length > 0 ? headers : undefined,
    body: body || undefined,
    contentType: contentType || undefined,
  };
}

function parseThunderClientCollection(
  collection: ThunderCollection,
): ImportResult {
  const result: ImportResult = {
    folders: [],
    requests: new Map(),
    folderConfigs: new Map(),
  };

  const collectionName =
    collection.collectionName || collection.colName || "Imported Collection";
  const rootFolder: Folder = {
    id: `folder-${Date.now()}`,
    name: collectionName,
    createdAt: Date.now(),
    requests: [],
    subfolders: [],
  };

  // Parse root level requests
  if (collection.requests) {
    for (const req of collection.requests) {
      const request = parseThunderRequest(req, rootFolder.id);
      if (!rootFolder.requests) {
        rootFolder.requests = [];
      }
      rootFolder.requests.push({
        id: request.id,
        name: request.name,
        folderId: request.folderId,
        method: request.method,
      });
      result.requests.set(request.id, request);
    }
  }

  // Parse folders
  if (collection.folders) {
    parseThunderFolders(collection.folders, rootFolder, result);
  }

  result.folders.push(rootFolder);
  return result;
}

function parseThunderFolders(
  folders: ThunderFolder[],
  parentFolder: Folder,
  result: ImportResult,
): void {
  for (const folder of folders) {
    const subfolder: Folder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: folder.name,
      createdAt: Date.now(),
      parentId: parentFolder.id,
      requests: [],
      subfolders: [],
    };

    if (!parentFolder.subfolders) {
      parentFolder.subfolders = [];
    }
    parentFolder.subfolders.push(subfolder);

    // Parse requests in this folder
    if (folder.requests) {
      for (const req of folder.requests) {
        const request = parseThunderRequest(req, subfolder.id);
        if (!subfolder.requests) {
          subfolder.requests = [];
        }
        subfolder.requests.push({
          id: request.id,
          name: request.name,
          folderId: request.folderId,
          method: request.method,
        });
        result.requests.set(request.id, request);
      }
    }

    // Recursively parse subfolders
    if (folder.folders) {
      parseThunderFolders(folder.folders, subfolder, result);
    }
  }
}

function parseThunderRequest(
  req: ThunderRequest,
  folderId: string,
): ImportedRequest {
  const requestId = `request-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  // Parse headers
  const headers: { key: string; value: string }[] = [];
  if (req.headers) {
    for (const h of req.headers) {
      headers.push({ key: h.name, value: h.value });
    }
  }

  // Parse body
  let body = "";
  let contentType = "";
  if (req.body) {
    if (req.body.type === "json" || req.body.type === "text") {
      body = req.body.raw || "";
      contentType =
        req.body.type === "json" ? "application/json" : "text/plain";
    } else if (req.body.type === "formencoded" && req.body.form) {
      contentType = "application/x-www-form-urlencoded";
      body = req.body.form
        .map(
          (p) => `${encodeURIComponent(p.name)}=${encodeURIComponent(p.value)}`,
        )
        .join("&");
    } else if (req.body.type === "formdata") {
      contentType = "multipart/form-data";
    }
  }

  return {
    id: requestId,
    name: req.name,
    folderId,
    method: req.method || "GET",
    url: req.url || "",
    headers: headers.length > 0 ? headers : undefined,
    body: body || undefined,
    contentType: contentType || undefined,
  };
}
