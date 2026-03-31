import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  EntryKind,
  IndexStatusResponse,
  MatchMode,
  SearchBackend,
  SearchProfile,
  SearchRequest,
  SearchResultItem,
  SizeComparison,
  SortMode
} from "../../shared/search-types";
import {
  cancelSearch,
  onSearchBatch,
  onSearchCancelled,
  onSearchDone,
  onSearchError,
  startSearch,
  searchEnrichMetadata,
  tauriRuntimeAvailable
} from "../../shared/tauri-client";
import { useSearchState, useSearchRefs, useThemeState, usePersistence, useFilesystemTree, useFilterState, useSettingsState, useLayoutState, useIndex, useRoots, useActions } from "../hooks";
import { useRoots as useRootsState } from "../hooks/useRoots";
import { buildSearchRequest, getDateValidationErrors } from "../search-request";
import { sortResultsForMode, filterPlainResults, sameSearchContextWithoutQuery, computeAdaptiveDebounce, renderSearchErrorStatus, mergeMetadataIntoResults, ROW_HEIGHT, RESPONSIVE_BREAKPOINT } from "../utils/search-utils";
import type { ContextMenuState, DisplayMode, FilterChip, RootItem } from "../types";
import type { ToastItem } from "../../widgets/ToastHost";

type IncrementalSearchContext = {
  request: SearchRequest;
  results: SearchResultItem[];
};

export function useApp() {
  const { t, i18n } = useTranslation();
  const tr = useCallback((key: string, defaultValue: string, values?: Record<string, unknown>) =>
    t(key, { defaultValue, ...(values ?? {}) }), [t]);
  
  const searchState = useSearchState(tr("app.status.ready", "Готово"));
  const searchRefs = useSearchRefs();
  const themeState = useThemeState(tr);
  const persistence = usePersistence();
  const filesystemTree = useFilesystemTree();
  const filterState = useFilterState();
  const settingsState = useSettingsState();
  const layoutState = useLayoutState();
  const roots = useRootsState();

  const [query, setQuery] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [listHeight, setListHeight] = useState(460);
  const [scrollTop, setScrollTop] = useState(0);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [newThemeName, setNewThemeName] = useState("");
  const [newThemeBg, setNewThemeBg] = useState("#1b1f2a");
  const [newThemeText, setNewThemeText] = useState("#e7edf8");
  const [newThemeAccent, setNewThemeAccent] = useState("#4a8cff");
  
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const resultPaneRef = useRef<HTMLDivElement | null>(null);
  const incrementalSearchRef = useRef<IncrementalSearchContext | null>(null);

  const indexRoots = useMemo(
    () => roots.enabledRoots.length > 0 ? roots.enabledRoots : [roots.primaryRoot].filter(Boolean),
    [roots.enabledRoots, roots.primaryRoot]
  );

  const indexTtlMs = useMemo(
    () => Math.max(1, settingsState.indexTtlHours) * 60 * 60 * 1000,
    [settingsState.indexTtlHours]
  );
  const indexCheckIntervalMs = useMemo(
    () => Math.max(1, settingsState.indexCheckIntervalMinutes) * 60 * 1000,
    [settingsState.indexCheckIntervalMinutes]
  );

  const index = useIndex(
    indexRoots,
    indexTtlMs,
    indexCheckIntervalMs,
    filterState.searchBackend,
    searchState.isSearching,
    tr
  );

  const pushToast = useCallback((text: string, kind: ToastItem["kind"] = "info") => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => prev.concat({ id, text, kind }));
    const dismissTime = Math.max(2000, Math.min(5000, text.length * 50));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, dismissTime);
  }, []);

  const closeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const actions = useActions(pushToast, tr);

  const limit = useMemo(() => {
    if (filterState.limitMode === "100") return 100;
    if (filterState.limitMode === "500") return 500;
    if (filterState.limitMode === "1000") return 1000;
    if (filterState.limitMode === "none") return null;
    return Math.max(1, filterState.customLimit);
  }, [filterState.limitMode, filterState.customLimit]);

  const buildCurrentRequest = useCallback(() => {
    return buildSearchRequest({
      query,
      enabledRoots: roots.enabledRoots,
      primaryRoot: roots.primaryRoot,
      extensionsRaw: filterState.extensionsRaw,
      excludePathsRaw: filterState.excludePathsRaw,
      maxDepthUnlimited: filterState.maxDepthUnlimited,
      maxDepth: filterState.maxDepth,
      limit,
      strict: filterState.strict,
      ignoreCase: filterState.ignoreCase,
      includeHidden: filterState.includeHidden,
      entryKind: filterState.entryKind,
      matchMode: filterState.matchMode,
      sizeFilterEnabled: filterState.sizeFilterEnabled,
      sizeComparison: filterState.sizeComparison,
      sizeValue: filterState.sizeValue,
      sizeUnit: filterState.sizeUnit,
      modifiedFilterEnabled: filterState.modifiedFilterEnabled,
      modifiedAfter: filterState.modifiedAfter,
      modifiedBefore: filterState.modifiedBefore,
      createdFilterEnabled: filterState.createdFilterEnabled,
      createdAfter: filterState.createdAfter,
      createdBefore: filterState.createdBefore,
      sortMode: filterState.sortMode,
      searchBackend: filterState.searchBackend
    });
  }, [query, roots.enabledRoots, roots.primaryRoot, filterState, limit]);

  const validateCurrentDateFilters = useCallback(() => {
    return getDateValidationErrors({
      query,
      enabledRoots: roots.enabledRoots,
      primaryRoot: roots.primaryRoot,
      extensionsRaw: filterState.extensionsRaw,
      excludePathsRaw: filterState.excludePathsRaw,
      maxDepthUnlimited: filterState.maxDepthUnlimited,
      maxDepth: filterState.maxDepth,
      limit,
      strict: filterState.strict,
      ignoreCase: filterState.ignoreCase,
      includeHidden: filterState.includeHidden,
      entryKind: filterState.entryKind,
      matchMode: filterState.matchMode,
      sizeFilterEnabled: filterState.sizeFilterEnabled,
      sizeComparison: filterState.sizeComparison,
      sizeValue: filterState.sizeValue,
      sizeUnit: filterState.sizeUnit,
      modifiedFilterEnabled: filterState.modifiedFilterEnabled,
      modifiedAfter: filterState.modifiedAfter,
      modifiedBefore: filterState.modifiedBefore,
      createdFilterEnabled: filterState.createdFilterEnabled,
      createdAfter: filterState.createdAfter,
      createdBefore: filterState.createdBefore,
      sortMode: filterState.sortMode,
      searchBackend: filterState.searchBackend
    });
  }, [query, roots.enabledRoots, roots.primaryRoot, filterState, limit]);

  const selectedResult = useMemo(
    () => searchState.results.find((item) => item.full_path === searchState.selectedPath) ?? null,
    [searchState.results, searchState.selectedPath]
  );

  const chips = useMemo<FilterChip[]>(() => {
    const items: FilterChip[] = [];
    if (filterState.entryKind !== "Any") {
      items.push({
        id: "entry",
        label: filterState.entryKind === "File"
          ? tr("app.chips.filesOnly", "Только файлы")
          : tr("app.chips.dirsOnly", "Только папки"),
        remove: () => filterState.setEntryKind("Any")
      });
    }
    if (filterState.extensionsRaw.trim()) {
      items.push({
        id: "ext",
        label: tr("app.chips.extensions", "Расширения: {{extensions}}", { extensions: filterState.extensionsRaw }),
        remove: () => filterState.setExtensionsRaw("")
      });
    }
    if (filterState.excludePathsRaw.trim()) {
      items.push({
        id: "exclude",
        label: tr("app.chips.excludePaths", "Исключить: {{paths}}", { paths: filterState.excludePathsRaw }),
        remove: () => filterState.setExcludePathsRaw("")
      });
    }
    if (!filterState.maxDepthUnlimited) {
      items.push({
        id: "depth",
        label: tr("app.chips.depth", "Глубина: {{depth}}", { depth: filterState.maxDepth }),
        remove: () => filterState.setMaxDepthUnlimited(true)
      });
    }
    if (filterState.sizeFilterEnabled) {
      const signs: Record<SizeComparison, string> = { Greater: ">", Smaller: "<", Equal: "=" };
      items.push({
        id: "size",
        label: tr("app.chips.size", "Размер {{sign}} {{value}} {{unit}}", {
          sign: signs[filterState.sizeComparison],
          value: filterState.sizeValue,
          unit: filterState.sizeUnit
        }),
        remove: () => filterState.setSizeFilterEnabled(false)
      });
    }
    if (filterState.modifiedFilterEnabled) {
      items.push({
        id: "modified",
        label: tr("app.chips.modified", "Дата изменения"),
        remove: () => filterState.setModifiedFilterEnabled(false)
      });
    }
    if (filterState.createdFilterEnabled) {
      items.push({
        id: "created",
        label: tr("app.chips.created", "Дата создания"),
        remove: () => filterState.setCreatedFilterEnabled(false)
      });
    }
    if (filterState.strict) {
      items.push({ id: "strict", label: tr("app.chips.strict", "Строгий режим"), remove: () => filterState.setStrict(false) });
    }
    if (!filterState.ignoreCase) {
      items.push({
        id: "case",
        label: tr("app.chips.caseSensitive", "С учетом регистра"),
        remove: () => filterState.setIgnoreCase(true)
      });
    }
    if (filterState.includeHidden) {
      items.push({ id: "hidden", label: tr("app.chips.hidden", "Скрытые"), remove: () => filterState.setIncludeHidden(false) });
    }
    if (limit !== null) {
      items.push({
        id: "limit",
        label: tr("app.chips.limit", "Лимит: {{limit}}", { limit }),
        remove: () => filterState.setLimitMode("none")
      });
    }
    return items;
  }, [filterState, limit, tr]);

  const visibleRows = useMemo(() => {
    const safeHeight = Math.max(200, listHeight);
    const rawStart = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT));
    const maxStart = Math.max(0, searchState.results.length - 1);
    const startIndex = Math.min(rawStart, maxStart);
    const count = Math.ceil(safeHeight / ROW_HEIGHT) + 8;
    const endIndex = Math.min(searchState.results.length, startIndex + count);
    return {
      startIndex,
      endIndex,
      topSpacer: startIndex * ROW_HEIGHT,
      bottomSpacer: Math.max(0, (searchState.results.length - endIndex) * ROW_HEIGHT),
      items: searchState.results.slice(startIndex, endIndex)
    };
  }, [listHeight, searchState.results, scrollTop]);

  return {
    tr,
    searchState,
    searchRefs,
    themeState,
    persistence,
    filesystemTree,
    filterState,
    settingsState,
    layoutState,
    roots,
    index,
    actions,
    query,
    setQuery,
    historyOpen,
    setHistoryOpen,
    newProfileName,
    setNewProfileName,
    listHeight,
    setListHeight,
    scrollTop,
    setScrollTop,
    contextMenu,
    setContextMenu,
    toasts,
    pushToast,
    closeToast,
    newThemeName,
    setNewThemeName,
    newThemeBg,
    setNewThemeBg,
    newThemeText,
    setNewThemeText,
    newThemeAccent,
    setNewThemeAccent,
    searchInputRef,
    resultPaneRef,
    incrementalSearchRef,
    indexRoots,
    limit,
    buildCurrentRequest,
    validateCurrentDateFilters,
    selectedResult,
    chips,
    visibleRows
  };
}
