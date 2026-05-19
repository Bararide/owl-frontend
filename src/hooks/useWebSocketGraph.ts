import { useEffect, useRef, useState, useCallback } from "react";
import { useWebSocket } from "./useWebSocket";

interface GraphWebSocketMessage {
  type: string;
  request_id?: string;
  data?: any;
  error?: string;
}

interface UseWebSocketGraphReturn {
  graphData: any;
  groups: any[];
  fileGroupsMap: Record<string, { groupId: string; color: string }[]>;
  recommendations: string[];
  logs: string[];
  isRecommendationsLoading: boolean;
  isLogsLoading: boolean;
  isConnected: boolean;
  requestGraphData: () => Promise<void>;
  requestGroups: () => Promise<void>;
  requestFileGroupsMap: () => Promise<void>;
  requestRecommendations: (timeout?: number) => Promise<void>;
  requestLogs: () => Promise<void>;
  subscribeToGraphUpdates: () => void;
  unsubscribeFromGraphUpdates: () => void;
  subscribeToRecommendations: () => void;
  unsubscribeFromRecommendations: () => void;
  subscribeToLogs: () => void;
  unsubscribeFromLogs: () => void;
}

export const useWebSocketGraph = (
  containerId: string | undefined,
): UseWebSocketGraphReturn => {
  const [graphData, setGraphData] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [fileGroupsMap, setFileGroupsMap] = useState<
    Record<string, { groupId: string; color: string }[]>
  >({});
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isRecommendationsLoading, setIsRecommendationsLoading] = useState(false);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const requestIdRef = useRef(0);
  const currentRequestIdRef = useRef<string | null>(null);
  const currentLogsRequestIdRef = useRef<string | null>(null);
  const pendingRequestsRef = useRef<
    Map<
      string,
      {
        resolve: (data: any) => void;
        reject: (error: Error) => void;
        timeout: ReturnType<typeof setTimeout>;
      }
    >
  >(new Map());

  const handleMessage = useCallback((message: GraphWebSocketMessage) => {
    const { type, request_id, data, error } = message;

    if (error) {
      console.error("[GraphWS] Error in message:", error);
      if (request_id && pendingRequestsRef.current.has(request_id)) {
        const { reject, timeout } = pendingRequestsRef.current.get(request_id)!;
        clearTimeout(timeout);
        pendingRequestsRef.current.delete(request_id);
        reject(new Error(error));
      }
      return;
    }

    if (request_id && pendingRequestsRef.current.has(request_id)) {
      const { resolve, timeout } = pendingRequestsRef.current.get(request_id)!;
      clearTimeout(timeout);
      pendingRequestsRef.current.delete(request_id);
      resolve(data);
    }

    if (type === "recommendations_data") {
      const paths = data?.paths || data?.data?.paths || [];
      setRecommendations(paths);
      setIsRecommendationsLoading(false);
      currentRequestIdRef.current = null;
      return;
    }

    if (type === "recommendations_update") {
      const newPaths = data?.paths || data?.data?.paths || [];
      if (newPaths.length > 0) {
        setRecommendations((prev) => {
          const combined = [...prev, ...newPaths];
          return Array.from(new Set(combined));
        });
      }
      return;
    }

    if (type === "recommendations_complete") {
      setIsRecommendationsLoading(false);
      currentRequestIdRef.current = null;
      return;
    }

    if (type === "log_message") {
      const logMessage = data?.message || data?.data?.message || "";
      if (logMessage) {
        setLogs((prev) => [...prev, logMessage]);
      }
      return;
    }

    if (type === "logs_error") {
      console.error("[GraphWS] Logs error:", data?.error);
      setIsLogsLoading(false);
      currentLogsRequestIdRef.current = null;
      return;
    }

    if (type === "graph_data" && data) {
      setGraphData(data);
      return;
    }

    if (type === "groups_data" && data) {
      setGroups(Array.isArray(data) ? data : data.groups || []);
      return;
    }

    if (type === "file_groups_map_data" && data) {
      setFileGroupsMap(data.file_groups_map || {});
      return;
    }

    if (type === "graph_update" && data) {
      setGraphData((prev: any) => ({ ...prev, ...data }));
      return;
    }

    if (type === "groups_update" && data) {
      setGroups(data.groups || []);
      if (data.file_groups_map) setFileGroupsMap(data.file_groups_map);
      return;
    }

    if (type === "file_groups_data" && data) {
      const fileId = data.file_id;
      const fileGroups = data.groups || [];
      if (fileId) {
        setFileGroupsMap((prev) => ({ ...prev, [fileId]: fileGroups }));
      }
      return;
    }
  }, []);

  const {
    isConnected: wsConnected,
    isReady,
    sendMessage,
  } = useWebSocket(containerId, {
    onMessage: handleMessage,
    onConnect: () => {
      setIsConnected(true);
    },
    onDisconnect: () => {
      setIsConnected(false);
      setRecommendations([]);
      setLogs([]);
      setIsRecommendationsLoading(false);
      setIsLogsLoading(false);
      currentRequestIdRef.current = null;
      currentLogsRequestIdRef.current = null;
      pendingRequestsRef.current.forEach(({ reject, timeout }) => {
        clearTimeout(timeout);
        reject(new Error("Disconnected"));
      });
      pendingRequestsRef.current.clear();
    },
  });

  const sendRequest = useCallback(
    async (action: string, payload: any = {}): Promise<any> =>
      new Promise((resolve, reject) => {
        const request_id = `req_${Date.now()}_${requestIdRef.current++}`;
        const timeout = setTimeout(() => {
          if (pendingRequestsRef.current.has(request_id)) {
            pendingRequestsRef.current.delete(request_id);
            reject(new Error("Request timeout"));
          }
        }, 30000);
        pendingRequestsRef.current.set(request_id, {
          resolve,
          reject,
          timeout,
        });
        sendMessage({
          action,
          request_id,
          container_id: containerId,
          ...payload,
        }).then((sent) => {
          if (!sent) {
            clearTimeout(timeout);
            pendingRequestsRef.current.delete(request_id);
            reject(new Error("WebSocket not ready"));
          }
        });
      }),
    [containerId, sendMessage],
  );

  const requestGraphData = useCallback(async () => {
    if (!isReady) return;
    try {
      const data = await sendRequest("get_graph_data");
      if (data) setGraphData(data);
    } catch (error) {
      console.error("[GraphWS] Failed to request graph data:", error);
    }
  }, [sendRequest, isReady]);

  const requestGroups = useCallback(async () => {
    if (!isReady) return;
    try {
      const data = await sendRequest("get_groups");
      if (data) setGroups(Array.isArray(data) ? data : data.groups || []);
    } catch (error) {
      console.error("[GraphWS] Failed to request groups:", error);
    }
  }, [sendRequest, isReady]);

  const requestFileGroupsMap = useCallback(async () => {
    if (!isReady) return;
    try {
      const data = await sendRequest("get_file_groups_map");
      if (data?.file_groups_map) setFileGroupsMap(data.file_groups_map);
    } catch (error) {
      console.error("[GraphWS] Failed to request file groups map:", error);
    }
  }, [sendRequest, isReady]);

  const requestRecommendations = useCallback(
    async (timeout: number = 30) => {
      if (!isReady) return;

      if (currentRequestIdRef.current) {
        const pending = pendingRequestsRef.current.get(currentRequestIdRef.current);
        if (pending) {
          clearTimeout(pending.timeout);
          pending.reject(new Error("Cancelled by new request"));
          pendingRequestsRef.current.delete(currentRequestIdRef.current);
        }
        currentRequestIdRef.current = null;
      }

      setIsRecommendationsLoading(true);
      setRecommendations([]);

      try {
        const requestId = await sendRequest("get_recommendations", { timeout });
        currentRequestIdRef.current = requestId;
      } catch (error) {
        console.error("[GraphWS] Failed to request recommendations:", error);
        setIsRecommendationsLoading(false);
        currentRequestIdRef.current = null;
      }
    },
    [sendRequest, isReady],
  );

  const requestLogs = useCallback(async () => {
    if (!isReady) return;

    if (currentLogsRequestIdRef.current) {
      const pending = pendingRequestsRef.current.get(currentLogsRequestIdRef.current);
      if (pending) {
        clearTimeout(pending.timeout);
        pending.reject(new Error("Cancelled by new request"));
        pendingRequestsRef.current.delete(currentLogsRequestIdRef.current);
      }
      currentLogsRequestIdRef.current = null;
    }

    setIsLogsLoading(true);
    setLogs([]);

    try {
      const requestId = await sendRequest("get_logs");
      currentLogsRequestIdRef.current = requestId;
    } catch (error) {
      console.error("[GraphWS] Failed to request logs:", error);
      setIsLogsLoading(false);
      currentLogsRequestIdRef.current = null;
    }
  }, [sendRequest, isReady]);

  const subscribeToGraphUpdates = useCallback(() => {
    sendMessage({
      action: "subscribe_to_graph_updates",
      container_id: containerId,
    });
  }, [containerId, sendMessage]);

  const unsubscribeFromGraphUpdates = useCallback(() => {
    sendMessage({
      action: "unsubscribe_from_graph_updates",
      container_id: containerId,
    });
  }, [containerId, sendMessage]);

  const subscribeToRecommendations = useCallback(() => {
    sendMessage({
      action: "subscribe_to_recommendations",
      container_id: containerId,
    });
  }, [containerId, sendMessage]);

  const unsubscribeFromRecommendations = useCallback(() => {
    sendMessage({
      action: "unsubscribe_from_recommendations",
      container_id: containerId,
    });
  }, [containerId, sendMessage]);

  const subscribeToLogs = useCallback(() => {
    sendMessage({
      action: "subscribe_to_logs",
      container_id: containerId,
    });
  }, [containerId, sendMessage]);

  const unsubscribeFromLogs = useCallback(() => {
    sendMessage({
      action: "unsubscribe_from_logs",
      container_id: containerId,
    });
  }, [containerId, sendMessage]);

  return {
    graphData,
    groups,
    fileGroupsMap,
    recommendations,
    logs,
    isRecommendationsLoading,
    isLogsLoading,
    isConnected: wsConnected && isReady,
    requestGraphData,
    requestGroups,
    requestFileGroupsMap,
    requestRecommendations,
    requestLogs,
    subscribeToGraphUpdates,
    unsubscribeFromGraphUpdates,
    subscribeToRecommendations,
    unsubscribeFromRecommendations,
    subscribeToLogs,
    unsubscribeFromLogs,
  };
};