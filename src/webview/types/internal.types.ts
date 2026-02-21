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
}

export interface FormDataItem {
  key: string;
  value: string;
  type: "text" | "file";
  fileName?: string;
  fileData?: string; // base64 encoded
}

export interface RequestConfig {
  id: string;
  name: string;
  folderId: string;
  method: string;
  url: string;
  headers?: Header[];
  body?: string;
  contentType?: string;
  formData?: FormDataItem[];
}

export interface FolderConfig {
  baseUrl?: string;
  headers?: Header[];
}

export interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: string;
  time: number;
  size: number;
}

export interface RequestEditorProps {
  requestId: string;
  requestName: string;
  folderId: string;
}
