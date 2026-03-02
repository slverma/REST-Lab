import * as monaco from "monaco-editor/esm/vs/editor/editor.api.js";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { METHODS_WITH_BODY } from "../config";
import { generateCurlCommand } from "../helpers/curl";
import {
  formatJson,
  formDataToBody,
  getEditorLanguageFromContentType,
  hasFileFields,
  interpolateVariables,
  isFormContentType,
  stripJsonComments,
} from "../helpers/helper";
import {
  FolderConfig,
  FormDataItem,
  RequestConfig,
  RequestEditorProps,
  ResponseData,
} from "../types/internal.types";

declare function acquireVsCodeApi(): {
  postMessage: (message: unknown) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
};

const vscode = acquireVsCodeApi();

type SplitLayout = "horizontal" | "vertical";
type ActiveTab = "headers" | "body";
type ResponseTab = "body" | "headers";

interface RequestContextValue {
  // State
  config: RequestConfig;
  folderConfig: FolderConfig;
  envVariables: Record<string, string>;
  environments: { id: string; name: string }[];
  activeEnvironmentId: string | null;
  response: ResponseData | null;
  isLoading: boolean;
  activeTab: ActiveTab;
  responseTab: ResponseTab;
  isSaved: boolean;
  splitLayout: SplitLayout;
  requestSize: number;
  isResizing: boolean;

  // Refs
  bodyEditorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  containerRef: React.RefObject<HTMLDivElement>;
  splitContainerRef: React.RefObject<HTMLDivElement>;

  // Computed values
  requestEditorLanguage: string;
  responseEditorLanguage: string;
  responseBodyValue: string;

  // State setters
  setActiveTab: (tab: ActiveTab) => void;
  setResponseTab: (tab: ResponseTab) => void;

  // Handlers
  handleConfigChange: (updates: Partial<RequestConfig>) => void;
  handleSendRequest: () => void;
  handleSaveConfig: () => void;
  handleCopyCurl: () => void;
  handleBeautifyJson: () => void;
  toggleLayout: () => void;
  handleResizeStart: (e: React.MouseEvent) => void;
  handleSetActiveEnvironment: (envId: string | null) => void;

  // Header handlers
  handleAddHeader: () => void;
  handleUpdateHeader: (
    index: number,
    field: "key" | "value",
    value: string,
  ) => void;
  handleRemoveHeader: (index: number) => void;

  // Form data handlers
  handleAddFormData: () => void;
  handleUpdateFormData: (
    index: number,
    field: "key" | "value",
    value: string,
  ) => void;
  handleRemoveFormData: (index: number) => void;
  handleToggleFormDataType: (index: number) => void;
  handleFileSelect: (index: number, file: File | null) => void;

  // vscode
  vscode: typeof vscode;
}

const RequestContext = createContext<RequestContextValue | null>(null);

export const useRequestContext = (): RequestContextValue => {
  const context = useContext(RequestContext);
  if (!context) {
    throw new Error(
      "useRequestContext must be used within a RequestContextProvider",
    );
  }
  return context;
};

interface RequestContextProviderProps extends RequestEditorProps {
  children: ReactNode;
}

export const RequestContextProvider: React.FC<RequestContextProviderProps> = ({
  requestId,
  requestName,
  folderId,
  children,
}) => {
  // Core state
  const [config, setConfig] = useState<RequestConfig>({
    id: requestId,
    name: requestName,
    folderId,
    method: "GET",
    url: "",
    headers: [],
    body: "",
    contentType: "",
    formData: [],
  });

  const [folderConfig, setFolderConfig] = useState<FolderConfig>({});
  const [envVariables, setEnvVariables] = useState<Record<string, string>>({});
  const [environments, setEnvironments] = useState<
    { id: string; name: string }[]
  >([]);
  const [activeEnvironmentId, setActiveEnvironmentId] = useState<string | null>(
    null,
  );
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("headers");
  const [responseTab, setResponseTab] = useState<ResponseTab>("body");
  const [isSaved, setIsSaved] = useState(true);

  // Layout state
  const [splitLayout, setSplitLayout] = useState<SplitLayout>("vertical");
  const [requestSize, setRequestSize] = useState(50);
  const [isResizing, setIsResizing] = useState(false);

  // Refs
  const bodyEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(
    null,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  // Keep a ref in sync so the stable message handler never sees a stale collectionId
  const collectionIdRef = useRef<string | null>(null);

  // Computed values
  const requestEditorLanguage = useMemo(
    () => getEditorLanguageFromContentType(config.contentType),
    [config.contentType],
  );

  const responseContentType = response?.headers["content-type"];
  const responseEditorLanguage = useMemo(
    () => getEditorLanguageFromContentType(responseContentType),
    [responseContentType],
  );

  const responseBodyValue = useMemo(() => {
    if (!response) return "";
    if (response.status === 0) return response.data;
    if (responseEditorLanguage === "json") {
      return formatJson(response.data);
    }
    return response.data;
  }, [response, responseEditorLanguage]);

  // Handle resizing for both horizontal and vertical layouts
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !splitContainerRef.current) return;

      const containerRect = splitContainerRef.current.getBoundingClientRect();

      if (splitLayout === "horizontal") {
        const newSize =
          ((e.clientY - containerRect.top) / containerRect.height) * 100;
        const clampedSize = Math.max(20, Math.min(80, newSize));
        setRequestSize(clampedSize);
      } else {
        const newSize =
          ((e.clientX - containerRect.left) / containerRect.width) * 100;
        const clampedSize = Math.max(25, Math.min(75, newSize));
        setRequestSize(clampedSize);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    if (isResizing) {
      document.body.style.cursor =
        splitLayout === "horizontal" ? "row-resize" : "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, splitLayout]);

  // Message handling effect
  useEffect(() => {
    vscode.postMessage({ type: "getConfig" });

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case "configLoaded":
          setConfig(message.config);
          setFolderConfig(message.folderConfig || {});
          setEnvVariables(message.envVariables || {});
          setEnvironments(message.environments || []);
          setActiveEnvironmentId(message.activeEnvironmentId ?? null);
          setCollectionId(message.collectionId ?? null);
          collectionIdRef.current = message.collectionId ?? null;
          setIsSaved(true);
          if (METHODS_WITH_BODY.includes(message.config.method)) {
            setActiveTab("body");
          }
          break;
        case "folderConfigUpdated":
          setFolderConfig(message.folderConfig || {});
          if (message.envVariables !== undefined) {
            setEnvVariables(message.envVariables);
          }
          if (message.environments !== undefined) {
            setEnvironments(message.environments);
          }
          if (message.activeEnvironmentId !== undefined) {
            setActiveEnvironmentId(message.activeEnvironmentId);
          }
          break;
        case "environmentUpdated":
          if (
            !message.collectionId ||
            message.collectionId === collectionIdRef.current
          ) {
            setEnvVariables(message.envVariables || {});
            if (message.activeEnvironmentId !== undefined) {
              setActiveEnvironmentId(message.activeEnvironmentId);
            }
            if (message.environments !== undefined) {
              setEnvironments(message.environments);
            }
          }
          break;
        case "responseReceived":
          setResponse(message.response);
          setIsLoading(false);
          break;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        vscode.postMessage({ type: "getConfig" });
      }
    };

    window.addEventListener("message", handleMessage);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("message", handleMessage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const toggleLayout = useCallback(() => {
    setSplitLayout((prev) =>
      prev === "horizontal" ? "vertical" : "horizontal",
    );
    setRequestSize(50);
  }, []);

  const handleConfigChange = useCallback((updates: Partial<RequestConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
    setIsSaved(false);
  }, []);

  const handleSaveConfig = useCallback(() => {
    vscode.postMessage({ type: "saveConfig", config });
    setIsSaved(true);
  }, [config]);

  const handleSendRequest = useCallback(() => {
    setIsLoading(true);
    setResponse(null);

    let allHeaders = [
      ...(folderConfig.headers || []),
      ...(config.headers || []),
    ];

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

    const rawUrl = folderConfig.baseUrl
      ? `${folderConfig.baseUrl}${config.url}`
      : config.url;

    // Interpolate {{variables}} in URL, header values, and body
    const fullUrl = interpolateVariables(rawUrl, envVariables);
    const interpolatedHeaders = allHeaders.map((h) => ({
      key: h.key,
      value: interpolateVariables(h.value, envVariables),
    }));

    let requestBody: string | undefined = config.body;
    let formDataWithFiles: FormDataItem[] | undefined;

    if (isFormContentType(config.contentType)) {
      if (hasFileFields(config.formData)) {
        formDataWithFiles = config.formData;
        requestBody = undefined;
      } else {
        requestBody = formDataToBody(config.formData || [], config.contentType);
      }
    } else {
      requestBody = stripJsonComments(config.body || "");
    }

    // Apply variable interpolation to body
    if (requestBody) {
      requestBody = interpolateVariables(requestBody, envVariables);
    }

    vscode.postMessage({
      type: "sendRequest",
      method: config.method,
      url: fullUrl,
      headers: interpolatedHeaders,
      body: requestBody,
      formData: formDataWithFiles,
    });

    vscode.postMessage({ type: "saveConfig", config });
    setIsSaved(true);
  }, [config, folderConfig, envVariables]);

  const handleCopyCurl = useCallback(() => {
    const curl = generateCurlCommand(folderConfig, config, envVariables);
    navigator.clipboard.writeText(curl);
    vscode.postMessage({
      type: "showInfo",
      message: "cURL command copied to clipboard!",
    });
  }, [folderConfig, config, envVariables]);

  const handleSetActiveEnvironment = useCallback((envId: string | null) => {
    vscode.postMessage({ type: "setActiveEnvironment", envId });
  }, []);

  const handleBeautifyJson = useCallback(async () => {
    if (!config.body) return;

    try {
      const formatted = formatJson(config.body);
      if (formatted !== config.body) {
        handleConfigChange({ body: formatted });
        vscode.postMessage({
          type: "showInfo",
          message: "JSON formatted successfully!",
        });
      } else {
        vscode.postMessage({
          type: "showInfo",
          message: "JSON is already formatted",
        });
      }
    } catch (error) {
      vscode.postMessage({
        type: "showError",
        message: "Failed to format: Invalid JSON",
      });
    }
  }, [config.body, handleConfigChange]);

  // Header handlers
  const handleAddHeader = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      headers: [...(prev.headers || []), { key: "", value: "" }],
    }));
    setIsSaved(false);
  }, []);

  const handleUpdateHeader = useCallback(
    (index: number, field: "key" | "value", value: string) => {
      setConfig((prev) => {
        const newHeaders = [...(prev.headers || [])];
        newHeaders[index] = { ...newHeaders[index], [field]: value };
        return { ...prev, headers: newHeaders };
      });
      setIsSaved(false);
    },
    [],
  );

  const handleRemoveHeader = useCallback((index: number) => {
    setConfig((prev) => ({
      ...prev,
      headers: (prev.headers || []).filter((_, i) => i !== index),
    }));
    setIsSaved(false);
  }, []);

  // Form data handlers
  const handleAddFormData = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      formData: [
        ...(prev.formData || []),
        { key: "", value: "", type: "text" as const },
      ],
    }));
    setIsSaved(false);
  }, []);

  const handleUpdateFormData = useCallback(
    (index: number, field: "key" | "value", value: string) => {
      setConfig((prev) => {
        const newFormData = [...(prev.formData || [])];
        newFormData[index] = { ...newFormData[index], [field]: value };
        return { ...prev, formData: newFormData };
      });
      setIsSaved(false);
    },
    [],
  );

  const handleRemoveFormData = useCallback((index: number) => {
    setConfig((prev) => ({
      ...prev,
      formData: (prev.formData || []).filter((_, i) => i !== index),
    }));
    setIsSaved(false);
  }, []);

  const handleToggleFormDataType = useCallback((index: number) => {
    setConfig((prev) => {
      const newFormData = [...(prev.formData || [])];
      const currentType = newFormData[index].type || "text";
      newFormData[index] = {
        ...newFormData[index],
        type: currentType === "text" ? "file" : "text",
        value: "",
        fileName: undefined,
        fileData: undefined,
      };
      return { ...prev, formData: newFormData };
    });
    setIsSaved(false);
  }, []);

  const handleFileSelect = useCallback((index: number, file: File | null) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setConfig((prev) => {
        const newFormData = [...(prev.formData || [])];
        newFormData[index] = {
          ...newFormData[index],
          fileName: file.name,
          fileData: base64,
          value: file.name,
        };
        return { ...prev, formData: newFormData };
      });
      setIsSaved(false);
    };
    reader.readAsDataURL(file);
  }, []);

  const value: RequestContextValue = {
    // State
    config,
    folderConfig,
    envVariables,
    environments,
    activeEnvironmentId,
    response,
    isLoading,
    activeTab,
    responseTab,
    isSaved,
    splitLayout,
    requestSize,
    isResizing,

    // Refs
    bodyEditorRef,
    containerRef,
    splitContainerRef,

    // Computed values
    requestEditorLanguage,
    responseEditorLanguage,
    responseBodyValue,

    // State setters
    setActiveTab,
    setResponseTab,

    // Handlers
    handleConfigChange,
    handleSendRequest,
    handleSaveConfig,
    handleCopyCurl,
    handleBeautifyJson,
    toggleLayout,
    handleResizeStart,
    handleSetActiveEnvironment,

    // Header handlers
    handleAddHeader,
    handleUpdateHeader,
    handleRemoveHeader,

    // Form data handlers
    handleAddFormData,
    handleUpdateFormData,
    handleRemoveFormData,
    handleToggleFormDataType,
    handleFileSelect,

    // vscode
    vscode,
  };

  return (
    <RequestContext.Provider value={value}>{children}</RequestContext.Provider>
  );
};
