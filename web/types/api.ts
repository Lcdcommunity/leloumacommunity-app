//web/types/api.ts
export interface ApiListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiErrorPayload {
  message: string | string[];
  error?: string;
  statusCode?: number;
}