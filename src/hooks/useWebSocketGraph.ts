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
  isConnected: boolean;
  requestGraphData: () => Promise<void>;
  requestGroups: () => Promise<void>;
  requestFileGroupsMap: () => Promise<void>;
  subscribeToGraphUpdates: () => void;
  unsubscribeFromGraphUpdates: () => void;
}

export const useWebSocketGraph = (
  containerId: string | undefined,
): UseWebSocketGraphReturn => {
  const [graphData, setGraphData] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [fileGroupsMap, setFileGroupsMap] = useState<
    Record<string, { groupId: string; color: string }[]>
  >({});
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

  return {
    graphData,
    groups,
    fileGroupsMap,
    isConnected: wsConnected && isReady,
    requestGraphData,
    requestGroups,
    requestFileGroupsMap,
    subscribeToGraphUpdates,
    unsubscribeFromGraphUpdates,
  };
};
