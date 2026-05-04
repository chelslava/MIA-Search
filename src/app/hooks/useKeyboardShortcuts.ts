import { useEffect, useCallback, useRef } from "react";
import type { SearchResultItem, HistorySnapshot } from "../../shared/search-types";

type KeyboardShortcutsOptions = {
  isSearching: boolean;
  results: SearchResultItem[];
  selectedPath: string | null;
  selectedResult: SearchResultItem | null;
  searchBackend: "Scan" | "Index";
  indexRoots: string[];
  isRebuildingIndex: boolean;
  onSearch: () => void;
  onRebuildIndex: () => void;
  onOpenPath: (path: string) => void;
  onOpenParent: (path: string) => void;
  onSelectPath: (path: string | null) => void;
  onOpenCommandPalette: () => void;
  onFocusSearch: () => void;
  onCloseModals: () => void;
  history?: HistorySnapshot;
  onSelectHistoryQuery?: (query: string) => void;
};

export function useKeyboardShortcuts({
  isSearching,
  results,
  selectedPath,
  selectedResult,
  searchBackend,
  indexRoots,
  isRebuildingIndex,
  onSearch,
  onRebuildIndex,
  onOpenPath,
  onOpenParent,
  onSelectPath,
  onOpenCommandPalette,
  onFocusSearch,
  onCloseModals,
  history,
  onSelectHistoryQuery
}: KeyboardShortcutsOptions): void {
  const historyIndexRef = useRef<number>(-1);
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    const accel = event.ctrlKey || event.metaKey;
    const alt = event.altKey;

    if (accel && key === "k") {
      event.preventDefault();
      onOpenCommandPalette();
      return;
    }
    if (accel && key === "f") {
      event.preventDefault();
      onFocusSearch();
      return;
    }
    if (key === "f5") {
      event.preventDefault();
      onSearch();
      return;
    }
    if (accel && event.shiftKey && key === "r") {
      event.preventDefault();
      if (searchBackend === "Index" && indexRoots.length > 0 && !isRebuildingIndex) {
        onRebuildIndex();
      }
      return;
    }
    if (key === "escape") {
      onCloseModals();
      historyIndexRef.current = -1;
      return;
    }
    if (alt && (key === "arrowup" || key === "arrowdown")) {
      if (!history || !onSelectHistoryQuery || history.query_entries.length === 0) return;
      const entries = history.query_entries.filter(e => e.query.trim());
      if (entries.length === 0) return;
      
      event.preventDefault();
      if (key === "arrowup") {
        historyIndexRef.current = historyIndexRef.current <= 0 
          ? entries.length - 1 
          : historyIndexRef.current - 1;
      } else {
        historyIndexRef.current = historyIndexRef.current >= entries.length - 1 
          ? 0 
          : historyIndexRef.current + 1;
      }
      const entry = entries[historyIndexRef.current];
      if (entry) {
        onSelectHistoryQuery(entry.query);
      }
      return;
    }
    if (key === "arrowdown" || key === "arrowup") {
      const target = event.target as HTMLElement | null;
      const activeTag = target?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") {
        if (activeTag !== "select") {
          const input = target as HTMLInputElement | HTMLTextAreaElement;
          if (input.selectionStart !== input.selectionEnd) return;
        }
        return;
      }
      if (results.length === 0) return;
      event.preventDefault();
      const currentIndex = selectedPath ? results.findIndex((item) => item.full_path === selectedPath) : -1;
      const delta = key === "arrowdown" ? 1 : -1;
      const nextIndex = Math.max(0, Math.min(results.length - 1, currentIndex + delta));
      const nextItem = results[nextIndex];
      if (nextItem) {
        onSelectPath(nextItem.full_path);
        const row = document.querySelector<HTMLTableRowElement>(`tr[data-path="${CSS.escape(nextItem.full_path)}"]`);
        row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
      return;
    }
    if (key === "enter" && selectedResult) {
      const activeTag = (event.target as HTMLElement | null)?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") return;
      event.preventDefault();
      if (event.shiftKey && onOpenParent) {
        onOpenParent(selectedResult.full_path);
      } else {
        onOpenPath(selectedResult.full_path);
      }
    }
  }, [isSearching, results, selectedPath, selectedResult, searchBackend, indexRoots, isRebuildingIndex, onSearch, onRebuildIndex, onOpenPath, onOpenParent, onOpenCommandPalette, onFocusSearch, onCloseModals, onSelectPath]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
