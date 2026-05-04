import { describe, it, expect } from "vitest";
import { useSearchRequest } from "./useSearchRequest";
import { renderHook } from "@testing-library/react";

describe("useSearchRequest", () => {
  it("builds empty request when query is blank", () => {
    const { result } = renderHook(() =>
      useSearchRequest({
        query: "",
        enabledRoots: [],
        primaryRoot: null,
        extensionsRaw: "",
        excludePathsRaw: "",
        maxDepthUnlimited: true,
        maxDepth: 3,
        limit: null,
        strict: false,
        ignoreCase: true,
        includeHidden: false,
        entryKind: "Any",
        matchMode: "Plain",
        sizeFilterEnabled: false,
        sizeComparison: "Greater",
        sizeValue: 1,
        sizeUnit: "MB",
        modifiedFilterEnabled: false,
        modifiedAfter: "",
        modifiedBefore: "",
        createdFilterEnabled: false,
        createdAfter: "",
        createdBefore: "",
        sortMode: "Relevance",
        searchBackend: "Scan"
      })
    );

    const request = result.current.buildCurrentRequest();
    expect(request.query).toBe("");
  });

  it("validates empty date filters", () => {
    const { result } = renderHook(() =>
      useSearchRequest({
        query: "test",
        enabledRoots: [],
        primaryRoot: null,
        extensionsRaw: "",
        excludePathsRaw: "",
        maxDepthUnlimited: true,
        maxDepth: 3,
        limit: null,
        strict: false,
        ignoreCase: true,
        includeHidden: false,
        entryKind: "Any",
        matchMode: "Plain",
        sizeFilterEnabled: false,
        sizeComparison: "Greater",
        sizeValue: 1,
        sizeUnit: "MB",
        modifiedFilterEnabled: false,
        modifiedAfter: "",
        modifiedBefore: "",
        createdFilterEnabled: false,
        createdAfter: "",
        createdBefore: "",
        sortMode: "Relevance",
        searchBackend: "Scan"
      })
    );

    const errors = result.current.validateDateFilters();
    expect(errors).toHaveLength(0);
  });

  it("detects empty query", () => {
    const { result } = renderHook(() =>
      useSearchRequest({
        query: "   ",
        enabledRoots: [],
        primaryRoot: null,
        extensionsRaw: "",
        excludePathsRaw: "",
        maxDepthUnlimited: true,
        maxDepth: 3,
        limit: null,
        strict: false,
        ignoreCase: true,
        includeHidden: false,
        entryKind: "Any",
        matchMode: "Plain",
        sizeFilterEnabled: false,
        sizeComparison: "Greater",
        sizeValue: 1,
        sizeUnit: "MB",
        modifiedFilterEnabled: false,
        modifiedAfter: "",
        modifiedBefore: "",
        createdFilterEnabled: false,
        createdAfter: "",
        createdBefore: "",
        sortMode: "Relevance",
        searchBackend: "Scan"
      })
    );

    expect(result.current.isEmptyQuery).toBe(true);
  });
});
