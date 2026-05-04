import { describe, it, expect } from "vitest";
import { sortResultsForMode } from "./utils/search-utils";

describe("sortResultsForMode", () => {
  it("sorts by name ascending", () => {
    const items = [
      { name: "zebra", full_path: "/zebra", parent_path: "/", is_file: true, is_dir: false, extension: null, size: null, created_at: null, modified_at: null, hidden: false, score: null, source_root: "/" },
      { name: "apple", full_path: "/apple", parent_path: "/", is_file: true, is_dir: false, extension: null, size: null, created_at: null, modified_at: null, hidden: false, score: null, source_root: "/" },
    ];
    const sorted = sortResultsForMode(items, "Name");
    expect(sorted[0].name).toBe("apple");
    expect(sorted[1].name).toBe("zebra");
  });

  it("sorts by size descending", () => {
    const items = [
      { name: "small", full_path: "/small", parent_path: "/", is_file: true, is_dir: false, extension: null, size: 10, created_at: null, modified_at: null, hidden: false, score: null, source_root: "/" },
      { name: "large", full_path: "/large", parent_path: "/", is_file: true, is_dir: false, extension: null, size: 1000, created_at: null, modified_at: null, hidden: false, score: null, source_root: "/" },
    ];
    const sorted = sortResultsForMode(items, "Size");
    expect(sorted[0].name).toBe("large");
    expect(sorted[1].name).toBe("small");
  });

  it("handles null size", () => {
    const items = [
      { name: "no_size", full_path: "/no_size", parent_path: "/", is_file: true, is_dir: false, extension: null, size: null, created_at: null, modified_at: null, hidden: false, score: null, source_root: "/" },
      { name: "with_size", full_path: "/with_size", parent_path: "/", is_file: true, is_dir: false, extension: null, size: 100, created_at: null, modified_at: null, hidden: false, score: null, source_root: "/" },
    ];
    const sorted = sortResultsForMode(items, "Size");
    expect(sorted[0].name).toBe("with_size");
  });

  it("does not mutate original array", () => {
    const items = [
      { name: "b", full_path: "/b", parent_path: "/", is_file: true, is_dir: false, extension: null, size: null, created_at: null, modified_at: null, hidden: false, score: null, source_root: "/" },
      { name: "a", full_path: "/a", parent_path: "/", is_file: true, is_dir: false, extension: null, size: null, created_at: null, modified_at: null, hidden: false, score: null, source_root: "/" },
    ];
    const original = [...items];
    sortResultsForMode(items, "Name");
    expect(items[0].name).toBe(original[0].name);
    expect(items[1].name).toBe(original[1].name);
  });
});
