/**
 * Result type for service operations.
 * All service methods return Result<T> instead of throwing exceptions.
 */
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: AppError };

/**
 * Structured application error returned within failed Result values.
 */
export interface AppError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

/**
 * Error code categories used across the application.
 */
export enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN = 'UNKNOWN',
}
