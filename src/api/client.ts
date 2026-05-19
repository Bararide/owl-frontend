import axios from "axios";
import { EventSourcePolyfill } from "event-source-polyfill";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export interface LabelOption {
  key: string;
  value: string;
}

export interface Container {
  id: string;
  status: "running" | "stopped" | "error" | "starting";
  memory_limit: number;
  storage_quota: number;
  file_limit: number;
  env_label: LabelOption;
  type_label: LabelOption;
  created_at: string;
  cpu_usage: number;
  memory_usage: number;
  user_id: string;
  commands: string[];
  privileged: boolean;
}

export interface ContainerStatus {
  id: string;
  status: string;
}

export interface ApiFile {
  path: string;
  name: string;
  size: number;
  content?: string;
  container_id: string;
  user_id: string;
  created_at: string;
  mime_type: string;
}

export interface CreateContainerRequest {
  container_id: string;
  memory_limit: number;
  storage_quota: number;
  file_limit: number;
  env_label: LabelOption;
  type_label: LabelOption;
  commands: string[];
  privileged: boolean;
}

export interface SearchRequest {
  query: string;
  container_id: string;
  limit?: number;
}

export interface CreateFileRequest {
  file: ApiFile;
  content: string;
}

export interface SearchResult {
  results: Array<{
    file_id?: string;
    path: string;
    score?: number;
    scope?: number;
    content_preview?: string;
  }>;
}

export interface FileContent {
  content: string;
  explanation?: string;
  encoding: string;
  size: number;
  mime_type: string;
}

export interface ChatRequest {
  query: string;
  container_id: string;
  model: number;
  limit: number;
  conversation_history?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

export interface ChatResponse {
  answer: string;
  used_files: Array<{
    file_path: string;
    file_name: string;
    relevance_score: number;
    content_snippet: string;
  }>;
  conversation_id?: string;
}

export interface OcrProcessRequest {
  container_id: string;
  file_data: string;
  file_name: string;
  mime_type: string;
  model?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
}

export interface SemanticGraphEdge {
  source?: string;
  target?: string;
  from?: string;
  to?: string;
  scope?: number;
  bidirectional?: boolean;
  reverse?: boolean;
  metadata?: Record<string, any>;
}

export interface SemanticGraphNode {
  id?: string;
  path?: string;
  name?: string;
  title?: string;
  metadata?: Record<string, any>;
}

export interface SemanticGraphData {
  nodes?: SemanticGraphNode[];
  edges?: SemanticGraphEdge[];
  links?: SemanticGraphEdge[];
  graph?: SemanticGraphEdge[];
  count?: number;
  container_id?: string;
  user_id?: string;
  request_id?: string;
  success?: boolean;
}

export interface OcrProcessResponse {
  text: string;
  confidence: number;
  processing_time: number;
  file_name: string;
  extracted_text_length: number;
  boxes_count: number;
  has_visualization: boolean;
  visualization?: string;
  visualization_format?: string;
}

export interface RecommendationEvent {
  container_id: string;
  user_id: string;
  paths: string[];
  type?: "paths_update" | "complete";
  total_paths?: string[];
  count?: number;
}

export interface Group {
  id: string;
  container_id: string;
  description: string | null;
  created_at: string;
  color: string;
}

export interface GroupStats {
  group_id: string;
  container_id: string;
  description: string | null;
  created_at: string;
  total_files: number;
  total_size: number;
  average_file_size: number;
  files: Array<{
    id: string;
    name: string;
    size: number;
    created_at: string;
  }>;
}

export interface FileGroupRelation {
  file_id: string;
  group_id: string;
}

export interface RecommendationStreamCallbacks {
  onPathsUpdate?: (paths: string[], event: RecommendationEvent) => void;
  onComplete?: (paths: string[], event: RecommendationEvent) => void;
  onError?: (error: Event) => void;
  onConnected?: (streamId: string) => void;
}

export interface RecommendationsBlockingResponse {
  container_id: string;
  user_id: string;
  paths: string[];
  count: number;
}

export interface RecommendationFile {
  path: string;
  name: string;
  isRecommended: boolean;
}

export interface SearchResultFile extends ApiFile {
  score?: number;
  content_preview?: string;
}

export interface SearchHistoryResponse {
  container_id: string;
  history: string[];
  request_id?: string;
  success?: boolean;
  user_id?: string;
}

class ApiClient {
  private token: string | null = null;
  private client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  private getAuthHeaders() {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    return headers;
  }

  connectToRecommendationsStream(
    containerId: string,
    callbacks: RecommendationStreamCallbacks,
  ): () => void {
    if (!this.token) {
      throw new Error("No token set");
    }

    const url = `${API_BASE_URL}/recommendations/stream?container_id=${containerId}`;
    const controller = new AbortController();
    let isAborted = false;

    const safeCallback = <K extends keyof RecommendationStreamCallbacks>(
      name: K,
      ...args: Parameters<NonNullable<RecommendationStreamCallbacks[K]>>
    ) => {
      if (!isAborted && callbacks[name]) {
        (callbacks[name] as any)(...args);
      }
    };

    fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "text/event-stream",
      },
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok || !response.body) {
          throw new Error(`Failed to connect: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const read = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (line.startsWith("data:")) {
                  try {
                    const data = JSON.parse(line.slice(5));
                    if (data.paths) {
                      safeCallback("onPathsUpdate", data.paths, data);
                    }
                  } catch (e) {
                    console.error("Error parsing SSE data:", e);
                  }
                } else if (line.startsWith("event: connected")) {
                  try {
                    const data = JSON.parse(line.slice(14));
                    safeCallback("onConnected", data.stream_id);
                  } catch (e) {
                    console.error("Error parsing connected event:", e);
                  }
                } else if (line.startsWith("event: end")) {
                  safeCallback("onComplete", [], {} as RecommendationEvent);
                  return;
                }
              }
            }
          } catch (readError) {
            if (!isAborted) {
              safeCallback("onError", readError as Event);
            }
          }
        };

        read();
      })
      .catch((error) => {
        if (error.name !== "AbortError" && !isAborted) {
          safeCallback("onError", error);
        }
      });

    return () => {
      isAborted = true;
      controller.abort();
    };
  }

  async getRecommendationsBlocking(
    containerId: string,
    timeout: number = 30,
  ): Promise<RecommendationsBlockingResponse> {
    const response = await this.client.get<{
      data: RecommendationsBlockingResponse;
    }>(`/recommendations/blocking`, {
      params: { container_id: containerId, timeout },
      headers: this.getAuthHeaders(),
    });
    return response.data.data;
  }

  async closeRecommendationsStream(
    streamId: string,
  ): Promise<{ stream_id: string; closed: boolean }> {
    const response = await this.client.post<{
      data: { stream_id: string; closed: boolean };
    }>(
      `/recommendations/stream/${streamId}/close`,
      {},
      { headers: this.getAuthHeaders() },
    );
    return response.data.data;
  }

  async chatWithBot(data: ChatRequest): Promise<ChatResponse> {
    const response = await this.client.post<{ data: ChatResponse }>(
      "/chat",
      data,
      {
        headers: this.getAuthHeaders(),
      },
    );
    return response.data.data;
  }

  async ocrProcess(data: OcrProcessRequest): Promise<OcrProcessResponse> {
    const response = await this.client.post<{ data: OcrProcessResponse }>(
      "/ocr/process",
      data,
      {
        headers: this.getAuthHeaders(),
      },
    );
    return response.data.data;
  }

  async getUser(): Promise<User> {
    const response = await this.client.get<{ data: User }>("/auth/user", {
      headers: this.getAuthHeaders(),
    });
    return response.data.data;
  }

  async getSemanticGraph(containerId: string): Promise<SemanticGraphData> {
    const response = await this.client.get<{ data: SemanticGraphData }>(
      "/search/graph",
      {
        headers: this.getAuthHeaders(),
        params: { container_id: containerId },
      },
    );
    console.log("Graph data received:", response.data.data);
    return response.data.data;
  }

  async getContainers(): Promise<Container[]> {
    const response = await this.client.get<{ data: Container[] }>(
      "/containers",
      {
        headers: this.getAuthHeaders(),
      },
    );
    return response.data.data;
  }

  async getContainer(containerId: string): Promise<Container> {
    const response = await this.client.get<{ data: Container }>(
      `/containers/${containerId}`,
      {
        headers: this.getAuthHeaders(),
      },
    );
    return response.data.data;
  }

  async createContainer(data: CreateContainerRequest): Promise<Container> {
    const response = await this.client.post<{ data: Container }>(
      "/containers",
      data,
      {
        headers: this.getAuthHeaders(),
      },
    );
    return response.data.data;
  }

  async deleteContainer(containerId: string): Promise<void> {
    await this.client.delete(`/containers/${containerId}`, {
      headers: this.getAuthHeaders(),
    });
  }

  async restartContainer(containerId: string): Promise<void> {
    await this.client.post(
      `/containers/${containerId}/restart`,
      {},
      {
        headers: this.getAuthHeaders(),
      },
    );
  }

  async getSearchHistory(containerId: string): Promise<SearchHistoryResponse> {
    const response = await this.client.get<{ data: SearchHistoryResponse }>(
      "/search/history",
      {
        headers: this.getAuthHeaders(),
        params: { container_id: containerId },
      },
    );
    return response.data.data;
  }

  async stopContainer(containerId: string): Promise<void> {
    await this.client.post(
      `/containers/${containerId}/stop`,
      {},
      {
        headers: this.getAuthHeaders(),
      },
    );
  }

  async getContainerStats(containerId: string): Promise<any> {
    const response = await this.client.get(`/containers/${containerId}/stats`, {
      headers: this.getAuthHeaders(),
    });
    return response.data.data;
  }

  async getFiles(containerId: string): Promise<ApiFile[]> {
    const response = await this.client.get<{ data: ApiFile[] }>(
      `/containers/${containerId}/files`,
      {
        headers: this.getAuthHeaders(),
      },
    );
    return response.data.data;
  }

  async getFilesRebuildIndex(containerId: string): Promise<ApiFile[]> {
    const response = await this.client.get<{ data: ApiFile[] }>(
      `/containers/${containerId}/files/refresh`,
      {
        headers: this.getAuthHeaders(),
      },
    );
    return response.data.data;
  }

  async getFile(fileId: string, containerId: string): Promise<ApiFile> {
    const response = await this.client.get<{ data: ApiFile }>(
      `/containers/${containerId}/files/${fileId}`,
      { headers: this.getAuthHeaders() },
    );
    return response.data.data;
  }

  async getFileContent(
    containerId: string,
    fileId: string,
  ): Promise<FileContent> {
    const response = await this.client.get<{ data: FileContent }>(
      `/containers/${containerId}/files/${fileId}/content`,
      { headers: this.getAuthHeaders() },
    );
    return response.data.data;
  }

  async getContainerStatus(
    containerId: string,
    userId: string,
  ): Promise<ContainerStatus> {
    const response = await this.client.get<{ data: ContainerStatus }>(
      `/containers/${containerId}/status`,
      {
        headers: this.getAuthHeaders(),
        params: { user_id: userId },
      },
    );
    return response.data.data;
  }

  async uploadFile(containerId: string, file: File): Promise<ApiFile> {
    const formData = new FormData();
    formData.append("file", file);

    const uploadClient = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
    });

    const response = await uploadClient.post<{ data: ApiFile }>(
      `/containers/${containerId}/files`,
      formData,
      {
        headers: {
          Authorization: this.token ? `Bearer ${this.token}` : "",
        },
      },
    );
    return response.data.data;
  }

  async deleteFile(fileId: string, containerId: string): Promise<void> {
    await this.client.delete(`/containers/${containerId}/files/${fileId}`, {
      headers: this.getAuthHeaders(),
    });
  }

  async downloadFile(fileId: string, containerId: string): Promise<Blob> {
    const response = await this.client.get(
      `/containers/${containerId}/files/${fileId}/download`,
      {
        responseType: "blob",
        headers: this.getAuthHeaders(),
      },
    );
    return response.data;
  }

  async readFile(
    fileId: string,
    containerId: string,
  ): Promise<{ content: string }> {
    const response = await this.client.get<{ data: { content: string } }>(
      `/containers/${containerId}/files/${fileId}/content`,
      { headers: this.getAuthHeaders() },
    );
    return response.data.data;
  }

  async semanticSearch(data: SearchRequest): Promise<SearchResult> {
    const response = await this.client.post<{ data: SearchResult }>(
      "/search/semantic",
      { query: data.query, limit: data.limit },
      {
        headers: this.getAuthHeaders(),
        params: { container_id: data.container_id },
      },
    );
    return response.data.data;
  }

  async healthCheck(): Promise<{ status: string }> {
    const response = await this.client.get<{ data: { status: string } }>(
      "/health",
      {
        headers: this.getAuthHeaders(),
      },
    );
    return response.data.data;
  }

  async rebuildIndex(): Promise<{ message: string }> {
    const response = await this.client.post<{ data: { message: string } }>(
      "/search/rebuild-index",
      {},
      {
        headers: this.getAuthHeaders(),
      },
    );
    return response.data.data;
  }

  async getServiceStatus(): Promise<any> {
    const response = await this.client.get("/system/status", {
      headers: this.getAuthHeaders(),
    });
    return response.data.data;
  }

  async getContainerGroups(containerId: string): Promise<Group[]> {
    const response = await this.client.get<{ data: Group[] }>(
      `/groups/container/${containerId}`,
      { headers: this.getAuthHeaders() },
    );
    return response.data.data;
  }

  async createGroup(
    containerId: string,
    name: string,
    description?: string,
    color?: string,
  ): Promise<Group> {
    const response = await this.client.post<{ data: Group }>(
      `/groups/container/${containerId}`,
      { name, description: description || "", color: color || "#ff9800" },
      { headers: this.getAuthHeaders() },
    );
    return response.data.data;
  }

  async updateGroupColor(groupId: string, color: string): Promise<void> {
    await this.client.patch(
      `/groups/${groupId}`,
      { color },
      { headers: this.getAuthHeaders() },
    );
  }

  async getGroup(groupId: string): Promise<Group> {
    const response = await this.client.get<{ data: Group }>(
      `/groups/${groupId}`,
      { headers: this.getAuthHeaders() },
    );
    return response.data.data;
  }

  async updateGroup(groupId: string, description: string): Promise<void> {
    await this.client.patch(
      `/groups/${groupId}`,
      { description },
      { headers: this.getAuthHeaders() },
    );
  }

  async deleteGroup(groupId: string): Promise<void> {
    await this.client.delete(`/groups/${groupId}`, {
      headers: this.getAuthHeaders(),
    });
  }

  async addFileToGroup(
    groupId: string,
    fileId: string,
  ): Promise<FileGroupRelation> {
    const response = await this.client.post<{ data: FileGroupRelation }>(
      `/groups/${groupId}/files`,
      { file_id: fileId },
      { headers: this.getAuthHeaders() },
    );
    return response.data.data;
  }

  async removeFileFromGroup(groupId: string, fileId: string): Promise<void> {
    await this.client.delete(`/groups/${groupId}/files/${fileId}`, {
      headers: this.getAuthHeaders(),
    });
  }

  async getGroupFiles(groupId: string): Promise<ApiFile[]> {
    const response = await this.client.get<{ data: ApiFile[] }>(
      `/groups/${groupId}/files`,
      { headers: this.getAuthHeaders() },
    );
    return response.data.data;
  }

  async getFileGroups(fileId: string): Promise<Group[]> {
    const response = await this.client.get<{ data: Group[] }>(
      `/groups/file/${fileId}/groups`,
      { headers: this.getAuthHeaders() },
    );
    return response.data.data;
  }

  async addMultipleFilesToGroup(
    groupId: string,
    fileIds: string[],
  ): Promise<FileGroupRelation[]> {
    const response = await this.client.post<{ data: FileGroupRelation[] }>(
      `/groups/${groupId}/files/batch`,
      { file_ids: fileIds },
      { headers: this.getAuthHeaders() },
    );
    return response.data.data;
  }

  async removeMultipleFilesFromGroup(
    groupId: string,
    fileIds: string[],
  ): Promise<void> {
    await this.client.delete(`/groups/${groupId}/files/batch`, {
      data: { file_ids: fileIds },
      headers: this.getAuthHeaders(),
    });
  }

  async moveFileBetweenGroups(
    fileId: string,
    fromGroupId: string,
    toGroupId: string,
  ): Promise<void> {
    await this.client.post(
      `/groups/${toGroupId}/move/${fileId}`,
      { from_group_id: fromGroupId },
      { headers: this.getAuthHeaders() },
    );
  }

  async getGroupStats(groupId: string): Promise<GroupStats> {
    const response = await this.client.get<{ data: GroupStats }>(
      `/groups/${groupId}/stats`,
      { headers: this.getAuthHeaders() },
    );
    return response.data.data;
  }
}

export const apiClient = new ApiClient();
