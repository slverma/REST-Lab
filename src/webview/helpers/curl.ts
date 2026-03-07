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

  // Build effective params: folder params excluding disabled overrides + request-only params
  const inheritedParamKeys = new Set(
    (folderConfig.params || []).map((p) => p.key.toLowerCase()),
  );
  const disabledParamKeys = new Set(
    (config.params || [])
      .filter(
        (p) =>
          inheritedParamKeys.has(p.key.toLowerCase()) && p.enabled === false,
      )
      .map((p) => p.key.toLowerCase()),
  );
  const allParams = [
    ...(folderConfig.params || []).filter(
      (p) => !disabledParamKeys.has(p.key.toLowerCase()),
    ),
    ...(config.params || []).filter(
      (p) => !inheritedParamKeys.has(p.key.toLowerCase()),
    ),
  ].filter((p) => p.key && p.enabled !== false);
  const rawUrlWithParams =
    allParams.length > 0
      ? `${rawUrl}${rawUrl.includes("?") ? "&" : "?"}${allParams
          .map(
            (p) =>
              `${encodeURIComponent(p.key)}=${encodeURIComponent(
                interpolateVariables(p.value, envVariables),
              )}`,
          )
          .join("&")}`
      : rawUrl;

  const fullUrl = interpolateVariables(rawUrlWithParams, envVariables);

  // Start with curl command
  let curl = `curl -X ${config.method}`;

  // Add URL (escaped)
  curl += ` '${fullUrl.replace(/'/g, "'\\''")}'`;

  // Build effective headers: folder headers excluding disabled overrides + request-only headers
  const inheritedHeaderKeys = new Set(
    (folderConfig.headers || []).map((h) => h.key.toLowerCase()),
  );
  const disabledHeaderKeys = new Set(
    (config.headers || [])
      .filter(
        (h) =>
          inheritedHeaderKeys.has(h.key.toLowerCase()) && h.enabled === false,
      )
      .map((h) => h.key.toLowerCase()),
  );
  let allHeaders = [
    ...(folderConfig.headers || []).filter(
      (h) => !disabledHeaderKeys.has(h.key.toLowerCase()),
    ),
    ...(config.headers || []).filter(
      (h) => !inheritedHeaderKeys.has(h.key.toLowerCase()),
    ),
  ].filter((h) => h.key && h.value && h.enabled !== false);

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
