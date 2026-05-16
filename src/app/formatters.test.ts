import { describe, expect, it } from "vitest";
import {
  formatBytes,
  formatDate,
  formatRelativeTime,
  toIsoOrNull
} from "./formatters";

describe("formatBytes", () => {
  it("returns empty string for null", () => {
    expect(formatBytes(null)).toBe("");
  });

  it("returns empty string for negative", () => {
    expect(formatBytes(-1)).toBe("");
  });

  it("formats bytes correctly", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("formats KB correctly", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("formats MB correctly", () => {
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
    expect(formatBytes(1024 * 1024 * 2.5)).toBe("2.5 MB");
  });

  it("formats GB correctly", () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe("1.0 GB");
  });

  it("formats large values without decimals for 100+ units", () => {
    expect(formatBytes(1024 * 1024 * 1024 * 100)).toBe("100 GB");
  });
});

describe("formatDate", () => {
  it("returns empty string for null", () => {
    expect(formatDate(null)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(formatDate("")).toBe("");
  });

  it("formats valid ISO date", () => {
    const result = formatDate("2026-05-01T12:00:00.000Z");
    expect(result).not.toBe("");
    expect(result).toContain("2026");
  });

  it("returns empty string for invalid date", () => {
    expect(formatDate("not-a-date")).toBe("");
  });
});

describe("formatRelativeTime", () => {
  it("returns empty string for null", () => {
    expect(formatRelativeTime(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(formatRelativeTime(undefined)).toBe("");
  });

  it("returns empty string for invalid date", () => {
    expect(formatRelativeTime("invalid")).toBe("");
  });

  it("returns 'только что' for very recent dates", () => {
    const now = new Date();
    const result = formatRelativeTime(now.toISOString());
    expect(result).toBe("только что");
  });
});

describe("toIsoOrNull", () => {
  it("returns null for empty string", () => {
    expect(toIsoOrNull("")).toBeNull();
  });

  it("returns null for whitespace only", () => {
    expect(toIsoOrNull("   ")).toBeNull();
  });

  it("returns null for invalid date", () => {
    expect(toIsoOrNull("not-a-date")).toBeNull();
  });

  it("converts valid ISO date", () => {
    const result = toIsoOrNull("2026-05-01T12:00:00.000Z");
    expect(result).toBe("2026-05-01T12:00:00.000Z");
  });

  it("converts date-only string", () => {
    const result = toIsoOrNull("2026-05-01");
    expect(result).not.toBeNull();
    expect(result).toContain("2026-05-01");
  });
});
