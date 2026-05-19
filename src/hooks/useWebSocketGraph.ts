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
  isRecommendationsLoading: boolean;
  isConnected: boolean;
  requestGraphData: () => Promise<void>;
  requestGroups: () => Promise<void>;
  requestFileGroupsMap: () => Promise<void>;
  requestRecommendations: (timeout?: number) => Promise<void>;
  subscribeToGraphUpdates: () => void;
  unsubscribeFromGraphUpdates: () => void;
  subscribeToRecommendations: () => void;
  unsubscribeFromRecommendations: () => void;
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
  const [isRecommendationsLoading, setIsRecommendationsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const requestIdRef = useRef(0);
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
    console.log(
      "[GraphWS] handleMessage:",
      message.type,
      "request_id:",
      message.request_id,
    );
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
      console.log("[GraphWS] Resolving pending request:", request_id);
      const { resolve, timeout } = pendingRequestsRef.current.get(request_id)!;
      clearTimeout(timeout);
      pendingRequestsRef.current.delete(request_id);
      resolve(data);
      return;
    }
    if (type === "graph_data" && data) {
      console.log(
        "[GraphWS] Setting graphData:",
        data.count,
        "nodes,",
        data.edges?.length,
        "edges",
      );
      setGraphData(data);
    } else if (type === "groups_data" && data) {
      console.log(
        "[GraphWS] Setting groups:",
        Array.isArray(data) ? data.length : 0,
      );
      setGroups(Array.isArray(data) ? data : data.groups || []);
    } else if (type === "file_groups_map_data" && data) {
      console.log(
        "[GraphWS] Setting fileGroupsMap:",
        Object.keys(data.file_groups_map || {}).length,
        "entries",
      );
      setFileGroupsMap(data.file_groups_map || {});
    } else if (type === "graph_update" && data) {
      console.log("[GraphWS] Updating graphData");
      setGraphData((prev: any) => ({ ...prev, ...data }));
    } else if (type === "groups_update" && data) {
      console.log("[GraphWS] Updating groups");
      setGroups(data.groups || []);
      if (data.file_groups_map) setFileGroupsMap(data.file_groups_map);
    } else if (type === "file_groups_data" && data) {
      const fileId = data.file_id;
      const fileGroups = data.groups || [];
      if (fileId) {
        console.log("[GraphWS] Updating fileGroups for", fileId);
        setFileGroupsMap((prev) => ({ ...prev, [fileId]: fileGroups }));
      }
    } else if (type === "recommendations_data" && data) {
      console.log("[GraphWS] Setting recommendations:", data.paths?.length || 0);
      setRecommendations(data.paths || []);
      setIsRecommendationsLoading(false);
    } else if (type === "recommendations_update" && data) {
      console.log("[GraphWS] Updating recommendations:", data.paths?.length || 0);
      setRecommendations((prev) => {
        const combined = [...prev, ...(data.paths || [])];
        return Array.from(new Set(combined));
      });
    } else if (type === "recommendations_complete") {
      console.log("[GraphWS] Recommendations complete");
      setIsRecommendationsLoading(false);
    }
  }, []);

  const {
    isConnected: wsConnected,
    isReady,
    sendMessage,
  } = useWebSocket(containerId, {
    onMessage: handleMessage,
    onConnect: () => {
      console.log("[GraphWS] onConnect: setting isConnected=true");
      setIsConnected(true);
    },
    onDisconnect: () => {
      console.log("[GraphWS] onDisconnect: clearing pending requests");
      setIsConnected(false);
      setRecommendations([]);
      setIsRecommendationsLoading(false);
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
        console.log(
          "[GraphWS] sendRequest:",
          action,
          "request_id:",
          request_id,
        );
        const timeout = setTimeout(() => {
          if (pendingRequestsRef.current.has(request_id)) {
            console.warn("[GraphWS] Request timeout:", request_id);
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
            console.error("[GraphWS] Failed to send request:", request_id);
            clearTimeout(timeout);
            pendingRequestsRef.current.delete(request_id);
            reject(new Error("WebSocket not ready"));
          } else {
            console.log("[GraphWS] Request sent:", request_id);
          }
        });
      }),
    [containerId, sendMessage],
  );

  const requestGraphData = useCallback(async () => {
    if (!isReady) {
      console.warn("[GraphWS] Not ready, skipping requestGraphData");
      return;
    }
    console.log("[GraphWS] Calling requestGraphData");
    try {
      const data = await sendRequest("get_graph_data");
      if (data) setGraphData(data);
    } catch (error) {
      console.error("[GraphWS] Failed to request graph data:", error);
    }
  }, [sendRequest, isReady]);

  const requestGroups = useCallback(async () => {
    if (!isReady) {
      console.warn("[GraphWS] Not ready, skipping requestGroups");
      return;
    }
    console.log("[GraphWS] Calling requestGroups");
    try {
      const data = await sendRequest("get_groups");
      if (data) setGroups(Array.isArray(data) ? data : data.groups || []);
    } catch (error) {
      console.error("[GraphWS] Failed to request groups:", error);
    }
  }, [sendRequest, isReady]);

  const requestFileGroupsMap = useCallback(async () => {
    if (!isReady) {
      console.warn("[GraphWS] Not ready, skipping requestFileGroupsMap");
      return;
    }
    console.log("[GraphWS] Calling requestFileGroupsMap");
    try {
      const data = await sendRequest("get_file_groups_map");
      if (data?.file_groups_map) setFileGroupsMap(data.file_groups_map);
    } catch (error) {
      console.error("[GraphWS] Failed to request file groups map:", error);
    }
  }, [sendRequest, isReady]);

  const requestRecommendations = useCallback(async (timeout: number = 30) => {
    if (!isReady) {
      console.warn("[GraphWS] Not ready, skipping requestRecommendations");
      return;
    }
    console.log("[GraphWS] Calling requestRecommendations");
    setIsRecommendationsLoading(true);
    setRecommendations([]);
    try {
      await sendRequest("get_recommendations", { timeout });
    } catch (error) {
      console.error("[GraphWS] Failed to request recommendations:", error);
      setIsRecommendationsLoading(false);
    }
  }, [sendRequest, isReady]);

  const subscribeToGraphUpdates = useCallback(() => {
    console.log("[GraphWS] Calling subscribeToGraphUpdates");
    sendMessage({
      action: "subscribe_to_graph_updates",
      container_id: containerId,
    });
  }, [containerId, sendMessage]);

  const unsubscribeFromGraphUpdates = useCallback(() => {
    console.log("[GraphWS] Calling unsubscribeFromGraphUpdates");
    sendMessage({
      action: "unsubscribe_from_graph_updates",
      container_id: containerId,
    });
  }, [containerId, sendMessage]);

  const subscribeToRecommendations = useCallback(() => {
    console.log("[GraphWS] Calling subscribeToRecommendations");
    sendMessage({
      action: "subscribe_to_recommendations",
      container_id: containerId,
    });
  }, [containerId, sendMessage]);

  const unsubscribeFromRecommendations = useCallback(() => {
    console.log("[GraphWS] Calling unsubscribeFromRecommendations");
    sendMessage({
      action: "unsubscribe_from_recommendations",
      container_id: containerId,
    });
  }, [containerId, sendMessage]);

  return {
    graphData,
    groups,
    fileGroupsMap,
    recommendations,
    isRecommendationsLoading,
    isConnected: wsConnected && isReady,
    requestGraphData,
    requestGroups,
    requestFileGroupsMap,
    requestRecommendations,
    subscribeToGraphUpdates,
    unsubscribeFromGraphUpdates,
    subscribeToRecommendations,
    unsubscribeFromRecommendations,
  };
};