import { FolderConfig, RequestConfig } from "../types/internal.types";
import { formDataToBody, isFormContentType, stripJsonComments } from "./helper";

export const generateCurlCommand = (
  folderConfig: FolderConfig,
  config: RequestConfig,
): string => {
  // Build full URL
  const fullUrl = folderConfig.baseUrl
    ? `${folderConfig.baseUrl}${config.url}`
    : config.url;

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
    curl += ` \\
  -H '${h.key}: ${h.value.replace(/'/g, "'\\''")}'`;
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
      // Strip comments from body for cURL command
      const cleanBody = stripJsonComments(config.body);
      curl += ` \\
  -d '${cleanBody.replace(/'/g, "'\\''")}'`;
    }
  }

  return curl;
};
