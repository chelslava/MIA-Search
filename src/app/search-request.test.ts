import { describe, expect, it } from "vitest";
import { buildSearchRequest } from "./search-request";

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
