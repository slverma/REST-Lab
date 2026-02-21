import { Folder, FolderConfig } from "../providers/SidebarProvider";
import * as vscode from "vscode";

interface RequestConfig {
  method?: string;
  url?: string;
  headers?: { key: string; value: string }[];
  body?: string;
  contentType?: string;
  formData?: { key: string; value: string; type: string }[];
}

// RESTLab native format
interface RESTLabCollection {
  version: string;
  exportedAt: string;
  type: "restlab-collection";
  folder: Folder;
  folderConfigs: { [folderId: string]: FolderConfig };
  requestConfigs: { [requestId: string]: RequestConfig };
}

export async function exportToRESTLab(
  folder: Folder,
  context: vscode.ExtensionContext
): Promise<RESTLabCollection> {
  const collection: RESTLabCollection = {
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    type: "restlab-collection",
    folder: folder,
    folderConfigs: {},
    requestConfigs: {},
  };

  // Collect all folder configs and request configs recursively
  await collectConfigs(folder, collection, context);

  return collection;
}

async function collectConfigs(
  folder: Folder,
  collection: RESTLabCollection,
  context: vscode.ExtensionContext
): Promise<void> {
  // Get folder config
  const folderConfig = context.globalState.get<FolderConfig>(
    `restlab.folder.${folder.id}`
  );
  if (folderConfig) {
    collection.folderConfigs[folder.id] = folderConfig;
  }

  // Get request configs
  if (folder.requests) {
    for (const request of folder.requests) {
      const requestConfig = context.globalState.get<RequestConfig>(
        `restlab.request.${request.id}`
      );
      if (requestConfig) {
        collection.requestConfigs[request.id] = requestConfig;
      }
    }
  }

  // Process subfolders recursively
  if (folder.subfolders) {
    for (const subfolder of folder.subfolders) {
      await collectConfigs(subfolder, collection, context);
    }
  }
}

// Postman Collection v2.1 format
interface PostmanCollection {
  info: {
    name: string;
    schema: string;
    _postman_id?: string;
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
  header: { key: string; value: string; type: string }[];
  body?: {
    mode: string;
    raw?: string;
    options?: {
      raw?: {
        language: string;
      };
    };
  };
  url: {
    raw: string;
    host?: string[];
    path?: string[];
  };
}

interface PostmanVariable {
  key: string;
  value: string;
  type: string;
}

export async function exportToPostman(
  folder: Folder,
  context: vscode.ExtensionContext
): Promise<PostmanCollection> {
  const folderConfig = context.globalState.get<FolderConfig>(
    `restlab.folder.${folder.id}`
  );

  const collection: PostmanCollection = {
    info: {
      name: folder.name,
      schema:
        "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      _postman_id: folder.id,
    },
    item: [],
    variable: [],
  };

  // Add base URL as variable if present
  if (folderConfig?.baseUrl) {
    collection.variable = [
      {
        key: "baseUrl",
        value: folderConfig.baseUrl,
        type: "string",
      },
    ];
  }

  // Convert folders and requests recursively
  collection.item = await convertFolderToPostmanItems(folder, context);

  return collection;
}

async function convertFolderToPostmanItems(
  folder: Folder,
  context: vscode.ExtensionContext
): Promise<PostmanItem[]> {
  const items: PostmanItem[] = [];

  // Add subfolders as nested items
  if (folder.subfolders) {
    for (const subfolder of folder.subfolders) {
      const subfolderItem: PostmanItem = {
        name: subfolder.name,
        item: await convertFolderToPostmanItems(subfolder, context),
      };
      items.push(subfolderItem);
    }
  }

  // Add requests
  if (folder.requests) {
    for (const request of folder.requests) {
      const requestConfig = context.globalState.get<RequestConfig>(
        `restlab.request.${request.id}`
      );

      const postmanItem: PostmanItem = {
        name: request.name,
        request: {
          method: requestConfig?.method || request.method || "GET",
          header: (requestConfig?.headers || []).map((h) => ({
            key: h.key,
            value: h.value,
            type: "text",
          })),
          url: {
            raw: requestConfig?.url || "",
          },
        },
      };

      // Add body if present
      if (requestConfig?.body) {
        const contentType = requestConfig.contentType || "json";
        let language = "json";
        let mode = "raw";

        if (contentType === "application/xml" || contentType === "xml") {
          language = "xml";
        } else if (contentType === "text/plain" || contentType === "text") {
          language = "text";
        } else if (contentType === "text/html" || contentType === "html") {
          language = "html";
        }

        postmanItem.request!.body = {
          mode,
          raw: requestConfig.body,
          options: {
            raw: {
              language,
            },
          },
        };
      }

      items.push(postmanItem);
    }
  }

  return items;
}

export async function exportToThunderClient(
  folder: Folder,
  context: vscode.ExtensionContext
): Promise<ThunderCollection> {
  const folderConfig = context.globalState.get<FolderConfig>(
    `restlab.folder.${folder.id}`
  );

  const collection: ThunderCollection = {
    collectionName: folder.name,
    folders: [],
    requests: [],
  };

  // Convert recursively
  await convertFolderToThunderFormat(folder, collection, context);

  return collection;
}

interface ThunderCollection {
  collectionName: string;
  folders?: ThunderFolder[];
  requests?: ThunderRequest[];
}

interface ThunderFolder {
  name: string;
  folders?: ThunderFolder[];
  requests?: ThunderRequest[];
}

interface ThunderRequest {
  name: string;
  method: string;
  url: string;
  headers?: { name: string; value: string }[];
  body?: {
    type?: string;
    raw?: string;
  };
}

async function convertFolderToThunderFormat(
  folder: Folder,
  target: ThunderCollection | ThunderFolder,
  context: vscode.ExtensionContext
): Promise<void> {
  // Add subfolders
  if (folder.subfolders) {
    if (!target.folders) {
      target.folders = [];
    }
    for (const subfolder of folder.subfolders) {
      const thunderFolder: ThunderFolder = {
        name: subfolder.name,
        folders: [],
        requests: [],
      };
      await convertFolderToThunderFormat(subfolder, thunderFolder, context);
      target.folders.push(thunderFolder);
    }
  }

  // Add requests
  if (folder.requests) {
    if (!target.requests) {
      target.requests = [];
    }
    for (const request of folder.requests) {
      const requestConfig = context.globalState.get<RequestConfig>(
        `restlab.request.${request.id}`
      );

      const thunderRequest: ThunderRequest = {
        name: request.name,
        method: requestConfig?.method || request.method || "GET",
        url: requestConfig?.url || "",
      };

      // Add headers
      if (requestConfig?.headers && requestConfig.headers.length > 0) {
        thunderRequest.headers = requestConfig.headers.map((h) => ({
          name: h.key,
          value: h.value,
        }));
      }

      // Add body
      if (requestConfig?.body) {
        thunderRequest.body = {
          type: requestConfig.contentType || "json",
          raw: requestConfig.body,
        };
      }

      target.requests.push(thunderRequest);
    }
  }
}
