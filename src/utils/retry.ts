import { Result, ErrorCode } from '@/types/result';

/**
 * Configuration for retry behavior with exponential backoff.
 */
export interface RetryConfig {
  maxAttempts: number; // 3
  baseDelayMs: number; // 1000
  backoffMultiplier: number; // 2
}

/**
 * Default retry configuration: 3 attempts with 1s base delay doubling each time.
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  backoffMultiplier: 2,
};

/**
 * Calculates the backoff delay for a given attempt number.
 * Formula: baseDelayMs * multiplier^attempt
 *
 * @param attempt - Zero-based attempt index (0, 1, 2, ...)
 * @param baseDelayMs - Base delay in milliseconds
 * @param multiplier - Backoff multiplier
 * @returns Delay in milliseconds
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number,
  multiplier: number
): number {
  return baseDelayMs * Math.pow(multiplier, attempt);
}

/**
 * Delays execution for the specified number of milliseconds.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries an async operation with exponential backoff.
 *
 * Attempts the operation up to maxAttempts times. If the operation returns
 * a successful Result, it is returned immediately. If all attempts fail,
 * returns a NETWORK_ERROR Result.
 *
 * Backoff delays between attempts: baseDelayMs * backoffMultiplier^attempt
 * With defaults (1000ms base, multiplier 2): 1s, 2s, 4s
 *
 * @param operation - Async function returning a Result<T>
 * @param config - Retry configuration (defaults to 3 attempts, 1s base, 2x multiplier)
 * @returns The successful Result or an error Result after all attempts fail
 */
export async function withRetry<T>(
  operation: () => Promise<Result<T>>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<Result<T>> {
  let lastResult: Result<T> | undefined;

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    const result = await operation();
    if (result.success) return result;

    lastResult = result;

    if (attempt < config.maxAttempts - 1) {
      await delay(
        calculateBackoffDelay(attempt, config.baseDelayMs, config.backoffMultiplier)
      );
    }
  }

  return lastResult ?? {
    success: false,
    error: {
      code: ErrorCode.NETWORK_ERROR,
      message: 'Operation failed after retries',
    },
  };
}
