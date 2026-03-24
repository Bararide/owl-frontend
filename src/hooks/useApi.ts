import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiFile, ChatRequest, CreateContainerRequest, OcrProcessRequest, RecommendationEvent, SearchRequest, User } from '../api/client';
import { useCallback, useEffect, useRef, useState } from 'react';

export const useContainers = () => {
  return useQuery({
    queryKey: ['containers'],
    queryFn: () => apiClient.getContainers(),
  });
};

export const useContainer = (containerId: string) => {
  return useQuery({
    queryKey: ['containers', containerId],
    queryFn: () => apiClient.getContainer(containerId),
    enabled: !!containerId,
  });
};

export const useOcrProcess = () => {
  return useMutation({
    mutationFn: (data: OcrProcessRequest) => apiClient.ocrProcess(data),
  });
};

export const useChatWithBot = () => {
  return useMutation({
    mutationFn: (data: ChatRequest) => apiClient.chatWithBot(data),
  });
};

export const useCreateContainer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateContainerRequest) => apiClient.createContainer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] });
    },
  });
};

export const useGetUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: User) => apiClient.getUser(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  })
}

export const useFileContent = (containerId: string, fileId: string) => {
  return useQuery({
    queryKey: ['fileContent', containerId, fileId],
    queryFn: async () => {
      try {
        if (!containerId || !fileId) {
          throw new Error('containerId and fileId are required');
        }
        const result = await apiClient.getFileContent(containerId, fileId);
        return result;
      } catch (error) {
        throw error;
      }
    },
    enabled: !!containerId && !!fileId,
    retry: 1,
    staleTime: 0
  });
};

export const useDeleteContainer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (containerId: string) => apiClient.deleteContainer(containerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] });
    },
  });
};

export const useRestartContainer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (containerId: string) => apiClient.restartContainer(containerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] });
    },
  });
};

export const useNotifications = () => {
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const addNotification = useCallback((n: { open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }) => {
    setNotification(n);
  }, []);

  const closeNotification = useCallback(() => {
    setNotification((prev) => ({ ...prev, open: false }));
  }, []);

  return { addNotification, notification, closeNotification };
};

export const useFiles = (containerId: string | undefined) => {
  return useQuery({
    queryKey: ['files', containerId],
    queryFn: () => apiClient.getFiles(containerId ? containerId : ""),
    enabled: !!containerId,
  });
};

export const useGetSemanticGraph = (containerId: string) => {
  return useQuery({
    queryKey: ['semanticGraph', containerId],
    queryFn: () => apiClient.getSemanticGraph(containerId),
    enabled: !!containerId,
  });
};

export const useFilesRebuildIndex = (containerId: string | undefined) => {
  return useQuery({
    queryKey: ['files', containerId],
    queryFn: () => apiClient.getFilesRebuildIndex(containerId ? containerId : ""),
    enabled: !!containerId,
  });
};

export const useUploadFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ containerId, file }: {
      containerId: string;
      file: File;
    }) => apiClient.uploadFile(containerId, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['files', variables.containerId] });
    },
  });
};

export const useDownloadFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ container_id, file }: {
      container_id: string,
      file: ApiFile;
    }) => apiClient.downloadFile(file.name, container_id)
  })
}

export const useDeleteFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ fileId, containerId }: { fileId: string; containerId: string }) =>
      apiClient.deleteFile(fileId, containerId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['files', variables.containerId] });
    },
  });
};

export const useSemanticSearch = () => {
  return useMutation({
    mutationFn: (data: SearchRequest) => apiClient.semanticSearch(data),
  });
};

export const useHealthCheck = () => {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => apiClient.healthCheck(),
    refetchInterval: 30000,
  });
};

export const useRebuildIndex = () => {
  return useMutation({
    mutationFn: () => apiClient.rebuildIndex(),
  });
};

export const useRecommendationsStream = (
  containerId: string | undefined,
  onPathsUpdate?: (paths: string[], event: RecommendationEvent) => void,
  onComplete?: (paths: string[], event: RecommendationEvent) => void,
  onError?: (error: Event) => void
) => {
  const [paths, setPaths] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [streamId, setStreamId] = useState<string | null>(null);
  const disconnectRef = useRef<(() => void) | null>(null);

  const callbacksRef = useRef({ onPathsUpdate, onComplete, onError });

  useEffect(() => {
    callbacksRef.current = { onPathsUpdate, onComplete, onError };
  }, [onPathsUpdate, onComplete, onError]);

  useEffect(() => {
    if (!containerId) return;

    setPaths([]);
    setIsConnected(false);
    setStreamId(null);

    if (disconnectRef.current) {
      disconnectRef.current();
    }

    disconnectRef.current = apiClient.connectToRecommendationsStream(
      containerId,
      {
        onPathsUpdate: (newPaths, event) => {
          setPaths(prev => {
            const combined = [...prev, ...newPaths];
            const unique = Array.from(new Set(combined));
            return unique;
          });

          if (callbacksRef.current.onPathsUpdate) {
            callbacksRef.current.onPathsUpdate(newPaths, event);
          }
        },
        onComplete: (finalPaths, event) => {
          setIsConnected(false);
          if (callbacksRef.current.onComplete) {
            callbacksRef.current.onComplete(finalPaths, event);
          }
        },
        onError: (error) => {
          setIsConnected(false);
          if (callbacksRef.current.onError) {
            callbacksRef.current.onError(error);
          }
        },
        onConnected: (id) => {
          setIsConnected(true);
          setStreamId(id);
        }
      }
    );

    return () => {
      if (disconnectRef.current) {
        disconnectRef.current();
      }
    };
  }, [containerId]); // ТОЛЬКО containerId вызывает пересоздание!

  return { paths, isConnected, streamId };
};

export const useRecommendationsBlocking = () => {
  return useMutation({
    mutationFn: ({ containerId, timeout }: { containerId: string; timeout?: number }) =>
      apiClient.getRecommendationsBlocking(containerId, timeout)
  });
};

export const useCloseRecommendationsStream = () => {
  return useMutation({
    mutationFn: (streamId: string) => apiClient.closeRecommendationsStream(streamId)
  });
};

export const useAutoRefreshFiles = (containerId: string | undefined) => {
  const queryClient = useQueryClient();
  const [paths, setPaths] = useState<string[]>([]);

  const { paths: streamPaths, isConnected } = useRecommendationsStream(
    containerId,
    (newPaths) => {
      setPaths(prev => [...prev, ...newPaths]);
      queryClient.invalidateQueries({ queryKey: ['files', containerId] });
    }
  );

  return {
    paths: streamPaths,
    isConnected,
    refresh: () => queryClient.invalidateQueries({ queryKey: ['files', containerId] })
  };
};