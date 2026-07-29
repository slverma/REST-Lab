import { AuthConfig, Environment, FormDataItem } from "../types/internal.types";

// Get editor language based on content type
export const getEditorLanguageFromContentType = (
  contentType?: string,
): string => {
  if (!contentType) return "plaintext";
  const ct = contentType.toLowerCase();
  if (ct.includes("json")) return "json";
  if (ct.includes("xml")) return "xml";
  if (ct.includes("html")) return "html";
  if (ct.includes("css")) return "css";
  if (ct.includes("javascript") || ct.includes("ecmascript")) {
    return "javascript";
  }
  return "plaintext";
};

// Format JSON string with proper indentation
export const formatJson = (data: string): string => {
  try {
    return JSON.stringify(JSON.parse(data), null, 2);
  } catch {
    return data;
  }
};

// Get status color class based on HTTP status code
export const getStatusColor = (status: number): string => {
  if (status >= 200 && status < 300) return "status-success";
  if (status >= 300 && status < 400) return "status-redirect";
  if (status >= 400 && status < 500) return "status-client-error";
  if (status >= 500) return "status-server-error";
  return "status-error";
};

// Get file extension from content-type header
export const getFileExtension = (headers: Record<string, string>): string => {
  const contentType = headers["content-type"] || "";
  if (contentType.includes("json")) return "json";
  if (contentType.includes("xml")) return "xml";
  if (contentType.includes("html")) return "html";
  if (contentType.includes("css")) return "css";
  if (contentType.includes("javascript")) return "js";
  if (contentType.includes("csv")) return "csv";
  return "txt";
};

// Format byte size to human readable string
export const formatSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
  return `${size} ${units[i]}`;
};

// Extract the pre-truncation byte size from the marker HistoryManager
// appends to a body/response field it truncated for storage
// (`...[truncated for storage, original size N bytes]`). Returns null when
// the text carries no such marker (i.e. this field wasn't the one truncated).
export const parseTruncationOriginalSize = (
  text: string | undefined,
): number | null => {
  if (!text) return null;
  const match = text.match(/\[truncated for storage, original size (\d+) bytes\]\s*$/);
  return match ? parseInt(match[1], 10) : null;
};

// Get placeholder text for body editor based on content type
export const getBodyPlaceholder = (contentType?: string): string => {
  switch (contentType) {
    case "application/json":
      return '{\n  "key": "value"\n}';
    case "application/xml":
      return '<?xml version="1.0"?>\n<root>\n  <element>value</element>\n</root>';
    case "application/x-www-form-urlencoded":
      return "key1=value1&key2=value2";
    case "text/plain":
      return "Plain text content...";
    case "text/html":
      return "<html>\n  <body>Content</body>\n</html>";
    default:
      return "Request body...";
  }
};

// Check if content type is form-based
export const isFormContentType = (ct?: string) =>
  ct === "application/x-www-form-urlencoded" || ct === "multipart/form-data";

// Convert form data to body string for sending
export const formDataToBody = (
  formData: FormDataItem[],
  contentType?: string,
): string => {
  const items = formData.filter((item) => item.key.trim());

  // For URL encoded, only include text fields
  if (contentType === "application/x-www-form-urlencoded") {
    return items
      .filter((item) => item.type !== "file")
      .map(
        (item) =>
          `${encodeURIComponent(item.key)}=${encodeURIComponent(item.value)}`,
      )
      .join("&");
  }

  // For multipart/form-data with files, we need to send via extension
  // For now, send text fields as URL encoded
  return items
    .filter((item) => item.type !== "file")
    .map(
      (item) =>
        `${encodeURIComponent(item.key)}=${encodeURIComponent(item.value)}`,
    )
    .join("&");
};

// Helper function to strip comments from JSON body before sending
export const stripJsonComments = (jsonString: string): string => {
  if (!jsonString) return jsonString;

  const lines = jsonString.split("\n");
  const nonCommentLines = lines.filter(
    (line) => !line.trimStart().startsWith("//"),
  );
  return nonCommentLines.join("\n");
};

// Check if form has files
export const hasFileFields = (formData?: FormDataItem[]) =>
  (formData || []).some((item) => item.type === "file" && item.fileData);

// Interpolate {{variable}} placeholders in a string using a variables map
export const interpolateVariables = (
  text: string,
  variables: Record<string, string>,
): string => {
  if (!text || Object.keys(variables).length === 0) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(variables, key)
      ? variables[key]
      : match;
  });
};

// Build a flat { key → value } map from an Environment (only enabled variables)
export const buildEnvVariables = (
  environment?: Environment | null,
): Record<string, string> => {
  if (!environment) return {};
  const vars: Record<string, string> = {};
  for (const v of environment.variables) {
    if (v.enabled && v.key.trim()) {
      vars[v.key.trim()] = v.value;
    }
  }
  return vars;
};

export interface ResolvedAuth {
  headers: { key: string; value: string }[];
  params: { key: string; value: string }[];
}

/**
 * Returns headers and query params to inject based on effective auth config.
 * Request-level auth takes priority over folder-level auth.
 * All string values go through variable interpolation.
 */
export function resolveAuth(
  requestAuth: AuthConfig | undefined,
  folderAuth: AuthConfig | undefined,
  envVariables: Record<string, string>,
): ResolvedAuth {
  const auth = requestAuth !== undefined ? requestAuth : folderAuth;
  if (!auth || auth.type === 'none') return { headers: [], params: [] };

  if (auth.type === 'bearer') {
    const token = interpolateVariables(auth.token, envVariables);
    return {
      headers: [{ key: 'Authorization', value: `Bearer ${token}` }],
      params: [],
    };
  }

  if (auth.type === 'basic') {
    const username = interpolateVariables(auth.username, envVariables);
    const password = interpolateVariables(auth.password, envVariables);
    const encoded = btoa(unescape(encodeURIComponent(`${username}:${password}`)));
    return {
      headers: [{ key: 'Authorization', value: `Basic ${encoded}` }],
      params: [],
    };
  }

  if (auth.type === 'apikey') {
    const key = interpolateVariables(auth.key, envVariables);
    if (auth.addTo === 'query') {
      return { headers: [], params: [{ key, value: auth.value }] };
    }
    const value = interpolateVariables(auth.value, envVariables);
    return { headers: [{ key, value }], params: [] };
  }

  return { headers: [], params: [] };
}

// Format a timestamp as a short relative-time string (e.g. "5m ago")
export const formatRelativeTime = (timestamp: number): string => {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 5) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(timestamp).toLocaleDateString();
};
