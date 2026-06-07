import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiClient,
  ApiFile,
  ChatRequest,
  CreateContainerRequest,
  OcrProcessRequest,
  RecommendationEvent,
  SearchRequest,
  User,
  ContainerStatus,
  UserGroup,
  GroupMember,
  ContainerAccess,
} from "../api/client";
import { useCallback, useEffect, useRef, useState } from "react";

export const useContainers = () => {
  return useQuery({
    queryKey: ["containers"],
    queryFn: () => apiClient.getContainers(),
  });
};

export const useAllContainersForAdmin = () => {
  return useQuery({
    queryKey: ["all-containers"],
    queryFn: () => apiClient.getAllContainersForAdmin(),
  });
};

export const useAllUsers = () => {
  return useQuery({
    queryKey: ["all-users"],
    queryFn: () => apiClient.getAllUsers(),
  });
};

export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      apiClient.updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
    },
  });
};

export const useUpdateUserStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      apiClient.updateUserStatus(userId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
    },
  });
};

export const useUserGroups = () => {
  return useQuery({
    queryKey: ["user-groups"],
    queryFn: () => apiClient.getUserGroups(),
  });
};

export const useCreateUserGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      name,
      description,
      color,
    }: {
      name: string;
      description?: string;
      color?: string;
    }) => apiClient.createUserGroup(name, description, color),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-groups"] });
    },
  });
};

export const useDeleteUserGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) => apiClient.deleteUserGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-groups"] });
    },
  });
};

export const useUpdateUserGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      data,
    }: {
      groupId: string;
      data: { name?: string; description?: string; color?: string };
    }) => apiClient.updateUserGroup(groupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-groups"] });
    },
  });
};

export const useGroupMembers = (groupId: string | undefined) => {
  return useQuery({
    queryKey: ["group-members", groupId],
    queryFn: () => apiClient.getGroupMembers(groupId!),
    enabled: !!groupId,
  });
};

export const useAddUserToGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      userId,
      role,
    }: {
      groupId: string;
      userId: string;
      role?: string;
    }) => apiClient.addUserToGroup(groupId, userId, role),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({
        queryKey: ["group-members", groupId],
      });
      queryClient.invalidateQueries({ queryKey: ["user-groups"] });
    },
  });
};

export const useRemoveUserFromGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      userId,
    }: {
      groupId: string;
      userId: string;
    }) => apiClient.removeUserFromGroup(groupId, userId),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({
        queryKey: ["group-members", groupId],
      });
      queryClient.invalidateQueries({ queryKey: ["user-groups"] });
    },
  });
};

export const useUpdateMemberRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      userId,
      role,
    }: {
      groupId: string;
      userId: string;
      role: string;
    }) => apiClient.updateMemberRole(groupId, userId, role),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({
        queryKey: ["group-members", groupId],
      });
    },
  });
};

export const useContainerAccesses = (containerId: string | undefined) => {
  return useQuery({
    queryKey: ["container-accesses", containerId],
    queryFn: () => apiClient.getContainerAccesses(containerId!),
    enabled: !!containerId,
  });
};

export const useGrantContainerAccess = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      containerId,
      groupId,
      permission,
    }: {
      containerId: string;
      groupId: string;
      permission?: string;
    }) => apiClient.grantContainerAccess(containerId, groupId, permission),
    onSuccess: (_, { containerId }) => {
      queryClient.invalidateQueries({
        queryKey: ["container-accesses", containerId],
      });
      queryClient.invalidateQueries({ queryKey: ["user-groups"] });
    },
  });
};

export const useRevokeContainerAccess = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      containerId,
      groupId,
    }: {
      containerId: string;
      groupId: string;
    }) => apiClient.revokeContainerAccess(containerId, groupId),
    onSuccess: (_, { containerId }) => {
      queryClient.invalidateQueries({
        queryKey: ["container-accesses", containerId],
      });
      queryClient.invalidateQueries({ queryKey: ["user-groups"] });
    },
  });
};

export const useCreateContainerAsAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateContainerRequest) =>
      apiClient.createContainerAsAdmin(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-containers"] });
      queryClient.invalidateQueries({ queryKey: ["containers"] });
    },
  });
};

export const useContainer = (containerId: string) => {
  return useQuery({
    queryKey: ["containers", containerId],
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
    mutationFn: (data: CreateContainerRequest) =>
      apiClient.createContainer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["containers"] });
    },
  });
};

export const useGetUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: User) => apiClient.getUser(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
};

export const useContainerStatus = (containerId: string, userId: string) => {
  return useQuery({
    queryKey: ["containerStatus", containerId, userId],
    queryFn: async () => {
      try {
        if (!containerId || !userId) {
          throw new Error("containerId and userId are required");
        }

        const result = await apiClient.getContainerStatus(containerId, userId);
        return result;
      } catch (error) {
        throw error;
      }
    },
  });
};

export const useFileContent = (containerId: string, fileId: string) => {
  return useQuery({
    queryKey: ["fileContent", containerId, fileId],
    queryFn: async () => {
      try {
        if (!containerId || !fileId) {
          throw new Error("containerId and fileId are required");
        }
        const result = await apiClient.getFileContent(containerId, fileId);
        return result;
      } catch (error) {
        throw error;
      }
    },
    enabled: !!containerId && !!fileId,
    retry: 1,
    staleTime: 0,
  });
};

export const useDeleteContainer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (containerId: string) => apiClient.deleteContainer(containerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["containers"] });
    },
  });
};

export const useRestartContainer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (containerId: string) =>
      apiClient.restartContainer(containerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["containers"] });
    },
  });
};

export const useNotifications = () => {
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({
    open: false,
    message: "",
    severity: "info",
  });

  const addNotification = useCallback(
    (n: {
      open: boolean;
      message: string;
      severity: "success" | "error" | "info" | "warning";
    }) => {
      setNotification(n);
    },
    [],
  );

  const closeNotification = useCallback(() => {
    setNotification((prev) => ({ ...prev, open: false }));
  }, []);

  return { addNotification, notification, closeNotification };
};

export const useFiles = (containerId: string | undefined) => {
  return useQuery({
    queryKey: ["files", containerId],
    queryFn: () => apiClient.getFiles(containerId ? containerId : ""),
    enabled: !!containerId,
  });
};

export const useGetSemanticGraph = (containerId: string) => {
  return useQuery({
    queryKey: ["semanticGraph", containerId],
    queryFn: () => apiClient.getSemanticGraph(containerId),
    enabled: !!containerId,
  });
};

export const useFilesRebuildIndex = (containerId: string | undefined) => {
  return useQuery({
    queryKey: ["files", containerId],
    queryFn: () =>
      apiClient.getFilesRebuildIndex(containerId ? containerId : ""),
    enabled: !!containerId,
  });
};

export const useUploadFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ containerId, file }: { containerId: string; file: File }) =>
      apiClient.uploadFile(containerId, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["files", variables.containerId],
      });
    },
  });
};

export const useDownloadFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      container_id,
      file,
    }: {
      container_id: string;
      file: ApiFile;
    }) => apiClient.downloadFile(file.name, container_id),
  });
};

export const useDeleteFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      fileId,
      containerId,
    }: {
      fileId: string;
      containerId: string;
    }) => apiClient.deleteFile(fileId, containerId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["files", variables.containerId],
      });
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
    queryKey: ["health"],
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
  onError?: (error: Event) => void,
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
          setPaths((prev) => {
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
        },
      },
    );

    return () => {
      if (disconnectRef.current) {
        disconnectRef.current();
      }
    };
  }, [containerId]);

  return { paths, isConnected, streamId };
};

export const useRecommendationsBlocking = () => {
  return useMutation({
    mutationFn: ({
      containerId,
      timeout,
    }: {
      containerId: string;
      timeout?: number;
    }) => apiClient.getRecommendationsBlocking(containerId, timeout),
  });
};

export const useCloseRecommendationsStream = () => {
  return useMutation({
    mutationFn: (streamId: string) =>
      apiClient.closeRecommendationsStream(streamId),
  });
};

export const useAutoRefreshFiles = (containerId: string | undefined) => {
  const queryClient = useQueryClient();
  const [paths, setPaths] = useState<string[]>([]);

  const { paths: streamPaths, isConnected } = useRecommendationsStream(
    containerId,
    (newPaths) => {
      setPaths((prev) => [...prev, ...newPaths]);
      queryClient.invalidateQueries({ queryKey: ["files", containerId] });
    },
  );

  return {
    paths: streamPaths,
    isConnected,
    refresh: () =>
      queryClient.invalidateQueries({ queryKey: ["files", containerId] }),
  };
};

export const useContainerGroups = (containerId: string | undefined) => {
  return useQuery({
    queryKey: ["groups", "container", containerId],
    queryFn: () => apiClient.getContainerGroups(containerId!),
    enabled: !!containerId,
  });
};

export const useGroup = (groupId: string | undefined) => {
  return useQuery({
    queryKey: ["groups", groupId],
    queryFn: () => apiClient.getGroup(groupId!),
    enabled: !!groupId,
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      containerId,
      name,
      description,
      color,
    }: {
      containerId: string;
      name: string;
      description?: string;
      color: string;
    }) => apiClient.createGroup(containerId, name, description, color),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["groups", "container", variables.containerId],
      });
    },
  });
};

export const useSearchHistory = (containerId: string | undefined) => {
  return useQuery({
    queryKey: ["searchHistory", containerId],
    queryFn: () => apiClient.getSearchHistory(containerId!),
    enabled: !!containerId,
    staleTime: 1 * 60 * 1000,
    retry: 1,
  });
};

export const useUpdateGroupColor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, color }: { groupId: string; color: string }) =>
      apiClient.updateGroupColor(groupId, color),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
};

export const useUpdateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      description,
    }: {
      groupId: string;
      description: string;
    }) => apiClient.updateGroup(groupId, description),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["groups", variables.groupId],
      });
    },
  });
};

export const useDeleteGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) => apiClient.deleteGroup(groupId),
    onSuccess: (_, groupId) => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
};

export const useGroupFiles = (groupId: string | undefined) => {
  return useQuery({
    queryKey: ["groups", groupId, "files"],
    queryFn: () => apiClient.getGroupFiles(groupId!),
    enabled: !!groupId,
  });
};

export const useFileGroups = (fileId: string | undefined) => {
  return useQuery({
    queryKey: ["files", fileId, "groups"],
    queryFn: () => apiClient.getFileGroups(fileId!),
    enabled: !!fileId,
  });
};

export const useAddFileToGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, fileId }: { groupId: string; fileId: string }) =>
      apiClient.addFileToGroup(groupId, fileId),
    onSuccess: (_, { groupId, fileId }) => {
      queryClient.invalidateQueries({ queryKey: ["groups", groupId, "files"] });
      queryClient.invalidateQueries({ queryKey: ["files", fileId, "groups"] });
      queryClient.invalidateQueries({ queryKey: ["groups", groupId, "stats"] });
    },
  });
};

export const useRemoveFileFromGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, fileId }: { groupId: string; fileId: string }) =>
      apiClient.removeFileFromGroup(groupId, fileId),
    onSuccess: (_, { groupId, fileId }) => {
      queryClient.invalidateQueries({ queryKey: ["groups", groupId, "files"] });
      queryClient.invalidateQueries({ queryKey: ["files", fileId, "groups"] });
      queryClient.invalidateQueries({ queryKey: ["groups", groupId, "stats"] });
    },
  });
};

export const useAddMultipleFilesToGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      fileIds,
    }: {
      groupId: string;
      fileIds: string[];
    }) => apiClient.addMultipleFilesToGroup(groupId, fileIds),
    onSuccess: (_, { groupId, fileIds }) => {
      queryClient.invalidateQueries({ queryKey: ["groups", groupId, "files"] });
      fileIds.forEach((fileId) => {
        queryClient.invalidateQueries({
          queryKey: ["files", fileId, "groups"],
        });
      });
      queryClient.invalidateQueries({ queryKey: ["groups", groupId, "stats"] });
    },
  });
};

export const useRemoveMultipleFilesFromGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      fileIds,
    }: {
      groupId: string;
      fileIds: string[];
    }) => apiClient.removeMultipleFilesFromGroup(groupId, fileIds),
    onSuccess: (_, { groupId, fileIds }) => {
      queryClient.invalidateQueries({ queryKey: ["groups", groupId, "files"] });
      fileIds.forEach((fileId) => {
        queryClient.invalidateQueries({
          queryKey: ["files", fileId, "groups"],
        });
      });
      queryClient.invalidateQueries({ queryKey: ["groups", groupId, "stats"] });
    },
  });
};

export const useMoveFileBetweenGroups = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      fileId,
      fromGroupId,
      toGroupId,
    }: {
      fileId: string;
      fromGroupId: string;
      toGroupId: string;
    }) => apiClient.moveFileBetweenGroups(fileId, fromGroupId, toGroupId),
    onSuccess: (_, { fileId, fromGroupId, toGroupId }) => {
      queryClient.invalidateQueries({
        queryKey: ["groups", fromGroupId, "files"],
      });
      queryClient.invalidateQueries({
        queryKey: ["groups", toGroupId, "files"],
      });
      queryClient.invalidateQueries({ queryKey: ["files", fileId, "groups"] });
      queryClient.invalidateQueries({
        queryKey: ["groups", fromGroupId, "stats"],
      });
      queryClient.invalidateQueries({
        queryKey: ["groups", toGroupId, "stats"],
      });
    },
  });
};

export const useGroupStats = (groupId: string | undefined) => {
  return useQuery({
    queryKey: ["groups", groupId, "stats"],
    queryFn: () => apiClient.getGroupStats(groupId!),
    enabled: !!groupId,
  });
};