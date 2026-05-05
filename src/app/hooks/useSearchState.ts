import { useCallback, useRef, useState } from "react";
import type { SearchResultItem, SortMode } from "../../shared/search-types";

export type SearchState = {
  results: SearchResultItem[];
  selectedPath: string | null;
  status: string;
  activeSearchId: number | null;
  isSearching: boolean;
  limitReached: boolean;
  checkedPaths: number;
  searchStartedAt: number | null;
  elapsedMs: number | null;
  ttfrMs: number | null;
  searchErrorCount: number;
  selectedPaths: Set<string>;
};

export type SearchStateActions = {
  setResults: React.Dispatch<React.SetStateAction<SearchResultItem[]>>;
  setSelectedPath: React.Dispatch<React.SetStateAction<string | null>>;
  setStatus: React.Dispatch<React.SetStateAction<string>>;
  setActiveSearchId: React.Dispatch<React.SetStateAction<number | null>>;
  setIsSearching: React.Dispatch<React.SetStateAction<boolean>>;
  setLimitReached: React.Dispatch<React.SetStateAction<boolean>>;
  setCheckedPaths: React.Dispatch<React.SetStateAction<number>>;
  setSearchStartedAt: React.Dispatch<React.SetStateAction<number | null>>;
  setElapsedMs: React.Dispatch<React.SetStateAction<number | null>>;
  setTtfrMs: React.Dispatch<React.SetStateAction<number | null>>;
  setSearchErrorCount: React.Dispatch<React.SetStateAction<number>>;
  resetSearch: (status: string) => void;
  toggleSelection: (path: string, selected: boolean) => void;
  selectAll: (results: SearchResultItem[]) => void;
  clearSelection: () => void;
};

export function useSearchState(initialStatus: string): SearchState & SearchStateActions {
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [status, setStatus] = useState(initialStatus);
  const [activeSearchId, setActiveSearchId] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [checkedPaths, setCheckedPaths] = useState(0);
  const [searchStartedAt, setSearchStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [ttfrMs, setTtfrMs] = useState<number | null>(null);
  const [searchErrorCount, setSearchErrorCount] = useState(0);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback((path: string, selected: boolean) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(path);
      } else {
        next.delete(path);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((results: SearchResultItem[]) => {
    setSelectedPaths(new Set(results.map((r) => r.full_path)));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPaths(new Set());
  }, []);

  const resetSearch = useCallback((newStatus: string) => {
    setResults([]);
    setSelectedPath(null);
    setCheckedPaths(0);
    setLimitReached(false);
    setStatus(newStatus);
    setIsSearching(true);
    setSearchStartedAt(Date.now());
    setElapsedMs(null);
    setTtfrMs(null);
    setSearchErrorCount(0);
    setSelectedPaths(new Set());
  }, []);

  return {
    results,
    selectedPath,
    status,
    activeSearchId,
    isSearching,
    limitReached,
    checkedPaths,
    searchStartedAt,
    elapsedMs,
    ttfrMs,
    searchErrorCount,
    selectedPaths,
    setResults,
    setSelectedPath,
    setStatus,
    setActiveSearchId,
    setIsSearching,
    setLimitReached,
    setCheckedPaths,
    setSearchStartedAt,
    setElapsedMs,
    setTtfrMs,
    setSearchErrorCount,
    resetSearch,
    toggleSelection,
    selectAll,
    clearSelection,
  };
}

export function useSearchRefs() {
  const activeSearchIdRef = useRef<number | null>(null);
  const searchStartedAtRef = useRef<number | null>(null);
  const sortModeRef = useRef<SortMode>("Relevance");
  const bufferedBatchRef = useRef<SearchResultItem[]>([]);
  const pendingCheckedDeltaRef = useRef(0);
  const batchFlushFrameRef = useRef<number | null>(null);
  const metadataLoadedPathsRef = useRef<Set<string>>(new Set());
  const metadataInFlightPathsRef = useRef<Set<string>>(new Set());

  return {
    activeSearchIdRef,
    searchStartedAtRef,
    sortModeRef,
    bufferedBatchRef,
    pendingCheckedDeltaRef,
    batchFlushFrameRef,
    metadataLoadedPathsRef,
    metadataInFlightPathsRef
  };
}
