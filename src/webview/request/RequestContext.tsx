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
  AuthConfig,
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
type ActiveTab = "headers" | "body" | "params" | "auth";
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
  isSmallScreen: boolean;
  isResponseHidden: boolean;
  toggleResponseHidden: () => void;

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
  handleAuthChange: (auth: AuthConfig | undefined) => void;
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
  handleToggleHeader: (index: number) => void;
  handleToggleInheritedHeader: (headerKey: string) => void;

  // Param handlers
  handleAddParam: () => void;
  handleUpdateParam: (
    index: number,
    field: "key" | "value",
    value: string,
  ) => void;
  handleRemoveParam: (index: number) => void;
  handleToggleParam: (index: number) => void;
  handleToggleInheritedParam: (paramKey: string) => void;

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
    params: [],
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
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [isResponseHidden, setIsResponseHidden] = useState(false);

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

  const SMALL_BREAKPOINT = 680;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const small = entry.contentRect.width < SMALL_BREAKPOINT;
        setIsSmallScreen((prev) => {
          if (prev !== small) {
            setSplitLayout(small ? "horizontal" : "vertical");
            setRequestSize(50);
          }
          return small;
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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

  const toggleResponseHidden = useCallback(() => {
    setIsResponseHidden((prev) => !prev);
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
    setIsResponseHidden(false);

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
    ].filter((h) => h.enabled !== false);

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

    // Interpolate {{variables}} in URL, header values, and body
    const fullUrl = interpolateVariables(rawUrlWithParams, envVariables);
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

  const handleAuthChange = useCallback((auth: AuthConfig | undefined) => {
    setConfig((prev) => ({ ...prev, auth }));
    setIsSaved(false);
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

  // Param handlers
  const handleAddParam = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      params: [...(prev.params || []), { key: "", value: "" }],
    }));
    setIsSaved(false);
  }, []);

  const handleUpdateParam = useCallback(
    (index: number, field: "key" | "value", value: string) => {
      setConfig((prev) => {
        const newParams = [...(prev.params || [])];
        newParams[index] = { ...newParams[index], [field]: value };
        return { ...prev, params: newParams };
      });
      setIsSaved(false);
    },
    [],
  );

  const handleRemoveParam = useCallback((index: number) => {
    setConfig((prev) => ({
      ...prev,
      params: (prev.params || []).filter((_, i) => i !== index),
    }));
    setIsSaved(false);
  }, []);

  const handleToggleHeader = useCallback((index: number) => {
    setConfig((prev) => {
      const newHeaders = [...(prev.headers || [])];
      newHeaders[index] = {
        ...newHeaders[index],
        enabled: newHeaders[index].enabled !== false ? false : true,
      };
      return { ...prev, headers: newHeaders };
    });
    setIsSaved(false);
  }, []);

  const handleToggleParam = useCallback((index: number) => {
    setConfig((prev) => {
      const newParams = [...(prev.params || [])];
      newParams[index] = {
        ...newParams[index],
        enabled: newParams[index].enabled !== false ? false : true,
      };
      return { ...prev, params: newParams };
    });
    setIsSaved(false);
  }, []);

  const handleToggleInheritedHeader = useCallback(
    (headerKey: string) => {
      setConfig((prev) => {
        const existingIndex = (prev.headers || []).findIndex(
          (h) => h.key.toLowerCase() === headerKey.toLowerCase(),
        );

        if (existingIndex >= 0) {
          const existing = (prev.headers || [])[existingIndex];
          if (existing.enabled === false) {
            // Re-enabling: remove the disabled override entirely
            return {
              ...prev,
              headers: (prev.headers || []).filter(
                (_, i) => i !== existingIndex,
              ),
            };
          } else {
            // Disabling: mark as disabled override
            const newHeaders = [...(prev.headers || [])];
            newHeaders[existingIndex] = {
              ...newHeaders[existingIndex],
              enabled: false,
            };
            return { ...prev, headers: newHeaders };
          }
        } else {
          // Header doesn't exist in request config, create disabled override
          const inheritedHeader = (folderConfig.headers || []).find(
            (h) => h.key.toLowerCase() === headerKey.toLowerCase(),
          );
          if (inheritedHeader) {
            return {
              ...prev,
              headers: [
                ...(prev.headers || []),
                { ...inheritedHeader, enabled: false },
              ],
            };
          }
          return prev;
        }
      });
      setIsSaved(false);
    },
    [folderConfig.headers],
  );

  const handleToggleInheritedParam = useCallback(
    (paramKey: string) => {
      setConfig((prev) => {
        const existingIndex = (prev.params || []).findIndex(
          (p) => p.key.toLowerCase() === paramKey.toLowerCase(),
        );

        if (existingIndex >= 0) {
          const existing = (prev.params || [])[existingIndex];
          if (existing.enabled === false) {
            // Re-enabling: remove the disabled override entirely
            return {
              ...prev,
              params: (prev.params || []).filter((_, i) => i !== existingIndex),
            };
          } else {
            // Disabling: mark as disabled override
            const newParams = [...(prev.params || [])];
            newParams[existingIndex] = {
              ...newParams[existingIndex],
              enabled: false,
            };
            return { ...prev, params: newParams };
          }
        } else {
          // Param doesn't exist in request config, create disabled override
          const inheritedParam = (folderConfig.params || []).find(
            (p) => p.key.toLowerCase() === paramKey.toLowerCase(),
          );
          if (inheritedParam) {
            return {
              ...prev,
              params: [
                ...(prev.params || []),
                { ...inheritedParam, enabled: false },
              ],
            };
          }
          return prev;
        }
      });
      setIsSaved(false);
    },
    [folderConfig.params],
  );

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
    isSmallScreen,
    isResponseHidden,
    toggleResponseHidden,

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
    handleAuthChange,
    toggleLayout,
    handleResizeStart,
    handleSetActiveEnvironment,

    // Header handlers
    handleAddHeader,
    handleUpdateHeader,
    handleRemoveHeader,
    handleToggleHeader,
    handleToggleInheritedHeader,

    // Param handlers
    handleAddParam,
    handleUpdateParam,
    handleRemoveParam,
    handleToggleParam,
    handleToggleInheritedParam,

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
