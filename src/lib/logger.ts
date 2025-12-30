/**
 * Structured Logging Utility
 *
 * Logs to both console and Seq (if configured)
 * Use for better observability in development and production
 */

import * as SeqLogger from "seq-logging";

// Seq configuration from environment
const SEQ_SERVER_URL = process.env.SEQ_SERVER_URL || "http://localhost:5341";
const SEQ_API_KEY = process.env.SEQ_API_KEY;

// Initialize Seq logger (only if enabled)
let seqLogger: SeqLogger.Logger | null = null;

if (process.env.ENABLE_SEQ_LOGGING === "true") {
  seqLogger = new SeqLogger.Logger({
    serverUrl: SEQ_SERVER_URL,
    apiKey: SEQ_API_KEY,
    onError: (e) => {
      // Can't use logger here (circular), use console as last resort
      // eslint-disable-next-line no-console
      console.error("Seq logging error:", e);
    },
  });
  // eslint-disable-next-line no-console
  console.log(`✅ Seq logging enabled: ${SEQ_SERVER_URL}`);
}

export interface LogContext {
  [key: string]: unknown;
}

class Logger {
  /**
   * Log informational message
   */
  info(message: string, context?: LogContext) {
    // Always log to Seq first (if enabled)
    if (seqLogger) {
      seqLogger.emit({
        timestamp: new Date(),
        level: "Information",
        messageTemplate: message,
        properties: context,
      });
    }

    // Also log to console for convenience
    // eslint-disable-next-line no-console
    console.log(`[INFO] ${message}`, context || "");
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext) {
    // Always log to Seq first (if enabled)
    if (seqLogger) {
      seqLogger.emit({
        timestamp: new Date(),
        level: "Warning",
        messageTemplate: message,
        properties: context,
      });
    }

    // Also log to console for convenience
    // eslint-disable-next-line no-console
    console.warn(`[WARN] ${message}`, context || "");
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | unknown, context?: LogContext) {
    // Always log to Seq first (if enabled)
    if (seqLogger) {
      seqLogger.emit({
        timestamp: new Date(),
        level: "Error",
        messageTemplate: message,
        properties: {
          ...context,
          error:
            error instanceof Error
              ? {
                  message: error.message,
                  stack: error.stack,
                  name: error.name,
                }
              : error,
        },
        exception: error instanceof Error ? error.message : undefined,
      });
    }

    // Also log to console for convenience
    // eslint-disable-next-line no-console
    console.error(`[ERROR] ${message}`, error, context || "");
  }

  /**
   * Log debug message (only in development)
   */
  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === "development") {
      // Always log to Seq first (if enabled)
      if (seqLogger) {
        seqLogger.emit({
          timestamp: new Date(),
          level: "Debug",
          messageTemplate: message,
          properties: context,
        });
      }

      // Also log to console for convenience
      // eslint-disable-next-line no-console
      console.debug(`[DEBUG] ${message}`, context || "");
    }
  }

  /**
   * Flush any pending logs (useful before process exit)
   */
  async flush() {
    if (seqLogger) {
      return seqLogger.close();
    }
  }
}

export const logger = new Logger();
