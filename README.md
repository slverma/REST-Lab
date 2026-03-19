# REST Lab

### A modern REST API client for Visual Studio Code. Test, debug, and manage your APIs with a beautiful, intuitive interface.

<div align="center">

![REST Lab](resources/demo/create-user.png)

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/slverma.restlab?style=flat-square&label=VS%20Code%20Marketplace&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=slverma.restlab)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE.md)

</div>

---

## ✨ Features

### 🚀 Full HTTP Method Support

Test your APIs with all standard HTTP methods including GET, POST, PUT, PATCH, DELETE, HEAD, and OPTIONS.

<!-- ![HTTP Methods Demo](link-to-gif) -->

---

### 📁 Organize with Collections & Folders

Create folders to organize your API requests. Keep your workspace clean and structured with unlimited collections.

![Create Folders Demo](resources/demo/folders.gif)

---

### ⚙️ Folder-Level Configuration

Set base URLs and default headers at the folder level. All requests within a folder automatically inherit these settings, reducing repetitive configuration.

![Folder Config Demo](resources/demo/folder-settings-only.gif)

---

### 🌍 Environment Support

Create multiple environments per collection (for example: Local, Staging, Production), mark one as active, and use variables across requests.

- Collection-scoped environments with fast switching
- Enable/disable individual variables
- Variable autocomplete when typing `{{` in supported fields
- Real-time interpolation preview in the request URL

Use variable syntax:

- `{{baseUrl}}`
- `{{token}}`
- `{{userId}}`

Variables are applied in:

- Request URL and query params
- Request headers
- Request body
- Folder settings such as base URL, header values, and query params

![Environment Support Demo](resources/demo/env-support.gif)

---

### 📝 Modern Request Editor

Clean, intuitive interface for crafting requests with editable names, organized tabs, and easy-to-use editors.

![Request Editor Demo](resources/demo/request-editor.gif)

---

### 🎯 Multiple Content Types

Support for all common content types:

- JSON (with syntax highlighting)
- XML
- Form URL Encoded
- Multipart Form Data
- Plain Text
- HTML

<!-- ![Content Types Demo](link-to-gif) -->

---

### 📤 File Upload Support

Easily upload files using multipart form data with built-in file picker.

![File Upload Demo](resources/demo/file-upload.gif)

---

### 💡 Smart Header Autocomplete

Intelligent autocomplete for common HTTP headers makes request configuration faster and error-free.

![Autocomplete Demo](resources/demo/header-autocomplete.gif)

---

### 📊 Beautiful Response Viewer

View formatted responses with:

- Syntax-highlighted JSON/XML
- Response headers display
- Status code indicators
- Response time tracking
- Response size metrics

![Response Viewer Demo](resources/demo/response-format.gif)

---

### 📥 Export/Import Collections

Export/Import your existing collections from:

- REST Lab native format
- Postman (v2.1 format)
- Thunder Client

Share your API collections with team members or backup your work.

![Import Collections Demo](resources/demo/export-import.gif)

---

### 🔧 Copy as cURL

Generate cURL commands from any request with a single click. Perfect for sharing API calls or debugging in terminal.

<!-- ![Copy cURL Demo](link-to-gif) -->

---

### 🎨 Drag & Drop Organization

Reorder your requests and folders with intuitive drag-and-drop functionality.

![Drag Drop Demo](resources/demo/drag-drop.gif)

---

### 💾 Persistent Storage

All your requests, folders, and configurations are automatically saved and persist across VS Code sessions.

<!-- ![Persistent Storage Demo](link-to-gif) -->

---

### 📋 Response Actions

- Copy response data to clipboard
- Download response as file
- Beautify JSON/XML responses
- View raw response data

<!-- ![Response Actions Demo](link-to-gif) -->

---

## 🚀 Getting Started

### Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "REST Lab"
4. Click Install

### Quick Start

1. **Open REST Lab**: Click the REST Lab icon in the Activity Bar (left sidebar)
2. **Create a Folder**: Click the folder icon (📁) to create your first collection
3. **Configure Folder** (Optional): Click the ⚙️ icon to set base URL and default headers
4. **Add Environment** (Optional): In collection settings, open the Environments tab and add env variables
5. **Add Request**: Click the ➕ icon to create a new request
6. **Send Request**: Configure your request and click the Send button!

### Environment Quick Start

1. Open a collection and go to the **Environments** tab
2. Create environments like `Local`, `Staging`, and `Production`
3. Add variables such as `baseUrl`, `token`, `userId`
4. Mark one environment as active
5. Use variables in requests with `{{variableName}}`
6. Switch the active environment from the request editor dropdown when needed

### Environment Behavior

- Environments are stored at the root collection level
- Nested folders and requests use the active environment from their root collection
- Only enabled variables are applied
- If a variable does not exist, the placeholder is left unchanged
- In folder settings, local active-environment variables override inherited environment variables with the same key

---

## 💡 Usage Tips

- **Organize by Project**: Create separate folders for different APIs or projects
- **Use Base URLs**: Set base URLs at the folder level to avoid repetition
- **Default Headers**: Configure common headers (like Authorization) at folder level
- **Use Environments**: Keep separate values for local, staging, and production
- **Use Variables Everywhere**: Reuse `{{variables}}` in URLs, headers, params, and body
- **Quick Testing**: Press Send button or use keyboard shortcuts for faster testing
- **Import Existing**: Migrate from Postman or Thunder Client using the import feature

---

## 📋 Requirements

- Visual Studio Code 1.85.0 or later

---

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues and pull requests.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

---

<div align="center">

**Enjoy testing your APIs with REST Lab!** 🧪

Made with ❤️ for the VS Code community

</div>
