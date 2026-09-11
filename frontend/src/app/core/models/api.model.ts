/** Every endpoint answers with this envelope. */
export interface ApiResponse<T, M = unknown> {
  success: boolean;
  data: T;
  meta?: M;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiErrorDetail {
  field: string;
  message: string;
}

/** Normalised failure shape produced by the error interceptor. */
export interface ApiFailure {
  status: number;
  message: string;
  details?: ApiErrorDetail[];
}
