export interface ParsedCurlRequest {
  method: string;
  url: string;
  headers: { key: string; value: string }[];
  params: { key: string; value: string }[];
  body?: string;
  contentType?: string;
  formData?: {
    key: string;
    value: string;
    type: "text" | "file";
    fileName?: string;
  }[];
}

/**
 * Tokenizes a curl command string, respecting single/double quotes and
 * the shell escape sequence `'\''` for a literal single-quote inside
 * single-quoted strings.
 */
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    if (char === "'") {
      // Single-quoted string: the only escape is '\'' (end quote, literal ', reopen quote)
      i++;
      while (i < input.length) {
        if (input[i] === "'") {
          // Check for '\'' pattern
          if (
            input[i + 1] === "\\" &&
            input[i + 2] === "'" &&
            input[i + 3] === "'"
          ) {
            current += "'";
            i += 4;
          } else {
            i++; // closing quote
            break;
          }
        } else {
          current += input[i];
          i++;
        }
      }
    } else if (char === '"') {
      // Double-quoted string with backslash escaping
      i++;
      while (i < input.length && input[i] !== '"') {
        if (input[i] === "\\") {
          i++;
          if (i < input.length) {
            current += input[i];
            i++;
          }
        } else {
          current += input[i];
          i++;
        }
      }
      i++; // skip closing quote
    } else if (char === " " || char === "\t") {
      if (current) {
        tokens.push(current);
        current = "";
      }
      i++;
    } else {
      current += char;
      i++;
    }
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Parses a curl command string into a structured request object.
 * Returns null if the input does not look like a valid curl command.
 */
export function parseCurlCommand(
  curlCommand: string,
): ParsedCurlRequest | null {
  // Normalize line continuations (backslash + newline)
  const normalized = curlCommand.replace(/\\\s*\n\s*/g, " ").trim();

  const tokens = tokenize(normalized);

  if (!tokens.length || tokens[0].toLowerCase() !== "curl") {
    return null;
  }

  let method = "";
  let url = "";
  const headers: { key: string; value: string }[] = [];
  let body: string | undefined;
  const formData: {
    key: string;
    value: string;
    type: "text" | "file";
    fileName?: string;
  }[] = [];
  let hasBody = false;
  let hasFormData = false;

  let i = 1; // skip 'curl'

  while (i < tokens.length) {
    const token = tokens[i];

    if (token === "-X" || token === "--request") {
      method = tokens[++i] || "";
      i++;
    } else if (token === "--url") {
      url = tokens[++i] || "";
      i++;
    } else if (token === "-H" || token === "--header") {
      const headerStr = tokens[++i] || "";
      const colonIdx = headerStr.indexOf(":");
      if (colonIdx > 0) {
        const key = headerStr.substring(0, colonIdx).trim();
        const value = headerStr.substring(colonIdx + 1).trim();
        headers.push({ key, value });
      }
      i++;
    } else if (
      token === "-d" ||
      token === "--data" ||
      token === "--data-raw" ||
      token === "--data-binary" ||
      token === "--data-urlencode"
    ) {
      body = tokens[++i] || "";
      hasBody = true;
      i++;
    } else if (token === "-F" || token === "--form") {
      const formStr = tokens[++i] || "";
      const eqIdx = formStr.indexOf("=");
      if (eqIdx > 0) {
        const key = formStr.substring(0, eqIdx);
        const value = formStr.substring(eqIdx + 1);
        if (value.startsWith("@")) {
          formData.push({
            key,
            value: "",
            type: "file",
            fileName: value.substring(1),
          });
        } else {
          formData.push({ key, value, type: "text" });
        }
        hasFormData = true;
      }
      i++;
    } else if (
      token === "--compressed" ||
      token === "-s" ||
      token === "--silent" ||
      token === "-i" ||
      token === "--include" ||
      token === "-v" ||
      token === "--verbose" ||
      token === "-L" ||
      token === "--location" ||
      token === "-k" ||
      token === "--insecure" ||
      token === "--no-keepalive" ||
      token === "--http1.1" ||
      token === "--http2"
    ) {
      // Boolean flags with no value
      i++;
    } else if (
      token === "--max-time" ||
      token === "--connect-timeout" ||
      token === "--retry" ||
      token === "-u" ||
      token === "--user" ||
      token === "-A" ||
      token === "--user-agent" ||
      token === "--proxy" ||
      token === "-x" ||
      token === "-e" ||
      token === "--referer" ||
      token === "-o" ||
      token === "--output" ||
      token === "--cert" ||
      token === "--key" ||
      token === "--cacert"
    ) {
      // Flags that consume next token (but we don't use the value)
      i += 2;
    } else if (!token.startsWith("-")) {
      // Positional argument — treat as URL if we don't have one yet
      if (!url) {
        url = token;
      }
      i++;
    } else {
      // Unknown flag — skip
      i++;
    }
  }

  if (!url) {
    return null;
  }

  // Infer method if not explicitly set
  if (!method) {
    if (hasBody || hasFormData) {
      method = "POST";
    } else {
      method = "GET";
    }
  }

  // Split URL into base URL + query params
  const params: { key: string; value: string }[] = [];
  let cleanUrl = url;
  const queryIdx = url.indexOf("?");
  if (queryIdx >= 0) {
    cleanUrl = url.substring(0, queryIdx);
    const queryString = url.substring(queryIdx + 1);
    for (const part of queryString.split("&")) {
      if (!part) continue;
      const eqIdx = part.indexOf("=");
      if (eqIdx >= 0) {
        try {
          params.push({
            key: decodeURIComponent(part.substring(0, eqIdx)),
            value: decodeURIComponent(part.substring(eqIdx + 1)),
          });
        } catch {
          params.push({
            key: part.substring(0, eqIdx),
            value: part.substring(eqIdx + 1),
          });
        }
      } else {
        params.push({ key: decodeURIComponent(part), value: "" });
      }
    }
  }

  // Extract Content-Type (stored separately in RequestConfig)
  let contentType: string | undefined;
  const ctHeader = headers.find((h) => h.key.toLowerCase() === "content-type");
  if (ctHeader) {
    contentType = ctHeader.value.split(";")[0].trim();
  }

  const result: ParsedCurlRequest = {
    method: method.toUpperCase(),
    url: cleanUrl,
    // Keep Content-Type in headers list as well — the RequestEditorProvider will
    // store it in requestConfig.contentType; having it in headers too is harmless.
    headers: headers.filter((h) => h.key.toLowerCase() !== "content-type"),
    params,
    contentType,
  };

  if (hasFormData && formData.length > 0) {
    result.formData = formData;
  } else if (hasBody && body !== undefined) {
    result.body = body;
  }

  return result;
}
