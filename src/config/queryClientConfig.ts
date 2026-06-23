/**
 * React Query global configuration.
 *
 * Creates a QueryClient with:
 * - retry: 3 attempts for queries
 * - retryDelay: exponential backoff (1s, 2s, 4s, ... capped at 30s)
 * - staleTime: 30 seconds
 * - gcTime: 5 minutes (garbage collection)
 * - Global mutation onError capturing to monitoring service
 *
 * Because the monitoring service lives inside the React tree (via ServiceProvider),
 * we use a module-level callback pattern. Call `setGlobalErrorHandler` after the
 * app mounts to wire in the monitoring service's captureException.
 *
 * Requirements: 11.4
 */

import { QueryClient } from "@tanstack/react-query";

// ─── Module-Level Error Handler ──────────────────────────────────────────────

type ErrorHandler = (error: Error) => void;

let globalErrorHandler: ErrorHandler | null = null;

/**
 * Registers a global error handler for React Query mutations.
 * Call this from a component that has access to the monitoring service
 * (e.g., inside ServiceProvider) after mount.
 */
export function setGlobalErrorHandler(handler: ErrorHandler): void {
  globalErrorHandler = handler;
}

/**
 * Clears the global error handler. Useful for cleanup on unmount.
 */
export function clearGlobalErrorHandler(): void {
  globalErrorHandler = null;
}

// ─── QueryClient Configuration ──────────────────────────────────────────────

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 30_000, // 30 seconds
      gcTime: 300_000, // 5 minutes
    },
    mutations: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      onError: (error: Error) => {
        if (globalErrorHandler) {
          globalErrorHandler(error);
        }
      },
    },
  },
});
