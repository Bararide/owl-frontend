import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';

interface FileNotification {
  type: 'file_created' | 'file_deleted' | 'file_updated';
  file: {
    id: string;
    name: string;
    size: number;
    mime_type: string;
  };
  timestamp: string;
}

export const useFileNotifications = (containerId: string | undefined) => {
  const queryClient = useQueryClient();
  const containerIdRef = useRef(containerId);

  useEffect(() => {
    containerIdRef.current = containerId;
  }, [containerId]);

  const { isConnected, sendMessage } = useWebSocket(containerId, {
    onMessage: (data) => {
      console.log('WebSocket message:', data.type);
      
      if (data.type === 'file_created' && containerIdRef.current) {
        console.log('New file detected:', data.file?.name);
        queryClient.invalidateQueries({ queryKey: ['files', containerIdRef.current] });
      }
      
      if (data.type === 'file_deleted' && containerIdRef.current) {
        console.log('File deleted:', data.file?.name);
        queryClient.invalidateQueries({ queryKey: ['files', containerIdRef.current] });
      }
      
      if (data.type === 'file_updated' && containerIdRef.current) {
        console.log('File updated:', data.file?.name);
        queryClient.invalidateQueries({ queryKey: ['files', containerIdRef.current] });
      }
    },
  });

  return {
    isConnected,
    lastFileNotification: null as FileNotification | null,
  };
};