import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiFile, ChatRequest, CreateContainerRequest, OcrProcessRequest, SearchRequest, User } from '../api/client';

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

export const useFiles = (containerId: string | undefined) => {
  return useQuery({
    queryKey: ['files', containerId],
    queryFn: () => apiClient.getFiles(containerId ? containerId : ""),
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
    mutationFn: ({ container_id, file}: {
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