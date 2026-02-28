//backend/src/common/dto/paginated-response.dto.ts
export interface PaginatedResponseDto<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}