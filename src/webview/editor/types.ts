export interface Header {
  key: string;
  value: string;
  enabled?: boolean;
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

export interface FolderConfig {
  id: string;
  name: string;
  baseUrl?: string;
  headers?: Header[];
  params?: Header[];
  environments?: Environment[];
  activeEnvironmentId?: string | null;
}

export interface FolderEditorProps {
  folderId: string;
  folderName: string;
  isCollection: boolean;
}

export interface InheritedConfig {
  baseUrl?: string;
  headers?: Header[];
  params?: Header[];
  envVariables?: Record<string, string>;
}
