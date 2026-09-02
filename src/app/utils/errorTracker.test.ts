import { describe, it, expect, vi, beforeEach } from "vitest";
import { recordFrontendError, initErrorTracker } from "./errorTracker";
import * as tauriClient from "../../shared/tauri-client";

describe("errorTracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(tauriClient, "hasTauriRuntime").mockReturnValue(true);
  });

  it("recordFrontendError formats and sends Error instances to backend", async () => {
    const recordSpy = vi.spyOn(tauriClient, "errorReportRecordFrontend").mockResolvedValue(undefined as any);
    const testError = new Error("Simulated test error");

    await recordFrontendError("TestScope", testError);

    expect(recordSpy).toHaveBeenCalledWith(
      "frontend",
      "error",
      "TestScope",
      expect.stringContaining("Simulated test error")
    );
  });

  it("recordFrontendError handles string errors", async () => {
    const recordSpy = vi.spyOn(tauriClient, "errorReportRecordFrontend").mockResolvedValue(undefined as any);

    await recordFrontendError("StringScope", "Raw error message", "warn");

    expect(recordSpy).toHaveBeenCalledWith(
      "frontend",
      "warn",
      "StringScope",
      "Raw error message"
    );
  });

  it("initErrorTracker sets up event listeners without error", () => {
    expect(() => initErrorTracker()).not.toThrow();
  });
});
