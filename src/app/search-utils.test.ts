import { describe, expect, it } from "vitest";
import {
  compareSearchItems,
  sortResultsForMode,
  filterPlainResults,
  clamp,
  arraysEqual,
  sameSearchContextWithoutQuery,
  isIndexStale,
  parseSearchErrorMessage,
  renderSearchErrorStatus,
  renderSearchErrorFromCode,
  insertIntoSortedArray,
  mergeMetadataIntoResults,
  computeAdaptiveDebounce,
} from "./utils/search-utils";
import type { SearchResultItem } from "../shared/search-types";

const makeItem = (name: string, size?: number, modified?: string, score?: number): SearchResultItem => ({
  name,
  full_path: `/path/${name}`,
  parent_path: "/path",
  is_file: true,
  is_dir: false,
  extension: name.includes(".") ? name.split(".").pop() ?? null : null,
  size: size ?? null,
  created_at: null,
  modified_at: modified ?? null,
  hidden: false,
  score: score ?? null,
  source_root: "/",
});

describe("compareSearchItems", () => {
  it("sorts by name alphabetically", () => {
    const a = makeItem("apple.txt");
    const b = makeItem("banana.txt");
    expect(compareSearchItems(a, b, "Name")).toBeLessThan(0);
    expect(compareSearchItems(b, a, "Name")).toBeGreaterThan(0);
  });

  it("sorts by size descending", () => {
    const small = makeItem("small.txt", 100);
    const large = makeItem("large.txt", 1000);
    expect(compareSearchItems(small, large, "Size")).toBeGreaterThan(0);
    expect(compareSearchItems(large, small, "Size")).toBeLessThan(0);
  });

  it("sorts by modified date descending", () => {
    const older = makeItem("older.txt", 0, "2026-01-01T00:00:00Z");
    const newer = makeItem("newer.txt", 0, "2026-03-01T00:00:00Z");
    expect(compareSearchItems(older, newer, "Modified")).toBeGreaterThan(0);
    expect(compareSearchItems(newer, older, "Modified")).toBeLessThan(0);
  });

  it("sorts by relevance score descending", () => {
    const low = makeItem("low.txt", 0, undefined, 0.5);
    const high = makeItem("high.txt", 0, undefined, 0.9);
    expect(compareSearchItems(low, high, "Relevance")).toBeGreaterThan(0);
    expect(compareSearchItems(high, low, "Relevance")).toBeLessThan(0);
  });
});

describe("sortResultsForMode", () => {
  it("returns new sorted array without mutating original", () => {
    const items = [makeItem("c"), makeItem("a"), makeItem("b")];
    const sorted = sortResultsForMode(items, "Name");
    expect(sorted[0].name).toBe("a");
    expect(sorted[1].name).toBe("b");
    expect(sorted[2].name).toBe("c");
    expect(items[0].name).toBe("c");
  });
});

describe("filterPlainResults", () => {
  const items = [
    makeItem("apple.txt"),
    makeItem("APPLES.doc"),
    makeItem("banana.txt"),
  ];

  it("filters case-insensitively when ignoreCase is true", () => {
    const filtered = filterPlainResults(items, "apple", true);
    expect(filtered).toHaveLength(2);
  });

  it("filters case-sensitively when ignoreCase is false", () => {
    const filtered = filterPlainResults(items, "apple", false);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("apple.txt");
  });

  it("filters by full path", () => {
    const filtered = filterPlainResults(items, "/path/", true);
    expect(filtered).toHaveLength(3);
  });

  it("returns empty array for no matches", () => {
    const filtered = filterPlainResults(items, "xyz123", true);
    expect(filtered).toHaveLength(0);
  });
});

describe("compareSearchItems", () => {
  it("sorts by type extension alphabetically", () => {
    const a = makeItem("file.js");
    const b = makeItem("file.txt");
    expect(compareSearchItems(a, b, "Type")).toBeLessThan(0);
  });

  it("handles null extension in Type mode", () => {
    const a = makeItem("noext");
    const b = makeItem("file.txt");
    expect(compareSearchItems(a, b, "Type")).toBeLessThan(0);
  });

  it("falls back to name for equal relevance scores", () => {
    const a = makeItem("zebra", 0, undefined, 0.5);
    const b = makeItem("apple", 0, undefined, 0.5);
    expect(compareSearchItems(a, b, "Relevance")).toBeGreaterThan(0);
  });
});

describe("mergeMetadataIntoResults", () => {
  it("returns original array when no patches", () => {
    const items = [makeItem("a.txt"), makeItem("b.txt")];
    const result = mergeMetadataIntoResults(items, []);
    expect(result).toBe(items);
  });

  it("returns original array when no patches match", () => {
    const items = [makeItem("a.txt"), makeItem("b.txt")];
    const patches = [{ full_path: "/other/path.txt", size: 999 }];
    const result = mergeMetadataIntoResults(items, patches);
    expect(result).toBe(items);
  });

  it("merges matching patches into results", () => {
    const items = [makeItem("a.txt", 100), makeItem("b.txt", 200)];
    const patches = [{ full_path: "/path/a.txt", size: 500, modified_at: "2026-01-01T00:00:00Z" }];
    const result = mergeMetadataIntoResults(items, patches);
    expect(result).toHaveLength(2);
    expect(result[0].size).toBe(500);
    expect(result[0].modified_at).toBe("2026-01-01T00:00:00Z");
    expect(result[1].size).toBe(200);
  });

  it("does not modify original items", () => {
    const items = [makeItem("a.txt", 100)];
    const patches = [{ full_path: "/path/a.txt", size: 500 }];
    const result = mergeMetadataIntoResults(items, patches);
    expect(items[0].size).toBe(100);
    expect(result[0].size).toBe(500);
  });
});

describe("computeAdaptiveDebounce", () => {
  it("clamps debounce for heavy modes (Regex)", () => {
    const request = {
      options: { match_mode: "Regex", max_depth: null, size_filter: null, created_filter: null, modified_filter: null },
      query: "test",
      roots: ["/home"],
      extensions: []
    };
    const result = computeAdaptiveDebounce(request, 300);
    expect(result).toBeGreaterThanOrEqual(200);
    expect(result).toBeLessThanOrEqual(300);
  });

  it("clamps debounce for many roots", () => {
    const request = {
      options: { match_mode: "Plain", max_depth: null, size_filter: null, created_filter: null, modified_filter: null },
      query: "test",
      roots: ["/a", "/b", "/c"],
      extensions: []
    };
    const result = computeAdaptiveDebounce(request, 300);
    expect(result).toBeGreaterThanOrEqual(200);
    expect(result).toBeLessThanOrEqual(300);
  });

  it("clamps debounce for short simple queries", () => {
    const request = {
      options: { match_mode: "Plain", max_depth: null, size_filter: null, created_filter: null, modified_filter: null },
      query: "abc",
      roots: ["/home"],
      extensions: []
    };
    const result = computeAdaptiveDebounce(request, 200);
    expect(result).toBeGreaterThanOrEqual(80);
    expect(result).toBeLessThanOrEqual(120);
  });

  it("uses normal range for complex queries", () => {
    const request = {
      options: { match_mode: "Plain", max_depth: null, size_filter: null, created_filter: null, modified_filter: null },
      query: "longer query here",
      roots: ["/home"],
      extensions: []
    };
    const result = computeAdaptiveDebounce(request, 200);
    expect(result).toBeGreaterThanOrEqual(120);
    expect(result).toBeLessThanOrEqual(220);
  });
});

describe("renderSearchErrorFromCode", () => {
  const tr = (key: string, defaultValue: string, values?: Record<string, unknown>) => {
    if (values) {
      return defaultValue.replace(/\{\{(\w+)\}\}/g, (_, k) => String(values[k] ?? ""));
    }
    return defaultValue;
  };

  it("renders SEARCH_INVALID_QUERY", () => {
    const result = renderSearchErrorFromCode("SEARCH_INVALID_QUERY", "bad regex", tr);
    expect(result).toContain("Ошибка запроса");
    expect(result).toContain("bad regex");
  });

  it("renders SEARCH_STATE_ERROR", () => {
    const result = renderSearchErrorFromCode("SEARCH_STATE_ERROR", "corrupt state", tr);
    expect(result).toContain("состояния поиска");
  });

  it("renders SEARCH_EXECUTION_ERROR", () => {
    const result = renderSearchErrorFromCode("SEARCH_EXECUTION_ERROR", "io error", tr);
    expect(result).toContain("выполнения поиска");
  });

  it("renders generic error for unknown code", () => {
    const result = renderSearchErrorFromCode("UNKNOWN_CODE", "some error", tr);
    expect(result).toContain("Ошибка:");
    expect(result).toContain("some error");
  });
});

describe("clamp", () => {
  it("clamps value to min", () => {
    expect(clamp(5, 10, 20)).toBe(10);
  });

  it("clamps value to max", () => {
    expect(clamp(25, 10, 20)).toBe(20);
  });

  it("returns value when within range", () => {
    expect(clamp(15, 10, 20)).toBe(15);
  });
});

describe("arraysEqual", () => {
  it("returns true for equal arrays", () => {
    expect(arraysEqual(["a", "b"], ["a", "b"])).toBe(true);
  });

  it("returns false for different length", () => {
    expect(arraysEqual(["a"], ["a", "b"])).toBe(false);
  });

  it("returns false for different elements", () => {
    expect(arraysEqual(["a", "b"], ["a", "c"])).toBe(false);
  });
});

describe("sameSearchContextWithoutQuery", () => {
  it("returns true when only query differs", () => {
    const left = {
      query: "old",
      roots: ["/home"],
      extensions: ["txt"],
      exclude_paths: ["node_modules"],
      options: { match_mode: "Plain" },
    };
    const right = {
      query: "new",
      roots: ["/home"],
      extensions: ["txt"],
      exclude_paths: ["node_modules"],
      options: { match_mode: "Plain" },
    };
    expect(sameSearchContextWithoutQuery(left, right)).toBe(true);
  });

  it("returns false when roots differ", () => {
    const left = {
      query: "test",
      roots: ["/home"],
      extensions: [],
      exclude_paths: [],
      options: {},
    };
    const right = {
      query: "test",
      roots: ["/etc"],
      extensions: [],
      exclude_paths: [],
      options: {},
    };
    expect(sameSearchContextWithoutQuery(left, right)).toBe(false);
  });
});

describe("isIndexStale", () => {
  it("returns true for old timestamp", () => {
    const oldDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(isIndexStale(oldDate, 60 * 60 * 1000)).toBe(true);
  });

  it("returns false for recent timestamp", () => {
    const recentDate = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    expect(isIndexStale(recentDate, 60 * 60 * 1000)).toBe(false);
  });

  it("returns true for invalid timestamp", () => {
    expect(isIndexStale("invalid", 60 * 60 * 1000)).toBe(true);
  });
});

describe("parseSearchErrorMessage", () => {
  it("parses SEARCH_INVALID_QUERY", () => {
    const result = parseSearchErrorMessage("[SEARCH_INVALID_QUERY] query too long");
    expect(result.code).toBe("SEARCH_INVALID_QUERY");
    expect(result.message).toBe("query too long");
  });

  it("returns null code for unformatted message", () => {
    const result = parseSearchErrorMessage("something went wrong");
    expect(result.code).toBeNull();
    expect(result.message).toBe("something went wrong");
  });
});

describe("renderSearchErrorStatus", () => {
  const tr = (key: string, defaultValue: string, values?: Record<string, unknown>) => {
    if (values) {
      return defaultValue.replace(/\{\{(\w+)\}\}/g, (_, k) => String(values[k] ?? ""));
    }
    return defaultValue;
  };

  it("renders invalid query error", () => {
    const result = renderSearchErrorStatus("[SEARCH_INVALID_QUERY] bad query", tr);
    expect(result).toContain("bad query");
  });

  it("renders generic error for unformatted message", () => {
    const result = renderSearchErrorStatus("unknown error", tr);
    expect(result).toContain("unknown error");
  });
});

describe("insertIntoSortedArray", () => {
  it("merges new items into empty sorted array", () => {
    const newItems = [makeItem("b"), makeItem("a")];
    const result = insertIntoSortedArray([], newItems, "Name");
    expect(result.map((i) => i.name)).toEqual(["a", "b"]);
  });

  it("merges new items into existing sorted array", () => {
    const existing = [makeItem("a"), makeItem("c"), makeItem("e")];
    const newItems = [makeItem("b"), makeItem("d")];
    const result = insertIntoSortedArray(existing, newItems, "Name");
    expect(result.map((i) => i.name)).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("handles empty new items array", () => {
    const existing = [makeItem("a"), makeItem("b")];
    const result = insertIntoSortedArray(existing, [], "Name");
    expect(result.map((i) => i.name)).toEqual(["a", "b"]);
  });

  it("handles appending items larger than all existing", () => {
    const existing = [makeItem("a"), makeItem("b")];
    const newItems = [makeItem("c"), makeItem("d")];
    const result = insertIntoSortedArray(existing, newItems, "Name");
    expect(result.map((i) => i.name)).toEqual(["a", "b", "c", "d"]);
  });

  it("handles prepending items smaller than all existing", () => {
    const existing = [makeItem("c"), makeItem("d")];
    const newItems = [makeItem("a"), makeItem("b")];
    const result = insertIntoSortedArray(existing, newItems, "Name");
    expect(result.map((i) => i.name)).toEqual(["a", "b", "c", "d"]);
  });
});
