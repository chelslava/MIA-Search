import { useEffect, useCallback, useRef } from "react";
import {
  cancelSearch,
  onSearchBatch,
  onSearchCancelled,
  onSearchDone,
  onSearchError,
  startSearch,
  tauriRuntimeAvailable
} from "../../shared/tauri-client";
import type { SearchRequest, SearchResultItem, SortMode } from "../../shared/search-types";
import { sortResultsForMode, mergeMetadataIntoResults } from "../utils/search-utils";

type SearchEventHandlers = {
  handleSearch: (request: SearchRequest) => Promise<void>;
  handleCancel: () => Promise<void>;
  scheduleResultsFlush: () => void;
};

type SearchStateActions = {
  setResults: React.Dispatch<React.SetStateAction<SearchResultItem[]>>;
  setSelectedPath: React.Dispatch<React.SetStateAction<string | null>>;
  setStatus: (status: string) => void;
  setActiveSearchId: React.Dispatch<React.SetStateAction<number | null>>;
  setIsSearching: (searching: boolean) => void;
  setLimitReached: (reached: boolean) => void;
  setCheckedPaths: React.Dispatch<React.SetStateAction<number>>;
  setSearchStartedAt: React.Dispatch<React.SetStateAction<number | null>>;
  setElapsedMs: React.Dispatch<React.SetStateAction<number | null>>;
  setTtfrMs: React.Dispatch<React.SetStateAction<number | null>>;
  setSearchErrorCount: React.Dispatch<React.SetStateAction<number>>;
};

type SearchRefs = {
  activeSearchIdRef: React.MutableRefObject<number | null>;
  searchStartedAtRef: React.MutableRefObject<number | null>;
  sortModeRef: React.MutableRefObject<SortMode>;
  bufferedBatchRef: React.MutableRefObject<SearchResultItem[]>;
  pendingCheckedDeltaRef: React.MutableRefObject<number>;
  batchFlushFrameRef: React.MutableRefObject<number | null>;
  incrementalSearchRef: React.MutableRefObject<{ request: SearchRequest; results: SearchResultItem[] } | null>;
};

type UseSearchEventsOptions = {
  searchState: SearchStateActions;
  searchRefs: SearchRefs;
  tr: (key: string, defaultValue: string) => string;
  pushToast: (text: string, kind: "info" | "success" | "error") => void;
  refreshPersistenceData: () => Promise<void>;
};

export function useSearchEvents({
  searchState,
  searchRefs,
  tr,
  pushToast,
  refreshPersistenceData
}: UseSearchEventsOptions): SearchEventHandlers {
  const {
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
    setSearchErrorCount
  } = searchState;

  const {
    activeSearchIdRef,
    searchStartedAtRef,
    sortModeRef,
    bufferedBatchRef,
    pendingCheckedDeltaRef,
    batchFlushFrameRef,
    incrementalSearchRef
  } = searchRefs;

  const scheduleResultsFlush = useCallback(() => {
    if (batchFlushFrameRef.current !== null) return;
    batchFlushFrameRef.current = window.requestAnimationFrame(() => {
      batchFlushFrameRef.current = null;
      if (bufferedBatchRef.current.length === 0) return;
      const nextChunk = bufferedBatchRef.current;
      bufferedBatchRef.current = [];
      const checkedDelta = pendingCheckedDeltaRef.current;
      pendingCheckedDeltaRef.current = 0;
      if (checkedDelta > 0) {
        setCheckedPaths((prev) => prev + checkedDelta);
      }
      setResults((prev) => {
        const next = sortResultsForMode(prev.concat(nextChunk), sortModeRef.current);
        if (incrementalSearchRef.current) {
          incrementalSearchRef.current = { ...incrementalSearchRef.current, results: next };
        }
        return next;
      });
    });
  }, [batchFlushFrameRef, bufferedBatchRef, pendingCheckedDeltaRef, setCheckedPaths, setResults, sortModeRef, incrementalSearchRef]);

  const handleSearch = useCallback(async (request: SearchRequest) => {
    if (!tauriRuntimeAvailable) {
      setStatus(tr("app.status.tauriUnavailable", "Tauri runtime не обнаружен"));
      return;
    }

    setResults([]);
    setSelectedPath(null);
    setCheckedPaths(0);
    setLimitReached(false);
    setStatus(tr("app.status.scanning", "Сканирование..."));
    setIsSearching(true);
    setSearchStartedAt(Date.now());
    setElapsedMs(null);
    setTtfrMs(null);
    setSearchErrorCount(0);
    incrementalSearchRef.current = { request, results: [] };
    bufferedBatchRef.current = [];
    pendingCheckedDeltaRef.current = 0;
    if (batchFlushFrameRef.current !== null) {
      window.cancelAnimationFrame(batchFlushFrameRef.current);
      batchFlushFrameRef.current = null;
    }

    try {
      const response = await startSearch(request);
      setActiveSearchId(response.search_id);
    } catch (error) {
      setIsSearching(false);
      setSearchStartedAt(null);
      setElapsedMs(null);
      setTtfrMs(null);
      setStatus(tr("app.status.startError", `Ошибка запуска: ${String(error)}`));
      pushToast(tr("app.toast.searchStartFailed", "Не удалось запустить поиск"), "error");
    }
  }, [tr, pushToast, setResults, setSelectedPath, setCheckedPaths, setLimitReached, setStatus, setIsSearching, setSearchStartedAt, setElapsedMs, setTtfrMs, setSearchErrorCount, setActiveSearchId, incrementalSearchRef, bufferedBatchRef, pendingCheckedDeltaRef, batchFlushFrameRef]);

  const handleCancel = useCallback(async () => {
    if (!tauriRuntimeAvailable) return;
    try {
      await cancelSearch();
      setStatus(tr("app.status.stopping", "Остановка..."));
    } catch {
      setStatus(tr("app.status.stopError", "Не удалось остановить поиск"));
    }
  }, [tr, setStatus]);

  useEffect(() => {
    if (!tauriRuntimeAvailable) return;

    const unlisten: Array<() => void> = [];
    let mounted = true;
    let ttfrSet = false;

    const registerListener = async <T,>(registration: Promise<() => void>) => {
      try {
        const handler = await registration;
        if (mounted) {
          unlisten.push(handler);
        } else {
          handler();
        }
      } catch (error) {
        console.error("Failed to register event listener:", error);
      }
    };

    registerListener(onSearchBatch((payload) => {
      if (activeSearchIdRef.current === null) {
        activeSearchIdRef.current = payload.search_id;
        setActiveSearchId(payload.search_id);
      }
      if (payload.search_id !== activeSearchIdRef.current) {
        return;
      }
      if (searchStartedAtRef.current !== null && !ttfrSet) {
        setTtfrMs(Date.now() - searchStartedAtRef.current);
        ttfrSet = true;
      }
      bufferedBatchRef.current.push(...payload.results);
      pendingCheckedDeltaRef.current += payload.results.length;
      scheduleResultsFlush();
    }));

    registerListener(onSearchDone((payload) => {
      if (activeSearchIdRef.current === null) {
        activeSearchIdRef.current = payload.search_id;
        setActiveSearchId(payload.search_id);
      }
      if (payload.search_id !== activeSearchIdRef.current) {
        return;
      }
      setStatus(tr("app.status.ready", "Готово"));
      setLimitReached(payload.limit_reached);
      setIsSearching(false);
      if (batchFlushFrameRef.current !== null) {
        window.cancelAnimationFrame(batchFlushFrameRef.current);
        batchFlushFrameRef.current = null;
      }
      if (pendingCheckedDeltaRef.current > 0) {
        const checkedDelta = pendingCheckedDeltaRef.current;
        pendingCheckedDeltaRef.current = 0;
        setCheckedPaths((prev) => prev + checkedDelta);
      }
      if (bufferedBatchRef.current.length > 0) {
        const remaining = bufferedBatchRef.current;
        bufferedBatchRef.current = [];
        setResults((prev) => {
          const next = sortResultsForMode(prev.concat(remaining), sortModeRef.current);
          if (incrementalSearchRef.current) {
            incrementalSearchRef.current = { ...incrementalSearchRef.current, results: next };
          }
          return next;
        });
      }
      setActiveSearchId(null);
      if (searchStartedAtRef.current !== null) {
        setElapsedMs(Date.now() - searchStartedAtRef.current);
      }
      void refreshPersistenceData();
    }));

    registerListener(onSearchCancelled((payload) => {
      if (activeSearchIdRef.current === null) {
        activeSearchIdRef.current = payload.search_id;
        setActiveSearchId(payload.search_id);
      }
      if (payload.search_id !== activeSearchIdRef.current) {
        return;
      }
      setStatus(tr("app.status.stopped", "Остановлено"));
      setIsSearching(false);
      if (pendingCheckedDeltaRef.current > 0) {
        const checkedDelta = pendingCheckedDeltaRef.current;
        pendingCheckedDeltaRef.current = 0;
        setCheckedPaths((prev) => prev + checkedDelta);
      }
      bufferedBatchRef.current = [];
      if (batchFlushFrameRef.current !== null) {
        window.cancelAnimationFrame(batchFlushFrameRef.current);
        batchFlushFrameRef.current = null;
      }
      setActiveSearchId(null);
      if (searchStartedAtRef.current !== null) {
        setElapsedMs(Date.now() - searchStartedAtRef.current);
      }
    }));

    registerListener(onSearchError((payload) => {
      if (activeSearchIdRef.current === null) {
        activeSearchIdRef.current = payload.search_id;
        setActiveSearchId(payload.search_id);
      }
      if (payload.search_id !== activeSearchIdRef.current) {
        return;
      }
      setStatus(payload.message);
      setIsSearching(false);
      setSearchErrorCount((prev) => prev + 1);
      if (pendingCheckedDeltaRef.current > 0) {
        const checkedDelta = pendingCheckedDeltaRef.current;
        pendingCheckedDeltaRef.current = 0;
        setCheckedPaths((prev) => prev + checkedDelta);
      }
      bufferedBatchRef.current = [];
      if (batchFlushFrameRef.current !== null) {
        window.cancelAnimationFrame(batchFlushFrameRef.current);
        batchFlushFrameRef.current = null;
      }
      setActiveSearchId(null);
      if (searchStartedAtRef.current !== null) {
        setElapsedMs(Date.now() - searchStartedAtRef.current);
      }
    }));

    return () => {
      mounted = false;
      unlisten.forEach((fn) => fn());
    };
  }, [tr, scheduleResultsFlush, refreshPersistenceData, activeSearchIdRef, searchStartedAtRef, sortModeRef, bufferedBatchRef, pendingCheckedDeltaRef, batchFlushFrameRef, incrementalSearchRef, setActiveSearchId, setTtfrMs, setStatus, setLimitReached, setIsSearching, setCheckedPaths, setResults, setElapsedMs, setSearchErrorCount]);

  return {
    handleSearch,
    handleCancel,
    scheduleResultsFlush
  };
}
