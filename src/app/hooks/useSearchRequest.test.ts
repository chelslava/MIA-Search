import { describe, expect, it } from "vitest";
import { buildSearchRequest, getDateValidationErrors } from "../search-request";
import { computeAdaptiveDebounce } from "../utils/search-utils";

describe("Search flow integration", () => {
  const defaultOptions = {
    query: "test",
    enabledRoots: ["C:/projects"],
    primaryRoot: "C:/",
    extensionsRaw: "",
    excludePathsRaw: "",
    maxDepthUnlimited: true,
    maxDepth: 3,
    limit: null as number | null,
    strict: false,
    ignoreCase: true,
    includeHidden: false,
    entryKind: "Any" as const,
    matchMode: "Plain" as const,
    sizeFilterEnabled: false,
    sizeComparison: "Greater" as const,
    sizeValue: 0,
    sizeUnit: "MB" as const,
    modifiedFilterEnabled: false,
    modifiedAfter: "",
    modifiedBefore: "",
    createdFilterEnabled: false,
    createdAfter: "",
    createdBefore: "",
    sortMode: "Relevance" as const,
    searchBackend: "Scan" as const
  };

  it("builds request with empty query", () => {
    const request = buildSearchRequest({ ...defaultOptions, query: "" });
    expect(request.query).toBe("");
    expect(request.roots).toEqual(["C:/projects"]);
  });

  it("builds request with valid query", () => {
    const request = buildSearchRequest({ ...defaultOptions, query: "test file" });
    expect(request.query).toBe("test file");
  });

  it("normalizes extensions", () => {
    const request = buildSearchRequest({ ...defaultOptions, extensionsRaw: ".ts, .js, .tsx, .jsx" });
    expect(request.extensions).toEqual(["ts", "js", "tsx", "jsx"]);
  });

  it("deduplicates extensions", () => {
    const request = buildSearchRequest({ ...defaultOptions, extensionsRaw: "txt, txt, md, md" });
    expect(request.extensions).toEqual(["txt", "md"]);
  });

  it("normalizes exclude paths", () => {
    const request = buildSearchRequest({ ...defaultOptions, excludePathsRaw: " node_modules , .git , dist " });
    expect(request.exclude_paths).toEqual(["node_modules", ".git", "dist"]);
  });

  it("uses primary root when enabled roots empty", () => {
    const request = buildSearchRequest({ ...defaultOptions, enabledRoots: [], query: "" });
    expect(request.roots).toEqual(["C:/"]);
  });

  it("trims whitespace from query", () => {
    const request = buildSearchRequest({ ...defaultOptions, query: "  hello world  " });
    expect(request.query).toBe("hello world");
  });

  it("applies size filter correctly", () => {
    const request = buildSearchRequest({
      ...defaultOptions,
      sizeFilterEnabled: true,
      sizeComparison: "Greater",
      sizeValue: 10,
      sizeUnit: "MB"
    });
    expect(request.options.size_filter).toEqual({
      comparison: "Greater",
      bytes: 10 * 1024 * 1024
    });
  });

  it("sets max depth when limited", () => {
    const request = buildSearchRequest({
      ...defaultOptions,
      maxDepthUnlimited: false,
      maxDepth: 5
    });
    expect(request.options.max_depth).toBe(5);
  });

  it("sets null max depth when unlimited", () => {
    const request = buildSearchRequest({
      ...defaultOptions,
      maxDepthUnlimited: true
    });
    expect(request.options.max_depth).toBe(null);
  });

  it("computes adaptive debounce for heavy query", () => {
    const request = buildSearchRequest({
      ...defaultOptions,
      matchMode: "Regex"
    });
    const debounce = computeAdaptiveDebounce(request, 300);
    expect(debounce).toBeGreaterThanOrEqual(200);
    expect(debounce).toBeLessThanOrEqual(300);
  });

  it("validates date filters with invalid dates", () => {
    const errors = getDateValidationErrors({
      ...defaultOptions,
      modifiedFilterEnabled: true,
      modifiedAfter: "invalid-date",
      createdFilterEnabled: true,
      createdAfter: "not-a-date"
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});
