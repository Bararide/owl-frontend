import axios from 'axios';
import { ApiResponse, FileData, SearchResponse, SearchResult } from '../types';

const API_BASE_URL = 'http://localhost:9999';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    console.log('API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      data: config.data,
      headers: config.headers
    });
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      status: response.status,
      data: response.data,
      url: response.config.url
    });
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    if (error.response) {
      console.error('Error Response Data:', error.response.data);
      console.error('Error Status:', error.response.status);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
    return Promise.reject(error);
  }
);

const extractData = <T>(response: any): ApiResponse<T> => {
  if (response.data && typeof response.data === 'object') {
    const apiResponse = response.data as ApiResponse<T>;

    if (apiResponse.status === 'success' && apiResponse.data) {
      return apiResponse;
    } else if (apiResponse.status === 'error') {
      return apiResponse;
    }
  }

  console.error('Unexpected response structure:', response.data);
  return {
    status: 'error',
    error: 'Unexpected response structure from server'
  };
};

export const semanticSearch = async (query: string, limit: number = 5): Promise<ApiResponse<SearchResponse>> => {
  try {
    console.log('Starting semantic search with query:', query, 'limit:', limit);

    const response = await api.post('/semantic', { query, limit });
    return extractData<SearchResponse>(response);

  } catch (error) {
    console.error('Semantic search API error:', error);

    if (axios.isAxiosError(error)) {
      if (error.response) {
        return extractData<SearchResponse>(error.response);
      } else if (error.request) {
        console.error('No response received from server');
        return { status: 'error', error: 'No response from server - check if API is running' };
      } else {
        console.error('Request setup error:', error.message);
        return { status: 'error', error: `Request failed: ${error.message}` };
      }
    }

    return { status: 'error', error: 'Unknown error during semantic search' };
  }
};

export const createFile = async (path: string, content: string): Promise<ApiResponse<FileData>> => {
  try {
    const response = await api.post('/files/create', { path, content });
    return extractData<FileData>(response);
  } catch (error) {
    console.error('Create file error:', error);

    if (axios.isAxiosError(error) && error.response) {
      return extractData<FileData>(error.response);
    }
    return { status: 'error', error: 'Failed to create file' };
  }
};

export const getFile = async (path: string): Promise<ApiResponse<FileData>> => {
  try {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const response = await api.get('/files/read', {
      params: { path: normalizedPath }
    });
    return extractData<FileData>(response);
  } catch (error) {
    console.error('Get file error:', error);

    if (axios.isAxiosError(error) && error.response) {
      return extractData<FileData>(error.response);
    }
    return { status: 'error', error: 'Failed to fetch file' };
  }
};

export const rebuildIndex = async (): Promise<ApiResponse<{ message: string }>> => {
  try {
    const response = await api.post('/rebuild');
    return extractData<{ message: string }>(response);
  } catch (error) {
    console.error('Rebuild index error:', error);

    if (axios.isAxiosError(error) && error.response) {
      return extractData<{ message: string }>(error.response);
    }
    return { status: 'error', error: 'Failed to rebuild index' };
  }
};