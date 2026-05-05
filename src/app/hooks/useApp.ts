import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  SearchProfile,
  SearchRequest,
  SearchResultItem,
  SizeComparison
} from "../../shared/search-types";
import {
  actionOpenPath,
  actionOpenParent,
  actionRevealPath,
  actionCopyToClipboard,
  cancelSearch,
  favoritesAdd,
  favoritesRemove,
  fsPickFolder,
  indexRebuildCancel,
  onSearchBatch,
  onSearchCancelled,
  onSearchDone,
  onSearchError,
  profilesDelete,
  profilesSave,
  searchEnrichMetadata,
  startSearch,
  tauriRuntimeAvailable
} from "../../shared/tauri-client";
import {
  useSearchState,
  useSearchRefs,
  useThemeState,
  usePersistence,
  useFilesystemTree,
  useFilterState,
  useSettingsState,
  useLayoutState,
  useIndex,
  useRoots,
  useToast,
  useUIState,
  useSearchRequest,
  useResults,
  useIncrementalSearch
} from "../hooks";
import { useRoots as useRootsState } from "../hooks/useRoots";
import {
  computeAdaptiveDebounce,
  renderSearchErrorStatus,
  mergeMetadataIntoResults,
  DEFAULT_ROOT_PATH,
  RESPONSIVE_BREAKPOINT,
  sortResultsForMode,
  insertIntoSortedArray
} from "../utils/search-utils";
import type { FilterChip } from "../types";

export function useApp() {
  const { t, i18n } = useTranslation();
  const tr = useCallback((key: string, defaultValue: string, values?: Record<string, unknown>) =>
    t(key, { defaultValue, ...(values ?? {}) }), [t]);
  
  const language = i18n.resolvedLanguage === "en" ? "en" : "ru";
  
  const searchState = useSearchState(tr("app.status.ready", "Готово"));
  const searchRefs = useSearchRefs();
  const themeState = useThemeState(tr);
  const persistence = usePersistence();
  const filesystemTree = useFilesystemTree();
  const filterState = useFilterState();
  const settingsState = useSettingsState();
  const layoutState = useLayoutState();
  const roots = useRootsState();
  const { toasts, pushToast, closeToast } = useToast();
  const uiState = useUIState();

  const [query, setQuery] = useState("");
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const resultPaneRef = useRef<HTMLDivElement | null>(null);

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

  const limit = useMemo(() => {
    if (filterState.limitMode === "100") return 100;
    if (filterState.limitMode === "500") return 500;
    if (filterState.limitMode === "1000") return 1000;
    if (filterState.limitMode === "none") return null;
    return Math.max(1, filterState.customLimit);
  }, [filterState.limitMode, filterState.customLimit]);

  const searchRequest = useSearchRequest({
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

  const { visibleRows } = useResults({
    results: searchState.results,
    sortMode: filterState.sortMode,
    listHeight: uiState.listHeight,
    scrollTop: uiState.scrollTop
  });

  const incrementalSearch = useIncrementalSearch({
    ignoreCase: filterState.ignoreCase
  });

  const buildCurrentRequest = searchRequest.buildCurrentRequest;
  const validateCurrentDateFilters = searchRequest.validateDateFilters;

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

  const scheduleResultsFlush = useCallback(() => {
    if (searchRefs.batchFlushFrameRef.current !== null) return;
    searchRefs.batchFlushFrameRef.current = window.requestAnimationFrame(() => {
      searchRefs.batchFlushFrameRef.current = null;
      if (searchRefs.bufferedBatchRef.current.length === 0) return;
      const nextChunk = searchRefs.bufferedBatchRef.current;
      searchRefs.bufferedBatchRef.current = [];
      const checkedDelta = searchRefs.pendingCheckedDeltaRef.current;
      searchRefs.pendingCheckedDeltaRef.current = 0;
      if (checkedDelta > 0) {
        searchState.setCheckedPaths((prev) => prev + checkedDelta);
      }
      searchState.setResults((prev) => {
        const next = insertIntoSortedArray(prev, nextChunk, searchRefs.sortModeRef.current);
        incrementalSearch.updateIncrementalResults(next, searchRefs.sortModeRef.current);
        return next;
      });
    });
  }, [searchRefs, searchState, incrementalSearch]);

  const tryIncrementalPlainSearch = useCallback((nextRequest: SearchRequest): boolean => {
    const filtered = incrementalSearch.tryIncrementalSearch(nextRequest, searchRefs.sortModeRef.current);
    if (!filtered) return false;
    searchState.setResults(filtered);
    searchState.setSelectedPath((prev) => (prev && filtered.some((item) => item.full_path === prev) ? prev : null));
    uiState.setScrollTop(0);
    searchState.setStatus(tr("app.status.ready", "Готово"));
    searchState.setIsSearching(false);
    return true;
  }, [searchState, searchRefs, uiState, tr, incrementalSearch]);

  const handleSearch = useCallback(async (preparedRequest?: SearchRequest): Promise<void> => {
    if (!tauriRuntimeAvailable) {
      searchState.setStatus(tr("app.status.tauriUnavailable", "Tauri runtime не обнаружен"));
      return;
    }

    if (searchState.isSearching) {
      return;
    }

    if (!preparedRequest) {
      const dateErrors = validateCurrentDateFilters();
      if (dateErrors.length > 0) {
        const fieldNames: Record<string, string> = {
          modifiedAfter: tr("app.filters.modified.legend", "Дата изменения"),
          modifiedBefore: tr("app.filters.modified.legend", "Дата изменения"),
          createdAfter: tr("app.filters.created.legend", "Дата создания"),
          createdBefore: tr("app.filters.created.legend", "Дата создания"),
        };
        const fieldList = [...new Set(dateErrors.map((e) => fieldNames[e.field]))].join(", ");
        pushToast(
          tr("app.toast.invalidDateFilter", "Некорректная дата в фильтре: {{fields}}", { fields: fieldList }),
          "error"
        );
        return;
      }
    }

    const request = preparedRequest ?? buildCurrentRequest();
    searchState.setResults([]);
    uiState.setScrollTop(0);
    searchState.setSelectedPath(null);
    searchState.setCheckedPaths(0);
    searchState.setLimitReached(false);
    searchState.setStatus(tr("app.status.scanning", "Сканирование..."));
    searchState.setIsSearching(true);
    searchState.setSearchStartedAt(Date.now());
    searchState.setElapsedMs(null);
    searchState.setTtfrMs(null);
    searchState.setSearchErrorCount(0);
    incrementalSearch.incrementalSearchRef.current = { request, results: [] };
    searchRefs.bufferedBatchRef.current = [];
    searchRefs.pendingCheckedDeltaRef.current = 0;
    if (searchRefs.batchFlushFrameRef.current !== null) {
      window.cancelAnimationFrame(searchRefs.batchFlushFrameRef.current);
      searchRefs.batchFlushFrameRef.current = null;
    }
    searchRefs.metadataLoadedPathsRef.current.clear();
    searchRefs.metadataInFlightPathsRef.current.clear();

    try {
      const response = await startSearch(request);
      searchState.setActiveSearchId(response.search_id);
    } catch (error) {
      searchState.setIsSearching(false);
      searchState.setSearchStartedAt(null);
      searchState.setElapsedMs(null);
      searchState.setTtfrMs(null);
      searchState.setStatus(tr("app.status.startError", "Ошибка запуска: {{error}}", { error: String(error) }));
      pushToast(tr("app.toast.searchStartFailed", "Не удалось запустить поиск"), "error");
    }
  }, [searchState, searchRefs, uiState, validateCurrentDateFilters, buildCurrentRequest, pushToast, tr]);

  const handleCancel = useCallback(async (): Promise<void> => {
    if (!tauriRuntimeAvailable) return;
    try {
      await cancelSearch();
      searchState.setStatus(tr("app.status.stopping", "Остановка..."));
    } catch {
      searchState.setStatus(tr("app.status.stopError", "Не удалось остановить поиск"));
    }
  }, [searchState, tr]);

  const handleOpenPath = useCallback(async (path: string): Promise<void> => {
    if (!tauriRuntimeAvailable) return;
    try {
      await actionOpenPath(path);
      await persistence.refreshPersistenceData();
    } catch {
      pushToast(tr("app.toast.openFailed", "Не удалось открыть элемент"), "error");
    }
  }, [persistence, pushToast, tr]);

  const handleOpenParent = useCallback(async (path: string): Promise<void> => {
    if (!tauriRuntimeAvailable) return;
    try {
      await actionOpenParent(path);
      await persistence.refreshPersistenceData();
    } catch {
      pushToast(tr("app.toast.openParentFailed", "Не удалось открыть родительскую папку"), "error");
    }
  }, [persistence, pushToast, tr]);

  const handleRevealPath = useCallback(async (path: string): Promise<void> => {
    if (!tauriRuntimeAvailable) return;
    try {
      await actionRevealPath(path);
    } catch {
      pushToast(tr("app.toast.revealFailed", "Не удалось показать в проводнике"), "error");
    }
  }, [pushToast, tr]);

  const handleCopyPath = useCallback(async (path: string): Promise<void> => {
    if (!tauriRuntimeAvailable) return;
    try {
      await actionCopyToClipboard(path);
      pushToast(tr("app.toast.pathCopied", "Путь скопирован"), "success");
    } catch {
      pushToast(tr("app.toast.pathCopyFailed", "Не удалось скопировать путь"), "error");
    }
  }, [pushToast, tr]);

  const handleCopyName = useCallback(async (name: string): Promise<void> => {
    if (!tauriRuntimeAvailable) return;
    try {
      await actionCopyToClipboard(name);
      pushToast(tr("app.toast.nameCopied", "Имя скопировано"), "success");
    } catch {
      pushToast(tr("app.toast.nameCopyFailed", "Не удалось скопировать имя"), "error");
    }
  }, [pushToast, tr]);

  const handleAddFavorite = useCallback(async (path: string): Promise<void> => {
    if (!tauriRuntimeAvailable) return;
    try {
      await favoritesAdd(path);
      persistence.handleAddFavorite(path);
      pushToast(tr("app.toast.favoriteAdded", "Добавлено в избранное"), "success");
    } catch {
      pushToast(tr("app.toast.favoriteAddFailed", "Не удалось добавить в избранное"), "error");
    }
  }, [persistence, pushToast, tr]);

  const handleRemoveFavorite = useCallback(async (path: string): Promise<void> => {
    if (!tauriRuntimeAvailable) return;
    try {
      await favoritesRemove(path);
      persistence.handleRemoveFavorite(path);
    } catch {
      pushToast(tr("app.toast.favoriteRemoveFailed", "Не удалось удалить из избранного"), "error");
    }
  }, [persistence, pushToast, tr]);

  const handleSaveProfile = useCallback(async (): Promise<void> => {
    const name = uiState.newProfileName.trim();
    if (!name || !tauriRuntimeAvailable) return;
    try {
      await profilesSave({
        id: "",
        name,
        pinned: false,
        request: buildCurrentRequest()
      });
      uiState.setNewProfileName("");
      await persistence.refreshPersistenceData();
      pushToast(tr("app.toast.profileSaved", "Профиль сохранен"), "success");
    } catch {
      pushToast(tr("app.toast.profileSaveFailed", "Не удалось сохранить профиль"), "error");
    }
  }, [uiState, buildCurrentRequest, persistence, pushToast, tr]);

  const handleDeleteProfile = useCallback(async (profileId: string): Promise<void> => {
    if (!tauriRuntimeAvailable) return;
    try {
      await profilesDelete(profileId);
      persistence.handleDeleteProfile(profileId);
    } catch {
      pushToast(tr("app.toast.profileDeleteFailed", "Не удалось удалить профиль"), "error");
    }
  }, [persistence, pushToast, tr]);

  const requestClearHistory = useCallback(() => {
    setConfirmClearHistory(true);
  }, []);

  const handleClearHistory = useCallback(async (): Promise<void> => {
    setConfirmClearHistory(false);
    if (!tauriRuntimeAvailable) return;
    try {
      await persistence.handleClearHistory();
      pushToast(tr("app.toast.historyCleared", "История очищена"), "success");
    } catch {
      pushToast(tr("app.toast.historyClearFailed", "Не удалось очистить историю"), "error");
    }
  }, [persistence, pushToast, tr]);

  const applyProfile = useCallback((profile: SearchProfile): void => {
    const req = profile.request;
    setQuery(req.query);
    const profileRoots = req.roots.length > 0 ? req.roots.map((path) => ({ path, enabled: true as const })) : [{ path: DEFAULT_ROOT_PATH, enabled: true as const }];
    roots.setRoots(profileRoots);
    roots.setPrimaryRoot(profileRoots[0]?.path ?? DEFAULT_ROOT_PATH);
    filterState.setExtensionsRaw(req.extensions.join(","));
    filterState.setExcludePathsRaw((req.exclude_paths ?? []).join(","));
    filterState.setStrict(req.options.strict);
    filterState.setIgnoreCase(req.options.ignore_case);
    filterState.setIncludeHidden(req.options.include_hidden);
    filterState.setEntryKind(req.options.entry_kind);
    filterState.setMatchMode(req.options.match_mode);
    filterState.setSortMode(req.options.sort_mode);
    filterState.setSearchBackend(req.options.search_backend ?? "Scan");
    filterState.setMaxDepthUnlimited(req.options.max_depth === null);
    filterState.setMaxDepth(req.options.max_depth ?? 3);
    if (req.options.limit === null) {
      filterState.setLimitMode("none");
    } else if (req.options.limit === 100) {
      filterState.setLimitMode("100");
    } else if (req.options.limit === 500) {
      filterState.setLimitMode("500");
    } else if (req.options.limit === 1000) {
      filterState.setLimitMode("1000");
    } else {
      filterState.setLimitMode("custom");
      filterState.setCustomLimit(req.options.limit);
    }
  }, [roots, filterState]);

  const upsertRoot = useCallback((path: string): void => {
    const normalized = path.trim();
    if (!normalized) return;
    if (roots.roots.some((root) => root.path === normalized)) return;
    roots.setRoots((previous) => previous.concat({ path: normalized, enabled: true }));
  }, [roots]);

  const handlePickRootPath = useCallback(async (): Promise<void> => {
    if (!tauriRuntimeAvailable) {
      searchState.setStatus(tr("app.status.tauriUnavailable", "Tauri runtime не обнаружен"));
      return;
    }
    try {
      const selected = await fsPickFolder();
      if (!selected) return;
      upsertRoot(selected);
      roots.setPrimaryRoot(selected);
    } catch {
      pushToast(tr("app.toast.pickFolderFailed", "Не удалось выбрать папку"), "error");
    }
  }, [searchState, roots, upsertRoot, pushToast, tr]);

  const handleRemoveRoot = useCallback((path: string): void => {
    roots.setRoots((previous) => {
      const next = previous.filter((item) => item.path !== path);
      if (next.length === 0) {
        roots.setPrimaryRoot(DEFAULT_ROOT_PATH);
        return [{ path: DEFAULT_ROOT_PATH, enabled: true }];
      }
      if (!next.some((item) => item.path === roots.primaryRoot)) {
        roots.setPrimaryRoot(next[0]?.path ?? DEFAULT_ROOT_PATH);
      }
      return next;
    });
  }, [roots]);

  const handleCancelRebuild = useCallback(async (): Promise<void> => {
    if (!tauriRuntimeAvailable) return;
    try {
      await indexRebuildCancel();
      pushToast(tr("app.index.rebuildCancelled", "Перестроение отменено"), "info");
    } catch {
      pushToast(tr("app.index.cancelFailed", "Не удалось отменить"), "error");
    }
  }, [pushToast, tr]);

  const commandActions = useMemo(() => [
    { id: "cmd-new", label: tr("app.commands.newSearch", "> Новый поиск"), run: () => void handleSearch() },
    { id: "cmd-rebuild-index", label: tr("app.commands.rebuildIndex", "> Перестроить индекс"), run: () => void index.handleRebuildIndex(indexRoots) },
    { id: "cmd-clear-history", label: tr("app.commands.clearHistory", "> Очистить историю"), run: requestClearHistory },
    { id: "cmd-theme", label: tr("app.commands.toggleTheme", "> Переключить тему"), run: () => themeState.setThemeId((prev) => (prev === "dark" ? "light" : "dark")) },
    { id: "cmd-focus", label: tr("app.commands.focusSearch", "/ Фокус в строку поиска"), run: () => searchInputRef.current?.focus() },
    { id: "cmd-help", label: tr("app.commands.help", "? Горячие клавиши"), run: () => pushToast(tr("app.messages.hotkeys", "⌘K, ⌘F, Esc, F5, ↑/↓, Enter"), "info") },
    ...persistence.profiles.map((profile) => ({
      id: `profile-${profile.id}`,
      label: `# ${profile.name}`,
      run: () => applyProfile(profile)
    }))
  ], [handleSearch, index, indexRoots, requestClearHistory, themeState, pushToast, tr, persistence.profiles, applyProfile]);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    searchRefs.activeSearchIdRef.current = searchState.activeSearchId;
  }, [searchState.activeSearchId, searchRefs]);

  useEffect(() => {
    if (!searchState.isSearching) return;
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 500);
    return () => window.clearInterval(timer);
  }, [searchState.isSearching]);

  useEffect(() => {
    searchRefs.searchStartedAtRef.current = searchState.searchStartedAt;
  }, [searchState.searchStartedAt, searchRefs]);

  useEffect(() => {
    searchRefs.sortModeRef.current = filterState.sortMode;
    searchState.setResults((prev) => {
      const next = sortResultsForMode(prev, filterState.sortMode);
      if (incrementalSearch.incrementalSearchRef.current) {
        incrementalSearch.incrementalSearchRef.current = { ...incrementalSearch.incrementalSearchRef.current, results: next };
      }
      return next;
    });
  }, [filterState.sortMode, searchState, searchRefs]);

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
      if (searchRefs.activeSearchIdRef.current === null) {
        searchRefs.activeSearchIdRef.current = payload.search_id;
        searchState.setActiveSearchId(payload.search_id);
      }
      if (payload.search_id !== searchRefs.activeSearchIdRef.current) {
        return;
      }
      if (searchRefs.searchStartedAtRef.current !== null && !ttfrSet) {
        searchState.setTtfrMs(Date.now() - searchRefs.searchStartedAtRef.current);
        ttfrSet = true;
      }
      searchRefs.bufferedBatchRef.current.push(...payload.results);
      searchRefs.pendingCheckedDeltaRef.current += payload.results.length;
      scheduleResultsFlush();
    }));

    registerListener(onSearchDone((payload) => {
      if (searchRefs.activeSearchIdRef.current === null) {
        searchRefs.activeSearchIdRef.current = payload.search_id;
        searchState.setActiveSearchId(payload.search_id);
      }
      if (payload.search_id !== searchRefs.activeSearchIdRef.current) {
        return;
      }
      searchState.setStatus(tr("app.status.ready", "Готово"));
      searchState.setLimitReached(payload.limit_reached);
      searchState.setIsSearching(false);
      if (searchRefs.batchFlushFrameRef.current !== null) {
        window.cancelAnimationFrame(searchRefs.batchFlushFrameRef.current);
        searchRefs.batchFlushFrameRef.current = null;
      }
      if (searchRefs.pendingCheckedDeltaRef.current > 0) {
        const checkedDelta = searchRefs.pendingCheckedDeltaRef.current;
        searchRefs.pendingCheckedDeltaRef.current = 0;
        searchState.setCheckedPaths((prev) => prev + checkedDelta);
      }
      if (searchRefs.bufferedBatchRef.current.length > 0) {
        const remaining = searchRefs.bufferedBatchRef.current;
        searchRefs.bufferedBatchRef.current = [];
        searchState.setResults((prev) => {
          const next = insertIntoSortedArray(prev, remaining, searchRefs.sortModeRef.current);
          if (incrementalSearch.incrementalSearchRef.current) {
            incrementalSearch.incrementalSearchRef.current = { ...incrementalSearch.incrementalSearchRef.current, results: next };
          }
          return next;
        });
      }
      searchState.setActiveSearchId(null);
      if (searchRefs.searchStartedAtRef.current !== null) {
        searchState.setElapsedMs(Date.now() - searchRefs.searchStartedAtRef.current);
      }
      void persistence.refreshPersistenceData();
    }));

    registerListener(onSearchCancelled((payload) => {
      if (searchRefs.activeSearchIdRef.current === null) {
        searchRefs.activeSearchIdRef.current = payload.search_id;
        searchState.setActiveSearchId(payload.search_id);
      }
      if (payload.search_id !== searchRefs.activeSearchIdRef.current) {
        return;
      }
      searchState.setStatus(tr("app.status.stopped", "Остановлено"));
      searchState.setIsSearching(false);
      if (searchRefs.pendingCheckedDeltaRef.current > 0) {
        const checkedDelta = searchRefs.pendingCheckedDeltaRef.current;
        searchRefs.pendingCheckedDeltaRef.current = 0;
        searchState.setCheckedPaths((prev) => prev + checkedDelta);
      }
      searchRefs.bufferedBatchRef.current = [];
      if (searchRefs.batchFlushFrameRef.current !== null) {
        window.cancelAnimationFrame(searchRefs.batchFlushFrameRef.current);
        searchRefs.batchFlushFrameRef.current = null;
      }
      searchState.setActiveSearchId(null);
      if (searchRefs.searchStartedAtRef.current !== null) {
        searchState.setElapsedMs(Date.now() - searchRefs.searchStartedAtRef.current);
      }
    }));

    registerListener(onSearchError((payload) => {
      if (searchRefs.activeSearchIdRef.current === null) {
        searchRefs.activeSearchIdRef.current = payload.search_id;
        searchState.setActiveSearchId(payload.search_id);
      }
      if (payload.search_id !== searchRefs.activeSearchIdRef.current) {
        return;
      }
      searchState.setStatus(renderSearchErrorStatus(payload.message, tr));
      searchState.setIsSearching(false);
      searchState.setSearchErrorCount((prev) => prev + 1);
      if (searchRefs.pendingCheckedDeltaRef.current > 0) {
        const checkedDelta = searchRefs.pendingCheckedDeltaRef.current;
        searchRefs.pendingCheckedDeltaRef.current = 0;
        searchState.setCheckedPaths((prev) => prev + checkedDelta);
      }
      searchRefs.bufferedBatchRef.current = [];
      if (searchRefs.batchFlushFrameRef.current !== null) {
        window.cancelAnimationFrame(searchRefs.batchFlushFrameRef.current);
        searchRefs.batchFlushFrameRef.current = null;
      }
      searchState.setActiveSearchId(null);
      if (searchRefs.searchStartedAtRef.current !== null) {
        searchState.setElapsedMs(Date.now() - searchRefs.searchStartedAtRef.current);
      }
    }));

    return () => {
      mounted = false;
      unlisten.forEach((fn) => fn());
    };
  }, [tr, scheduleResultsFlush, persistence, searchState, searchRefs]);

  useEffect(() => {
    if (!settingsState.liveSearch) return;
    const request = buildCurrentRequest();
    if (!request.query.trim()) return;
    const adaptiveDebounce = computeAdaptiveDebounce(request, settingsState.debounceMs);
    const timer = window.setTimeout(() => {
      if (tryIncrementalPlainSearch(request)) return;
      void handleSearch(request);
    }, adaptiveDebounce);
    return () => window.clearTimeout(timer);
  }, [settingsState.debounceMs, settingsState.liveSearch, query, filterState.searchBackend, buildCurrentRequest, handleSearch, tryIncrementalPlainSearch]);

  useEffect(() => {
    if (!settingsState.liveSearch) return;
    const request = buildCurrentRequest();
    if (!request.query.trim()) return;
    const timer = window.setTimeout(() => {
      void handleSearch(request);
    }, settingsState.debounceMs);
    return () => window.clearTimeout(timer);
  }, [
    filterState.createdAfter,
    filterState.createdBefore,
    filterState.createdFilterEnabled,
    filterState.entryKind,
    filterState.extensionsRaw,
    filterState.excludePathsRaw,
    filterState.ignoreCase,
    filterState.includeHidden,
    limit,
    filterState.matchMode,
    filterState.maxDepth,
    filterState.maxDepthUnlimited,
    filterState.modifiedAfter,
    filterState.modifiedBefore,
    filterState.modifiedFilterEnabled,
    settingsState.regexEnabled,
    roots.roots,
    filterState.sizeComparison,
    filterState.sizeFilterEnabled,
    filterState.sizeUnit,
    filterState.sizeValue,
    filterState.strict,
    settingsState.debounceMs,
    settingsState.liveSearch,
    buildCurrentRequest,
    handleSearch
  ]);

  useEffect(() => {
    if (!tauriRuntimeAvailable || searchState.isSearching || layoutState.displayMode === "cards" || visibleRows.items.length === 0) return;

    const targetPaths = visibleRows.items
      .map((item) => item.full_path)
      .filter(
        (path) =>
          !searchRefs.metadataLoadedPathsRef.current.has(path) &&
          !searchRefs.metadataInFlightPathsRef.current.has(path)
      )
      .slice(0, 32);
    if (targetPaths.length === 0) return;

    const timer = window.setTimeout(() => {
      for (const path of targetPaths) {
        searchRefs.metadataInFlightPathsRef.current.add(path);
      }

      void searchEnrichMetadata(targetPaths)
        .then((patches) => {
          for (const path of targetPaths) {
            searchRefs.metadataLoadedPathsRef.current.add(path);
          }
          if (patches.length === 0) return;
          searchState.setResults((prev) => {
            const next = mergeMetadataIntoResults(prev, patches);
            if (incrementalSearch.incrementalSearchRef.current) {
              incrementalSearch.incrementalSearchRef.current = { ...incrementalSearch.incrementalSearchRef.current, results: next };
            }
            return next;
          });
        })
        .catch(() => {})
        .finally(() => {
          for (const path of targetPaths) {
            searchRefs.metadataInFlightPathsRef.current.delete(path);
          }
        });
    }, 150);

    return () => {
      window.clearTimeout(timer);
    };
  }, [layoutState.displayMode, searchState.isSearching, visibleRows.items, searchState, searchRefs]);

  useEffect(() => {
    if (!resultPaneRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.height;
      if (typeof next === "number" && next > 0) {
        uiState.setListHeight(next - 44);
      }
    });
    observer.observe(resultPaneRef.current);
    return () => observer.disconnect();
  }, [uiState]);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      const dragging = document.body.dataset.dragPanel;
      if (!dragging) return;
      document.body.style.cursor = "col-resize";
      const viewportWidth = window.innerWidth;
      if (dragging === "left") {
        layoutState.setLeftWidth(Math.max(200, Math.min(460, event.clientX - 8)));
      }
      if (dragging === "right") {
        layoutState.setRightWidth(Math.max(220, Math.min(500, viewportWidth - event.clientX - 8)));
      }
    };
    const onMouseUp = () => {
      delete document.body.dataset.dragPanel;
      document.body.style.cursor = "";
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [layoutState]);

  useEffect(() => {
    const onClick = () => uiState.setContextMenu(null);
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [uiState]);

  useEffect(
    () => () => {
      if (searchRefs.batchFlushFrameRef.current !== null) {
        window.cancelAnimationFrame(searchRefs.batchFlushFrameRef.current);
      }
      searchRefs.pendingCheckedDeltaRef.current = 0;
      searchRefs.bufferedBatchRef.current = [];
    },
    [searchRefs]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const accel = event.ctrlKey || event.metaKey;

      if (accel && key === "k") {
        event.preventDefault();
        layoutState.setPaletteOpen(true);
        return;
      }
      if (accel && key === "f") {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (key === "f5") {
        event.preventDefault();
        void handleSearch();
        return;
      }
      if (accel && event.shiftKey && key === "r") {
        event.preventDefault();
        if (filterState.searchBackend === "Index" && indexRoots.length > 0 && !index.isRebuildingIndex) {
          void index.handleRebuildIndex(indexRoots);
        }
        return;
      }
      if (key === "escape") {
        layoutState.setPaletteOpen(false);
        layoutState.setFiltersOpen(false);
        uiState.setContextMenu(null);
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
        if (searchState.results.length === 0) return;
        event.preventDefault();
        const currentIndex = searchState.selectedPath ? searchState.results.findIndex((item) => item.full_path === searchState.selectedPath) : -1;
        const delta = key === "arrowdown" ? 1 : -1;
        const nextIndex = Math.max(0, Math.min(searchState.results.length - 1, currentIndex + delta));
        const nextItem = searchState.results[nextIndex];
        if (nextItem) {
          searchState.setSelectedPath(nextItem.full_path);
          const row = document.querySelector<HTMLTableRowElement>(`tr[data-path="${CSS.escape(nextItem.full_path)}"]`);
          row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
        return;
      }
      if (key === "enter" && selectedResult) {
        const activeTag = (event.target as HTMLElement | null)?.tagName.toLowerCase();
        if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") return;
        event.preventDefault();
        void handleOpenPath(selectedResult.full_path);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [indexRoots, index.isRebuildingIndex, searchState.results, searchState.selectedPath, selectedResult, filterState.searchBackend, handleSearch, handleOpenPath, layoutState, uiState]);

  useEffect(() => {
    if (window.innerWidth < RESPONSIVE_BREAKPOINT) {
      layoutState.setLeftVisible(false);
      layoutState.setRightVisible(false);
    }
  }, [layoutState]);

  useEffect(() => {
    if (!settingsState.regexEnabled && filterState.matchMode === "Regex") {
      filterState.setMatchMode("Plain");
    }
  }, [filterState.matchMode, settingsState.regexEnabled, filterState]);

  const statusText = useMemo(() => {
    const effectiveElapsedMs =
      searchState.elapsedMs !== null ? searchState.elapsedMs : searchState.isSearching && searchState.searchStartedAt !== null ? nowMs - searchState.searchStartedAt : null;
    const elapsed =
      effectiveElapsedMs === null
        ? "-"
        : tr("app.status.elapsedSeconds", "{{value}} сек", { value: (effectiveElapsedMs / 1000).toFixed(2) });
    const throughput =
      effectiveElapsedMs && effectiveElapsedMs > 0
        ? `${(searchState.checkedPaths / Math.max(effectiveElapsedMs / 1000, 0.001)).toFixed(1)}/s`
        : "-";
    const ttfr =
      searchState.ttfrMs === null
        ? "-"
        : tr("app.status.elapsedSeconds", "{{value}} сек", { value: (searchState.ttfrMs / 1000).toFixed(2) });
    const warning = searchState.limitReached
      ? tr("app.status.limitWarning", "Показано только {{count}} результатов", { count: searchState.results.length })
      : "";
    const progress = searchState.isSearching && throughput !== "-"
      ? `${searchState.checkedPaths} ${tr("app.statusbar.checked", "проверено")}`
      : "-";
    return { elapsed, warning, ttfr, throughput, errors: String(searchState.searchErrorCount), progress };
  }, [searchState.checkedPaths, searchState.elapsedMs, searchState.isSearching, searchState.limitReached, nowMs, searchState.results.length, searchState.searchErrorCount, searchState.searchStartedAt, tr, searchState.ttfrMs]);

  return {
    tr,
    language,
    searchState,
    searchRefs,
    themeState,
    persistence,
    filesystemTree,
    filterState,
    settingsState,
    layoutState,
    roots,
    upsertRoot,
    index,
    indexRoots,
    handleCancelRebuild,
    toasts,
    pushToast,
    closeToast,
    uiState,
    query,
    setQuery,
    handleSearch,
    handleCancel,
    handleOpenPath,
    handleOpenParent,
    handleRevealPath,
    handleCopyPath,
    handleCopyName,
    handleAddFavorite,
    handleRemoveFavorite,
    handleSaveProfile,
    handleDeleteProfile,
    handleClearHistory,
    handlePickRootPath,
    handleRemoveRoot,
    applyProfile,
    requestClearHistory,
    selectedResult,
    chips,
    visibleRows,
    selectedPaths: searchState.selectedPaths,
    toggleSelection: searchState.toggleSelection,
    selectAll: searchState.selectAll,
    clearSelection: searchState.clearSelection,
    limit,
    buildCurrentRequest,
    statusText,
    commandActions,
    confirmClearHistory,
    setConfirmClearHistory,
    searchInputRef,
    resultPaneRef,
    incrementalSearch: incrementalSearch.incrementalSearchRef,
  };
}
