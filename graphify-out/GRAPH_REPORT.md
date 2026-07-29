# Graph Report - .  (2026-07-29)

## Corpus Check
- 145 files · ~183,723 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 700 nodes · 1163 edges · 80 communities (43 shown, 37 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 41 edges (avg confidence: 0.83)
- Token cost: 21,000 input · 1,266,478 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Env Vars & Autocomplete Input|Env Vars & Autocomplete Input]]
- [[_COMMUNITY_Collection ImportExport Parsing|Collection Import/Export Parsing]]
- [[_COMMUNITY_SidebarProvider Tree CRUD|SidebarProvider Tree CRUD]]
- [[_COMMUNITY_Response Formatting & Truncation|Response Formatting & Truncation]]
- [[_COMMUNITY_Cookie Support & First-Launch Seed|Cookie Support & First-Launch Seed]]
- [[_COMMUNITY_Core Architecture & Persistence Docs|Core Architecture & Persistence Docs]]
- [[_COMMUNITY_Build & Release Dev Dependencies|Build & Release Dev Dependencies]]
- [[_COMMUNITY_Request Editor Tabs & Context|Request Editor Tabs & Context]]
- [[_COMMUNITY_History Editor Panel Feature|History Editor Panel Feature]]
- [[_COMMUNITY_Auth Tab & Request Context|Auth Tab & Request Context]]
- [[_COMMUNITY_Provider Cross-Panel Coordination|Provider Cross-Panel Coordination]]
- [[_COMMUNITY_Webview Entry Points & Monaco Worker|Webview Entry Points & Monaco Worker]]
- [[_COMMUNITY_Request Context Helpers (cURLAuth)|Request Context Helpers (cURL/Auth)]]
- [[_COMMUNITY_package.json Manifest Metadata|package.json Manifest Metadata]]
- [[_COMMUNITY_TypeScript Compiler Config|TypeScript Compiler Config]]
- [[_COMMUNITY_Fluid Layout & Response Panel Redesign|Fluid Layout & Response Panel Redesign]]
- [[_COMMUNITY_HistoryManager CRUD Methods|HistoryManager CRUD Methods]]
- [[_COMMUNITY_HistoryEditorProvider Delegation|HistoryEditorProvider Delegation]]
- [[_COMMUNITY_Sidebar Webview Entry & Icons|Sidebar Webview Entry & Icons]]
- [[_COMMUNITY_Body Editor & Monaco Theme|Body Editor & Monaco Theme]]
- [[_COMMUNITY_History Panel Providers|History Panel Providers]]
- [[_COMMUNITY_Shared Data Type Definitions|Shared Data Type Definitions]]
- [[_COMMUNITY_Dropdown Action Icons|Dropdown Action Icons]]
- [[_COMMUNITY_FolderRequest Drag-Drop UI|Folder/Request Drag-Drop UI]]
- [[_COMMUNITY_History Entry List & Dialogs|History Entry List & Dialogs]]
- [[_COMMUNITY_File Upload  Form Data|File Upload / Form Data]]
- [[_COMMUNITY_RequestEditorProvider Panel Lifecycle|RequestEditorProvider Panel Lifecycle]]
- [[_COMMUNITY_ImportExport Provider Icons|Import/Export Provider Icons]]
- [[_COMMUNITY_Bearer & API Key Auth Design|Bearer & API Key Auth Design]]
- [[_COMMUNITY_Auth Config Inheritance|Auth Config Inheritance]]
- [[_COMMUNITY_Spacing Token System|Spacing Token System]]
- [[_COMMUNITY_FolderEditorProvider Lifecycle|FolderEditorProvider Lifecycle]]
- [[_COMMUNITY_Vite Build Script|Vite Build Script]]
- [[_COMMUNITY_Create-User Demo Screenshot|Create-User Demo Screenshot]]
- [[_COMMUNITY_VS Code Contribution Points|VS Code Contribution Points]]
- [[_COMMUNITY_npm Runtime Dependencies|npm Runtime Dependencies]]
- [[_COMMUNITY_npm Build Scripts|npm Build Scripts]]
- [[_COMMUNITY_Expanded Folders Persistence|Expanded Folders Persistence]]
- [[_COMMUNITY_Add-Collection Icon Asset|Add-Collection Icon Asset]]
- [[_COMMUNITY_Folder AddImport Icons|Folder Add/Import Icons]]
- [[_COMMUNITY_First-Launch Seed Data|First-Launch Seed Data]]
- [[_COMMUNITY_Claude Local Settings|Claude Local Settings]]
- [[_COMMUNITY_Repository Metadata|Repository Metadata]]
- [[_COMMUNITY_Eye Icon Component|Eye Icon Component]]
- [[_COMMUNITY_VS Code Launch Config|VS Code Launch Config]]
- [[_COMMUNITY_VS Code Tasks Config|VS Code Tasks Config]]
- [[_COMMUNITY_Delete Request Wiring|Delete Request Wiring]]
- [[_COMMUNITY_Rename Folder Wiring|Rename Folder Wiring]]
- [[_COMMUNITY_Rename Request Wiring|Rename Request Wiring]]
- [[_COMMUNITY_Collection Icon Theme Pair|Collection Icon Theme Pair]]
- [[_COMMUNITY_Folder Icon Theme Pair|Folder Icon Theme Pair]]
- [[_COMMUNITY_Request Icon Theme Pair|Request Icon Theme Pair]]
- [[_COMMUNITY_Extension Branding Icon|Extension Branding Icon]]
- [[_COMMUNITY_Deploy Script|Deploy Script]]
- [[_COMMUNITY_Tab Strip Scroll Hook|Tab Strip Scroll Hook]]
- [[_COMMUNITY_Claude Code Permissions|Claude Code Permissions]]
- [[_COMMUNITY_MIT License|MIT License]]
- [[_COMMUNITY_Sidebar View Resolution|Sidebar View Resolution]]
- [[_COMMUNITY_Delete Folder Method|Delete Folder Method]]
- [[_COMMUNITY_Add Request Method|Add Request Method]]
- [[_COMMUNITY_Duplicate Request Method|Duplicate Request Method]]
- [[_COMMUNITY_Duplicate Folder Method|Duplicate Folder Method]]
- [[_COMMUNITY_Move Request Method|Move Request Method]]
- [[_COMMUNITY_Move Folder Method|Move Folder Method]]
- [[_COMMUNITY_Custom Folder Editor Resolution|Custom Folder Editor Resolution]]
- [[_COMMUNITY_History Lookup by Request|History Lookup by Request]]
- [[_COMMUNITY_Clear History for Request|Clear History for Request]]
- [[_COMMUNITY_Monaco Worker Module Declaration|Monaco Worker Module Declaration]]
- [[_COMMUNITY_Monaco Environment Config|Monaco Environment Config]]
- [[_COMMUNITY_Custom Monaco Theme|Custom Monaco Theme]]
- [[_COMMUNITY_BasicAPI Key Auth UI|Basic/API Key Auth UI]]
- [[_COMMUNITY_Folder Settings Auth Section|Folder Settings Auth Section]]
- [[_COMMUNITY_Sidebar Flask Icon|Sidebar Flask Icon]]
- [[_COMMUNITY_ExportImport Demo GIF|Export/Import Demo GIF]]

## God Nodes (most connected - your core abstractions)
1. `SidebarProvider` - 52 edges
2. `useRequestContext()` - 17 edges
3. `RequestEditorProvider` - 16 edges
4. `HistoryManager` - 16 edges
5. `RequestContextProvider()` - 14 edges
6. `compilerOptions` - 13 edges
7. `getNonce()` - 13 edges
8. `activate()` - 11 edges
9. `FolderEditorProvider` - 11 edges
10. `HistoryResponseViewer()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `scripts/deploy.sh (manual release/deploy script)` --semantically_similar_to--> `.releaserc.js (Semantic Release Configuration)`  [INFERRED] [semantically similar]
  scripts/deploy.sh → .releaserc.js
- `CLAUDE.md (architecture & contributor guide)` --references--> `scripts/build.js (Vite build script)`  [AMBIGUOUS]
  CLAUDE.md → scripts/build.js
- `scripts/deploy.sh (manual release/deploy script)` --references--> `.github/workflows/release.yml (Semantic Release CI job)`  [AMBIGUOUS]
  scripts/deploy.sh → .github/workflows/release.yml
- `Folders Demo GIF` --conceptually_related_to--> `SidebarProvider`  [EXTRACTED]
  resources/demo/folders.gif → src/providers/SidebarProvider.ts
- `Folder Settings Demo (GIF)` --conceptually_related_to--> `FolderEditorProvider`  [EXTRACTED]
  resources/demo/folder-settings-only.gif → src/providers/FolderEditorProvider.ts

## Hyperedges (group relationships)
- **Automated release pipeline: commit analysis -> changelog -> version bump -> publish** — releaserc, workflows_release, changelog, package [INFERRED 0.85]
- **Front-end asset build/style pipeline (Vite + PostCSS + Tailwind + TypeScript)** — scripts_build, tsconfig, postcss_config, tailwind_config [INFERRED 0.80]
- **Local extension-host debug launch flow (VS Code tasks + launch configs + npm scripts)** — vscode_launch, vscode_tasks, package [INFERRED 0.75]
- **globalState Persistence Key Contract** — src_extension_seeddefaultdata, providers_sidebarprovider_sidebarprovider, providers_requesteditorprovider_requesteditorprovider, providers_foldereditorprovider_foldereditorprovider, providers_historymanager_historymanager [INFERRED 0.85]
- **Multi-format Collection Import/Export Interop (RESTLab, Postman, Thunder Client)** — utils_importparser_parserestlabcollection, utils_importparser_parsepostmancollection, utils_importparser_parsethunderclientcollection, utils_exportparser_exporttorestlab, utils_exportparser_exporttopostman, utils_exportparser_exporttothunderclient [INFERRED 0.85]
- **Static Map-tracked WebviewPanel Lifecycle Pattern** — providers_requesteditorprovider_requesteditorprovider, providers_foldereditorprovider_foldereditorprovider, providers_historyeditorprovider_historyeditorprovider [INFERRED 0.80]
- **Sidebar Tree Item Actions Flow** — sidebar_sidebar_sidebar, sidebar_folderitem_folderitem, sidebar_folderactionsdropdown_folderactionsdropdown, sidebar_requestactionsdropdown_requestactionsdropdown [INFERRED 0.85]
- **Folder/Collection Settings Editor Flow** — editor_foldereditor_foldereditor, editor_settingstab_settingstab, editor_environmentstab_environmentstab [INFERRED 0.85]
- **Parallel Environment Variable Management UIs** — sidebar_environmentmodal_environmentmodal, editor_foldereditor_foldereditor, editor_environmentstab_environmentstab [INFERRED 0.75]
- **Tab/panel components consuming RequestContext directly** — request_headertab_headertab, request_paramstab_paramstab, request_cookietab_cookietab, request_historytab_historytab, request_responsepanel_responsepanel, request_formfieldeditor_formfieldeditor, request_varinput_varinput [INFERRED 0.80]
- **Inherited-value enable/disable override pattern (headers vs params)** — request_headertab_headertab, request_paramstab_paramstab, request_requestcontext_requestcontextprovider [INFERRED 0.85]
- **Request history capture/restore/delete flow** — request_historytab_historytab, history_historyview_historyview, request_requestcontext_requestcontextprovider, utils_historymanager_historymanager [INFERRED 0.75]
- **Tooltip-warned, confirm-gated history restore** — components_historyentrylist_historyentryactions, components_tooltip_tooltip, components_confirmdialog_confirmdialog [EXTRACTED 1.00]
- **Tooltip-wrapped icon action toolbar for response viewing** — components_historyresponseviewer_historyresponseviewer, components_tooltip_tooltip, icons_copyicon_copyicon, icons_downloadicon_downloadicon, icons_pencilicon_pencilicon [EXTRACTED 1.00]
- **Shared auto-growing single-line textarea pattern** — components_autocompleteinput_autocompleteinput, components_autogrowtextarea_autogrowtextarea, helpers_useautogrow_useautogrow [INFERRED 0.95]
- **Request History Feature Family** — plans_2026_07_16_request_history_historymanager, plans_2026_07_16_history_editor_panel_historyeditorprovider, plans_2026_07_29_history_response_viewer_historyresponseviewer, plans_2026_07_17_history_opt_out_enabled_flag [EXTRACTED 0.90]
- **Request Auth & Security Config Family** — plans_2026_05_17_bearer_auth_authconfig_type, plans_2026_05_17_api_key_basic_auth_resolveauth, plans_2026_05_17_cookie_integration_cookie_types [INFERRED 0.80]
- **Request/Response Panel Visual Redesign** — plans_2026_05_17_response_panel_improvements_responsepanel, plans_2026_06_05_fluid_layout_tailwind_removal_fluid_tokens, plans_2026_07_19_modern_panel_redesign_rounded_panels [EXTRACTED 0.90]
- **History Feature Iterative Redesign** — specs_2026_07_16_request_history_design_request_history, specs_2026_07_16_history_editor_panel_design_history_editor_panel, specs_2026_07_29_history_response_viewer_design_history_response_viewer [EXTRACTED 1.00]
- **Auth Configuration System Evolution** — specs_2026_05_17_bearer_auth_design_bearer_auth, specs_2026_05_17_api_key_basic_auth_design_api_key_basic_auth, specs_2026_05_17_api_key_basic_auth_design_authconfig_type [EXTRACTED 1.00]
- **Fluid Spacing Token System Across UI Passes** — specs_2026_06_05_fluid_layout_tailwind_removal_design_em_token_scale, specs_2026_07_19_modern_panel_redesign_design_shared_tokens, specs_2026_07_19_modern_panel_redesign_design_modern_panel_redesign [INFERRED 0.85]
- **OBSERVATION: SVG asset misplaced among .tsx icon components** —  [INFERRED 0.55]

## Communities (80 total, 37 thin omitted)

### Community 0 - "Env Vars & Autocomplete Input"
Cohesion: 0.06
Nodes (32): AutocompleteInput(), AutoGrowTextarea(), AutoGrowTextareaProps, Environment Variable Support Demo (env-support.gif), EnvironmentsTab(), EnvironmentsTabProps, EnvVarInput(), EnvVarInputProps (+24 more)

### Community 1 - "Collection Import/Export Parsing"
Cohesion: 0.06
Nodes (44): SidebarProvider._handleCreateRequestFromCurl, SidebarProvider._handleExportCollection, SidebarProvider._handleImportCollection, parseCurlCommand(), ParsedCurlRequest, tokenize(), collectConfigs(), convertFolderToPostmanItems() (+36 more)

### Community 3 - "Response Formatting & Truncation"
Cohesion: 0.12
Nodes (18): buildTruncationMessage(), byteLength(), HistoryResponseViewer(), HistoryResponseViewerProps, ResponseTab, Response Format Demo, formatJson(), formatSize() (+10 more)

### Community 4 - "Cookie Support & First-Launch Seed"
Cohesion: 0.11
Nodes (28): Persisted Expanded-Folder State (restlab.expandedFolders), Persist Expanded Folders Plan, Cookie / ResponseCookie Types, CookieTab Component, Cookie Integration Plan, Set-Cookie Response Parsing (parseSetCookie), Seeded JSONPlaceholder Example Collection, First-Launch Seed Data Plan (+20 more)

### Community 5 - "Core Architecture & Persistence Docs"
Cohesion: 0.10
Nodes (25): CHANGELOG.md (REST Lab release history), CLAUDE.md (architecture & contributor guide), Folder configuration inheritance (child overrides parent, same-key merge), globalState persistence model (folders/folder-config/request-config/expanded-state keys), Three independent React webview bundles (sidebar/editor/request) communicating only via postMessage, Conventional Commits specification, package.json (npm manifest), axios dependency (+17 more)

### Community 6 - "Build & Release Dev Dependencies"
Cohesion: 0.08
Nodes (24): devDependencies, autoprefixer, concurrently, conventional-changelog-conventionalcommits, postcss, semantic-release, @semantic-release/changelog, @semantic-release/commit-analyzer (+16 more)

### Community 7 - "Request Editor Tabs & Context"
Cohesion: 0.18
Nodes (11): Header Name Autocomplete Demo (GIF), CookieTab(), HeaderTab(), HistoryTab(), ParamsTab(), useRequestContext(), VarInput(), VarInputProps (+3 more)

### Community 8 - "History Editor Panel Feature"
Cohesion: 0.10
Nodes (23): src/webview/history/ bundle (HistoryView.tsx, 4th Vite build), Global History as an Editor Panel Design, HistoryEditorProvider (new singleton panel provider), SidebarProvider history methods refactor (public delegation methods), HistoryEntry type, HistoryEntryList.tsx (shared list component), HistoryManager (addEntry/getAll/prune), HistoryPanel.tsx (sidebar global history, later superseded) (+15 more)

### Community 9 - "Auth Tab & Request Context"
Cohesion: 0.14
Nodes (14): AuthMode, AuthTab(), AuthTabProps, configToMode(), RequestEditorContent(), EnvironmentModalProps, AuthConfig, Cookie (+6 more)

### Community 10 - "Provider Cross-Panel Coordination"
Cohesion: 0.15
Nodes (18): FolderEditorProvider.openFolderEditor, RequestEditorProvider.broadcastToAllPanels, RequestEditorProvider.openRequestEditor, parseSetCookie(), RequestEditorProvider.refreshPanelConfig, RequestEditorProvider._sendHttpRequest, SidebarProvider.addFolder, SidebarProvider.getActiveEnvVariables (+10 more)

### Community 11 - "Webview Entry Points & Monaco Worker"
Cohesion: 0.13
Nodes (11): Request Editor Demo (GIF), HistoryView(), vscode, history/index.tsx (webview entry), container, root, request/index.tsx (webview entry), container (+3 more)

### Community 12 - "Request Context Helpers (cURL/Auth)"
Cohesion: 0.28
Nodes (14): generateCurlCommand(), formDataToBody(), interpolateVariables(), isFormContentType(), resolveAuth(), stripJsonComments(), ActiveTab, RequestContext (+6 more)

### Community 13 - "package.json Manifest Metadata"
Cohesion: 0.13
Nodes (14): activationEvents, categories, description, displayName, engines, vscode, icon, keywords (+6 more)

### Community 14 - "TypeScript Compiler Config"
Cohesion: 0.13
Nodes (14): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, jsx, lib, module, moduleResolution, outDir (+6 more)

### Community 15 - "Fluid Layout & Response Panel Redesign"
Cohesion: 0.20
Nodes (14): ResizeObserver Auto-Layout (isSmallScreen), EyeIcon Component, Monaco Find-Widget Paste Fix, Response Panel Improvements Plan, ResponsePanel Component, --rl-* Fluid Spacing Tokens, Fluid Layout + Sidebar Tailwind Removal Plan, sidebar.css (Custom CSS Replacing Tailwind) (+6 more)

### Community 16 - "HistoryManager CRUD Methods"
Cohesion: 0.25
Nodes (3): HistoryManager.addEntry, HistoryManager, truncateIfNeeded()

### Community 17 - "HistoryEditorProvider Delegation"
Cohesion: 0.16
Nodes (14): HistoryEditorProvider._buildHistoryPayload, HistoryEditorProvider.openHistoryPanel, HistoryEditorProvider.refreshIfOpen, HistoryManager.clearAll, HistoryManager.deleteEntry, HistoryManager.getAll, HistoryManager.isEnabled, HistoryManager.setEnabled (+6 more)

### Community 18 - "Sidebar Webview Entry & Icons"
Cohesion: 0.15
Nodes (8): HistoryIconProps, ImportDropdown(), container, Sidebar Webview Entry, root, DragData, Sidebar(), vscode

### Community 19 - "Body Editor & Monaco Theme"
Cohesion: 0.18
Nodes (8): getBodyPlaceholder(), BodyEditor(), MonacoEditorProps, VSCODE_THEME_CLASS_TO_MONACO_THEME, BodyTab(), BodyTabProps, RequestConfig, CONTENT_TYPES

### Community 20 - "History Panel Providers"
Cohesion: 0.32
Nodes (5): HistoryEditorProvider, ResponseCookie, getNonce(), handleDownloadResponse(), handleOpenResponseInEditor()

### Community 21 - "Shared Data Type Definitions"
Cohesion: 0.23
Nodes (9): FolderConfig, SidebarProvider._applyImportResult, Environment, EnvVariable, Folder, FolderConfig, Request, seedDefaultData() (+1 more)

### Community 23 - "Folder/Request Drag-Drop UI"
Cohesion: 0.23
Nodes (9): TooltipPosition, Drag-and-Drop Reordering Demo (drag-drop.gif), DragHandleIcon(), FolderActionsDropdown(), FolderItem(), FolderItemProps, getMethodColor(), RequestActionsDropdown() (+1 more)

### Community 24 - "History Entry List & Dialogs"
Cohesion: 0.25
Nodes (9): ConfirmDialog(), ConfirmDialogProps, HistoryEntryActions(), HistoryEntryList(), HistoryEntryListProps, renderBody(), Tooltip(), formatRelativeTime() (+1 more)

### Community 25 - "File Upload / Form Data"
Cohesion: 0.22
Nodes (5): File Upload Demo (form-data attachment), hasFileFields(), DownloadIcon(), UploadIcon(), FormFieldEditor()

### Community 27 - "Import/Export Provider Icons"
Cohesion: 0.20
Nodes (3): EXPORT_FORMATS, IMPORT_PROVIDERS, ImportProvider

### Community 28 - "Bearer & API Key Auth Design"
Cohesion: 0.20
Nodes (10): API Key & Basic Auth Design, AuthConfig type (bearer|basic|apikey|none), curl.ts (auth-aware cURL export), RequestContext.tsx (auth merge in handleSendRequest), resolveAuth() function, AuthConfig type (bearer|none), AuthTab.tsx (new Bearer tab), Bearer Token Authentication Design (+2 more)

### Community 29 - "Auth Config Inheritance"
Cohesion: 0.42
Nodes (9): API Key Auth Type, Basic Auth Type, API Key & Basic Auth Plan, resolveAuth Helper (generalized auth resolver), AuthConfig Discriminated Union, AuthTab Component (Request Editor), Bottom-Up Auth Inheritance (getInheritedConfig), Bearer Token Authentication Plan (+1 more)

### Community 30 - "Spacing Token System"
Cohesion: 0.25
Nodes (8): Em spacing token scale (--rl-sp1..5, --rl-ctrl, --rl-icon), Fluid Layout Fix + Sidebar Tailwind Removal, sidebar.css (new semantic stylesheet), Sidebar Tailwind removal, Modern Panel Redesign (Rounded Sections + Dotted Divider), Dot-indicator resize handle (idle dots / hover line), Shared spacing/radius token consolidation, Sidebar dedicated drag-handle grip (⋮⋮)

### Community 32 - "Vite Build Script"
Cohesion: 0.38
Nodes (6): buildAll(), createWebviewConfig(), __dirname, extensionConfig, isWatch, rootDir

### Community 33 - "Create-User Demo Screenshot"
Cohesion: 0.53
Nodes (6): create-user.png - REST Lab 'create user' POST request demo screenshot, create user request: POST http://localhost:5002/users, e-mart collection (folder in REST Lab sidebar), Request body: JSON (application/json) with nested user profile/preferences fields, Response: 200 OK, 18ms, 62 B, JSON body {status: success, data: {id: uuid}}, REST Lab extension UI (activity-bar sidebar + request editor panel)

### Community 34 - "VS Code Contribution Points"
Cohesion: 0.33
Nodes (6): contributes, commands, views, viewsContainers, restlab-sidebar, activitybar

### Community 35 - "npm Runtime Dependencies"
Cohesion: 0.33
Nodes (6): dependencies, axios, form-data, @monaco-editor/react, react, react-dom

### Community 36 - "npm Build Scripts"
Cohesion: 0.33
Nodes (6): scripts, build, build:prod, compile, vscode:prepublish, watch

### Community 37 - "Expanded Folders Persistence"
Cohesion: 0.40
Nodes (5): restlab.expandedFolders globalState key, Persist Expanded Folders State, saveExpandedFolders wire message, Sidebar.tsx (expanded-folders state), SidebarProvider (expanded-folders handling)

### Community 38 - "Add-Collection Icon Asset"
Cohesion: 0.50
Nodes (3): add-collection.svg (stacked plates + plus badge icon), CollectionAddIcon(), CollectionAddIconProps

### Community 40 - "First-Launch Seed Data"
Cohesion: 0.50
Nodes (4): Deterministic hard-coded seed IDs, First-Launch Seed Data Design, JSONPlaceholder seeded collection structure, seedDefaultData() function

### Community 42 - "Repository Metadata"
Cohesion: 0.67
Nodes (3): repository, type, url

## Ambiguous Edges - Review These
- `package.json (npm manifest)` → `scripts/build.js (Vite build script)`  [AMBIGUOUS]
  package.json · relation: references
- `scripts/build.js (Vite build script)` → `CLAUDE.md (architecture & contributor guide)`  [AMBIGUOUS]
  CLAUDE.md · relation: references
- `scripts/deploy.sh (manual release/deploy script)` → `.github/workflows/release.yml (Semantic Release CI job)`  [AMBIGUOUS]
  scripts/deploy.sh · relation: references

## Knowledge Gaps
- **231 isolated node(s):** `name`, `displayName`, `description`, `publisher`, `version` (+226 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `package.json (npm manifest)` and `scripts/build.js (Vite build script)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `scripts/build.js (Vite build script)` and `CLAUDE.md (architecture & contributor guide)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `scripts/deploy.sh (manual release/deploy script)` and `.github/workflows/release.yml (Semantic Release CI job)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `SidebarProvider` connect `SidebarProvider Tree CRUD` to `Provider Cross-Panel Coordination`, `History Panel Providers`, `Shared Data Type Definitions`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `activate()` connect `Provider Cross-Panel Coordination` to `SidebarProvider Tree CRUD`, `HistoryManager CRUD Methods`, `HistoryEditorProvider Delegation`, `Shared Data Type Definitions`, `RequestEditorProvider Panel Lifecycle`, `FolderEditorProvider Lifecycle`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `RequestEditorProvider` connect `RequestEditorProvider Panel Lifecycle` to `Provider Cross-Panel Coordination`, `Request Context Helpers (cURL/Auth)`, `History Panel Providers`, `Shared Data Type Definitions`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `name`, `displayName`, `description` to the rest of the system?**
  _234 weakly-connected nodes found - possible documentation gaps or missing edges._