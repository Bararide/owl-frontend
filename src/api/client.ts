import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

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

export interface File {
  id: string;
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

export interface CreateFileRequest {
  file: File;
  content: string;
}

export interface SearchRequest {
  query: string;
  container_id: string;
  limit?: number;
}

export interface SearchResult {
  results: Array<{
    file_id: string;
    path: string;
    score: number;
    content_preview: string;
  }>;
}

class ApiClient {
  private client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Containers endpoints
  async getContainers(): Promise<Container[]> {
    const response = await this.client.get<{ data: Container[] }>('/containers');
    return response.data.data;
  }

  async getContainer(containerId: string): Promise<Container> {
    const response = await this.client.get<{ data: Container }>(`/containers/${containerId}`);
    return response.data.data;
  }

  async createContainer(data: CreateContainerRequest): Promise<Container> {
    const response = await this.client.post<{ data: Container }>('/containers', data);
    return response.data.data;
  }

  async deleteContainer(containerId: string): Promise<void> {
    await this.client.delete(`/containers/${containerId}`);
  }

  async restartContainer(containerId: string): Promise<void> {
    await this.client.post(`/containers/${containerId}/restart`);
  }

  async stopContainer(containerId: string): Promise<void> {
    await this.client.post(`/containers/${containerId}/stop`);
  }

  async getContainerStats(containerId: string): Promise<any> {
    const response = await this.client.get(`/containers/${containerId}/stats`);
    return response.data.data;
  }

  // Files endpoints
  async getFiles(containerId: string): Promise<File[]> {
    const response = await this.client.get<{ data: File[] }>(`/containers/${containerId}/files`);
    return response.data.data;
  }

  async getFile(fileId: string, containerId: string): Promise<File> {
    const response = await this.client.get<{ data: File }>(
      `/containers/${containerId}/files/${fileId}`
    );
    return response.data.data;
  }

  async uploadFile(containerId: string, file: File, content: string): Promise<File> {
    const formData = new FormData();
    formData.append('file', JSON.stringify(file));
    formData.append('content', content);

    const response = await this.client.post<{ data: File }>(
      `/containers/${containerId}/files`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data;
  }

  async deleteFile(fileId: string, containerId: string): Promise<void> {
    await this.client.delete(`/containers/${containerId}/files/${fileId}`);
  }

  async downloadFile(fileId: string, containerId: string): Promise<Blob> {
    const response = await this.client.get(`/containers/${containerId}/files/${fileId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async readFile(fileId: string, containerId: string): Promise<{ content: string }> {
    const response = await this.client.get<{ data: { content: string } }>(
      `/containers/${containerId}/files/${fileId}/content`
    );
    return response.data.data;
  }

  // Search endpoints
  async semanticSearch(data: SearchRequest): Promise<SearchResult> {
    const response = await this.client.post<{ data: SearchResult }>('/search/semantic', data);
    return response.data.data;
  }

  // System endpoints
  async healthCheck(): Promise<{ status: string }> {
    const response = await this.client.get<{ data: { status: string } }>('/health');
    return response.data.data;
  }

  async rebuildIndex(): Promise<{ message: string }> {
    const response = await this.client.post<{ data: { message: string } }>('/search/rebuild-index');
    return response.data.data;
  }

  async getServiceStatus(): Promise<any> {
    const response = await this.client.get('/system/status');
    return response.data.data;
  }
}

export const apiClient = new ApiClient();