
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  actionCopyToClipboard,
  actionOpenParent,
  actionOpenPath,
  actionRevealPath,
  cancelSearch,
  favoritesAdd,
  favoritesList,
  favoritesRemove,
  fsListChildren,
  fsPickFolder,
  fsListRoots,
  historyClear,
  historyList,
  indexRebuild,
  indexStatus,
  onSearchBatch,
  onSearchCancelled,
  onSearchDone,
  onSearchError,
  profilesDelete,
  profilesList,
  profilesSave,
  searchEnrichMetadata,
  startSearch,
  tauriRuntimeAvailable
} from "../shared/tauri-client";
import type {
  EntryKind,
  FsTreeNode,
  HistorySnapshot,
  IndexStatusResponse,
  MatchMode,
  SearchBackend,
  SearchMetadataPatch,
  SearchProfile,
  SearchRequest,
  SearchResultItem,
  SizeComparison,
  SortMode
} from "../shared/search-types";
import { CommandPalette, type CommandPaletteAction } from "../widgets/CommandPalette";
import { ToastHost, type ToastItem } from "../widgets/ToastHost";
import { AppContextMenu } from "./components/chrome/AppContextMenu";
import { FiltersPanel } from "./components/chrome/FiltersPanel";
import { SettingsPanel } from "./components/chrome/SettingsPanel";
import { StatusBar } from "./components/chrome/StatusBar";
import { TopBar } from "./components/chrome/TopBar";
import { ResultsWorkspace } from "./components/results/ResultsWorkspace";
import { DetailsSidebar } from "./components/sidebars/DetailsSidebar";
import { LeftSidebar } from "./components/sidebars/LeftSidebar";
import { formatBytes, formatDate } from "./formatters";
import { buildSearchRequest } from "./search-request";
import { applyThemeColors, builtInThemes, darkenHex, tintHex } from "./theme";
import type { ContextMenuState, DisplayMode, FilterChip, RootItem, ThemePreset } from "./types";
import "./styles.css";

const defaultRootPath =
  typeof navigator !== "undefined" && /windows/i.test(navigator.userAgent) ? "C:\\" : "/";
const defaultRoots: RootItem[] = [{ path: defaultRootPath, enabled: true }];
const rowHeight = 34;
const DEFAULT_INDEX_TTL_HOURS = 6;
const DEFAULT_INDEX_CHECK_INTERVAL_MINUTES = 15;

function compareSearchItems(left: SearchResultItem, right: SearchResultItem, mode: SortMode): number {
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

const RESPONSIVE_BREAKPOINT = 1024;

function sortResultsForMode(items: SearchResultItem[], mode: SortMode): SearchResultItem[] {
  return [...items].sort((left, right) => compareSearchItems(left, right, mode));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function arraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((item, index) => item === right[index]);
}

function sameSearchContextWithoutQuery(left: SearchRequest, right: SearchRequest): boolean {
  return (
    arraysEqual(left.roots, right.roots) &&
    arraysEqual(left.extensions, right.extensions) &&
    arraysEqual(left.exclude_paths ?? [], right.exclude_paths ?? []) &&
    JSON.stringify(left.options) === JSON.stringify(right.options)
  );
}

type SearchErrorCode = "SEARCH_INVALID_QUERY" | "SEARCH_STATE_ERROR" | "SEARCH_EXECUTION_ERROR";

type ParsedSearchError = {
  code: SearchErrorCode | null;
  message: string;
};

function parseSearchErrorMessage(raw: string): ParsedSearchError {
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

function renderSearchErrorStatus(
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

function filterPlainResults(items: SearchResultItem[], query: string, ignoreCase: boolean): SearchResultItem[] {
  const normalizedQuery = ignoreCase ? query.toLocaleLowerCase() : query;
  return items.filter((item) => {
    const name = ignoreCase ? item.name.toLocaleLowerCase() : item.name;
    const fullPath = ignoreCase ? item.full_path.toLocaleLowerCase() : item.full_path;
    return name.includes(normalizedQuery) || fullPath.includes(normalizedQuery);
  });
}

function isIndexStale(updatedAt: string, ttlMs: number, now = Date.now()): boolean {
  const stamp = new Date(updatedAt).getTime();
  if (!Number.isFinite(stamp) || stamp <= 0) return true;
  return now - stamp > ttlMs;
}

function computeAdaptiveDebounce(request: SearchRequest, configuredDebounceMs: number): number {
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

function mergeMetadataIntoResults(items: SearchResultItem[], patches: SearchMetadataPatch[]): SearchResultItem[] {
  if (patches.length === 0) return items;
  const patchByPath = new Map<string, SearchMetadataPatch>();
  for (const patch of patches) {
    patchByPath.set(patch.full_path, patch);
  }

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

type IncrementalSearchContext = {
  request: SearchRequest;
  results: SearchResultItem[];
};

export function App() {
  const { t, i18n } = useTranslation();
  const tr = (key: string, defaultValue: string, values?: Record<string, unknown>) =>
    t(key, { defaultValue, ...(values ?? {}) });
  const [query, setQuery] = useState("");
  const [roots, setRoots] = useState<RootItem[]>(defaultRoots);
  const [primaryRoot, setPrimaryRoot] = useState(defaultRootPath);
  const [strict, setStrict] = useState(false);
  const [ignoreCase, setIgnoreCase] = useState(true);
  const [includeHidden, setIncludeHidden] = useState(false);
  const [entryKind, setEntryKind] = useState<EntryKind>("Any");
  const [extensionsRaw, setExtensionsRaw] = useState("");
  const [excludePathsRaw, setExcludePathsRaw] = useState("");
  const [matchMode, setMatchMode] = useState<MatchMode>("Plain");
  const [sortMode, setSortMode] = useState<SortMode>("Relevance");
  const [searchBackend, setSearchBackend] = useState<SearchBackend>("Scan");
  const [maxDepthUnlimited, setMaxDepthUnlimited] = useState(true);
  const [maxDepth, setMaxDepth] = useState(3);
  const [sizeFilterEnabled, setSizeFilterEnabled] = useState(false);
  const [sizeComparison, setSizeComparison] = useState<SizeComparison>("Greater");
  const [sizeValue, setSizeValue] = useState(1);
  const [sizeUnit, setSizeUnit] = useState<"B" | "KB" | "MB" | "GB" | "TB">("MB");
  const [modifiedFilterEnabled, setModifiedFilterEnabled] = useState(false);
  const [modifiedAfter, setModifiedAfter] = useState("");
  const [modifiedBefore, setModifiedBefore] = useState("");
  const [createdFilterEnabled, setCreatedFilterEnabled] = useState(false);
  const [createdAfter, setCreatedAfter] = useState("");
  const [createdBefore, setCreatedBefore] = useState("");
  const [limitMode, setLimitMode] = useState<"100" | "500" | "1000" | "custom" | "none">("500");
  const [customLimit, setCustomLimit] = useState(500);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [status, setStatus] = useState(tr("app.status.ready", "Готово"));
  const [activeSearchId, setActiveSearchId] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [checkedPaths, setCheckedPaths] = useState(0);
  const [searchStartedAt, setSearchStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [ttfrMs, setTtfrMs] = useState<number | null>(null);
  const [searchErrorCount, setSearchErrorCount] = useState(0);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [history, setHistory] = useState<HistorySnapshot>({ query_entries: [], opened_paths: [] });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [profiles, setProfiles] = useState<SearchProfile[]>([]);
  const [computerRoots, setComputerRoots] = useState<FsTreeNode[]>([]);
  const [treeChildren, setTreeChildren] = useState<Record<string, FsTreeNode[]>>({});
  const [expandedTree, setExpandedTree] = useState<string[]>([]);
  const [newProfileName, setNewProfileName] = useState("");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("table");
  const [leftVisible, setLeftVisible] = useState(true);
  const [rightVisible, setRightVisible] = useState(true);
  const [leftWidth, setLeftWidth] = useState(260);
  const [rightWidth, setRightWidth] = useState(280);
  const [liveSearch, setLiveSearch] = useState(true);
  const [regexEnabled, setRegexEnabled] = useState<boolean>(() => localStorage.getItem("mia.regexEnabled") !== "false");
  const [debounceMs, setDebounceMs] = useState(300);
  const [indexTtlHours, setIndexTtlHours] = useState<number>(() => {
    const raw = Number(localStorage.getItem("mia.indexTtlHours"));
    if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_INDEX_TTL_HOURS;
    return Math.max(1, Math.min(168, Math.round(raw)));
  });
  const [indexCheckIntervalMinutes, setIndexCheckIntervalMinutes] = useState<number>(() => {
    const raw = Number(localStorage.getItem("mia.indexCheckIntervalMinutes"));
    if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_INDEX_CHECK_INTERVAL_MINUTES;
    return Math.max(1, Math.min(120, Math.round(raw)));
  });
  const [themeId, setThemeId] = useState<string>(() => localStorage.getItem("mia.theme") ?? "dark");
  const [customThemes, setCustomThemes] = useState<ThemePreset[]>(() => {
    try {
      const raw = localStorage.getItem("mia.customThemes");
      if (!raw) return [];
      const parsed = JSON.parse(raw) as ThemePreset[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [indexStatusSnapshot, setIndexStatusSnapshot] = useState<IndexStatusResponse | null>(null);
  const [isRebuildingIndex, setIsRebuildingIndex] = useState(false);
  const [indexHint, setIndexHint] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [newThemeName, setNewThemeName] = useState("");
  const [newThemeBg, setNewThemeBg] = useState("#1b1f2a");
  const [newThemeText, setNewThemeText] = useState("#e7edf8");
  const [newThemeAccent, setNewThemeAccent] = useState("#4a8cff");
  const language = i18n.resolvedLanguage === "en" ? "en" : "ru";
  const [listHeight, setListHeight] = useState(460);
  const [scrollTop, setScrollTop] = useState(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const resultPaneRef = useRef<HTMLDivElement | null>(null);
  const activeSearchIdRef = useRef<number | null>(null);
  const searchStartedAtRef = useRef<number | null>(null);
  const sortModeRef = useRef<SortMode>("Relevance");
  const bufferedBatchRef = useRef<SearchResultItem[]>([]);
  const pendingCheckedDeltaRef = useRef(0);
  const batchFlushFrameRef = useRef<number | null>(null);
  const incrementalSearchRef = useRef<IncrementalSearchContext | null>(null);
  const metadataLoadedPathsRef = useRef<Set<string>>(new Set());
  const metadataInFlightPathsRef = useRef<Set<string>>(new Set());
  const themeOptions = useMemo(() => {
    const systemTheme: ThemePreset = {
      id: "system",
      name: tr("app.themes.system", "Системная"),
      colors: builtInThemes[0].colors,
      builtIn: true
    };
    return [systemTheme].concat(builtInThemes, customThemes);
  }, [customThemes, tr]);

  const activeTheme = useMemo(() => {
    if (themeId === "system") {
      const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
      return builtInThemes.find((theme) => theme.id === (prefersDark ? "dark" : "light")) ?? builtInThemes[0];
    }
    return themeOptions.find((theme) => theme.id === themeId) ?? builtInThemes[1];
  }, [themeId, themeOptions]);

  const enabledRoots = useMemo(
    () => roots.filter((root) => root.enabled).map((root) => root.path.trim()).filter(Boolean),
    [roots]
  );
  const indexRoots = useMemo(
    () => (enabledRoots.length > 0 ? enabledRoots : [primaryRoot].filter(Boolean)),
    [enabledRoots, primaryRoot]
  );
  const indexTtlMs = useMemo(
    () => Math.max(1, indexTtlHours) * 60 * 60 * 1000,
    [indexTtlHours]
  );
  const indexCheckIntervalMs = useMemo(
    () => Math.max(1, indexCheckIntervalMinutes) * 60 * 1000,
    [indexCheckIntervalMinutes]
  );

  const selectedResult = useMemo(
    () => results.find((item) => item.full_path === selectedPath) ?? null,
    [results, selectedPath]
  );
  const indexUpdatedAtLabel = useMemo(() => {
    if (!indexStatusSnapshot?.updated_at) return "-";
    return formatDate(indexStatusSnapshot.updated_at);
  }, [indexStatusSnapshot]);

  const limit = useMemo(() => {
    if (limitMode === "100") return 100;
    if (limitMode === "500") return 500;
    if (limitMode === "1000") return 1000;
    if (limitMode === "none") return null;
    return Math.max(1, customLimit);
  }, [limitMode, customLimit]);

  const chips = useMemo<FilterChip[]>(() => {
    const items: FilterChip[] = [];
    if (entryKind !== "Any") {
      items.push({
        id: "entry",
        label:
          entryKind === "File"
            ? tr("app.chips.filesOnly", "Только файлы")
            : tr("app.chips.dirsOnly", "Только папки"),
        remove: () => setEntryKind("Any")
      });
    }
    if (extensionsRaw.trim()) {
      items.push({
        id: "ext",
        label: tr("app.chips.extensions", "Расширения: {{extensions}}", { extensions: extensionsRaw }),
        remove: () => setExtensionsRaw("")
      });
    }
    if (excludePathsRaw.trim()) {
      items.push({
        id: "exclude",
        label: tr("app.chips.excludePaths", "Исключить: {{paths}}", { paths: excludePathsRaw }),
        remove: () => setExcludePathsRaw("")
      });
    }
    if (!maxDepthUnlimited) {
      items.push({
        id: "depth",
        label: tr("app.chips.depth", "Глубина: {{depth}}", { depth: maxDepth }),
        remove: () => setMaxDepthUnlimited(true)
      });
    }
    if (sizeFilterEnabled) {
      const signs: Record<SizeComparison, string> = { Greater: ">", Smaller: "<", Equal: "=" };
      items.push({
        id: "size",
        label: tr("app.chips.size", "Размер {{sign}} {{value}} {{unit}}", {
          sign: signs[sizeComparison],
          value: sizeValue,
          unit: sizeUnit
        }),
        remove: () => setSizeFilterEnabled(false)
      });
    }
    if (modifiedFilterEnabled) {
      items.push({
        id: "modified",
        label: tr("app.chips.modified", "Дата изменения"),
        remove: () => setModifiedFilterEnabled(false)
      });
    }
    if (createdFilterEnabled) {
      items.push({
        id: "created",
        label: tr("app.chips.created", "Дата создания"),
        remove: () => setCreatedFilterEnabled(false)
      });
    }
    if (strict) {
      items.push({ id: "strict", label: tr("app.chips.strict", "Строгий режим"), remove: () => setStrict(false) });
    }
    if (!ignoreCase) {
      items.push({
        id: "case",
        label: tr("app.chips.caseSensitive", "С учетом регистра"),
        remove: () => setIgnoreCase(true)
      });
    }
    if (includeHidden) {
      items.push({ id: "hidden", label: tr("app.chips.hidden", "Скрытые"), remove: () => setIncludeHidden(false) });
    }
    if (limit !== null) {
      items.push({
        id: "limit",
        label: tr("app.chips.limit", "Лимит: {{limit}}", { limit }),
        remove: () => setLimitMode("none")
      });
    }
    return items;
  }, [
    createdFilterEnabled,
    entryKind,
    excludePathsRaw,
    extensionsRaw,
    ignoreCase,
    includeHidden,
    limit,
    maxDepth,
    maxDepthUnlimited,
    modifiedFilterEnabled,
    sizeComparison,
    sizeFilterEnabled,
    sizeUnit,
    sizeValue,
    strict,
    tr
  ]);

  const visibleRows = useMemo(() => {
    const safeHeight = Math.max(200, listHeight);
    const rawStart = Math.max(0, Math.floor(scrollTop / rowHeight));
    const maxStart = Math.max(0, results.length - 1);
    const startIndex = Math.min(rawStart, maxStart);
    const count = Math.ceil(safeHeight / rowHeight) + 8;
    const endIndex = Math.min(results.length, startIndex + count);
    return {
      startIndex,
      endIndex,
      topSpacer: startIndex * rowHeight,
      bottomSpacer: Math.max(0, (results.length - endIndex) * rowHeight),
      items: results.slice(startIndex, endIndex)
    };
  }, [listHeight, results, scrollTop]);

  const commandActions = useMemo<CommandPaletteAction[]>(
    () => [
      { id: "cmd-new", label: tr("app.commands.newSearch", "> Новый поиск"), run: () => void handleSearch() },
      {
        id: "cmd-rebuild-index",
        label: tr("app.commands.rebuildIndex", "> Перестроить индекс"),
        run: () => void handleRebuildIndex(indexRoots)
      },
      {
        id: "cmd-clear-history",
        label: tr("app.commands.clearHistory", "> Очистить историю"),
        run: () => void handleClearHistory()
      },
      {
        id: "cmd-theme",
        label: tr("app.commands.toggleTheme", "> Переключить тему"),
        run: () => setThemeId((prev) => (prev === "dark" ? "light" : "dark"))
      },
      {
        id: "cmd-focus",
        label: tr("app.commands.focusSearch", "/ Фокус в строку поиска"),
        run: () => searchInputRef.current?.focus()
      },
      {
        id: "cmd-help",
        label: tr("app.commands.help", "? Горячие клавиши"),
        run: () => pushToast(tr("app.messages.hotkeys", "⌘K, ⌘F, Esc, F5, ↑/↓, Enter"), "info")
      },
      ...profiles.map((profile) => ({
        id: `profile-${profile.id}`,
        label: `# ${profile.name}`,
        run: () => applyProfile(profile)
      }))
    ],
    [indexRoots, profiles, tr]
  );

  function pushToast(text: string, kind: ToastItem["kind"] = "info"): void {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((previous) => previous.concat({ id, text, kind }));
    const dismissTime = Math.max(2000, Math.min(5000, text.length * 50));
    window.setTimeout(() => {
      setToasts((previous) => previous.filter((item) => item.id !== id));
    }, dismissTime);
  }

  function closeToast(id: string): void {
    setToasts((previous) => previous.filter((item) => item.id !== id));
  }

  function clearAllFilters(): void {
    setEntryKind("Any");
    setMatchMode("Plain");
    setExtensionsRaw("");
    setExcludePathsRaw("");
    setMaxDepthUnlimited(true);
    setMaxDepth(3);
    setSizeFilterEnabled(false);
    setModifiedFilterEnabled(false);
    setCreatedFilterEnabled(false);
    setStrict(false);
    setIgnoreCase(true);
    setIncludeHidden(false);
    setLimitMode("500");
    setCustomLimit(500);
  }

  async function loadComputerRoots(): Promise<void> {
    if (!tauriRuntimeAvailable) return;
    try {
      const rootsFromFs = await fsListRoots();
      setComputerRoots(rootsFromFs);
      if (rootsFromFs.length > 0 && roots.length === 1 && roots[0]?.path === defaultRootPath) {
        const next = rootsFromFs[0].path;
        setPrimaryRoot(next);
        setRoots([{ path: next, enabled: true }]);
      }
    } catch {
      // keep UI usable without filesystem tree
    }
  }

  async function loadTreeChildren(path: string): Promise<void> {
    if (!tauriRuntimeAvailable) return;
    if (treeChildren[path]) return;
    try {
      const children = await fsListChildren(path);
      setTreeChildren((previous) => ({ ...previous, [path]: children }));
    } catch {
      setTreeChildren((previous) => ({ ...previous, [path]: [] }));
    }
  }

  async function refreshIndexStatus(): Promise<IndexStatusResponse | null> {
    if (!tauriRuntimeAvailable) return null;
    try {
      const snapshot = await indexStatus();
      setIndexStatusSnapshot(snapshot);
      return snapshot;
    } catch {
      setIndexHint(tr("app.index.statusUnavailable", "Index status недоступен"));
      return null;
    }
  }

  async function handleRebuildIndex(rootsForIndex: string[]): Promise<void> {
    if (!tauriRuntimeAvailable || rootsForIndex.length === 0) return;
    setIsRebuildingIndex(true);
    setIndexHint(tr("app.index.rebuilding", "Идёт перестроение индекса..."));
    try {
      const rebuilt = await indexRebuild(rootsForIndex);
      setIndexStatusSnapshot({
        status: rebuilt.entries > 0 ? "ready" : "empty",
        entries: rebuilt.entries,
        roots: rebuilt.roots,
        root_paths: rootsForIndex,
        updated_at: rebuilt.updated_at
      });
      setIndexHint(tr("app.index.rebuildDone", "Индекс обновлён"));
    } catch {
      setIndexHint(tr("app.index.rebuildFailed", "Не удалось перестроить индекс"));
    } finally {
      setIsRebuildingIndex(false);
    }
  }

  function scheduleResultsFlush(): void {
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
  }

  function handleToggleTreeExpand(path: string): void {
    setExpandedTree((previous) => {
      if (previous.includes(path)) {
        return previous.filter((item) => item !== path);
      }
      void loadTreeChildren(path);
      return previous.concat(path);
    });
  }

  function handleSelectTreeRoot(path: string): void {
    upsertRoot(path);
    setPrimaryRoot(path);
  }

  function handleRemoveRoot(path: string): void {
    setRoots((previous) => {
      const next = previous.filter((item) => item.path !== path);
      if (next.length === 0) {
        setPrimaryRoot(defaultRootPath);
        return [{ path: defaultRootPath, enabled: true }];
      }
      if (!next.some((item) => item.path === primaryRoot)) {
        setPrimaryRoot(next[0]?.path ?? defaultRootPath);
      }
      return next;
    });
  }

  async function refreshPersistenceData(): Promise<void> {
    if (!tauriRuntimeAvailable) return;
    try {
      const [favItems, historySnapshot, profileItems] = await Promise.all([
        favoritesList(),
        historyList(),
        profilesList()
      ]);
      setFavorites(favItems);
      setHistory(historySnapshot);
      setProfiles(profileItems);
    } catch {
      setStatus(tr("app.status.persistenceError", "Ошибка загрузки данных"));
    }
  }

  function buildCurrentRequest() {
    return buildSearchRequest({
      query,
      enabledRoots,
      primaryRoot,
      extensionsRaw,
      excludePathsRaw,
      maxDepthUnlimited,
      maxDepth,
      limit,
      strict,
      ignoreCase,
      includeHidden,
      entryKind,
      matchMode,
      sizeFilterEnabled,
      sizeComparison,
      sizeValue,
      sizeUnit,
      modifiedFilterEnabled,
      modifiedAfter,
      modifiedBefore,
      createdFilterEnabled,
      createdAfter,
      createdBefore,
      sortMode,
      searchBackend
    });
  }

  function applyProfile(profile: SearchProfile): void {
    const req = profile.request;
    setQuery(req.query);
    const profileRoots = req.roots.length > 0 ? req.roots.map((path) => ({ path, enabled: true })) : defaultRoots;
    setRoots(profileRoots);
    setPrimaryRoot(profileRoots[0]?.path ?? defaultRootPath);
    setExtensionsRaw(req.extensions.join(","));
    setExcludePathsRaw((req.exclude_paths ?? []).join(","));
    setStrict(req.options.strict);
    setIgnoreCase(req.options.ignore_case);
    setIncludeHidden(req.options.include_hidden);
    setEntryKind(req.options.entry_kind);
    setMatchMode(req.options.match_mode);
    setSortMode(req.options.sort_mode);
    setSearchBackend(req.options.search_backend ?? "Scan");
    setMaxDepthUnlimited(req.options.max_depth === null);
    setMaxDepth(req.options.max_depth ?? 3);
    if (req.options.limit === null) {
      setLimitMode("none");
    } else if (req.options.limit === 100) {
      setLimitMode("100");
    } else if (req.options.limit === 500) {
      setLimitMode("500");
    } else if (req.options.limit === 1000) {
      setLimitMode("1000");
    } else {
      setLimitMode("custom");
      setCustomLimit(req.options.limit);
    }
  }
  function tryIncrementalPlainSearch(nextRequest: SearchRequest): boolean {
    if (isSearching) return false;
    const previous = incrementalSearchRef.current;
    if (!previous) return false;
    if (!sameSearchContextWithoutQuery(previous.request, nextRequest)) return false;
    if (previous.request.options.match_mode !== "Plain" || nextRequest.options.match_mode !== "Plain") return false;
    if (previous.request.options.strict || nextRequest.options.strict) return false;

    const previousQuery = previous.request.query.trim();
    const nextQuery = nextRequest.query.trim();
    if (!previousQuery || !nextQuery || nextQuery.length <= previousQuery.length) return false;

    const normalize = (value: string) =>
      nextRequest.options.ignore_case ? value.toLocaleLowerCase() : value;
    if (!normalize(nextQuery).startsWith(normalize(previousQuery))) return false;

    const filtered = sortResultsForMode(
      filterPlainResults(previous.results, nextQuery, nextRequest.options.ignore_case),
      sortModeRef.current
    );
    incrementalSearchRef.current = { request: nextRequest, results: filtered };
    setResults(filtered);
    setSelectedPath((prev) => (prev && filtered.some((item) => item.full_path === prev) ? prev : null));
    setScrollTop(0);
    setStatus(tr("app.status.ready", "Готово"));
    setIsSearching(false);
    return true;
  }

  async function handleSearch(preparedRequest?: SearchRequest): Promise<void> {
    if (!tauriRuntimeAvailable) {
      setStatus(tr("app.status.tauriUnavailable", "Tauri runtime не обнаружен"));
      return;
    }
    const request = preparedRequest ?? buildCurrentRequest();
    setResults([]);
    setScrollTop(0);
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
    metadataLoadedPathsRef.current.clear();
    metadataInFlightPathsRef.current.clear();

    try {
      const response = await startSearch(request);
      setActiveSearchId(response.search_id);
    } catch (error) {
      setIsSearching(false);
      setSearchStartedAt(null);
      setElapsedMs(null);
      setTtfrMs(null);
      setStatus(tr("app.status.startError", "Ошибка запуска: {{error}}", { error: String(error) }));
      pushToast(tr("app.toast.searchStartFailed", "Не удалось запустить поиск"), "error");
    }
  }

  async function handleCancel(): Promise<void> {
    if (!tauriRuntimeAvailable) return;
    try {
      await cancelSearch();
      setStatus(tr("app.status.stopping", "Остановка..."));
    } catch {
      setStatus(tr("app.status.stopError", "Не удалось остановить поиск"));
    }
  }

  async function handleOpenPath(path: string): Promise<void> {
    if (!tauriRuntimeAvailable) return;
    try {
      await actionOpenPath(path);
      await refreshPersistenceData();
    } catch {
      pushToast(tr("app.toast.openFailed", "Не удалось открыть элемент"), "error");
    }
  }

  async function handleOpenParent(path: string): Promise<void> {
    if (!tauriRuntimeAvailable) return;
    try {
      await actionOpenParent(path);
      await refreshPersistenceData();
    } catch {
      pushToast(tr("app.toast.openParentFailed", "Не удалось открыть родительскую папку"), "error");
    }
  }

  async function handleRevealPath(path: string): Promise<void> {
    if (!tauriRuntimeAvailable) return;
    try {
      await actionRevealPath(path);
    } catch {
      pushToast(tr("app.toast.revealFailed", "Не удалось показать в проводнике"), "error");
    }
  }

  async function handleCopyPath(path: string): Promise<void> {
    if (!tauriRuntimeAvailable) return;
    try {
      await actionCopyToClipboard(path);
      pushToast(tr("app.toast.pathCopied", "Путь скопирован"), "success");
    } catch {
      pushToast(tr("app.toast.pathCopyFailed", "Не удалось скопировать путь"), "error");
    }
  }

  async function handleCopyName(name: string): Promise<void> {
    if (!tauriRuntimeAvailable) return;
    try {
      await actionCopyToClipboard(name);
      pushToast(tr("app.toast.nameCopied", "Имя скопировано"), "success");
    } catch {
      pushToast(tr("app.toast.nameCopyFailed", "Не удалось скопировать имя"), "error");
    }
  }

  function upsertRoot(path: string): void {
    const normalized = path.trim();
    if (!normalized) return;
    if (roots.some((root) => root.path === normalized)) return;
    setRoots((previous) => previous.concat({ path: normalized, enabled: true }));
  }

  async function handlePickRootPath(): Promise<void> {
    if (!tauriRuntimeAvailable) {
      setStatus(tr("app.status.tauriUnavailable", "Tauri runtime не обнаружен"));
      return;
    }
    try {
      const selected = await fsPickFolder();
      if (!selected) return;
      upsertRoot(selected);
      setPrimaryRoot(selected);
    } catch {
      pushToast(tr("app.toast.pickFolderFailed", "Не удалось выбрать папку"), "error");
    }
  }

  async function handleAddFavorite(path: string): Promise<void> {
    if (!tauriRuntimeAvailable) return;
    try {
      const updated = await favoritesAdd(path);
      setFavorites(updated);
      pushToast(tr("app.toast.favoriteAdded", "Добавлено в избранное"), "success");
    } catch {
      pushToast(tr("app.toast.favoriteAddFailed", "Не удалось добавить в избранное"), "error");
    }
  }

  async function handleRemoveFavorite(path: string): Promise<void> {
    if (!tauriRuntimeAvailable) return;
    try {
      await favoritesRemove(path);
      setFavorites((previous) => previous.filter((item) => item !== path));
    } catch {
      pushToast(tr("app.toast.favoriteRemoveFailed", "Не удалось удалить из избранного"), "error");
    }
  }

  async function handleSaveProfile(): Promise<void> {
    const name = newProfileName.trim();
    if (!name || !tauriRuntimeAvailable) return;
    try {
      await profilesSave({
        id: "",
        name,
        pinned: false,
        request: buildCurrentRequest()
      });
      setNewProfileName("");
      await refreshPersistenceData();
      pushToast(tr("app.toast.profileSaved", "Профиль сохранен"), "success");
    } catch {
      pushToast(tr("app.toast.profileSaveFailed", "Не удалось сохранить профиль"), "error");
    }
  }

  async function handleDeleteProfile(profileId: string): Promise<void> {
    if (!tauriRuntimeAvailable) return;
    try {
      await profilesDelete(profileId);
      setProfiles((previous) => previous.filter((item) => item.id !== profileId));
    } catch {
      pushToast(tr("app.toast.profileDeleteFailed", "Не удалось удалить профиль"), "error");
    }
  }

  async function handleClearHistory(): Promise<void> {
    if (!tauriRuntimeAvailable) return;
    try {
      const snapshot = await historyClear();
      setHistory(snapshot);
      pushToast(tr("app.toast.historyCleared", "История очищена"), "success");
    } catch {
      pushToast(tr("app.toast.historyClearFailed", "Не удалось очистить историю"), "error");
    }
  }

  function createCustomTheme(): void {
    const name = newThemeName.trim();
    if (!name) {
      pushToast(tr("app.toast.themeNameRequired", "Введите имя темы"), "info");
      return;
    }
    const id = `custom-${Date.now()}`;
    const theme: ThemePreset = {
      id,
      name,
      colors: {
        bg: newThemeBg,
        surface: tintHex(newThemeBg, 0.08),
        surfaceAlt: tintHex(newThemeBg, 0.16),
        border: darkenHex(newThemeBg, 0.18),
        text: newThemeText,
        muted: darkenHex(newThemeText, 0.25),
        accent: newThemeAccent,
        accentSoft: tintHex(newThemeAccent, 0.65)
      }
    };
    setCustomThemes((previous) => previous.concat(theme));
    setThemeId(id);
    setNewThemeName("");
  }

  useEffect(() => {
    localStorage.setItem("mia.theme", themeId);
  }, [themeId]);

  useEffect(() => {
    localStorage.setItem("mia.customThemes", JSON.stringify(customThemes));
  }, [customThemes]);

  useEffect(() => {
    localStorage.setItem("mia.regexEnabled", regexEnabled ? "true" : "false");
  }, [regexEnabled]);

  useEffect(() => {
    if (!regexEnabled && matchMode === "Regex") {
      setMatchMode("Plain");
    }
  }, [matchMode, regexEnabled]);

  useEffect(() => {
    localStorage.setItem("mia.indexTtlHours", String(indexTtlHours));
  }, [indexTtlHours]);

  useEffect(() => {
    localStorage.setItem("mia.indexCheckIntervalMinutes", String(indexCheckIntervalMinutes));
  }, [indexCheckIntervalMinutes]);

  useEffect(() => {
    applyThemeColors(activeTheme.colors);
  }, [activeTheme]);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    activeSearchIdRef.current = activeSearchId;
  }, [activeSearchId]);

  useEffect(() => {
    if (!isSearching) return;
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 500);
    return () => window.clearInterval(timer);
  }, [isSearching]);

  useEffect(() => {
    searchStartedAtRef.current = searchStartedAt;
  }, [searchStartedAt]);

  useEffect(() => {
    sortModeRef.current = sortMode;
    setResults((prev) => {
      const next = sortResultsForMode(prev, sortMode);
      if (incrementalSearchRef.current) {
        incrementalSearchRef.current = { ...incrementalSearchRef.current, results: next };
      }
      return next;
    });
  }, [sortMode]);

  useEffect(() => {
    void refreshPersistenceData();
  }, []);

  useEffect(() => {
    void loadComputerRoots();
  }, []);

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
  }, [indexCheckIntervalMs, indexRoots, indexTtlMs, isRebuildingIndex, isSearching, searchBackend, tr]);

  useEffect(() => {
    if (!tauriRuntimeAvailable) return;

    const unlisten: Array<() => void> = [];
    let mounted = true;

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
      if (searchStartedAtRef.current !== null && ttfrMs === null) {
        setTtfrMs(Date.now() - searchStartedAtRef.current);
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
      setStatus(renderSearchErrorStatus(payload.message, tr));
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
  }, [tr, ttfrMs]);

  useEffect(() => {
    if (!liveSearch) return;
    const request = buildCurrentRequest();
    if (!request.query.trim()) return;
    const adaptiveDebounce = computeAdaptiveDebounce(request, debounceMs);
    const timer = window.setTimeout(() => {
      if (tryIncrementalPlainSearch(request)) return;
      void handleSearch(request);
    }, adaptiveDebounce);
    return () => window.clearTimeout(timer);
  }, [
    debounceMs,
    liveSearch,
    query,
    searchBackend
  ]);

  useEffect(() => {
    if (!liveSearch) return;
    const request = buildCurrentRequest();
    if (!request.query.trim()) return;
    const timer = window.setTimeout(() => {
      void handleSearch(request);
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [
    createdAfter,
    createdBefore,
    createdFilterEnabled,
    debounceMs,
    entryKind,
    extensionsRaw,
    excludePathsRaw,
    ignoreCase,
    includeHidden,
    limit,
    liveSearch,
    matchMode,
    maxDepth,
    maxDepthUnlimited,
    modifiedAfter,
    modifiedBefore,
    modifiedFilterEnabled,
    regexEnabled,
    roots,
    sizeComparison,
    sizeFilterEnabled,
    sizeUnit,
    sizeValue,
    strict
  ]);

  useEffect(() => {
    if (!tauriRuntimeAvailable || isSearching || displayMode === "cards" || visibleRows.items.length === 0) return;

    const targetPaths = visibleRows.items
      .map((item) => item.full_path)
      .filter(
        (path) =>
          !metadataLoadedPathsRef.current.has(path) &&
          !metadataInFlightPathsRef.current.has(path)
      )
      .slice(0, 64);
    if (targetPaths.length === 0) return;

    const timer = window.setTimeout(() => {
      for (const path of targetPaths) {
        metadataInFlightPathsRef.current.add(path);
      }

      void searchEnrichMetadata(targetPaths)
        .then((patches) => {
          for (const path of targetPaths) {
            metadataLoadedPathsRef.current.add(path);
          }
          if (patches.length === 0) return;
          setResults((prev) => {
            const next = mergeMetadataIntoResults(prev, patches);
            if (incrementalSearchRef.current) {
              incrementalSearchRef.current = { ...incrementalSearchRef.current, results: next };
            }
            return next;
          });
        })
        .catch(() => {
          // metadata enrichment is best-effort
        })
        .finally(() => {
          for (const path of targetPaths) {
            metadataInFlightPathsRef.current.delete(path);
          }
        });
    }, 100);

    return () => {
      window.clearTimeout(timer);
    };
  }, [displayMode, isSearching, visibleRows.items]);

  useEffect(() => {
    if (!resultPaneRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.height;
      if (typeof next === "number" && next > 0) {
        setListHeight(next - 44);
      }
    });
    observer.observe(resultPaneRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      const dragging = document.body.dataset.dragPanel;
      if (!dragging) return;
      document.body.style.cursor = "col-resize";
      const viewportWidth = window.innerWidth;
      if (dragging === "left") {
        setLeftWidth(Math.max(200, Math.min(460, event.clientX - 8)));
      }
      if (dragging === "right") {
        setRightWidth(Math.max(220, Math.min(500, viewportWidth - event.clientX - 8)));
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
  }, []);

  useEffect(() => {
    const onClick = () => setContextMenu(null);
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  useEffect(
    () => () => {
      if (batchFlushFrameRef.current !== null) {
        window.cancelAnimationFrame(batchFlushFrameRef.current);
      }
      pendingCheckedDeltaRef.current = 0;
      bufferedBatchRef.current = [];
    },
    []
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const accel = event.ctrlKey || event.metaKey;

      if (accel && key === "k") {
        event.preventDefault();
        setPaletteOpen(true);
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
        if (searchBackend === "Index" && indexRoots.length > 0 && !isRebuildingIndex) {
          void handleRebuildIndex(indexRoots);
        }
        return;
      }
      if (key === "escape") {
        setPaletteOpen(false);
        setFiltersOpen(false);
        setContextMenu(null);
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
          setSelectedPath(nextItem.full_path);
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
  }, [indexRoots, isRebuildingIndex, results, searchBackend, selectedPath, selectedResult]);

  useEffect(() => {
    if (window.innerWidth < RESPONSIVE_BREAKPOINT) {
      setLeftVisible(false);
      setRightVisible(false);
    }
  }, []);

  const statusText = useMemo(() => {
    const effectiveElapsedMs =
      elapsedMs !== null ? elapsedMs : isSearching && searchStartedAt !== null ? nowMs - searchStartedAt : null;
    const elapsed =
      effectiveElapsedMs === null
        ? "-"
        : tr("app.status.elapsedSeconds", "{{value}} сек", { value: (effectiveElapsedMs / 1000).toFixed(2) });
    const throughput =
      effectiveElapsedMs && effectiveElapsedMs > 0
        ? `${(checkedPaths / Math.max(effectiveElapsedMs / 1000, 0.001)).toFixed(1)}/s`
        : "-";
    const ttfr =
      ttfrMs === null
        ? "-"
        : tr("app.status.elapsedSeconds", "{{value}} сек", { value: (ttfrMs / 1000).toFixed(2) });
    const warning = limitReached
      ? tr("app.status.limitWarning", "Показано только {{count}} результатов", { count: results.length })
      : "";
    return { elapsed, warning, ttfr, throughput, errors: String(searchErrorCount) };
  }, [checkedPaths, elapsedMs, isSearching, limitReached, nowMs, results.length, searchErrorCount, searchStartedAt, tr, ttfrMs]);
  return (
    <>
      <main className="app">
        <TopBar
          query={query}
          onQueryChange={setQuery}
          regexEnabled={regexEnabled}
          onClearQuery={() => setQuery("")}
          searchInputRef={searchInputRef}
          isSearching={isSearching}
          onSearch={() => void handleSearch()}
          onCancelSearch={() => void handleCancel()}
          matchMode={matchMode}
          onMatchModeChange={setMatchMode}
          entryKind={entryKind}
          onEntryKindChange={setEntryKind}
          ignoreCase={ignoreCase}
          onIgnoreCaseChange={setIgnoreCase}
          liveSearch={liveSearch}
          onLiveSearchChange={setLiveSearch}
          includeHidden={includeHidden}
          onIncludeHiddenChange={setIncludeHidden}
          extensionFilter={extensionsRaw}
          onExtensionFilterChange={setExtensionsRaw}
          onToggleFilters={() => setFiltersOpen((prev) => !prev)}
          themeId={themeId}
          onThemeChange={setThemeId}
          themeOptions={themeOptions}
          onOpenCommandPalette={() => setPaletteOpen(true)}
          onToggleSettings={() => setSettingsOpen((prev) => !prev)}
          onToggleLeftPanel={() => setLeftVisible((prev) => !prev)}
          onToggleRightPanel={() => setRightVisible((prev) => !prev)}
          tr={tr}
        />

        {isSearching ? (
          <div className="progress-line" title={tr("app.status.scanningProgress", "Проверено: {{count}}", { count: checkedPaths })} />
        ) : null}

        {filtersOpen ? (
          <FiltersPanel
            entryKind={entryKind}
            onEntryKindChange={setEntryKind}
            extensionsRaw={extensionsRaw}
            onExtensionsRawChange={setExtensionsRaw}
            excludePathsRaw={excludePathsRaw}
            onExcludePathsRawChange={setExcludePathsRaw}
            maxDepthUnlimited={maxDepthUnlimited}
            onMaxDepthUnlimitedChange={setMaxDepthUnlimited}
            maxDepth={maxDepth}
            onMaxDepthChange={setMaxDepth}
            sizeFilterEnabled={sizeFilterEnabled}
            onSizeFilterEnabledChange={setSizeFilterEnabled}
            sizeComparison={sizeComparison}
            onSizeComparisonChange={setSizeComparison}
            sizeValue={sizeValue}
            onSizeValueChange={setSizeValue}
            sizeUnit={sizeUnit}
            onSizeUnitChange={setSizeUnit}
            modifiedFilterEnabled={modifiedFilterEnabled}
            onModifiedFilterEnabledChange={setModifiedFilterEnabled}
            modifiedAfter={modifiedAfter}
            onModifiedAfterChange={setModifiedAfter}
            modifiedBefore={modifiedBefore}
            onModifiedBeforeChange={setModifiedBefore}
            createdFilterEnabled={createdFilterEnabled}
            onCreatedFilterEnabledChange={setCreatedFilterEnabled}
            createdAfter={createdAfter}
            onCreatedAfterChange={setCreatedAfter}
            createdBefore={createdBefore}
            onCreatedBeforeChange={setCreatedBefore}
            strict={strict}
            onStrictChange={setStrict}
            ignoreCase={ignoreCase}
            onIgnoreCaseChange={setIgnoreCase}
            includeHidden={includeHidden}
            onIncludeHiddenChange={setIncludeHidden}
            searchBackend={searchBackend}
            onSearchBackendChange={setSearchBackend}
            indexStatus={indexStatusSnapshot}
            indexUpdatedAtLabel={indexUpdatedAtLabel}
            isRebuildingIndex={isRebuildingIndex}
            onRebuildIndex={() => void handleRebuildIndex(indexRoots)}
            indexHint={indexHint}
            limitMode={limitMode}
            onLimitModeChange={setLimitMode}
            customLimit={customLimit}
            onCustomLimitChange={setCustomLimit}
            onApply={() => {
              setFiltersOpen(false);
              void handleSearch();
            }}
            onResetAll={clearAllFilters}
            tr={tr}
          />
        ) : null}

        {settingsOpen ? (
          <SettingsPanel
            language={language}
            onLanguageChange={(value) => void i18n.changeLanguage(value)}
            liveSearch={liveSearch}
            onLiveSearchChange={setLiveSearch}
            regexEnabled={regexEnabled}
            onRegexEnabledChange={setRegexEnabled}
            debounceMs={debounceMs}
            onDebounceMsChange={setDebounceMs}
            indexTtlHours={indexTtlHours}
            onIndexTtlHoursChange={setIndexTtlHours}
            indexCheckIntervalMinutes={indexCheckIntervalMinutes}
            onIndexCheckIntervalMinutesChange={setIndexCheckIntervalMinutes}
            newThemeName={newThemeName}
            onNewThemeNameChange={setNewThemeName}
            newThemeBg={newThemeBg}
            onNewThemeBgChange={setNewThemeBg}
            newThemeText={newThemeText}
            onNewThemeTextChange={setNewThemeText}
            newThemeAccent={newThemeAccent}
            onNewThemeAccentChange={setNewThemeAccent}
            onCreateCustomTheme={createCustomTheme}
            tr={tr}
          />
        ) : null}

        <section
          className="layout"
          style={{
            gridTemplateColumns: leftVisible
              ? rightVisible
                ? `${leftWidth}px 2px minmax(0, 1fr) 2px ${rightWidth}px`
                : `${leftWidth}px 2px minmax(0, 1fr)`
              : rightVisible
                ? `minmax(0, 1fr) 2px ${rightWidth}px`
                : "minmax(0, 1fr)"
          }}
        >
          {leftVisible ? (
            <LeftSidebar
              tr={tr}
              roots={roots}
              primaryRoot={primaryRoot}
              newProfileName={newProfileName}
              history={history}
              profiles={profiles}
              computerRoots={computerRoots}
              treeChildren={treeChildren}
              expandedTree={expandedTree}
              historyOpen={historyOpen}
              onToggleHistoryOpen={() => setHistoryOpen((prev) => !prev)}
              onToggleTreeExpand={handleToggleTreeExpand}
              onSelectTreeRoot={handleSelectTreeRoot}
              onPickRootPath={() => void handlePickRootPath()}
              onRemoveRoot={handleRemoveRoot}
              onRootEnabledChange={(path, enabled) =>
                setRoots((previous) =>
                  previous.map((item) => (item.path === path ? { ...item, enabled } : item))
                )
              }
              onRootContextMenu={setContextMenu}
              onNewProfileNameChange={setNewProfileName}
              onSaveProfile={() => void handleSaveProfile()}
              onApplyProfile={applyProfile}
              onDeleteProfile={(profileId) => void handleDeleteProfile(profileId)}
              onClearHistory={() => void handleClearHistory()}
              onSelectHistoryQuery={setQuery}
              onDropRootPath={upsertRoot}
            />
          ) : null}

          {leftVisible ? <div className="splitter" onMouseDown={() => { document.body.dataset.dragPanel = "left"; }} /> : null}
          <ResultsWorkspace
            containerRef={resultPaneRef}
            displayMode={displayMode}
            setDisplayMode={setDisplayMode}
            sortMode={sortMode}
            setSortMode={setSortMode}
            chips={chips}
            onClearAllFilters={clearAllFilters}
            results={results}
            selectedPath={selectedPath}
            onSelectPath={setSelectedPath}
            onResultContextMenu={(event, item) => {
              event.preventDefault();
              setContextMenu({ type: "result", x: event.clientX, y: event.clientY, item });
            }}
            scrollTop={scrollTop}
            setScrollTop={setScrollTop}
            listHeight={listHeight}
            visibleRows={visibleRows}
            formatBytes={formatBytes}
            formatDate={formatDate}
            t={tr}
          />

          {rightVisible ? <div className="splitter" onMouseDown={() => { document.body.dataset.dragPanel = "right"; }} /> : null}

          {rightVisible ? (
            <DetailsSidebar
              tr={tr}
              selectedResult={selectedResult}
              onCopyPath={(path) => void handleCopyPath(path)}
              onOpenPath={(path) => void handleOpenPath(path)}
              onOpenParent={(path) => void handleOpenParent(path)}
              onRevealPath={(path) => void handleRevealPath(path)}
              onAddFavorite={(path) => void handleAddFavorite(path)}
            />
          ) : null}
        </section>

        <StatusBar
          resultsCount={results.length}
          status={status}
          statusText={statusText}
          checkedPaths={checkedPaths}
          activeSearchId={activeSearchId}
          tr={tr}
        />

        <AppContextMenu
          contextMenu={contextMenu}
          onOpenPath={(path) => void handleOpenPath(path)}
          onOpenParent={(path) => void handleOpenParent(path)}
          onRevealPath={(path) => void handleRevealPath(path)}
          onCopyPath={(path) => void handleCopyPath(path)}
          onCopyName={(name) => void handleCopyName(name)}
          onAddFavorite={(path) => void handleAddFavorite(path)}
          onSetPrimaryRoot={setPrimaryRoot}
          onDeleteRoot={(path) => setRoots((previous) => previous.filter((item) => item.path !== path))}
          tr={tr}
        />
      </main>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} actions={commandActions} />
      <ToastHost items={toasts} onClose={closeToast} />
    </>
  );
}
