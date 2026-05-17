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
  // Флаг: создаём ли мы новое соединение СЕЙЧАС
  const isConnectingRef = useRef(false);

  useEffect(() => {
    containerIdRef.current = containerId;
    optionsRef.current = options;
  }, [containerId, options]);

  const disconnect = useCallback(() => {
    console.log("[WS] disconnect() called");
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      console.log(
        "[WS] Closing existing socket, readyState:",
        wsRef.current.readyState,
      );
      wsRef.current.onclose = null; // Отключаем onclose чтобы не триггерить ре-коннект при явном дисконнекте
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
    // Если уже подключаемся или сокет открыт — не делаем ничего
    if (isConnectingRef.current) {
      console.log("[WS] Already connecting, skipping");
      return;
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log("[WS] Already connected, skipping");
      return;
    }

    const token = localStorage.getItem("auth_token");
    if (!token || !containerIdRef.current) {
      console.log("[WS] No token or containerId, skipping");
      return;
    }

    isConnectingRef.current = true;
    const wsUrl = `${process.env.REACT_APP_WS_URL || "ws://localhost:8000"}/ws?token=${token}&container_id=${containerIdRef.current}`;
    console.log(
      "[WS] Creating WebSocket:",
      wsUrl.replace(/token=[^&]+/, "token=***"),
    );

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[WS] onopen: socket opened");
      setIsConnected(true);
      connectionAttemptsRef.current = 0;
      if (optionsRef.current.onConnect) optionsRef.current.onConnect();
      console.log('[WS] Waiting for "connected" message from server...');
    };

    ws.onmessage = (event) => {
      console.log("[WS] <<< RAW message:", event.data.slice(0, 500));
      try {
        const data = JSON.parse(event.data);
        console.log(
          "[WS] <<< PARSED:",
          data.type,
          "request_id:",
          data.request_id,
        );
        if (data.type === "connected") {
          console.log('[WS] Received "connected", setting isReady=true');
          setIsReady(true);
          isConnectingRef.current = false;
          const queue = messageQueueRef.current;
          messageQueueRef.current = [];
          console.log("[WS] Flushing message queue:", queue.length, "messages");
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
      console.error("[WS] onerror:", error);
      if (optionsRef.current.onError) optionsRef.current.onError(error);
    };

    ws.onclose = (event) => {
      console.log("[WS] onclose: code=", event.code, "reason=", event.reason);
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
        console.log(
          "[WS] Scheduling reconnect in",
          delay,
          "ms, attempt",
          connectionAttemptsRef.current,
        );
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
      console.log("[WS] Component unmounting, disconnecting");
      disconnect();
    };
  }, [containerId]);

  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log("[WS] Sending ping");
        wsRef.current.send(JSON.stringify({ action: "ping" }));
      }
    }, 25000);
    return () => clearInterval(interval);
  }, [isConnected]);

  const sendMessage = useCallback(
    (msg: object): Promise<boolean> =>
      new Promise((resolve) => {
        console.log(
          "[WS] sendMessage:",
          (msg as any).action,
          "request_id:",
          (msg as any).request_id,
          "isReady:",
          isReady,
          "readyState:",
          wsRef.current?.readyState,
        );
        if (
          wsRef.current &&
          wsRef.current.readyState === WebSocket.OPEN &&
          isReady
        ) {
          try {
            wsRef.current.send(JSON.stringify(msg));
            console.log("[WS] >>> Message sent");
            resolve(true);
          } catch (e) {
            console.error("[WS] Send error:", e);
            resolve(false);
          }
        } else {
          console.log(
            "[WS] >>> Message queued (isReady=",
            isReady,
            ", readyState=",
            wsRef.current?.readyState,
            ")",
          );
          messageQueueRef.current.push({ msg, resolve });
        }
      }),
    [isReady],
  );

  return { isConnected, isReady, sendMessage, disconnect };
};
