/**
 * Monitoring service interface.
 * Abstracts error reporting so business logic is decoupled from Sentry.
 */

/** Contextual metadata attached to error reports. */
export interface ErrorContext {
  screenName?: string;
  userId?: string;
  deviceModel?: string;
  osVersion?: string;
  networkStatus?: 'online' | 'offline';
  extra?: Record<string, unknown>;
}

/** Navigation/action breadcrumb for debugging context. */
export interface Breadcrumb {
  category: string;
  message: string;
  level?: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, unknown>;
  timestamp?: number;
}

export interface IMonitoringService {
  captureException(error: Error, context?: ErrorContext): void;
  setUser(userId: string): void;
  clearUser(): void;
  addBreadcrumb(breadcrumb: Breadcrumb): void;
}
