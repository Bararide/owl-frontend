import axios from 'axios';
import { EventSourcePolyfill } from 'event-source-polyfill';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface LabelOption {
  key: string;
  value: string;
}

export interface Container {
  id: string;
  status: 'running' | 'stopped' | 'error' | 'starting';
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
    role: 'user' | 'assistant';
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

export interface SemanticGraph {
  from: string;
  to: string;
  score: number
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
  type?: 'paths_update' | 'complete';
  total_paths?: string[];
  count?: number;
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

class ApiClient {
  private token: string | null = null;
  private client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
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
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  connectToRecommendationsStream(
    containerId: string,
    callbacks: RecommendationStreamCallbacks
  ): () => void {
    if (!this.token) {
      throw new Error('No token set');
    }

    const url = `${API_BASE_URL}/recommendations/stream?container_id=${containerId}`;
    const controller = new AbortController();

    fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'text/event-stream',
      },
      signal: controller.signal,
    })
      .then(response => {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const read = async () => {
          while (true) {
            const { done, value } = await reader!.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data:')) {
                try {
                  const data = JSON.parse(line.slice(5));
                  if (data.paths && callbacks.onPathsUpdate) {
                    callbacks.onPathsUpdate(data.paths, data);
                  }
                } catch (e) {
                  console.error('Error parsing SSE data:', e);
                }
              } else if (line.startsWith('event: connected')) {
                try {
                  const data = JSON.parse(line.slice(14));
                  if (callbacks.onConnected) {
                    callbacks.onConnected(data.stream_id);
                  }
                } catch (e) {
                  console.error('Error parsing connected event:', e);
                }
              } else if (line.startsWith('event: end')) {
                callbacks.onComplete?.([], {} as RecommendationEvent);
                controller.abort();
              }
            }
          }
        };

        read();
      })
      .catch(error => {
        callbacks.onError?.(error);
      });

    return () => {
      controller.abort();
    };
  }

  async getRecommendationsBlocking(
    containerId: string,
    timeout: number = 30
  ): Promise<RecommendationsBlockingResponse> {
    const response = await this.client.get<{ data: RecommendationsBlockingResponse }>(
      `/recommendations/blocking`,
      {
        params: { container_id: containerId, timeout },
        headers: this.getAuthHeaders()
      }
    );
    return response.data.data;
  }

  async closeRecommendationsStream(streamId: string): Promise<{ stream_id: string; closed: boolean }> {
    const response = await this.client.post<{ data: { stream_id: string; closed: boolean } }>(
      `/recommendations/stream/${streamId}/close`,
      {},
      { headers: this.getAuthHeaders() }
    );
    return response.data.data;
  }

  async chatWithBot(data: ChatRequest): Promise<ChatResponse> {
    const response = await this.client.post<{ data: ChatResponse }>('/chat', data, {
      headers: this.getAuthHeaders()
    });
    return response.data.data;
  }

  async ocrProcess(data: OcrProcessRequest): Promise<OcrProcessResponse> {
    const response = await this.client.post<{ data: OcrProcessResponse }>('/ocr/process', data, {
      headers: this.getAuthHeaders()
    });
    return response.data.data;
  }

  async getUser(): Promise<User> {
    const response = await this.client.get<{data: User}>('/auth/user', {
      headers: this.getAuthHeaders()
    });
    return response.data.data;
  }

async getSemanticGraph(containerId: string): Promise<SemanticGraph> {
  const response = await this.client.get<{ data: SemanticGraph }>('/search/graph', {
    headers: this.getAuthHeaders(),
    params: { container_id: containerId }
  });
  return response.data.data;
}

  async getContainers(): Promise<Container[]> {
    const response = await this.client.get<{ data: Container[] }>('/containers', {
      headers: this.getAuthHeaders()
    });
    return response.data.data;
  }

  async getContainer(containerId: string): Promise<Container> {
    const response = await this.client.get<{ data: Container }>(`/containers/${containerId}`, {
      headers: this.getAuthHeaders()
    });
    return response.data.data;
  }

  async createContainer(data: CreateContainerRequest): Promise<Container> {
    const response = await this.client.post<{ data: Container }>('/containers', data, {
      headers: this.getAuthHeaders()
    });
    return response.data.data;
  }

  async deleteContainer(containerId: string): Promise<void> {
    await this.client.delete(`/containers/${containerId}`, {
      headers: this.getAuthHeaders()
    });
  }

  async restartContainer(containerId: string): Promise<void> {
    await this.client.post(`/containers/${containerId}/restart`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  async stopContainer(containerId: string): Promise<void> {
    await this.client.post(`/containers/${containerId}/stop`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  async getContainerStats(containerId: string): Promise<any> {
    const response = await this.client.get(`/containers/${containerId}/stats`, {
      headers: this.getAuthHeaders()
    });
    return response.data.data;
  }

  async getFiles(containerId: string): Promise<ApiFile[]> {
    const response = await this.client.get<{ data: ApiFile[] }>(`/containers/${containerId}/files`, {
      headers: this.getAuthHeaders()
    });
    return response.data.data;
  }

  async getFilesRebuildIndex(containerId: string): Promise<ApiFile[]> {
    const response = await this.client.get<{ data: ApiFile[] }>(`/containers/${containerId}/files/refresh`, {
      headers: this.getAuthHeaders()
    });
    return response.data.data;
  }

  async getFile(fileId: string, containerId: string): Promise<ApiFile> {
    const response = await this.client.get<{ data: ApiFile }>(
      `/containers/${containerId}/files/${fileId}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data.data;
  }

  async getFileContent(containerId: string, fileId: string): Promise<FileContent> {
    const response = await this.client.get<{ data: FileContent }>(
      `/containers/${containerId}/files/${fileId}/content`,
      { headers: this.getAuthHeaders() }
    );
    return response.data.data;
  }

  async uploadFile(
    containerId: string, 
    file: File
  ): Promise<ApiFile> {
    const formData = new FormData();
    formData.append('file', file);
    
    const uploadClient = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
    });
    
    const response = await uploadClient.post<{ data: ApiFile }>(
      `/containers/${containerId}/files`,
      formData,
      {
        headers: {
          'Authorization': this.token ? `Bearer ${this.token}` : '',
        },
      }
    );
    return response.data.data;
  }

  async deleteFile(fileId: string, containerId: string): Promise<void> {
    await this.client.delete(`/containers/${containerId}/files/${fileId}`, {
      headers: this.getAuthHeaders()
    });
  }

  async downloadFile(fileId: string, containerId: string): Promise<Blob> {
    const response = await this.client.get(`/containers/${containerId}/files/${fileId}/download`, {
      responseType: 'blob',
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async readFile(fileId: string, containerId: string): Promise<{ content: string }> {
    const response = await this.client.get<{ data: { content: string } }>(
      `/containers/${containerId}/files/${fileId}/content`,
      { headers: this.getAuthHeaders() }
    );
    return response.data.data;
  }

  async semanticSearch(data: SearchRequest): Promise<SearchResult> {
    const response = await this.client.post<{ data: SearchResult }>('/search/semantic', data, {
      headers: this.getAuthHeaders()
    });
    return response.data.data;
  }

  async healthCheck(): Promise<{ status: string }> {
    const response = await this.client.get<{ data: { status: string } }>('/health', {
      headers: this.getAuthHeaders()
    });
    return response.data.data;
  }

  async rebuildIndex(): Promise<{ message: string }> {
    const response = await this.client.post<{ data: { message: string } }>('/search/rebuild-index', {}, {
      headers: this.getAuthHeaders()
    });
    return response.data.data;
  }

  async getServiceStatus(): Promise<any> {
    const response = await this.client.get('/system/status', {
      headers: this.getAuthHeaders()
    });
    return response.data.data;
  }
}

export const apiClient = new ApiClient();