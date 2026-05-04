import { useState, useCallback, useEffect, useMemo } from "react";
import type { IndexStatusResponse } from "../../shared/search-types";
import { indexRebuild, indexStatus, tauriRuntimeAvailable } from "../../shared/tauri-client";
import { arraysEqual, isIndexStale } from "../utils/search-utils";

type UseIndexResult = {
  indexStatusSnapshot: IndexStatusResponse | null;
  isRebuildingIndex: boolean;
  indexHint: string;
  rebuildProgress: number;
  refreshIndexStatus: () => Promise<IndexStatusResponse | null>;
  handleRebuildIndex: (roots: string[]) => Promise<void>;
};

export function useIndex(
  indexRoots: string[],
  indexTtlMs: number,
  indexCheckIntervalMs: number,
  searchBackend: "Scan" | "Index",
  isSearching: boolean,
  tr: (key: string, defaultValue: string) => string
): UseIndexResult {
  const [indexStatusSnapshot, setIndexStatusSnapshot] = useState<IndexStatusResponse | null>(null);
  const [isRebuildingIndex, setIsRebuildingIndex] = useState(false);
  const [indexHint, setIndexHint] = useState("");
  const [rebuildProgress, setRebuildProgress] = useState(0);

  const refreshIndexStatus = useCallback(async (): Promise<IndexStatusResponse | null> => {
    if (!tauriRuntimeAvailable) return null;
    try {
      const snapshot = await indexStatus();
      setIndexStatusSnapshot(snapshot);
      if (snapshot.version_mismatch) {
        setIndexHint(tr("app.index.versionMismatch", "Индекс устарел и будет перестроен при следующем поиске"));
      }
      return snapshot;
    } catch {
      setIndexHint(tr("app.index.statusUnavailable", "Index status недоступен"));
      return null;
    }
  }, [tr]);

  const handleRebuildIndex = useCallback(async (roots: string[]) => {
    if (!tauriRuntimeAvailable || roots.length === 0) return;
    setIsRebuildingIndex(true);
    setRebuildProgress(0);
    setIndexHint(tr("app.index.rebuilding", "Идёт перестроение индекса..."));

    let pollIntervalId: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      pollIntervalId = setInterval(async () => {
        try {
          const snapshot = await indexStatus();
          setRebuildProgress(snapshot.rebuild_entries_count);
        } catch {
          // Ignore polling errors
        }
      }, 500);
    };

    const stopPolling = () => {
      if (pollIntervalId) {
        clearInterval(pollIntervalId);
        pollIntervalId = null;
      }
    };

    startPolling();

    try {
      const rebuilt = await indexRebuild(roots);
      stopPolling();
      setRebuildProgress(rebuilt.entries);
      setIndexStatusSnapshot({
        status: rebuilt.entries > 0 ? "ready" : "empty",
        entries: rebuilt.entries,
        roots: rebuilt.roots,
        root_paths: roots,
        updated_at: rebuilt.updated_at,
        version_mismatch: false,
        rebuild_entries_count: rebuilt.entries
      });
      setIndexHint(tr("app.index.rebuildDone", `Индекс обновлён (${rebuilt.entries} entries)`));
    } catch {
      stopPolling();
      setRebuildProgress(0);
      setIndexHint(tr("app.index.rebuildFailed", "Не удалось перестроить индекс"));
    } finally {
      setIsRebuildingIndex(false);
    }
  }, [tr]);

  useEffect(() => {
    if (!tauriRuntimeAvailable || searchBackend !== "Index") return;
    if (indexRoots.length === 0) return;

    let cancelled = false;
    let checkInProgress = false;

    const runCheck = async () => {
      if (cancelled || isRebuildingIndex || isSearching || checkInProgress) return;
      checkInProgress = true;
      try {
        const snapshot = await refreshIndexStatus();
        if (cancelled || !snapshot) return;

        const stale = isIndexStale(snapshot.updated_at, indexTtlMs);
        const rootsChanged = !arraysEqual(
          [...snapshot.root_paths].sort(),
          [...indexRoots].sort()
        );
        const shouldRebuild = snapshot.status === "empty" || rootsChanged || stale;

        if (!shouldRebuild) {
          setIndexHint(tr("app.index.ready", "Индекс готов"));
          return;
        }

        if (stale) {
          setIndexHint(tr("app.index.rebuildStale", "Индекс устарел, запускаю авто-обновление"));
        } else if (rootsChanged) {
          setIndexHint(tr("app.index.rebuildRootsChanged", "Набор roots изменился, обновляю индекс"));
        }

        await handleRebuildIndex(indexRoots);
      } finally {
        checkInProgress = false;
      }
    };

    const startupTimer = window.setTimeout(() => {
      void runCheck();
    }, 250);
    const intervalId = window.setInterval(() => {
      void runCheck();
    }, indexCheckIntervalMs);

    return () => {
      cancelled = true;
      window.clearTimeout(startupTimer);
      window.clearInterval(intervalId);
    };
  }, [indexCheckIntervalMs, indexRoots, indexTtlMs, isRebuildingIndex, isSearching, searchBackend, tr, refreshIndexStatus, handleRebuildIndex]);

  return {
    indexStatusSnapshot,
    isRebuildingIndex,
    indexHint,
    rebuildProgress,
    refreshIndexStatus,
    handleRebuildIndex
  };
}
