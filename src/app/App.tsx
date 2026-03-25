
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
  onSearchBatch,
  onSearchCancelled,
  onSearchDone,
  onSearchError,
  profilesDelete,
  profilesList,
  profilesSave,
  startSearch,
  tauriRuntimeAvailable
} from "../shared/tauri-client";
import type {
  EntryKind,
  FsTreeNode,
  HistorySnapshot,
  SearchProfile,
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

function sortResultsForMode(items: SearchResultItem[], mode: SortMode): SearchResultItem[] {
  return [...items].sort((left, right) => compareSearchItems(left, right, mode));
}

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
  const [sortMode, setSortMode] = useState<SortMode>("Relevance");
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
  const [favorites, setFavorites] = useState<string[]>([]);
  const [history, setHistory] = useState<HistorySnapshot>({ queries: [], opened_paths: [] });
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

  const selectedResult = useMemo(
    () => results.find((item) => item.full_path === selectedPath) ?? null,
    [results, selectedPath]
  );

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
    [profiles, tr]
  );

  function pushToast(text: string, kind: ToastItem["kind"] = "info"): void {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((previous) => previous.concat({ id, text, kind }));
    window.setTimeout(() => {
      setToasts((previous) => previous.filter((item) => item.id !== id));
    }, 2400);
  }

  function closeToast(id: string): void {
    setToasts((previous) => previous.filter((item) => item.id !== id));
  }

  function clearAllFilters(): void {
    setEntryKind("Any");
    setExtensionsRaw("");
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
      maxDepthUnlimited,
      maxDepth,
      limit,
      strict,
      ignoreCase,
      includeHidden,
      entryKind,
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
      regexEnabled
    });
  }

  function applyProfile(profile: SearchProfile): void {
    const req = profile.request;
    setQuery(req.query);
    const profileRoots = req.roots.length > 0 ? req.roots.map((path) => ({ path, enabled: true })) : defaultRoots;
    setRoots(profileRoots);
    setPrimaryRoot(profileRoots[0]?.path ?? defaultRootPath);
    setExtensionsRaw(req.extensions.join(","));
    setStrict(req.options.strict);
    setIgnoreCase(req.options.ignore_case);
    setIncludeHidden(req.options.include_hidden);
    setEntryKind(req.options.entry_kind);
    setSortMode(req.options.sort_mode);
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
  async function handleSearch(): Promise<void> {
    if (!tauriRuntimeAvailable) {
      setStatus(tr("app.status.tauriUnavailable", "Tauri runtime не обнаружен"));
      return;
    }
    setResults([]);
    setScrollTop(0);
    setSelectedPath(null);
    setCheckedPaths(0);
    setLimitReached(false);
    setStatus(tr("app.status.scanning", "Сканирование..."));
    setIsSearching(true);
    setSearchStartedAt(Date.now());
    setElapsedMs(null);

    try {
      const response = await startSearch(buildCurrentRequest());
      setActiveSearchId(response.search_id);
    } catch (error) {
      setIsSearching(false);
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
    applyThemeColors(activeTheme.colors);
  }, [activeTheme]);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    activeSearchIdRef.current = activeSearchId;
  }, [activeSearchId]);

  useEffect(() => {
    searchStartedAtRef.current = searchStartedAt;
  }, [searchStartedAt]);

  useEffect(() => {
    sortModeRef.current = sortMode;
    setResults((prev) => sortResultsForMode(prev, sortMode));
  }, [sortMode]);

  useEffect(() => {
    void refreshPersistenceData();
  }, []);

  useEffect(() => {
    void loadComputerRoots();
  }, []);

  useEffect(() => {
    if (!tauriRuntimeAvailable) return;

    const unlisten: Array<() => void> = [];
    let mounted = true;

    Promise.all([
      onSearchBatch((payload) => {
        if (payload.search_id !== activeSearchIdRef.current) {
          return;
        }
        setResults((prev) => sortResultsForMode(prev.concat(payload.results), sortModeRef.current));
        setCheckedPaths((prev) => prev + payload.results.length);
      }),
      onSearchDone((payload) => {
        if (payload.search_id !== activeSearchIdRef.current) {
          return;
        }
        setStatus(tr("app.status.ready", "Готово"));
        setLimitReached(payload.limit_reached);
        setIsSearching(false);
        setActiveSearchId(null);
        if (searchStartedAtRef.current !== null) {
          setElapsedMs(Date.now() - searchStartedAtRef.current);
        }
        void refreshPersistenceData();
      }),
      onSearchCancelled((payload) => {
        if (payload.search_id !== activeSearchIdRef.current) {
          return;
        }
        setStatus(tr("app.status.stopped", "Остановлено"));
        setIsSearching(false);
        setActiveSearchId(null);
        if (searchStartedAtRef.current !== null) {
          setElapsedMs(Date.now() - searchStartedAtRef.current);
        }
      }),
      onSearchError((payload) => {
        if (payload.search_id !== activeSearchIdRef.current) {
          return;
        }
        setStatus(tr("app.status.error", "Ошибка: {{message}}", { message: payload.message }));
        setIsSearching(false);
        setActiveSearchId(null);
        if (searchStartedAtRef.current !== null) {
          setElapsedMs(Date.now() - searchStartedAtRef.current);
        }
      })
    ])
      .then((handlers) => {
        if (!mounted) {
          handlers.forEach((fn) => fn());
          return;
        }
        unlisten.push(...handlers);
      })
      .catch((error) => {
        setStatus(
          tr("app.status.eventsError", "Ошибка подписки событий: {{message}}", {
            message: String(error)
          })
        );
      });

    return () => {
      mounted = false;
      unlisten.forEach((fn) => fn());
    };
  }, [tr]);

  useEffect(() => {
    if (!liveSearch) return;
    const timer = window.setTimeout(() => {
      if (query.trim()) {
        void handleSearch();
      }
    }, Math.max(100, debounceMs));
    return () => window.clearTimeout(timer);
  }, [
    createdAfter,
    createdBefore,
    createdFilterEnabled,
    debounceMs,
    entryKind,
    extensionsRaw,
    ignoreCase,
    includeHidden,
    limit,
    liveSearch,
    maxDepth,
    maxDepthUnlimited,
    modifiedAfter,
    modifiedBefore,
    modifiedFilterEnabled,
    query,
    regexEnabled,
    roots,
    sizeComparison,
    sizeFilterEnabled,
    sizeUnit,
    sizeValue,
    sortMode,
    strict
  ]);

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
      if (key === "escape") {
        setPaletteOpen(false);
        setFiltersOpen(false);
        setContextMenu(null);
        return;
      }
      if (key === "arrowdown" || key === "arrowup") {
        const activeTag = (event.target as HTMLElement | null)?.tagName.toLowerCase();
        if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") return;
        if (results.length === 0) return;
        event.preventDefault();
        const currentIndex = selectedPath ? results.findIndex((item) => item.full_path === selectedPath) : -1;
        const delta = key === "arrowdown" ? 1 : -1;
        const nextIndex = Math.max(0, Math.min(results.length - 1, currentIndex + delta));
        const nextItem = results[nextIndex];
        if (nextItem) {
          setSelectedPath(nextItem.full_path);
          const row = document.querySelector<HTMLTableRowElement>(`tr[data-path="${CSS.escape(nextItem.full_path)}"]`);
          row?.scrollIntoView({ block: "nearest" });
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
  }, [results, selectedPath, selectedResult]);

  useEffect(() => {
    if (window.innerWidth < 1024) {
      setLeftVisible(false);
      setRightVisible(false);
    }
  }, []);

  const statusText = useMemo(() => {
    const elapsed =
      elapsedMs === null
        ? "-"
        : tr("app.status.elapsedSeconds", "{{value}} сек", { value: (elapsedMs / 1000).toFixed(2) });
    const warning = limitReached
      ? tr("app.status.limitWarning", "Показано только {{count}} результатов", { count: results.length })
      : "";
    return { elapsed, warning };
  }, [elapsedMs, limitReached, results.length, tr]);
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
          liveSearch={liveSearch}
          onLiveSearchChange={setLiveSearch}
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

        {isSearching ? <div className="progress-line" /> : null}

        {filtersOpen ? (
          <FiltersPanel
            entryKind={entryKind}
            onEntryKindChange={setEntryKind}
            extensionsRaw={extensionsRaw}
            onExtensionsRawChange={setExtensionsRaw}
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
            gridTemplateColumns: `${leftVisible ? `${leftWidth}px 2px` : "0px 0px"} 1fr ${rightVisible ? `2px ${rightWidth}px` : "0px 0px"}`
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
            isSearching={isSearching}
            onCancelSearch={() => void handleCancel()}
            onSearch={() => void handleSearch()}
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
