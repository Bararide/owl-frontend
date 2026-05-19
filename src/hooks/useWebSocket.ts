import { useEffect, useRef, useState, useCallback } from "react";

interface WebSocketMessage {
  type: string;
  request_id?: string;
  [key: string]: any;
}
interface WebSocketOptions {
  onMessage?: (data: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export const useWebSocket = (
  containerId: string | undefined,
  options: WebSocketOptions = {},
) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const containerIdRef = useRef(containerId);
  const optionsRef = useRef(options);
  const messageQueueRef = useRef<
    Array<{ msg: object; resolve: (v: boolean) => void }>
  >([]);
  const connectionAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);

  useEffect(() => {
    containerIdRef.current = containerId;
    optionsRef.current = options;
  }, [containerId, options]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
      setIsReady(false);
      messageQueueRef.current.forEach(({ resolve }) => resolve(false));
      messageQueueRef.current = [];
    }
    isConnectingRef.current = false;
  }, []);

  const connect = useCallback(() => {
    if (isConnectingRef.current) {
      return;
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    const token = localStorage.getItem("auth_token");
    if (!token || !containerIdRef.current) {
      return;
    }

    isConnectingRef.current = true;
    const wsUrl = `${process.env.REACT_APP_WS_URL || "ws://localhost:8000"}/ws?token=${token}&container_id=${containerIdRef.current}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      connectionAttemptsRef.current = 0;
      if (optionsRef.current.onConnect) optionsRef.current.onConnect();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "connected") {
          setIsReady(true);
          isConnectingRef.current = false;
          const queue = messageQueueRef.current;
          messageQueueRef.current = [];
          queue.forEach(({ msg, resolve }) => {
            try {
              ws.send(JSON.stringify(msg));
              resolve(true);
            } catch {
              resolve(false);
            }
          });
        }
        if (optionsRef.current.onMessage) optionsRef.current.onMessage(data);
      } catch (error) {
        console.error(
          "[WS] Failed to parse message:",
          error,
          "Raw data:",
          event.data.slice(0, 200),
        );
      }
    };

    ws.onerror = (error) => {
      if (optionsRef.current.onError) optionsRef.current.onError(error);
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      setIsReady(false);
      wsRef.current = null;
      isConnectingRef.current = false;
      messageQueueRef.current.forEach(({ resolve }) => resolve(false));
      messageQueueRef.current = [];

      if (connectionAttemptsRef.current < 50 && containerIdRef.current) {
        const delay = Math.min(
          1000 * Math.pow(2, connectionAttemptsRef.current),
          10000,
        );
        connectionAttemptsRef.current += 1;

        reconnectTimeoutRef.current = setTimeout(() => connect(), delay);
      }
      if (optionsRef.current.onDisconnect) optionsRef.current.onDisconnect();
    };
  }, []);

  useEffect(() => {
    if (!containerId) {
      disconnect();
      return;
    }
    connect();
    return () => {
      if (containerIdRef.current !== containerId) return;
      disconnect();
    };
  }, [containerId]);

  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: "ping" }));
      }
    }, 25000);
    return () => clearInterval(interval);
  }, [isConnected]);

  const sendMessage = useCallback(
    (msg: object): Promise<boolean> =>
      new Promise((resolve) => {
        if (
          wsRef.current &&
          wsRef.current.readyState === WebSocket.OPEN &&
          isReady
        ) {
          try {
            wsRef.current.send(JSON.stringify(msg));
            resolve(true);
          } catch (e) {
            resolve(false);
          }
        } else {
          messageQueueRef.current.push({ msg, resolve });
        }
      }),
    [isReady],
  );

  return { isConnected, isReady, sendMessage, disconnect };
};
