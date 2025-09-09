export interface FileData {
  path: string;
  content: string;
  size: number;
}

export interface SearchResult {
  path: string;
  score: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  count: number;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  error?: string;
}