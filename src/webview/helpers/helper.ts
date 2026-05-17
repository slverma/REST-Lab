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

/**
 * Returns the Bearer token to inject as Authorization header, or null if no auth applies.
 * Request-level auth takes priority over folder-level auth.
 * Variable interpolation is applied to the token string.
 */
export function resolveAuthToken(
  requestAuth: AuthConfig | undefined,
  folderAuth: AuthConfig | undefined,
  envVariables: Record<string, string>,
): string | null {
  const auth = requestAuth !== undefined ? requestAuth : folderAuth;
  if (!auth || auth.type === 'none') return null;
  return interpolateVariables(auth.token, envVariables);
}
