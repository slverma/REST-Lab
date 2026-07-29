import * as vscode from "vscode";
import { Folder, Request, SidebarProvider } from "./providers/SidebarProvider";
import { FolderEditorProvider } from "./providers/FolderEditorProvider";
import { HistoryManager } from "./providers/HistoryManager";
import { RequestEditorProvider } from "./providers/RequestEditorProvider";
import { HistoryEditorProvider } from "./providers/HistoryEditorProvider";
import {
  FolderConfig,
  RequestConfig,
} from "./webview/types/internal.types";

async function seedDefaultData(
  context: vscode.ExtensionContext,
): Promise<void> {
  const existing = context.globalState.get<Folder[]>("restlab.folders");
  if (existing && existing.length > 0) return;

  const COLLECTION_ID = "restlab-example-collection";
  const POSTS_ID = "restlab-example-posts";
  const USERS_ID = "restlab-example-users";
  const REQ_GET_POSTS = "restlab-example-req-get-posts";
  const REQ_GET_POST = "restlab-example-req-get-post";
  const REQ_CREATE_POST = "restlab-example-req-create-post";
  const REQ_DELETE_POST = "restlab-example-req-delete-post";
  const REQ_GET_USERS = "restlab-example-req-get-users";
  const REQ_GET_USER = "restlab-example-req-get-user";
  const ENV_DEV_ID = "restlab-example-env-dev";
  const ENV_PROD_ID = "restlab-example-env-prod";
  const now = Date.now();

  const folderTree: Folder[] = [
    {
      id: COLLECTION_ID,
      name: "JSONPlaceholder",
      createdAt: now,
      requests: [],
      subfolders: [
        {
          id: POSTS_ID,
          name: "Posts",
          createdAt: now,
          parentId: COLLECTION_ID,
          requests: [
            { id: REQ_GET_POSTS, name: "Get all posts", folderId: POSTS_ID, method: "GET" } as Request,
            { id: REQ_GET_POST, name: "Get post by ID", folderId: POSTS_ID, method: "GET" } as Request,
            { id: REQ_CREATE_POST, name: "Create post", folderId: POSTS_ID, method: "POST" } as Request,
            { id: REQ_DELETE_POST, name: "Delete post", folderId: POSTS_ID, method: "DELETE" } as Request,
          ],
          subfolders: [],
        },
        {
          id: USERS_ID,
          name: "Users",
          createdAt: now,
          parentId: COLLECTION_ID,
          requests: [
            { id: REQ_GET_USERS, name: "Get all users", folderId: USERS_ID, method: "GET" } as Request,
            { id: REQ_GET_USER, name: "Get user by ID", folderId: USERS_ID, method: "GET" } as Request,
          ],
          subfolders: [],
        },
      ],
    },
  ];

  const folderConfig: FolderConfig = {
    baseUrl: "https://jsonplaceholder.typicode.com",
    headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
    params: [],
    environments: [
      {
        id: ENV_DEV_ID,
        name: "Development",
        variables: [
          { key: "baseUrl", value: "https://jsonplaceholder.typicode.com", enabled: true },
          { key: "userId", value: "1", enabled: true },
        ],
      },
      {
        id: ENV_PROD_ID,
        name: "Production",
        variables: [
          { key: "baseUrl", value: "https://jsonplaceholder.typicode.com", enabled: true },
          { key: "userId", value: "1", enabled: true },
        ],
      },
    ],
    activeEnvironmentId: ENV_DEV_ID,
  };

  const requests: RequestConfig[] = [
    {
      id: REQ_GET_POSTS,
      name: "Get all posts",
      folderId: POSTS_ID,
      method: "GET",
      url: "/posts",
    },
    {
      id: REQ_GET_POST,
      name: "Get post by ID",
      folderId: POSTS_ID,
      method: "GET",
      url: "/posts/1",
    },
    {
      id: REQ_CREATE_POST,
      name: "Create post",
      folderId: POSTS_ID,
      method: "POST",
      url: "/posts",
      contentType: "application/json",
      body: JSON.stringify({ title: "foo", body: "bar", userId: 1 }, null, 2),
    },
    {
      id: REQ_DELETE_POST,
      name: "Delete post",
      folderId: POSTS_ID,
      method: "DELETE",
      url: "/posts/1",
    },
    {
      id: REQ_GET_USERS,
      name: "Get all users",
      folderId: USERS_ID,
      method: "GET",
      url: "/users",
    },
    {
      id: REQ_GET_USER,
      name: "Get user by ID",
      folderId: USERS_ID,
      method: "GET",
      url: "/users/1",
    },
  ];

  try {
    await Promise.all([
      context.globalState.update("restlab.folders", folderTree),
      context.globalState.update(`restlab.folder.${COLLECTION_ID}`, folderConfig),
      ...requests.map((r) =>
        context.globalState.update(`restlab.request.${r.id}`, r),
      ),
      context.globalState.update("restlab.expandedFolders", [
        COLLECTION_ID,
        POSTS_ID,
      ]),
    ]);
  } catch (err) {
    await context.globalState.update("restlab.folders", undefined);
    console.error("REST Lab: failed to seed default data", err);
  }
}

export async function activate(context: vscode.ExtensionContext) {
  console.log("REST Lab extension is now active!");
  await seedDefaultData(context);

  // Initialize the history manager and sidebar provider
  const historyManager = new HistoryManager(context);
  const sidebarProvider = new SidebarProvider(
    context.extensionUri,
    context,
    historyManager,
  );

  // Register the sidebar webview provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "restlab-sidebar-view",
      sidebarProvider,
    ),
  );

  // Register the folder editor provider
  const folderEditorProvider = new FolderEditorProvider(context);
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      "restlab.folderEditor",
      folderEditorProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      },
    ),
  );

  // Register the request editor provider
  const requestEditorProvider = new RequestEditorProvider(context);

  // Register command to create folder
  context.subscriptions.push(
    vscode.commands.registerCommand("restlab.createFolder", async () => {
      const folderName = await vscode.window.showInputBox({
        prompt: "Enter Collection name",
        placeHolder: "New Collection",
      });

      if (folderName) {
        sidebarProvider.addFolder(folderName);
      }
    }),
  );

  // Register command to open folder configuration
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "restlab.openFolderConfig",
      (folderId: string, folderName: string) => {
        FolderEditorProvider.openFolderEditor(
          context,
          folderId,
          folderName,
          sidebarProvider,
        );
      },
    ),
  );

  // Register command to open request editor
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "restlab.openRequest",
      (requestId: string, requestName: string, folderId: string) => {
        RequestEditorProvider.openRequestEditor(
          context,
          requestId,
          requestName,
          folderId,
          historyManager,
          sidebarProvider,
        );
      },
    ),
  );

  // Register command to open the global history panel
  context.subscriptions.push(
    vscode.commands.registerCommand("restlab.openHistory", () => {
      HistoryEditorProvider.openHistoryPanel(context, sidebarProvider);
    }),
  );

  // Register command to import collection
  context.subscriptions.push(
    vscode.commands.registerCommand("restlab.importCollection", async () => {
      await sidebarProvider.importCollection();
    }),
  );
}

export function deactivate() {}
