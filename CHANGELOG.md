# Changelog

All notable changes to the REST Lab extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.0.9] - 2026-02-12

### Changed

#### Documentation Improvements

- **README Redesign** - Completely redesigned README.md with comprehensive features showcase
  - Added 14 distinct feature sections with dedicated GIF placeholder areas
  - Organized features with horizontal dividers for better readability
  - Added visual badges for VS Code Marketplace and License
  - Included "Getting Started" section with installation and quick start guide
  - Added "Usage Tips" section for best practices
  - Added "Contributing" section
  - Improved overall formatting with centered sections and professional layout
  - Each feature now has a dedicated spot for animated GIF demonstrations

---

## [0.0.8] - 2026-01-31

### Added

#### Drag & Drop Support

- **Move Requests** - Drag and drop requests between folders
  - Visual feedback with highlighted drop targets
  - Automatic folder expansion on drop
- **Move Folders** - Drag folders into other folders or to root level
  - Prevents circular references (can't drop into self or children)
  - Root level drop zone indicator when dragging folders

#### Duplicate Feature

- **Duplicate Request** - Create a copy of any request with all settings (URL, headers, body)
  - Duplicated request named with "(Copy)" suffix
  - Automatically opens the duplicated request
- **Duplicate Collection** - Deep clone entire folder hierarchies
  - Copies all requests, subfolders, and configurations recursively
  - Available in folder dropdown menu

#### Rename Feature

- **Rename Request** - Rename requests via dropdown menu
  - Input validation (non-empty names)
  - Updates stored configuration
- **Rename Collection** - Rename folders via dropdown menu
  - Pre-fills current name in input box

### Changed

- **Request Actions UI** - Consolidated all request actions (Rename, Duplicate, Delete) into a single dropdown menu
  - Cleaner interface matching folder actions pattern
  - Three-dot menu button on hover

### UI Improvements

- Added drag preview showing item name during drag operations
- Drop target highlighting with blue accent glow
- Empty folder hint changes to "Drop here to add" when dragging over

---

## [0.0.7] - 2026-01-31

### Changed

#### Build System Migration: esbuild → Vite

- **Vite Build System** - Migrated from esbuild to Vite for improved build tooling
  - Separate build configurations for extension (SSR/CJS) and webviews (IIFE)
  - Parallel webview builds for faster build times (~2x faster)
  - Proper sourcemap generation for debugging
  - Production builds with esbuild minification

- **Optimized Build Scripts**
  - `npm run build` - Development build (no minification)
  - `npm run build:prod` - Production build with minification
  - `npm run watch` - Watch mode for development
  - Replaced `vite-node` with `tsx` for faster script execution

- **Monaco Editor Improvements**
  - Configured Monaco to use inline blob workers (bypasses VS Code CSP restrictions)
  - Custom dark theme ("restlab-dark") matching VS Code aesthetics
  - Fixed clipboard paste functionality in VS Code webviews
  - Paste now works correctly with multiple Monaco editor instances

### Fixed

- **Clipboard Support** - Fixed paste (Cmd+V / Ctrl+V) not working in Monaco editors within VS Code webviews
  - Uses `navigator.clipboard.readText()` API
  - Editor-instance specific action to prevent conflicts between multiple editors

- **CSP Compatibility** - Updated Content Security Policy for webviews
  - Added `font-src data:` for Monaco fonts
  - Added `worker-src blob:` for inline workers
  - Added `'unsafe-eval'` for Monaco's dynamic code evaluation

- **JSX Runtime** - Fixed "jsxDEV is not a function" errors by using classic JSX runtime

- **React Imports** - Added explicit React imports to all components for classic JSX compatibility

### Removed

- Removed `esbuild.js` build script
- Removed `vite-node` dependency (replaced with `tsx`)

---

## [0.0.5] 15-01-2026

### Added

- **JSON Beautify Button** - Added "Beautify" button to format/prettify JSON content in request body
  - Located at the end of Content Type selector row in Body tab
  - Automatically formats JSON with proper indentation
  - Disabled when content type is not JSON or body is empty
  - Shows success/error notifications
  - Matches design system with gradient hover effects

### Fixed

- **Monaco Editor Folding Icons** - Fixed chevron icons not displaying in JSON editor
  - Resolved issue where folding controls showed squares (□) instead of proper chevron arrows (▼/►)
  - Added explicit unicode content values for folding icon rendering
  - Applied proper codicon font-family to folding control elements

---

## [0.0.3, 0.0.4] - 2024-12-19

### Added

#### Enhanced JSON Editor

- **CodeMirror Integration** - Replaced basic textarea with CodeMirror editor for JSON request bodies
- **Syntax Highlighting** - VS Code dark theme-styled syntax highlighting for JSON with distinct colors:
  - Property names in blue (#9cdcfe)
  - Strings in orange (#ce9178)
  - Numbers in green (#b5cea8)
  - Booleans and null in blue (#569cd6)
  - Brackets in gold (#ffd700)
- **Line Numbers** - Added line number gutter for easier navigation
- **Code Folding** - Collapse/expand JSON objects and arrays with fold gutter
- **Comment Support** - Toggle line comments with `Ctrl+/` (comments stripped before sending requests)
- **Keyboard Shortcuts**:
  - `Ctrl+/` - Toggle line comment
  - `Ctrl+Shift+[` - Fold code block
  - `Ctrl+Shift+]` - Unfold code block
  - Full undo/redo history support
- **Bracket Matching** - Automatic highlighting of matching brackets
- **Active Line Highlighting** - Visual indicator for current line
- **Search & Replace** - Built-in search functionality with keyboard shortcuts
- **Smart Comment Stripping** - Comments are automatically removed from JSON body before sending requests and generating cURL commands

### Changed

- **Request Body Editor** - Upgraded from plain textarea to full-featured CodeMirror editor
- **Editor Styling** - Glass-effect container with focus border highlighting
- **Editor Hints** - Added keyboard shortcut hints at the bottom of the editor

### Dependencies

- Added `@codemirror/commands` ^6.10.0
- Added `@codemirror/lang-json` ^6.0.2
- Added `@codemirror/language` ^6.11.3
- Added `@codemirror/search` ^6.5.11
- Added `@codemirror/state` ^6.5.2
- Added `@codemirror/view` ^6.39.4
- Added `@lezer/highlight` ^1.2.3

---

## [0.0.2] - 2024-12-17

### Fixed

- Minor bug fixes and stability improvements

---

## [0.0.1] - 2024-12-16

### Added

#### Core Features

- **REST API Client** - Full-featured REST API client integrated into VS Code sidebar
- **Request Editor Panel** - Dedicated webview panel for composing and sending HTTP requests
- **Response Viewer** - View response body, headers, and metadata with syntax highlighting

#### Collection Management

- **Collections (Folders)** - Organize requests into collections/folders
- **Nested Subfolders** - Support for hierarchical folder structure with unlimited nesting depth
- **Request Management** - Create, edit, duplicate, and delete requests within collections
- **Auto-expand** - Folders automatically expand when adding new requests or subfolders

#### HTTP Methods Support

- Full support for GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS methods
- Color-coded method badges for easy visual identification

#### Request Editor Features

- **URL Input** - Smart URL input with base URL resolution
- **Custom Headers** - Add/edit/remove headers with autocomplete suggestions
- **Multiple Body Types**:
  - JSON with syntax highlighting
  - XML
  - Form URL Encoded
  - Form Data with file upload support
  - Plain Text
  - HTML
- **Editable Request Names** - Click to rename requests inline

#### Response Features

- **Formatted Response Body** - Syntax highlighted output for JSON, XML, HTML
- **Response Headers** - Full headers display with copy functionality
- **Response Metadata** - Status code, response time, and size indicators
- **Copy Response** - One-click copy response to clipboard
- **Download Response** - Save response as file
- **Copy as cURL** - Export request as cURL command for terminal use

#### Collection Configuration

- **Base URL** - Set base URL per collection for easier request management
- **Default Headers** - Configure headers at collection level
- **Configuration Inheritance** - Child folders inherit parent folder configuration

#### Import Features

- **REST Lab Format** - Native format with lossless import (preserves all configuration)
- **Postman Collection v2.1** - Import from Postman exported collections
- **Thunder Client Format** - Import Thunder Client JSON exports
- **Import Dropdown** - User-friendly dropdown menu for selecting import provider

#### Export Features

- **REST Lab Format** - Native format export (preserves all settings)
- **Postman Collection v2.1** - Export to Postman compatible format
- **Thunder Client Format** - Export to Thunder Client format
- **Export Dropdown** - Quick export access from collection action buttons

#### User Interface

- **Modern Sidebar Design** - Clean, gradient-styled sidebar with REST Lab branding
- **Custom Tooltips** - Helpful tooltips on all action buttons
- **Empty State** - Friendly empty state with guidance for new users
- **Expandable Folders** - Chevron-based folder expand/collapse with smooth animations
- **Contextual Actions** - Action buttons appear on hover:
  - Add Subfolder
  - Add Request
  - Collection Settings (Base URL & Headers)
  - Export Collection
  - Delete Collection
  - Delete Request

#### Visual Design

- Sky Blue to Indigo gradient theme throughout
- Glass-effect backgrounds with subtle blur
- Method-specific color badges:
  - GET = Green
  - POST = Blue
  - PUT = Orange
  - PATCH = Purple
  - DELETE = Red
  - HEAD = Gray
  - OPTIONS = Teal
- Accent glow effects on interactive elements
- Smooth hover and focus transitions

#### Technical

- Built with React 18 and TypeScript
- VS Code Webview API for seamless integration
- Persistent storage using VS Code globalState
- esbuild for fast compilation
- Modular component architecture

---

## Future Roadmap

The following features are being considered for future releases:

- [ ] Environment variables support
- [ ] Request history
- [ ] Authentication helpers (Bearer, Basic, OAuth)
- [ ] Pre-request scripts
- [ ] Test scripts
- [ ] Drag and drop reordering
- [ ] Code generation (multiple languages)
- [ ] WebSocket support
- [ ] GraphQL support

---

_REST Lab - A modern REST API client for VS Code_
