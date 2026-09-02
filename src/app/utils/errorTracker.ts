import { logger } from "../logger";
import * as tauriClient from "../../shared/tauri-client";

let isInitialized = false;

/**
 * Records an error from the frontend and sends it to the unified backend error tracker.
 */
export async function recordFrontendError(
  context: string,
  error: unknown,
  level: "error" | "warn" = "error"
): Promise<void> {
  const message =
    error instanceof Error
      ? `${error.name}: ${error.message}${error.stack ? `\nStack: ${error.stack}` : ""}`
      : typeof error === "string"
        ? error
        : JSON.stringify(error);

  logger.error(message, context);

  if (tauriClient.hasTauriRuntime()) {
    try {
      await tauriClient.errorReportRecordFrontend("frontend", level, context, message);
    } catch {
      // Avoid recursive crash if reporting fails
    }
  }
}

/**
 * Initializes global uncaught error and unhandled promise rejection handlers.
 */
export function initErrorTracker(): void {
  if (isInitialized || typeof window === "undefined") return;
  isInitialized = true;

  window.addEventListener("error", (event) => {
    const context = `UncaughtException:${event.filename || "unknown"}:${event.lineno || 0}`;
    void recordFrontendError(context, event.error || event.message);
  });

  window.addEventListener("unhandledrejection", (event) => {
    const context = "UnhandledPromiseRejection";
    void recordFrontendError(context, event.reason);
  });
}
