import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
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
  options: WebSocketOptions = {}
) => {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const isMountedRef = useRef(true);
  const containerIdRef = useRef(containerId);
  const optionsRef = useRef(options);
  
  useEffect(() => {
    containerIdRef.current = containerId;
    optionsRef.current = options;
  }, [containerId, options]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected, skipping');
      return;
    }

    const token = localStorage.getItem('auth_token');
    if (!token || !containerIdRef.current) {
      console.log('No token or containerId');
      return;
    }

    const wsUrl = `${process.env.REACT_APP_WS_URL || 'ws://localhost:8000'}/ws?token=${token}&container_id=${containerIdRef.current}`;
    console.log('Creating new WebSocket connection');
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMountedRef.current) return;
      console.log('WebSocket connected');
      setIsConnected(true);
      if (optionsRef.current.onConnect) optionsRef.current.onConnect();
      
      ws.send(JSON.stringify({ action: 'ping' }));
    };

    ws.onmessage = (event) => {
      if (!isMountedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        if (optionsRef.current.onMessage) optionsRef.current.onMessage(data);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (optionsRef.current.onError) optionsRef.current.onError(error);
    };

    ws.onclose = () => {
      if (!isMountedRef.current) return;
      console.log('WebSocket closed');
      setIsConnected(false);
      if (optionsRef.current.onDisconnect) optionsRef.current.onDisconnect();
      wsRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!containerId) return;
    
    connect();
    
    return () => {
      disconnect();
    };
  }, [containerId]);

  useEffect(() => {
    if (!isConnected) return;
    
    const interval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: 'ping' }));
      }
    }, 25000);
    
    return () => clearInterval(interval);
  }, [isConnected]);

  return {
    isConnected,
    sendMessage: useCallback((msg: object) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(msg));
        return true;
      }
      return false;
    }, []),
    disconnect,
  };
};