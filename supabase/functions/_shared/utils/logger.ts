/**
 * Structured error logging utility for Edge Functions.
 *
 * Provides a factory function `createLogger(functionName)` that returns
 * a logger instance with info/warn/error methods. Each log entry includes
 * severity level, request ID, timestamp, function name, and sanitized data.
 *
 * Sensitive customer data (phone numbers, names, feedback text) is
 * automatically excluded via sanitizeForLogging before output.
 *
 * Requirement 14.3: Log on unhandled exceptions, HTTP 5xx responses,
 * Twilio/DB connection failures with structured metadata.
 */

import { sanitizeForLogging } from "./sanitize.ts";

/** Severity levels for structured log entries. */
export type LogSeverity = "INFO" | "WARN" | "ERROR";

/** Shape of a structured log entry. */
export interface LogEntry {
  severity: LogSeverity;
  requestId: string;
  timestamp: string;
  functionName: string;
  message: string;
  data?: unknown;
}

/** Logger instance returned by createLogger. */
export interface Logger {
  /** Log an informational message. */
  info(message: string, data?: Record<string, unknown>): void;
  /** Log a warning message. */
  warn(message: string, data?: Record<string, unknown>): void;
  /** Log an error message. */
  error(message: string, data?: Record<string, unknown>): void;
  /** The unique request ID for this logger instance. */
  readonly requestId: string;
}

/**
 * Generate a unique request ID.
 * Uses crypto.randomUUID when available (Deno runtime), falls back to
 * a timestamp-based ID.
 */
function generateRequestId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Build a structured log entry.
 */
function buildLogEntry(
  severity: LogSeverity,
  functionName: string,
  requestId: string,
  message: string,
  data?: Record<string, unknown>,
): LogEntry {
  const entry: LogEntry = {
    severity,
    requestId,
    timestamp: new Date().toISOString(),
    functionName,
    message,
  };

  if (data !== undefined) {
    entry.data = sanitizeForLogging(data);
  }

  return entry;
}

/**
 * Create a structured logger instance for an Edge Function.
 *
 * Each logger is scoped to a function name and generates a unique
 * request ID per instantiation. All data passed to log methods is
 * sanitized to exclude sensitive customer information before output.
 *
 * @param functionName - The name of the Edge Function (e.g., "send-sms").
 * @returns A Logger instance with info, warn, and error methods.
 *
 * @example
 * ```ts
 * import { createLogger } from "../_shared/utils/logger.ts";
 *
 * const logger = createLogger("send-sms");
 * logger.info("SMS sent successfully", { businessId: "abc-123" });
 * logger.error("Twilio connection failed", { error: err.message });
 * ```
 */
export function createLogger(functionName: string): Logger {
  const requestId = generateRequestId();

  return {
    get requestId() {
      return requestId;
    },

    info(message: string, data?: Record<string, unknown>): void {
      const entry = buildLogEntry("INFO", functionName, requestId, message, data);
      console.log(JSON.stringify(entry));
    },

    warn(message: string, data?: Record<string, unknown>): void {
      const entry = buildLogEntry("WARN", functionName, requestId, message, data);
      console.warn(JSON.stringify(entry));
    },

    error(message: string, data?: Record<string, unknown>): void {
      const entry = buildLogEntry("ERROR", functionName, requestId, message, data);
      console.error(JSON.stringify(entry));
    },
  };
}
