import { useMemo } from "react";
import type { SortMode, SearchResultItem } from "../../shared/search-types";

/**
 * Compares two search result items for sorting.
 * @param left - First item to compare
 * @param right - Second item to compare
 * @param mode - The sort mode determining comparison criteria
 * @returns Negative if left < right, positive if left > right, zero if equal
 */
export function compareSearchItems(left: SearchResultItem, right: SearchResultItem, mode: SortMode): number {
  switch (mode) {
    case "Name":
      return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
    case "Size":
      return (right.size ?? -1) - (left.size ?? -1);
    case "Modified":
      return new Date(right.modified_at ?? 0).getTime() - new Date(left.modified_at ?? 0).getTime();
    case "Type":
      return (left.extension ?? "").localeCompare(right.extension ?? "", undefined, { sensitivity: "base" });
    case "Relevance":
    default: {
      const scoreDiff = (right.score ?? 0) - (left.score ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
    }
  }
}

/**
 * Sorts search results according to the specified mode.
 * Creates a new sorted array without mutating the original.
 */
export function sortResultsForMode(items: SearchResultItem[], mode: SortMode): SearchResultItem[] {
  return [...items].sort((left, right) => compareSearchItems(left, right, mode));
}

export function insertIntoSortedArray(
  sorted: SearchResultItem[],
  newItems: SearchResultItem[],
  mode: SortMode
): SearchResultItem[] {
  if (sorted.length === 0) {
    return sortResultsForMode(newItems, mode);
  }
  if (newItems.length === 0) {
    return sorted;
  }

  const result: SearchResultItem[] = [];
  let sortedIdx = 0;
  let newIdx = 0;

  while (sortedIdx < sorted.length && newIdx < newItems.length) {
    if (compareSearchItems(sorted[sortedIdx], newItems[newIdx], mode) <= 0) {
      result.push(sorted[sortedIdx++]);
    } else {
      result.push(newItems[newIdx++]);
    }
  }

  while (sortedIdx < sorted.length) {
    result.push(sorted[sortedIdx++]);
  }

  while (newIdx < newItems.length) {
    result.push(newItems[newIdx++]);
  }

  return result;
}

/**
 * Filters search results by query string using plain text matching.
 * Searches both item name and full path.
 */
export function filterPlainResults(items: SearchResultItem[], query: string, ignoreCase: boolean): SearchResultItem[] {
  const normalizedQuery = ignoreCase ? query.toLocaleLowerCase() : query;
  return items.filter((item) => {
    const name = ignoreCase ? item.name.toLocaleLowerCase() : item.name;
    const fullPath = ignoreCase ? item.full_path.toLocaleLowerCase() : item.full_path;
    return name.includes(normalizedQuery) || fullPath.includes(normalizedQuery);
  });
}

/**
 * Merges metadata patches into search results.
 * Updates existing items with fresh metadata from the backend.
 * Only creates new array if patches match any items.
 */
export function mergeMetadataIntoResults(items: SearchResultItem[], patches: { full_path: string; extension?: string | null; size?: number | null; created_at?: string | null; modified_at?: string | null; hidden?: boolean }[]): SearchResultItem[] {
  if (patches.length === 0) return items;
  const patchByPath = new Map(patches.map((patch) => [patch.full_path, patch]));

  let hasMatches = false;
  for (const item of items) {
    if (patchByPath.has(item.full_path)) {
      hasMatches = true;
      break;
    }
  }
  if (!hasMatches) return items;

  return items.map((item) => {
    const patch = patchByPath.get(item.full_path);
    if (!patch) return item;
    return {
      ...item,
      extension: patch.extension !== undefined ? patch.extension : item.extension,
      size: patch.size !== undefined ? patch.size : item.size,
      created_at: patch.created_at !== undefined ? patch.created_at : item.created_at,
      modified_at: patch.modified_at !== undefined ? patch.modified_at : item.modified_at,
      hidden: patch.hidden !== undefined ? patch.hidden : item.hidden
    };
  });
}

/**
 * Clamps a value between a minimum and maximum.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Checks if two string arrays are equal.
 */
export function arraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((item, index) => item === right[index]);
}

/**
 * Determines if two search requests have the same context (excluding query).
 * Used to prevent redundant searches when only the query changes.
 */
export function sameSearchContextWithoutQuery(left: { roots: string[]; extensions: string[]; exclude_paths?: string[]; options: object }, right: { roots: string[]; extensions: string[]; exclude_paths?: string[]; options: object }): boolean {
  return (
    arraysEqual(left.roots, right.roots) &&
    arraysEqual(left.extensions, right.extensions) &&
    arraysEqual(left.exclude_paths ?? [], right.exclude_paths ?? []) &&
    JSON.stringify(left.options) === JSON.stringify(right.options)
  );
}

/**
 * Computes adaptive debounce delay based on search complexity.
 * Uses shorter delays for simple queries, longer for complex searches.
 */
export function computeAdaptiveDebounce(request: { options: { match_mode: string; max_depth: number | null; size_filter: unknown; created_filter: unknown; modified_filter: unknown }; query: string; roots: string[]; extensions: string[] }, configuredDebounceMs: number): number {
  const mode = request.options.match_mode;
  const heavyMode = mode === "Regex" || mode === "Wildcard";
  const manyRoots = request.roots.length >= 3;
  if (heavyMode || manyRoots) {
    return clamp(configuredDebounceMs, 200, 300);
  }

  const shortPlainQuery = mode === "Plain" && request.query.trim().length <= 5;
  const noHeavyFilters =
    request.extensions.length === 0 &&
    request.options.max_depth === null &&
    request.options.size_filter === null &&
    request.options.created_filter === null &&
    request.options.modified_filter === null;
  if (shortPlainQuery && noHeavyFilters) {
    return clamp(configuredDebounceMs, 80, 120);
  }

  return clamp(configuredDebounceMs, 120, 220);
}

/**
 * Checks if an index is stale based on its last update time and TTL.
 * @param updatedAt - ISO timestamp of last index update
 * @param ttlMs - Time-to-live in milliseconds
 * @param now - Current timestamp (defaults to Date.now())
 */
export function isIndexStale(updatedAt: string, ttlMs: number, now = Date.now()): boolean {
  const stamp = new Date(updatedAt).getTime();
  if (!Number.isFinite(stamp) || stamp <= 0) return true;
  return now - stamp > ttlMs;
}

type SearchErrorCode = "SEARCH_INVALID_QUERY" | "SEARCH_STATE_ERROR" | "SEARCH_EXECUTION_ERROR";

export function renderSearchErrorFromCode(
  code: string,
  message: string,
  tr: (key: string, defaultValue: string, values?: Record<string, unknown>) => string
): string {
  if (code === "SEARCH_INVALID_QUERY") {
    return tr("app.status.errorInvalidQuery", "Ошибка запроса поиска: {{message}}", { message });
  }
  if (code === "SEARCH_STATE_ERROR") {
    return tr("app.status.errorState", "Внутренняя ошибка состояния поиска: {{message}}", { message });
  }
  if (code === "SEARCH_EXECUTION_ERROR") {
    return tr("app.status.errorExecution", "Ошибка выполнения поиска: {{message}}", { message });
  }
  return tr("app.status.error", "Ошибка: {{message}}", { message });
}

export function parseSearchErrorMessage(raw: string): { code: SearchErrorCode | null; message: string } {
  const match = raw.match(/^\[(SEARCH_[A-Z_]+)\]\s*(.*)$/);
  if (!match) {
    return { code: null, message: raw };
  }
  const code = match[1] as SearchErrorCode;
  const message = match[2]?.trim() ?? "";
  if (code === "SEARCH_INVALID_QUERY" || code === "SEARCH_STATE_ERROR" || code === "SEARCH_EXECUTION_ERROR") {
    return { code, message: message || raw };
  }
  return { code: null, message: raw };
}

export function renderSearchErrorStatus(
  rawMessage: string,
  tr: (key: string, defaultValue: string, values?: Record<string, unknown>) => string
): string {
  const parsed = parseSearchErrorMessage(rawMessage);
  if (parsed.code === "SEARCH_INVALID_QUERY") {
    return tr("app.status.errorInvalidQuery", "Ошибка запроса поиска: {{message}}", { message: parsed.message });
  }
  if (parsed.code === "SEARCH_STATE_ERROR") {
    return tr("app.status.errorState", "Внутренняя ошибка состояния поиска: {{message}}", { message: parsed.message });
  }
  if (parsed.code === "SEARCH_EXECUTION_ERROR") {
    return tr("app.status.errorExecution", "Ошибка выполнения поиска: {{message}}", { message: parsed.message });
  }
  return tr("app.status.error", "Ошибка: {{message}}", { message: rawMessage });
}

export const DEFAULT_ROOT_PATH =
  typeof navigator !== "undefined" && /windows/i.test(navigator.userAgent) ? "C:\\" : "/";

export const RESPONSIVE_BREAKPOINT = 1024;
export const ROW_HEIGHT = 34;
