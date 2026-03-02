import { FolderConfig, RequestConfig } from "../types/internal.types";
import {
  formDataToBody,
  interpolateVariables,
  isFormContentType,
  stripJsonComments,
} from "./helper";

export const generateCurlCommand = (
  folderConfig: FolderConfig,
  config: RequestConfig,
  envVariables: Record<string, string> = {},
): string => {
  // Build full URL and apply variable substitution
  const rawUrl = folderConfig.baseUrl
    ? `${folderConfig.baseUrl}${config.url}`
    : config.url;
  const fullUrl = interpolateVariables(rawUrl, envVariables);

  // Start with curl command
  let curl = `curl -X ${config.method}`;

  // Add URL (escaped)
  curl += ` '${fullUrl.replace(/'/g, "'\\''")}'`;

  // Combine headers
  let allHeaders = [
    ...(folderConfig.headers || []),
    ...(config.headers || []),
  ].filter((h) => h.key && h.value);

  // Add Content-Type if set
  if (config.contentType) {
    const hasContentType = allHeaders.some(
      (h) => h.key.toLowerCase() === "content-type",
    );
    if (!hasContentType) {
      allHeaders = [
        { key: "Content-Type", value: config.contentType },
        ...allHeaders,
      ];
    }
  }

  // Add headers
  allHeaders.forEach((h) => {
    const resolvedValue = interpolateVariables(h.value, envVariables);
    curl += ` \\
  -H '${h.key}: ${resolvedValue.replace(/'/g, "'\\''")}'`;
  });

  // Add body
  const methodsWithBody = ["POST", "PUT", "PATCH"];
  if (methodsWithBody.includes(config.method)) {
    if (isFormContentType(config.contentType) && config.formData?.length) {
      if (config.contentType === "multipart/form-data") {
        // Form data fields
        config.formData.forEach((item) => {
          if (item.type === "file" && item.fileName) {
            curl += ` \\
  -F '${item.key}=@${item.fileName}'`;
          } else if (item.key) {
            curl += ` \\
  -F '${item.key}=${item.value.replace(/'/g, "'\\''")}'`;
          }
        });
      } else {
        // URL encoded
        const body = formDataToBody(config.formData, config.contentType);
        if (body) {
          curl += ` \\
  -d '${body.replace(/'/g, "'\\''")}'`;
        }
      }
    } else if (config.body) {
      // Strip comments and interpolate variables in body for cURL command
      const cleanBody = interpolateVariables(
        stripJsonComments(config.body),
        envVariables,
      );
      curl += ` \\
  -d '${cleanBody.replace(/'/g, "'\\''")}'`;
    }
  }

  return curl;
};
