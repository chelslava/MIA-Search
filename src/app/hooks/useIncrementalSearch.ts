import { useCallback, useRef } from "react";
import type { SearchRequest, SearchResultItem, SortMode } from "../../shared/search-types";
import { filterPlainResults, sortResultsForMode, sameSearchContextWithoutQuery } from "../utils/search-utils";

type IncrementalSearchContext = {
  request: SearchRequest;
  results: SearchResultItem[];
};

type UseIncrementalSearchOptions = {
  ignoreCase: boolean;
};

export type UseIncrementalSearchReturn = {
  incrementalSearchRef: React.MutableRefObject<IncrementalSearchContext | null>;
  tryIncrementalSearch: (
    nextRequest: SearchRequest,
    sortMode: SortMode
  ) => SearchResultItem[] | null;
  clearIncremental: () => void;
  updateIncrementalResults: (
    results: SearchResultItem[],
    sortMode: SortMode
  ) => SearchResultItem[];
};

export function useIncrementalSearch({
  ignoreCase
}: UseIncrementalSearchOptions): UseIncrementalSearchReturn {
  const incrementalSearchRef = useRef<IncrementalSearchContext | null>(null);

  const tryIncrementalSearch = useCallback(
    (nextRequest: SearchRequest, sortMode: SortMode): SearchResultItem[] | null => {
      const previous = incrementalSearchRef.current;
      if (!previous) return null;
      if (!sameSearchContextWithoutQuery(previous.request, nextRequest)) return null;
      if (previous.request.options.match_mode !== "Plain" || nextRequest.options.match_mode !== "Plain") return null;
      if (previous.request.options.strict || nextRequest.options.strict) return null;

      const previousQuery = previous.request.query.trim();
      const nextQuery = nextRequest.query.trim();
      if (!previousQuery || !nextQuery || nextQuery.length <= previousQuery.length) return null;

      const normalize = (value: string) =>
        ignoreCase ? value.toLocaleLowerCase() : value;
      if (!normalize(nextQuery).startsWith(normalize(previousQuery))) return null;

      const filtered = sortResultsForMode(
        filterPlainResults(previous.results, nextQuery, ignoreCase),
        sortMode
      );
      incrementalSearchRef.current = { request: nextRequest, results: filtered };
      return filtered;
    },
    [ignoreCase]
  );

  const clearIncremental = useCallback(() => {
    incrementalSearchRef.current = null;
  }, []);

  const updateIncrementalResults = useCallback(
    (results: SearchResultItem[], sortMode: SortMode): SearchResultItem[] => {
      if (incrementalSearchRef.current) {
        incrementalSearchRef.current = { ...incrementalSearchRef.current, results };
      }
      return results;
    },
    []
  );

  return {
    incrementalSearchRef,
    tryIncrementalSearch,
    clearIncremental,
    updateIncrementalResults
  };
}
