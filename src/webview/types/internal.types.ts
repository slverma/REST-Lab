export interface Folder {
  id: string;
  name: string;
  createdAt: number;
  parentId?: string;
  requests?: Request[];
  subfolders?: Folder[];
}

export interface Request {
  id: string;
  name: string;
  folderId: string;
  method: string;
}

export interface ImportProvider {
  id: string;
  name: string;
  icon: React.ReactNode;
}

export interface Header {
  key: string;
  value: string;
  enabled?: boolean;
}

export interface FormDataItem {
  key: string;
  value: string;
  type: "text" | "file";
  fileName?: string;
  fileData?: string; // base64 encoded
}

export interface Cookie {
  name: string;
  value: string;
  enabled?: boolean;
}

export interface ResponseCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite?: string;
}

export type AuthConfig =
  | { type: 'bearer'; token: string }
  | { type: 'basic'; username: string; password: string }
  | { type: 'apikey'; key: string; value: string; addTo: 'header' | 'query' }
  | { type: 'none' };

export interface RequestConfig {
  id: string;
  name: string;
  folderId: string;
  method: string;
  url: string;
  headers?: Header[];
  params?: Header[];
  body?: string;
  contentType?: string;
  formData?: FormDataItem[];
  auth?: AuthConfig;
  cookies?: Cookie[];
}

export interface FolderConfig {
  baseUrl?: string;
  headers?: Header[];
  params?: Header[];
  environments?: Environment[];
  activeEnvironmentId?: string | null;
  auth?: AuthConfig;
}

export interface EnvVariable {
  key: string;
  value: string;
  enabled: boolean;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvVariable[];
}

export interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: string;
  time: number;
  size: number;
  cookies?: ResponseCookie[];
}

export interface HistoryEntry {
  id: string;
  requestId: string;
  requestName: string;
  folderId: string;
  timestamp: number;
  request: {
    method: string;
    url: string;
    resolvedUrl: string;
    headers: Header[];
    params: Header[];
    body?: string;
    contentType?: string;
    formData?: FormDataItem[];
    cookies?: Cookie[];
  };
  response: ResponseData;
  truncated?: boolean;
}

export interface RequestEditorProps {
  requestId: string;
  requestName: string;
  folderId: string;
}
