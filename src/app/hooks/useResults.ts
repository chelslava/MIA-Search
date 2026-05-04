import { useCallback, useMemo, useRef } from "react";
import type { SearchResultItem, SortMode } from "../../shared/search-types";
import { sortResultsForMode, ROW_HEIGHT } from "../utils/search-utils";

type SearchResults = SearchResultItem[];

type UseResultsOptions = {
  results: SearchResults;
  sortMode: SortMode;
  listHeight: number;
  scrollTop: number;
};

type UseResultsReturn = {
  sortedResults: SearchResults;
  visibleRows: {
    startIndex: number;
    endIndex: number;
    topSpacer: number;
    bottomSpacer: number;
    items: SearchResultItem[];
  };
  flushBatch: (chunk: SearchResultItem[], sortMode: SortMode) => SearchResults;
};

export function useResults({
  results,
  sortMode,
  listHeight,
  scrollTop
}: UseResultsOptions): UseResultsReturn {
  const bufferRef = useRef<SearchResultItem[]>([]);

  const flushBatch = useCallback((chunk: SearchResultItem[], mode: SortMode): SearchResults => {
    const merged = results.concat(chunk);
    bufferRef.current = [];
    return sortResultsForMode(merged, mode);
  }, [results]);

  const visibleRows = useMemo(() => {
    const safeHeight = Math.max(200, listHeight);
    const rawStart = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT));
    const maxStart = Math.max(0, results.length - 1);
    const startIndex = Math.min(rawStart, maxStart);
    const count = Math.ceil(safeHeight / ROW_HEIGHT) + 8;
    const endIndex = Math.min(results.length, startIndex + count);
    return {
      startIndex,
      endIndex,
      topSpacer: startIndex * ROW_HEIGHT,
      bottomSpacer: Math.max(0, (results.length - endIndex) * ROW_HEIGHT),
      items: results.slice(startIndex, endIndex)
    };
  }, [results, listHeight, scrollTop]);

  return {
    sortedResults: results,
    visibleRows,
    flushBatch
  };
}

type UseResultsStateOptions = {
  initialResults?: SearchResultItem[];
  initialSortMode?: SortMode;
};

export function useResultsState({
  initialResults = [],
  initialSortMode = "Relevance"
}: UseResultsStateOptions) {
  const resultsRef = useRef<SearchResultItem[]>(initialResults);
  const sortModeRef = useRef<SortMode>(initialSortMode);

  const sortedResults = useMemo(
    () => sortResultsForMode(resultsRef.current, sortModeRef.current),
    []
  );

  return {
    resultsRef,
    sortModeRef,
    sortedResults
  };
}
