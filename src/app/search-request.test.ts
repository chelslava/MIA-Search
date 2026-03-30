import { describe, expect, it } from "vitest";
import { buildSearchRequest, getDateValidationErrors } from "./search-request";

describe("buildSearchRequest", () => {
  it("normalizes and deduplicates exclude paths", () => {
    const request = buildSearchRequest({
      query: "report",
      enabledRoots: ["C:/data"],
      primaryRoot: "C:/fallback",
      extensionsRaw: "txt, txt, .md",
      excludePathsRaw: " node_modules, .git, node_modules,  , target ",
      maxDepthUnlimited: true,
      maxDepth: 3,
      limit: 100,
      strict: false,
      ignoreCase: false,
      includeHidden: false,
      entryKind: "Any",
      matchMode: "Plain",
      sizeFilterEnabled: false,
      sizeComparison: "Greater",
      sizeValue: 0,
      sizeUnit: "MB",
      modifiedFilterEnabled: false,
      modifiedAfter: "",
      modifiedBefore: "",
      createdFilterEnabled: false,
      createdAfter: "",
      createdBefore: "",
      sortMode: "Relevance",
      searchBackend: "Scan",
    });

    expect(request.exclude_paths).toEqual(["node_modules", ".git", "target"]);
  });
});

describe("getDateValidationErrors", () => {
  const baseInput = {
    query: "test",
    enabledRoots: ["C:/data"],
    primaryRoot: "C:/fallback",
    extensionsRaw: "",
    excludePathsRaw: "",
    maxDepthUnlimited: true,
    maxDepth: 3,
    limit: 100,
    strict: false,
    ignoreCase: false,
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
    searchBackend: "Scan" as const,
  };

  it("returns no errors for valid dates", () => {
    const errors = getDateValidationErrors({
      ...baseInput,
      modifiedFilterEnabled: true,
      modifiedAfter: "2026-03-25T12:00",
    });
    expect(errors).toEqual([]);
  });

  it("returns error for invalid date format", () => {
    const errors = getDateValidationErrors({
      ...baseInput,
      modifiedFilterEnabled: true,
      modifiedAfter: "invalid-date",
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("modifiedAfter");
    expect(errors[0].rawValue).toBe("invalid-date");
  });

  it("returns errors for multiple invalid dates", () => {
    const errors = getDateValidationErrors({
      ...baseInput,
      modifiedFilterEnabled: true,
      modifiedAfter: "bad",
      modifiedBefore: "worse",
      createdFilterEnabled: true,
      createdAfter: "nope",
    });
    expect(errors).toHaveLength(3);
  });
});
