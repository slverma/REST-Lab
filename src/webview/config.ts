export const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

export const METHODS_WITH_BODY = ["POST", "PUT", "PATCH"];

export const COMMON_HEADERS = [
  "Accept",
  "Accept-Charset",
  "Accept-Encoding",
  "Accept-Language",
  "Authorization",
  "Cache-Control",
  "Content-Type",
  "Content-Length",
  "Cookie",
  "Host",
  "Origin",
  "User-Agent",
  "X-Api-Key",
  "X-Auth-Token",
  "X-Request-ID",
];

export const CONTENT_TYPES = [
  { label: "None", value: "" },
  { label: "JSON", value: "application/json" },
  { label: "XML", value: "application/xml" },
  { label: "Form URL Encoded", value: "application/x-www-form-urlencoded" },
  { label: "Form Data", value: "multipart/form-data" },
  { label: "Plain Text", value: "text/plain" },
  { label: "HTML", value: "text/html" },
];
