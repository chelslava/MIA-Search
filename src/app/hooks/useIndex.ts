import { useState, useCallback, useEffect } from "preact/hooks";
import type { UnlistenFn } from "@tauri-apps/api/event";
import type { IndexRebuildResponse, IndexStatusResponse } from "../../shared/search-types";
import {
  indexRebuild,
  indexStatus,
  onIndexDone,
  onIndexError,
  onIndexProgress,
  tauriRuntimeAvailable,
} from "../../shared/tauri-client";
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

    const unlisteners: UnlistenFn[] = [];

    try {
      // Build the result promise BEFORE calling indexRebuild so we never
      // miss the completion events.
      const resultPromise = new Promise<IndexRebuildResponse>((resolve, reject) => {
        let settled = false;

        onIndexDone((payload) => {
          if (settled) return;
          settled = true;
          resolve(payload);
        }).then((fn) => unlisteners.push(fn));

        onIndexError((payload) => {
          if (settled) return;
          settled = true;
          reject(new Error(payload.message));
        }).then((fn) => unlisteners.push(fn));
      });

      // Wire up progress events.
      const unlistenProgress = await onIndexProgress((payload) => {
        setRebuildProgress(payload.entries);
      });
      unlisteners.push(unlistenProgress);

      // Start the rebuild — returns immediately with status "accepted".
      await indexRebuild(roots);

      // Wait for the completion event.
      const result = await resultPromise;

      setRebuildProgress(result.entries);
      setIndexStatusSnapshot({
        status: result.entries > 0 ? "ready" : "empty",
        entries: result.entries,
        roots: result.roots,
        root_paths: roots,
        updated_at: result.updated_at,
        version_mismatch: false,
        rebuild_entries_count: result.entries,
      });
      setIndexHint(tr("app.index.rebuildDone", `Индекс обновлён (${result.entries} entries)`));
    } catch {
      setRebuildProgress(0);
      setIndexHint(tr("app.index.rebuildFailed", "Не удалось перестроить индекс"));
    } finally {
      for (const fn of unlisteners) {
        fn();
      }
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
