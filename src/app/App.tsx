
import { useEffect, useMemo, useRef, useState } from "react";
import {
  actionCopyToClipboard,
  actionOpenParent,
  actionOpenPath,
  actionRevealPath,
  cancelSearch,
  favoritesAdd,
  favoritesList,
  favoritesRemove,
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
  HistorySnapshot,
  SearchProfile,
  SearchRequest,
  SearchResultItem,
  SizeComparison,
  SortMode
} from "../shared/search-types";
import { CommandPalette, type CommandPaletteAction } from "../widgets/CommandPalette";
import { ToastHost, type ToastItem } from "../widgets/ToastHost";
import "./styles.css";

type RootItem = { path: string; enabled: boolean };
type DisplayMode = "table" | "compact" | "cards";
type ThemeColors = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
};
type ThemePreset = { id: string; name: string; colors: ThemeColors; builtIn?: boolean };
type ContextMenuState =
  | { type: "result"; x: number; y: number; item: SearchResultItem }
  | { type: "root"; x: number; y: number; path: string }
  | null;
type FilterChip = { id: string; label: string; remove: () => void };

const defaultRoots: RootItem[] = [{ path: ".", enabled: true }];
const rowHeight = 34;

const builtInThemes: ThemePreset[] = [
  {
    id: "light",
    name: "Светлая",
    builtIn: true,
    colors: {
      bg: "#ffffff",
      surface: "#f8fafc",
      surfaceAlt: "#eef2f7",
      border: "#d7dee8",
      text: "#11181C",
      muted: "#526173",
      accent: "#0F67FF",
      accentSoft: "#dce8ff"
    }
  },
  {
    id: "dark",
    name: "Темная",
    builtIn: true,
    colors: {
      bg: "#0F0F12",
      surface: "#171a21",
      surfaceAlt: "#1f2430",
      border: "#303846",
      text: "#EDEDED",
      muted: "#A3ADBC",
      accent: "#3B82F6",
      accentSoft: "#1e355d"
    }
  },
  {
    id: "sepia",
    name: "Сепия",
    builtIn: true,
    colors: {
      bg: "#FBF5E8",
      surface: "#f2e7d1",
      surfaceAlt: "#ead9bb",
      border: "#d4bea0",
      text: "#3A2C1F",
      muted: "#6f5841",
      accent: "#C37B2E",
      accentSoft: "#f2ddc4"
    }
  },
  {
    id: "aquamarine",
    name: "Аквамарин",
    builtIn: true,
    colors: {
      bg: "#EFF7F6",
      surface: "#e0f0ed",
      surfaceAlt: "#d2e8e4",
      border: "#b2d1cb",
      text: "#1E3B3A",
      muted: "#4f6f6d",
      accent: "#2D9C7C",
      accentSoft: "#c9ebe1"
    }
  },
  {
    id: "night-blue",
    name: "Ночная синь",
    builtIn: true,
    colors: {
      bg: "#111122",
      surface: "#171a31",
      surfaceAlt: "#1e2342",
      border: "#2c3460",
      text: "#E0E4F0",
      muted: "#98a3c3",
      accent: "#6C8EFF",
      accentSoft: "#283666"
    }
  }
];

function formatBytes(size: number | null): string {
  if (size === null || size < 0) return "";
  if (size < 1024) return `${size} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = size / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDate(dateValue: string | null): string {
  if (!dateValue) return "";
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString("ru-RU");
}

function tintHex(hex: string, ratio: number): string {
  const valid = /^#?[0-9A-Fa-f]{6}$/.test(hex);
  if (!valid) return "#808080";
  const normalized = hex.startsWith("#") ? hex.slice(1) : hex;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  const blend = (value: number) => Math.max(0, Math.min(255, Math.round(value + (255 - value) * ratio)));
  return `#${[blend(r), blend(g), blend(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function darkenHex(hex: string, ratio: number): string {
  const valid = /^#?[0-9A-Fa-f]{6}$/.test(hex);
  if (!valid) return "#303030";
  const normalized = hex.startsWith("#") ? hex.slice(1) : hex;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  const blend = (value: number) => Math.max(0, Math.min(255, Math.round(value * (1 - ratio))));
  return `#${[blend(r), blend(g), blend(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function applyThemeColors(colors: ThemeColors): void {
  const root = document.documentElement;
  root.style.setProperty("--bg", colors.bg);
  root.style.setProperty("--surface", colors.surface);
  root.style.setProperty("--surface-alt", colors.surfaceAlt);
  root.style.setProperty("--border", colors.border);
  root.style.setProperty("--text", colors.text);
  root.style.setProperty("--muted", colors.muted);
  root.style.setProperty("--accent", colors.accent);
  root.style.setProperty("--accent-soft", colors.accentSoft);
}

function toIsoOrNull(value: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function App() {
  const [query, setQuery] = useState("");
  const [roots, setRoots] = useState<RootItem[]>(defaultRoots);
  const [newRoot, setNewRoot] = useState("");
  const [primaryRoot, setPrimaryRoot] = useState(".");
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
  const [status, setStatus] = useState("Готово");
  const [activeSearchId, setActiveSearchId] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [checkedPaths, setCheckedPaths] = useState(0);
  const [searchStartedAt, setSearchStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [history, setHistory] = useState<HistorySnapshot>({ queries: [], opened_paths: [] });
  const [profiles, setProfiles] = useState<SearchProfile[]>([]);
  const [newProfileName, setNewProfileName] = useState("");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("table");
  const [leftVisible, setLeftVisible] = useState(true);
  const [rightVisible, setRightVisible] = useState(true);
  const [leftWidth, setLeftWidth] = useState(260);
  const [rightWidth, setRightWidth] = useState(280);
  const [liveSearch, setLiveSearch] = useState(true);
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
  const [language, setLanguage] = useState<"ru" | "en">("ru");
  const [listHeight, setListHeight] = useState(460);
  const [scrollTop, setScrollTop] = useState(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const resultPaneRef = useRef<HTMLDivElement | null>(null);
  const sizeUnitMultipliers: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3,
    TB: 1024 ** 4
  };

  const themeOptions = useMemo(() => {
    const systemTheme: ThemePreset = {
      id: "system",
      name: "Системная",
      colors: builtInThemes[0].colors,
      builtIn: true
    };
    return [systemTheme].concat(builtInThemes, customThemes);
  }, [customThemes]);

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
        label: entryKind === "File" ? "Только файлы" : "Только папки",
        remove: () => setEntryKind("Any")
      });
    }
    if (extensionsRaw.trim()) {
      items.push({ id: "ext", label: `Расширения: ${extensionsRaw}`, remove: () => setExtensionsRaw("") });
    }
    if (!maxDepthUnlimited) {
      items.push({ id: "depth", label: `Глубина: ${maxDepth}`, remove: () => setMaxDepthUnlimited(true) });
    }
    if (sizeFilterEnabled) {
      const signs: Record<SizeComparison, string> = { Greater: ">", Smaller: "<", Equal: "=" };
      items.push({
        id: "size",
        label: `Размер ${signs[sizeComparison]} ${sizeValue} ${sizeUnit}`,
        remove: () => setSizeFilterEnabled(false)
      });
    }
    if (modifiedFilterEnabled) {
      items.push({ id: "modified", label: "Дата изменения", remove: () => setModifiedFilterEnabled(false) });
    }
    if (createdFilterEnabled) {
      items.push({ id: "created", label: "Дата создания", remove: () => setCreatedFilterEnabled(false) });
    }
    if (strict) items.push({ id: "strict", label: "Строгий режим", remove: () => setStrict(false) });
    if (!ignoreCase) items.push({ id: "case", label: "С учетом регистра", remove: () => setIgnoreCase(true) });
    if (includeHidden) items.push({ id: "hidden", label: "Скрытые", remove: () => setIncludeHidden(false) });
    if (limit !== null) items.push({ id: "limit", label: `Лимит: ${limit}`, remove: () => setLimitMode("none") });
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
    strict
  ]);

  const visibleRows = useMemo(() => {
    const safeHeight = Math.max(200, listHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight));
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
      { id: "cmd-new", label: "> Новый поиск", run: () => void handleSearch() },
      { id: "cmd-clear-history", label: "> Очистить историю", run: () => void handleClearHistory() },
      {
        id: "cmd-theme",
        label: "> Переключить тему",
        run: () => setThemeId((prev) => (prev === "dark" ? "light" : "dark"))
      },
      { id: "cmd-focus", label: "/ Фокус в строку поиска", run: () => searchInputRef.current?.focus() },
      {
        id: "cmd-help",
        label: "? Горячие клавиши",
        run: () => pushToast("⌘K, ⌘F, Esc, F5, ↑/↓, Enter", "info")
      },
      ...profiles.map((profile) => ({
        id: `profile-${profile.id}`,
        label: `# ${profile.name}`,
        run: () => applyProfile(profile)
      }))
    ],
    [profiles]
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
      setStatus("Ошибка загрузки данных");
    }
  }

  function buildCurrentRequest(): SearchRequest {
    const createdAfterIso = createdFilterEnabled ? toIsoOrNull(createdAfter) : null;
    const createdBeforeIso = createdFilterEnabled ? toIsoOrNull(createdBefore) : null;
    const modifiedAfterIso = modifiedFilterEnabled ? toIsoOrNull(modifiedAfter) : null;
    const modifiedBeforeIso = modifiedFilterEnabled ? toIsoOrNull(modifiedBefore) : null;

    return {
      query,
      roots: enabledRoots.length > 0 ? enabledRoots : [primaryRoot || "."],
      extensions: extensionsRaw
        .split(",")
        .map((value) => value.trim().replace(/^\./, ""))
        .filter(Boolean),
      options: {
        max_depth: maxDepthUnlimited ? null : maxDepth,
        limit,
        strict,
        ignore_case: ignoreCase,
        include_hidden: includeHidden,
        entry_kind: entryKind,
        size_filter: sizeFilterEnabled
          ? {
              comparison: sizeComparison,
              bytes: Math.max(0, sizeValue) * sizeUnitMultipliers[sizeUnit]
            }
          : null,
        created_filter: createdAfterIso
          ? { field: "Created", comparison: "After", value: createdAfterIso }
          : createdBeforeIso
            ? { field: "Created", comparison: "Before", value: createdBeforeIso }
            : null,
        modified_filter: modifiedAfterIso
          ? { field: "Modified", comparison: "After", value: modifiedAfterIso }
          : modifiedBeforeIso
            ? { field: "Modified", comparison: "Before", value: modifiedBeforeIso }
            : null,
        sort_mode: sortMode
      }
    };
  }

  function applyProfile(profile: SearchProfile): void {
    const req = profile.request;
    setQuery(req.query);
    const profileRoots = req.roots.length > 0 ? req.roots.map((path) => ({ path, enabled: true })) : defaultRoots;
    setRoots(profileRoots);
    setPrimaryRoot(profileRoots[0]?.path ?? ".");
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
      setStatus("Tauri runtime не обнаружен");
      return;
    }
    setResults([]);
    setSelectedPath(null);
    setCheckedPaths(0);
    setLimitReached(false);
    setStatus("Сканирование...");
    setIsSearching(true);
    setSearchStartedAt(Date.now());
    setElapsedMs(null);

    try {
      const response = await startSearch(buildCurrentRequest());
      setActiveSearchId(response.search_id);
    } catch (error) {
      setIsSearching(false);
      setStatus(`Ошибка запуска: ${String(error)}`);
      pushToast("Не удалось запустить поиск", "error");
    }
  }

  async function handleCancel(): Promise<void> {
    if (!tauriRuntimeAvailable) return;
    try {
      await cancelSearch();
      setStatus("Остановка...");
    } catch {
      setStatus("Не удалось остановить поиск");
    }
  }

  async function handleOpenPath(path: string): Promise<void> {
    if (!tauriRuntimeAvailable) return;
    try {
      await actionOpenPath(path);
      await refreshPersistenceData();
    } catch {
      pushToast("Не удалось открыть элемент", "error");
    }
  }

  async function handleOpenParent(path: string): Promise<void> {
    if (!tauriRuntimeAvailable) return;
    try {
      await actionOpenParent(path);
      await refreshPersistenceData();
    } catch {
      pushToast("Не удалось открыть родительскую папку", "error");
    }
  }

  async function handleRevealPath(path: string): Promise<void> {
    if (!tauriRuntimeAvailable) return;
    try {
      await actionRevealPath(path);
    } catch {
      pushToast("Не удалось показать в проводнике", "error");
    }
  }

  async function handleCopyPath(path: string): Promise<void> {
    if (!tauriRuntimeAvailable) return;
    try {
      await actionCopyToClipboard(path);
      pushToast("Путь скопирован", "success");
    } catch {
      pushToast("Не удалось скопировать путь", "error");
    }
  }

  async function handleCopyName(name: string): Promise<void> {
    if (!tauriRuntimeAvailable) return;
    try {
      await actionCopyToClipboard(name);
      pushToast("Имя скопировано", "success");
    } catch {
      pushToast("Не удалось скопировать имя", "error");
    }
  }

  function upsertRoot(path: string): void {
    const normalized = path.trim();
    if (!normalized) return;
    if (roots.some((root) => root.path === normalized)) return;
    setRoots((previous) => previous.concat({ path: normalized, enabled: true }));
  }

  function handleAddRoot(): void {
    upsertRoot(newRoot);
    setNewRoot("");
  }

  async function handleAddFavorite(path: string): Promise<void> {
    if (!tauriRuntimeAvailable) return;
    try {
      const updated = await favoritesAdd(path);
      setFavorites(updated);
      pushToast("Добавлено в избранное", "success");
    } catch {
      pushToast("Не удалось добавить в избранное", "error");
    }
  }

  async function handleRemoveFavorite(path: string): Promise<void> {
    if (!tauriRuntimeAvailable) return;
    try {
      await favoritesRemove(path);
      setFavorites((previous) => previous.filter((item) => item !== path));
    } catch {
      pushToast("Не удалось удалить из избранного", "error");
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
      pushToast("Профиль сохранен", "success");
    } catch {
      pushToast("Не удалось сохранить профиль", "error");
    }
  }

  async function handleDeleteProfile(profileId: string): Promise<void> {
    if (!tauriRuntimeAvailable) return;
    try {
      await profilesDelete(profileId);
      setProfiles((previous) => previous.filter((item) => item.id !== profileId));
    } catch {
      pushToast("Не удалось удалить профиль", "error");
    }
  }

  async function handleClearHistory(): Promise<void> {
    if (!tauriRuntimeAvailable) return;
    try {
      const snapshot = await historyClear();
      setHistory(snapshot);
      pushToast("История очищена", "success");
    } catch {
      pushToast("Не удалось очистить историю", "error");
    }
  }

  function createCustomTheme(): void {
    const name = newThemeName.trim();
    if (!name) {
      pushToast("Введите имя темы", "info");
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
    applyThemeColors(activeTheme.colors);
  }, [activeTheme]);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    void refreshPersistenceData();
  }, []);

  useEffect(() => {
    if (!tauriRuntimeAvailable) return;

    const unlisten: Array<() => void> = [];
    let mounted = true;

    Promise.all([
      onSearchBatch((payload) => {
        setResults((prev) => prev.concat(payload.results));
        setCheckedPaths((prev) => prev + payload.results.length);
      }),
      onSearchDone((payload) => {
        setStatus("Готово");
        setLimitReached(payload.limit_reached);
        setIsSearching(false);
        setActiveSearchId(null);
        if (searchStartedAt !== null) {
          setElapsedMs(Date.now() - searchStartedAt);
        }
        void refreshPersistenceData();
      }),
      onSearchCancelled(() => {
        setStatus("Остановлено");
        setIsSearching(false);
        setActiveSearchId(null);
        if (searchStartedAt !== null) {
          setElapsedMs(Date.now() - searchStartedAt);
        }
      }),
      onSearchError((payload) => {
        setStatus(`Ошибка: ${payload.message}`);
        setIsSearching(false);
        setActiveSearchId(null);
        if (searchStartedAt !== null) {
          setElapsedMs(Date.now() - searchStartedAt);
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
      .catch(() => {
        setStatus("Ошибка подписки событий");
      });

    return () => {
      mounted = false;
      unlisten.forEach((fn) => fn());
    };
  }, [searchStartedAt]);

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
    const elapsed = elapsedMs === null ? "-" : `${(elapsedMs / 1000).toFixed(2)} сек`;
    const warning = limitReached ? `Показано только ${results.length} результатов` : "";
    return { elapsed, warning };
  }, [elapsedMs, limitReached, results.length]);
  return (
    <>
      <main className="app">
        <header className="topbar">
          <button className="icon-btn" type="button" onClick={() => setLeftVisible((prev) => !prev)} title="Левая панель">☰</button>
          <input
            ref={searchInputRef}
            className="search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск файлов и папок..."
          />
          {query ? <button className="icon-btn" type="button" onClick={() => setQuery("")} title="Очистить">✕</button> : null}
          {isSearching ? (
            <button className="primary-btn" type="button" onClick={() => void handleCancel()}>Отменить поиск</button>
          ) : (
            <button className="primary-btn" type="button" onClick={() => void handleSearch()}>🔎 Поиск</button>
          )}
          <label className="toggle" title="Live search">
            <input type="checkbox" checked={liveSearch} onChange={(event) => setLiveSearch(event.target.checked)} />
            <span>Live</span>
          </label>
          <button className="icon-btn" type="button" onClick={() => setFiltersOpen((prev) => !prev)} title="Фильтры">⏷</button>
          <select className="theme-select" value={themeId} onChange={(event) => setThemeId(event.target.value)}>
            {themeOptions.map((theme) => (
              <option value={theme.id} key={theme.id}>🎨 {theme.name}</option>
            ))}
          </select>
          <button className="icon-btn" type="button" onClick={() => setPaletteOpen(true)} title="Командная палитра">⌘K</button>
          <button className="icon-btn" type="button" onClick={() => setSettingsOpen((prev) => !prev)} title="Настройки">⚙</button>
          <button className="icon-btn" type="button" onClick={() => setRightVisible((prev) => !prev)} title="Правая панель">⫸</button>
        </header>

        {isSearching ? <div className="progress-line" /> : null}

        {filtersOpen ? (
          <section className="filters-panel" aria-label="Расширенные фильтры">
            <div className="filter-grid">
              <fieldset>
                <legend>Тип элементов</legend>
                <label><input type="radio" checked={entryKind === "Any"} onChange={() => setEntryKind("Any")} /> Файлы и папки</label>
                <label><input type="radio" checked={entryKind === "File"} onChange={() => setEntryKind("File")} /> Только файлы</label>
                <label><input type="radio" checked={entryKind === "Directory"} onChange={() => setEntryKind("Directory")} /> Только папки</label>
              </fieldset>
              <fieldset>
                <legend>Расширения</legend>
                <input value={extensionsRaw} onChange={(event) => setExtensionsRaw(event.target.value)} placeholder="rs, txt, md" />
                <small>Разделяйте значения запятыми</small>
              </fieldset>
              <fieldset>
                <legend>Глубина</legend>
                <label><input type="checkbox" checked={maxDepthUnlimited} onChange={(event) => setMaxDepthUnlimited(event.target.checked)} /> Без ограничений</label>
                <input type="range" min={0} max={10} value={maxDepth} disabled={maxDepthUnlimited} onChange={(event) => setMaxDepth(Number(event.target.value))} />
                <input type="number" min={0} max={10} value={maxDepth} disabled={maxDepthUnlimited} onChange={(event) => setMaxDepth(Number(event.target.value))} />
              </fieldset>
              <fieldset>
                <legend>Размер</legend>
                <label><input type="checkbox" checked={sizeFilterEnabled} onChange={(event) => setSizeFilterEnabled(event.target.checked)} /> Учитывать</label>
                <div className="inline-row">
                  <select value={sizeComparison} disabled={!sizeFilterEnabled} onChange={(event) => setSizeComparison(event.target.value as SizeComparison)}>
                    <option value="Greater">больше</option><option value="Smaller">меньше</option><option value="Equal">равно</option>
                  </select>
                  <input type="number" min={0} value={sizeValue} disabled={!sizeFilterEnabled} onChange={(event) => setSizeValue(Math.max(0, Number(event.target.value) || 0))} />
                  <select value={sizeUnit} disabled={!sizeFilterEnabled} onChange={(event) => setSizeUnit(event.target.value as "B" | "KB" | "MB" | "GB" | "TB")}>
                    <option value="B">B</option><option value="KB">KB</option><option value="MB">MB</option><option value="GB">GB</option><option value="TB">TB</option>
                  </select>
                </div>
              </fieldset>
              <fieldset>
                <legend>Дата изменения</legend>
                <label><input type="checkbox" checked={modifiedFilterEnabled} onChange={(event) => setModifiedFilterEnabled(event.target.checked)} /> Учитывать</label>
                <div className="inline-row">
                  <input type="datetime-local" disabled={!modifiedFilterEnabled} value={modifiedAfter} onChange={(event) => setModifiedAfter(event.target.value)} />
                  <input type="datetime-local" disabled={!modifiedFilterEnabled} value={modifiedBefore} onChange={(event) => setModifiedBefore(event.target.value)} />
                </div>
              </fieldset>
              <fieldset>
                <legend>Дата создания</legend>
                <label><input type="checkbox" checked={createdFilterEnabled} onChange={(event) => setCreatedFilterEnabled(event.target.checked)} /> Учитывать</label>
                <div className="inline-row">
                  <input type="datetime-local" disabled={!createdFilterEnabled} value={createdAfter} onChange={(event) => setCreatedAfter(event.target.value)} />
                  <input type="datetime-local" disabled={!createdFilterEnabled} value={createdBefore} onChange={(event) => setCreatedBefore(event.target.value)} />
                </div>
              </fieldset>
              <fieldset>
                <legend>Режимы</legend>
                <label><input type="checkbox" checked={strict} onChange={(event) => setStrict(event.target.checked)} /> Строгий режим</label>
                <label><input type="checkbox" checked={ignoreCase} onChange={(event) => setIgnoreCase(event.target.checked)} /> Игнорировать регистр</label>
                <label><input type="checkbox" checked={includeHidden} onChange={(event) => setIncludeHidden(event.target.checked)} /> Включать скрытые</label>
              </fieldset>
              <fieldset>
                <legend>Лимит результатов</legend>
                <label><input type="radio" checked={limitMode === "100"} onChange={() => setLimitMode("100")} /> 100</label>
                <label><input type="radio" checked={limitMode === "500"} onChange={() => setLimitMode("500")} /> 500</label>
                <label><input type="radio" checked={limitMode === "1000"} onChange={() => setLimitMode("1000")} /> 1000</label>
                <label><input type="radio" checked={limitMode === "custom"} onChange={() => setLimitMode("custom")} /> Пользовательский</label>
                <input type="number" min={1} disabled={limitMode !== "custom"} value={customLimit} onChange={(event) => setCustomLimit(Math.max(1, Number(event.target.value) || 1))} />
                <label><input type="radio" checked={limitMode === "none"} onChange={() => setLimitMode("none")} /> Без лимита</label>
              </fieldset>
            </div>
            <div className="filters-actions">
              <button className="primary-btn" type="button" onClick={() => { setFiltersOpen(false); void handleSearch(); }}>Применить</button>
              <button className="ghost-btn" type="button" onClick={clearAllFilters}>Сбросить все</button>
            </div>
          </section>
        ) : null}

        {settingsOpen ? (
          <section className="settings-panel" aria-label="Настройки">
            <div className="settings-grid">
              <div>
                <h4>Общие</h4>
                <label>Язык
                  <select value={language} onChange={(event) => setLanguage(event.target.value as "ru" | "en")}>
                    <option value="ru">Русский</option><option value="en">English</option>
                  </select>
                </label>
                <label>Live search по умолчанию
                  <input type="checkbox" checked={liveSearch} onChange={(event) => setLiveSearch(event.target.checked)} />
                </label>
                <label>Debounce (мс)
                  <input type="number" min={100} max={2000} value={debounceMs} onChange={(event) => setDebounceMs(Math.max(100, Number(event.target.value) || 300))} />
                </label>
              </div>
              <div>
                <h4>Пользовательская тема</h4>
                <input placeholder="Имя темы" value={newThemeName} onChange={(event) => setNewThemeName(event.target.value)} />
                <label>Фон <input type="color" value={newThemeBg} onChange={(event) => setNewThemeBg(event.target.value)} /></label>
                <label>Текст <input type="color" value={newThemeText} onChange={(event) => setNewThemeText(event.target.value)} /></label>
                <label>Акцент <input type="color" value={newThemeAccent} onChange={(event) => setNewThemeAccent(event.target.value)} /></label>
                <button className="primary-btn" type="button" onClick={createCustomTheme}>Создать тему</button>
              </div>
            </div>
          </section>
        ) : null}

        <section
          className="layout"
          style={{
            gridTemplateColumns: `${leftVisible ? `${leftWidth}px 6px` : "0px 0px"} 1fr ${rightVisible ? `6px ${rightWidth}px` : "0px 0px"}`
          }}
        >
          {leftVisible ? (
            <aside
              className="left-panel"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const text = event.dataTransfer.getData("text/plain") || event.dataTransfer.getData("text/uri-list");
                if (text) upsertRoot(text.replace("file://", "").trim());
              }}
            >
              <details open>
                <summary>Корневые пути</summary>
                <div className="section-block">
                  <strong>Основной: {primaryRoot}</strong>
                  <div className="inline-row">
                    <input value={newRoot} onChange={(event) => setNewRoot(event.target.value)} placeholder="Новый путь" />
                    <button type="button" onClick={handleAddRoot}>Добавить путь</button>
                  </div>
                  <ul className="list">
                    {roots.map((root) => (
                      <li
                        key={root.path}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          setContextMenu({ type: "root", x: event.clientX, y: event.clientY, path: root.path });
                        }}
                      >
                        <label>
                          <input
                            type="checkbox"
                            checked={root.enabled}
                            onChange={(event) =>
                              setRoots((previous) =>
                                previous.map((item) => (item.path === root.path ? { ...item, enabled: event.target.checked } : item))
                              )
                            }
                          />
                          <span>{root.path}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>

              <details open>
                <summary>Профили поиска</summary>
                <div className="section-block">
                  <div className="inline-row">
                    <input value={newProfileName} onChange={(event) => setNewProfileName(event.target.value)} placeholder="Имя профиля" />
                    <button type="button" onClick={() => void handleSaveProfile()}>Сохранить</button>
                  </div>
                  <ul className="list">
                    {profiles.map((profile) => (
                      <li key={profile.id}>
                        <button type="button" className="link-btn" onClick={() => applyProfile(profile)}>📁 {profile.name}</button>
                        <button type="button" className="x-btn" onClick={() => void handleDeleteProfile(profile.id)}>✕</button>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>

              <details open>
                <summary>Избранное</summary>
                <div className="section-block">
                  <ul className="list">
                    {favorites.map((path) => (
                      <li key={path}>
                        <button type="button" className="link-btn" onClick={() => void handleOpenPath(path)}>⭐ {path}</button>
                        <button type="button" className="x-btn" onClick={() => void handleRemoveFavorite(path)}>✕</button>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>

              <details open>
                <summary>История поиска</summary>
                <div className="section-block">
                  <button type="button" className="ghost-btn" onClick={() => void handleClearHistory()}>Очистить историю</button>
                  <ul className="list">
                    {history.queries.slice(0, 10).map((item, index) => (
                      <li key={`${item.query}-${index}`}>
                        <button type="button" className="link-btn" onClick={() => setQuery(item.query)}>{item.query || "(пустой запрос)"}</button>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            </aside>
          ) : null}

          {leftVisible ? <div className="splitter" onMouseDown={() => { document.body.dataset.dragPanel = "left"; }} /> : null}
          <section className="center-panel" ref={resultPaneRef}>
            <div className="center-toolbar">
              <div className="inline-row">
                <button className={displayMode === "table" ? "mode-btn active" : "mode-btn"} type="button" onClick={() => setDisplayMode("table")}>Таблица</button>
                <button className={displayMode === "compact" ? "mode-btn active" : "mode-btn"} type="button" onClick={() => setDisplayMode("compact")}>Компактно</button>
                <button className={displayMode === "cards" ? "mode-btn active" : "mode-btn"} type="button" onClick={() => setDisplayMode("cards")}>Карточки</button>
              </div>
              <div className="inline-row">
                <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
                  <option value="Relevance">По релевантности</option>
                  <option value="Name">По имени</option>
                  <option value="Size">По размеру</option>
                  <option value="Modified">По дате изменения</option>
                  <option value="Type">По типу</option>
                </select>
                {isSearching ? (
                  <button className="primary-btn" type="button" onClick={() => void handleCancel()}>Отменить поиск</button>
                ) : (
                  <button className="primary-btn" type="button" onClick={() => void handleSearch()}>Поиск</button>
                )}
              </div>
            </div>

            <div className="chips-row">
              {chips.map((chip) => (
                <button key={chip.id} className="chip" type="button" onClick={chip.remove}>{chip.label} ✕</button>
              ))}
              {chips.length > 0 ? <button className="ghost-btn" type="button" onClick={clearAllFilters}>Сбросить все фильтры</button> : null}
            </div>

            {displayMode === "cards" ? (
              <div className="cards-grid" onScroll={(event) => setScrollTop((event.target as HTMLDivElement).scrollTop)}>
                {results.map((item) => (
                  <article
                    key={item.full_path}
                    className={selectedPath === item.full_path ? "result-card selected" : "result-card"}
                    onClick={() => setSelectedPath(item.full_path)}
                  >
                    <div className="card-title">{item.is_dir ? "📁" : "📄"} {item.name || "Без имени"}</div>
                    <div className="card-path">{item.full_path}</div>
                    <div className="card-meta">{item.is_dir ? "Папка" : "Файл"} • {formatBytes(item.size) || "-"}</div>
                  </article>
                ))}
              </div>
            ) : (
              <div className={displayMode === "compact" ? "results-wrap compact" : "results-wrap"} onScroll={(event) => setScrollTop((event.target as HTMLDivElement).scrollTop)}>
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>Иконка</th>
                      <th>Имя</th>
                      <th>Полный путь</th>
                      <th>Размер</th>
                      <th>Дата изменения</th>
                      <th>Тип</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.topSpacer > 0 ? (
                      <tr>
                        <td colSpan={6} style={{ height: `${visibleRows.topSpacer}px`, padding: 0, borderBottom: "none" }} />
                      </tr>
                    ) : null}

                    {visibleRows.items.map((item) => (
                      <tr
                        data-path={item.full_path}
                        key={item.full_path}
                        className={selectedPath === item.full_path ? "selected" : ""}
                        onClick={() => setSelectedPath(item.full_path)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          setContextMenu({ type: "result", x: event.clientX, y: event.clientY, item });
                        }}
                      >
                        <td className={item.hidden ? "muted-40" : ""}>{item.is_dir ? "📁" : "📄"}</td>
                        <td className={item.is_dir ? "name-cell dir" : "name-cell"}>{item.name || "Без имени"}</td>
                        <td className="path-cell">{item.full_path}</td>
                        <td>{item.is_dir ? "" : formatBytes(item.size)}</td>
                        <td>{formatDate(item.modified_at)}</td>
                        <td>{item.is_dir ? "Папка" : "Файл"}</td>
                      </tr>
                    ))}

                    {visibleRows.bottomSpacer > 0 ? (
                      <tr>
                        <td colSpan={6} style={{ height: `${visibleRows.bottomSpacer}px`, padding: 0, borderBottom: "none" }} />
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {rightVisible ? <div className="splitter" onMouseDown={() => { document.body.dataset.dragPanel = "right"; }} /> : null}

          {rightVisible ? (
            <aside className="right-panel">
              <h3>Детали</h3>
              {selectedResult ? (
                <div className="detail-grid">
                  <div className="detail-icon">{selectedResult.is_dir ? "📁" : "📄"}</div>
                  <div><strong>{selectedResult.name || "Без имени"}</strong></div>
                  <label>Полный путь</label>
                  <div className="copy-row">
                    <span className="truncate">{selectedResult.full_path}</span>
                    <button type="button" onClick={() => void handleCopyPath(selectedResult.full_path)}>Копия</button>
                  </div>
                  <label>Размер</label>
                  <div>{selectedResult.is_dir ? "" : formatBytes(selectedResult.size)}</div>
                  <label>Дата создания</label>
                  <div>{formatDate(selectedResult.created_at)}</div>
                  <label>Дата изменения</label>
                  <div>{formatDate(selectedResult.modified_at)}</div>
                  <label>Скрытый</label>
                  <div>{selectedResult.hidden ? "Да" : "Нет"}</div>
                  <label>Корневой источник</label>
                  <div>{selectedResult.source_root}</div>
                  <div className="actions-stack">
                    <button type="button" onClick={() => void handleOpenPath(selectedResult.full_path)}>Открыть</button>
                    <button type="button" onClick={() => void handleOpenParent(selectedResult.full_path)}>Открыть родительскую папку</button>
                    <button type="button" onClick={() => void handleRevealPath(selectedResult.full_path)}>Показать в файловом менеджере</button>
                    <button type="button" onClick={() => void handleCopyPath(selectedResult.full_path)}>Копировать путь</button>
                    <button type="button" onClick={() => void handleAddFavorite(selectedResult.full_path)}>Добавить в избранное</button>
                  </div>
                </div>
              ) : (
                <p className="muted">Выберите элемент в списке результатов.</p>
              )}
            </aside>
          ) : null}
        </section>

        <footer className="statusbar">
          <span>Найдено: {results.length} элементов</span>
          <span>Статус: {status}</span>
          <span>Время: {statusText.elapsed}</span>
          {statusText.warning ? <span className="warning">▲ {statusText.warning}</span> : null}
          <span>Проверено: {checkedPaths}</span>
          <span>ID: {activeSearchId ?? "-"}</span>
        </footer>

        {contextMenu ? (
          <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} role="menu">
            {contextMenu.type === "result" ? (
              <>
                <button type="button" onClick={() => void handleOpenPath(contextMenu.item.full_path)}>Открыть</button>
                <button type="button" onClick={() => void handleOpenParent(contextMenu.item.full_path)}>Открыть родительскую папку</button>
                <button type="button" onClick={() => void handleRevealPath(contextMenu.item.full_path)}>Показать в файловом менеджере</button>
                <button type="button" onClick={() => void handleCopyPath(contextMenu.item.full_path)}>Копировать полный путь</button>
                <button type="button" onClick={() => void handleCopyName(contextMenu.item.name)}>Копировать имя</button>
                <button type="button" onClick={() => void handleAddFavorite(contextMenu.item.full_path)}>Добавить в избранное</button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setPrimaryRoot(contextMenu.path)}>Сделать основным</button>
                <button type="button" onClick={() => setRoots((previous) => previous.filter((item) => item.path !== contextMenu.path))}>Удалить</button>
              </>
            )}
          </div>
        ) : null}
      </main>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} actions={commandActions} />
      <ToastHost items={toasts} onClose={closeToast} />
    </>
  );
}
