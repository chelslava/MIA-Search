import { useEffect, useMemo, useRef, useState } from "react";
import {
  actionCopyToClipboard,
  actionOpenPath,
  actionOpenParent,
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
  SortMode
} from "../shared/search-types";
import { CommandPalette, type CommandPaletteAction } from "../widgets/CommandPalette";
import { ToastHost, type ToastItem } from "../widgets/ToastHost";
import "./styles.css";

type RootItem = {
  path: string;
  enabled: boolean;
};

const defaultRoots: RootItem[] = [{ path: ".", enabled: true }];
const sizeUnitMultipliers: Record<string, number> = {
  B: 1,
  KB: 1024,
  MB: 1024 * 1024,
  GB: 1024 * 1024 * 1024,
  TB: 1024 * 1024 * 1024 * 1024
};

export function App() {
  const [query, setQuery] = useState("");
  const [roots, setRoots] = useState<RootItem[]>(defaultRoots);
  const [newRoot, setNewRoot] = useState("");
  const [strict, setStrict] = useState(false);
  const [ignoreCase, setIgnoreCase] = useState(true);
  const [includeHidden, setIncludeHidden] = useState(false);
  const [entryKind, setEntryKind] = useState<EntryKind>("Any");
  const [sortMode, setSortMode] = useState<SortMode>("Relevance");
  const [limit, setLimit] = useState(500);
  const [extensionsRaw, setExtensionsRaw] = useState("");
  const [sizeFilterEnabled, setSizeFilterEnabled] = useState(false);
  const [sizeComparison, setSizeComparison] = useState<"Smaller" | "Equal" | "Greater">("Greater");
  const [sizeValue, setSizeValue] = useState(1);
  const [sizeUnit, setSizeUnit] = useState<"B" | "KB" | "MB" | "GB" | "TB">("MB");
  const [createdAfter, setCreatedAfter] = useState("");
  const [createdBefore, setCreatedBefore] = useState("");
  const [modifiedAfter, setModifiedAfter] = useState("");
  const [modifiedBefore, setModifiedBefore] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [status, setStatus] = useState("Ожидание");
  const [activeSearchId, setActiveSearchId] = useState<number | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [searchStartedAt, setSearchStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [history, setHistory] = useState<HistorySnapshot>({ queries: [], opened_paths: [] });
  const [profiles, setProfiles] = useState<SearchProfile[]>([]);
  const [newProfileName, setNewProfileName] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const enabledRoots = useMemo(
    () => roots.filter((root) => root.enabled).map((root) => root.path.trim()).filter(Boolean),
    [roots]
  );
  const selectedResult = useMemo(
    () => results.find((item) => item.full_path === selectedPath) ?? null,
    [results, selectedPath]
  );
  const activeFilterChips = useMemo(() => {
    const chips: string[] = [];
    if (strict) chips.push("строгое совпадение");
    if (ignoreCase) chips.push("без учета регистра");
    if (includeHidden) chips.push("скрытые");
    if (extensionsRaw.trim()) chips.push(`расширения: ${extensionsRaw}`);
    if (sizeFilterEnabled) chips.push(`размер ${sizeComparison.toLowerCase()} ${sizeValue}${sizeUnit}`);
    if (createdAfter) chips.push("создано после");
    if (createdBefore) chips.push("создано до");
    if (modifiedAfter) chips.push("изменено после");
    if (modifiedBefore) chips.push("изменено до");
    chips.push(
      `тип: ${entryKind === "Any" ? "все" : entryKind === "File" ? "файлы" : "папки"}`
    );
    chips.push(`сортировка: ${sortMode.toLowerCase()}`);
    chips.push(`лимит: ${limit}`);
    return chips;
  }, [
    strict,
    ignoreCase,
    includeHidden,
    extensionsRaw,
    sizeFilterEnabled,
    sizeComparison,
    sizeValue,
    sizeUnit,
    createdAfter,
    createdBefore,
    modifiedAfter,
    modifiedBefore,
    entryKind,
    sortMode,
    limit
  ]);
  const commandActions = useMemo<CommandPaletteAction[]>(
    () => [
      { id: "search", label: "Запустить поиск", run: () => void handleSearch() },
      { id: "cancel", label: "Отменить поиск", run: () => void handleCancel() },
      { id: "focus", label: "Фокус в поле поиска", run: () => searchInputRef.current?.focus() },
      {
        id: "open",
        label: "Открыть выбранный результат",
        run: () => {
          if (selectedResult) void handleOpenPath(selectedResult.full_path);
        }
      },
      {
        id: "copy",
        label: "Скопировать выбранный путь",
        run: () => {
          if (selectedResult) void handleCopyPath(selectedResult.full_path);
        }
      },
      {
        id: "reveal",
        label: "Показать в проводнике",
        run: () => {
          if (selectedResult) void handleRevealPath(selectedResult.full_path);
        }
      },
      {
        id: "reset",
        label: "Сбросить фильтры",
        run: () => resetFilters()
      }
    ],
    [selectedResult]
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

  function resetFilters(): void {
    setStrict(false);
    setIgnoreCase(true);
    setIncludeHidden(false);
    setExtensionsRaw("");
    setSizeFilterEnabled(false);
    setCreatedAfter("");
    setCreatedBefore("");
    setModifiedAfter("");
    setModifiedBefore("");
    setEntryKind("Any");
    setSortMode("Relevance");
    setLimit(500);
    pushToast("Фильтры сброшены", "info");
  }

  const buildCurrentRequest = (): SearchRequest => ({
    query,
    roots: enabledRoots.length > 0 ? enabledRoots : ["."],
    extensions: extensionsRaw
      .split(",")
      .map((value) => value.trim().replace(/^\./, ""))
      .filter(Boolean),
    options: {
      max_depth: null,
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
      created_filter: createdAfter
        ? { field: "Created", comparison: "After", value: new Date(createdAfter).toISOString() }
        : createdBefore
          ? { field: "Created", comparison: "Before", value: new Date(createdBefore).toISOString() }
          : null,
      modified_filter: modifiedAfter
        ? { field: "Modified", comparison: "After", value: new Date(modifiedAfter).toISOString() }
        : modifiedBefore
          ? { field: "Modified", comparison: "Before", value: new Date(modifiedBefore).toISOString() }
          : null,
      sort_mode: sortMode
    }
  });

  async function refreshPersistenceData(): Promise<void> {
    if (!tauriRuntimeAvailable) {
      return;
    }
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
      setStatus("Не удалось загрузить сохраненные данные");
    }
  }

  function applyProfile(profile: SearchProfile): void {
    const req = profile.request;
    setQuery(req.query);
    setRoots(req.roots.length > 0 ? req.roots.map((path) => ({ path, enabled: true })) : defaultRoots);
    setExtensionsRaw(req.extensions.join(","));
    setStrict(req.options.strict);
    setIgnoreCase(req.options.ignore_case);
    setIncludeHidden(req.options.include_hidden);
    setEntryKind(req.options.entry_kind);
    setSortMode(req.options.sort_mode);
    setLimit(req.options.limit ?? 500);
  }

  useEffect(() => {
    if (!tauriRuntimeAvailable) {
      return;
    }

    const unlistenHandlers: Array<() => void> = [];
    let alive = true;

    Promise.all([
      onSearchBatch((payload) => {
        setResults((previous) => previous.concat(payload.results));
      }),
      onSearchDone((payload) => {
        setStatus(`Готово (${payload.total_results})`);
        setLimitReached(payload.limit_reached);
        setActiveSearchId(null);
        setIsSearching(false);
        if (searchStartedAt !== null) {
          setElapsedMs(Date.now() - searchStartedAt);
        }
        void refreshPersistenceData();
        pushToast(`Поиск завершен: ${payload.total_results}`, "success");
      }),
      onSearchCancelled((payload) => {
        setStatus(`Отменено (#${payload.search_id})`);
        setActiveSearchId(null);
        setIsSearching(false);
        if (searchStartedAt !== null) {
          setElapsedMs(Date.now() - searchStartedAt);
        }
        pushToast("Поиск отменен", "info");
      }),
      onSearchError((payload) => {
        setStatus(`Ошибка: ${payload.message}`);
        setActiveSearchId(null);
        setIsSearching(false);
        if (searchStartedAt !== null) {
          setElapsedMs(Date.now() - searchStartedAt);
        }
        pushToast(`Ошибка поиска: ${payload.message}`, "error");
      })
    ])
      .then((unlisteners) => {
        if (!alive) {
          unlisteners.forEach((unlisten) => unlisten());
          return;
        }
        unlistenHandlers.push(...unlisteners);
      })
      .catch(() => {
        setStatus("Не удалось подписаться на события");
      });

    return () => {
      alive = false;
      unlistenHandlers.forEach((unlisten) => unlisten());
    };
  }, [searchStartedAt]);

  useEffect(() => {
    void refreshPersistenceData();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

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
        if (paletteOpen) {
          event.preventDefault();
          setPaletteOpen(false);
          return;
        }
        if (query) {
          event.preventDefault();
          setQuery("");
        }
        return;
      }
      if (key === "enter" && selectedResult) {
        const target = event.target as HTMLElement | null;
        if (!target || target.tagName.toLowerCase() !== "input") {
          event.preventDefault();
          void handleOpenPath(selectedResult.full_path);
        }
        return;
      }
      if (accel && key === "c" && selectedResult) {
        const target = event.target as HTMLElement | null;
        if (!target || target.tagName.toLowerCase() !== "input") {
          event.preventDefault();
          void handleCopyPath(selectedResult.full_path);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [paletteOpen, query, selectedResult]);

  async function handleSearch(): Promise<void> {
    if (!tauriRuntimeAvailable) {
      setStatus("Tauri runtime не обнаружен");
      return;
    }

    const request: SearchRequest = buildCurrentRequest();

    setResults([]);
    setSelectedPath(null);
    setLimitReached(false);
    setStatus("Поиск...");
    setIsSearching(true);
    setSearchStartedAt(Date.now());
    setElapsedMs(null);

    try {
      const response = await startSearch(request);
      setActiveSearchId(response.search_id);
      setStatus(`Выполняется (#${response.search_id})`);
    } catch (error) {
      setStatus(`Ошибка запуска поиска: ${String(error)}`);
      setActiveSearchId(null);
      setIsSearching(false);
      pushToast("Не удалось запустить поиск", "error");
    }
  }

  async function handleCancel(): Promise<void> {
    if (!tauriRuntimeAvailable) {
      return;
    }
    try {
      await cancelSearch();
      setStatus("Отмена...");
      pushToast("Отмена поиска...", "info");
    } catch (error) {
      setStatus(`Ошибка отмены: ${String(error)}`);
      pushToast("Не удалось отменить поиск", "error");
    }
  }

  async function handleOpenPath(path: string): Promise<void> {
    if (!tauriRuntimeAvailable) {
      return;
    }
    try {
      await actionOpenPath(path);
      pushToast("Путь открыт", "success");
      await refreshPersistenceData();
    } catch {
      pushToast("Не удалось открыть путь", "error");
    }
  }

  async function handleCopyPath(path: string): Promise<void> {
    if (!tauriRuntimeAvailable) {
      return;
    }
    try {
      await actionCopyToClipboard(path);
      pushToast("Путь скопирован", "success");
    } catch {
      pushToast("Не удалось скопировать путь", "error");
    }
  }

  async function handleCopyName(name: string): Promise<void> {
    if (!tauriRuntimeAvailable) {
      return;
    }
    try {
      await actionCopyToClipboard(name);
      pushToast("Имя скопировано", "success");
    } catch {
      pushToast("Не удалось скопировать имя", "error");
    }
  }

  async function handleOpenParent(path: string): Promise<void> {
    if (!tauriRuntimeAvailable) {
      return;
    }
    try {
      await actionOpenParent(path);
      pushToast("Родительская папка открыта", "success");
      await refreshPersistenceData();
    } catch {
      pushToast("Не удалось открыть родительскую папку", "error");
    }
  }

  async function handleRevealPath(path: string): Promise<void> {
    if (!tauriRuntimeAvailable) {
      return;
    }
    try {
      await actionRevealPath(path);
      pushToast("Показано в проводнике", "success");
    } catch {
      pushToast("Не удалось показать в проводнике", "error");
    }
  }

  function handleAddRoot(): void {
    const path = newRoot.trim();
    if (!path) {
      return;
    }
    if (roots.some((root) => root.path === path)) {
      setNewRoot("");
      return;
    }
    setRoots((previous) => previous.concat({ path, enabled: true }));
    setNewRoot("");
  }

  async function handleAddFavorite(path: string): Promise<void> {
    if (!tauriRuntimeAvailable) {
      return;
    }
    try {
      const items = await favoritesAdd(path);
      setFavorites(items);
    } catch {
      setStatus("Не удалось добавить в избранное");
    }
  }

  async function handleRemoveFavorite(path: string): Promise<void> {
    if (!tauriRuntimeAvailable) {
      return;
    }
    try {
      await favoritesRemove(path);
      setFavorites((previous) => previous.filter((item) => item !== path));
    } catch {
      setStatus("Не удалось удалить из избранного");
    }
  }

  async function handleSaveProfile(): Promise<void> {
    const profileName = newProfileName.trim();
    if (!profileName || !tauriRuntimeAvailable) {
      return;
    }
    try {
      await profilesSave({
        id: "",
        name: profileName,
        pinned: false,
        request: buildCurrentRequest()
      });
      setNewProfileName("");
      await refreshPersistenceData();
    } catch {
      setStatus("Не удалось сохранить профиль");
    }
  }

  async function handleDeleteProfile(profileId: string): Promise<void> {
    if (!tauriRuntimeAvailable) {
      return;
    }
    try {
      await profilesDelete(profileId);
      setProfiles((previous) => previous.filter((profile) => profile.id !== profileId));
    } catch {
      setStatus("Не удалось удалить профиль");
    }
  }

  async function handleClearHistory(): Promise<void> {
    if (!tauriRuntimeAvailable) {
      return;
    }
    try {
      const snapshot = await historyClear();
      setHistory(snapshot);
    } catch {
      setStatus("Не удалось очистить историю");
    }
  }

  return (
    <>
      <main className="app-shell">
        <div className="top-panel">
          <div className="menu-bar">
            <span>Файл</span>
            <span>Правка</span>
            <span>Вид</span>
            <span>Поиск</span>
            <span>Закладки</span>
            <span>Сервис</span>
            <span>Справка</span>
          </div>
          <div className="toolbar-row">
            <input
              id="search-query"
              ref={searchInputRef}
              className="search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск файлов и папок"
            />
            <button type="button" className="button-primary" onClick={handleSearch}>
              Найти
            </button>
            <button type="button" className="button-secondary" onClick={handleCancel}>
              Отмена
            </button>
            <button type="button" className="button-secondary" onClick={resetFilters}>
              Сброс
            </button>
            <button type="button" className="button-secondary" onClick={() => setPaletteOpen(true)}>
              Палитра
            </button>
            <select
              className="mini-input"
              aria-label="search-scope"
              value={entryKind}
              onChange={(event) => setEntryKind(event.target.value as EntryKind)}
            >
              <option value="Any">Все</option>
              <option value="File">Файлы</option>
              <option value="Directory">Папки</option>
            </select>
            <select
              className="mini-input"
              aria-label="theme-select"
              value={theme}
              onChange={(event) => setTheme(event.target.value as "light" | "dark")}
            >
              <option value="dark">Темная</option>
              <option value="light">Светлая</option>
            </select>
          </div>

          <div className="toolbar-row compact-controls">
            <input
              className="search-input compact-input"
              value={extensionsRaw}
              onChange={(e) => setExtensionsRaw(e.target.value)}
              placeholder="расширения: rs,md,txt"
            />
            <select
              className="mini-input"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
            >
              <option value="Relevance">релевантность</option>
              <option value="Name">имя</option>
              <option value="Size">размер</option>
              <option value="Modified">дата изм.</option>
              <option value="Type">тип</option>
            </select>
            <input
              className="mini-input"
              type="number"
              min={1}
              value={limit}
              onChange={(e) => setLimit(Math.max(1, Number(e.target.value) || 1))}
              title="лимит"
            />
            <label className="compact-check">
              <input type="checkbox" checked={strict} onChange={(e) => setStrict(e.target.checked)} />
              строго
            </label>
            <label className="compact-check">
              <input type="checkbox" checked={ignoreCase} onChange={(e) => setIgnoreCase(e.target.checked)} />
              регистр
            </label>
            <label className="compact-check">
              <input
                type="checkbox"
                checked={includeHidden}
                onChange={(e) => setIncludeHidden(e.target.checked)}
              />
              скрытые
            </label>
          </div>

          <div className="toolbar-row compact-controls">
            <input
              className="search-input compact-input"
              value={newRoot}
              onChange={(event) => setNewRoot(event.target.value)}
              placeholder="Добавить корневой путь"
            />
            <button type="button" className="button-secondary" onClick={handleAddRoot}>
              Добавить корень
            </button>
            <input
              className="search-input compact-input"
              value={newProfileName}
              onChange={(event) => setNewProfileName(event.target.value)}
              placeholder="Имя профиля"
            />
            <button type="button" className="button-secondary" onClick={() => void handleSaveProfile()}>
              Сохранить профиль
            </button>
            <button type="button" className="button-secondary" onClick={() => void handleClearHistory()}>
              Очистить историю
            </button>
          </div>

          <div className="chip-row">
            {roots.map((root) => (
              <button
                key={root.path}
                type="button"
                className={`chip ${root.enabled ? "chip-active" : ""}`}
                onClick={() =>
                  setRoots((previous) =>
                    previous.map((item) => (item.path === root.path ? { ...item, enabled: !item.enabled } : item))
                  )
                }
              >
                {root.enabled ? "вкл" : "выкл"}: {root.path}
              </button>
            ))}
            {activeFilterChips.map((chip) => (
              <span className="chip chip-active" key={chip}>
                {chip}
              </span>
            ))}
          </div>
        </div>

        <div className="table-wrap" aria-label="Search results">
          <table className="results-table">
            <thead>
              <tr>
                <th>Имя</th>
                <th>Путь</th>
                <th>Тип</th>
                <th>Размер</th>
                <th>Изменен</th>
                <th>Корень</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {isSearching && results.length === 0 ? (
                <>
                  <tr>
                    <td colSpan={7}>
                      <div className="skeleton skeleton-row" />
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={7}>
                      <div className="skeleton skeleton-row" />
                    </td>
                  </tr>
                </>
              ) : null}
              {results.map((item) => (
                <tr
                  key={item.full_path}
                  className={selectedPath === item.full_path ? "row-selected" : ""}
                  onClick={() => setSelectedPath(item.full_path)}
                >
                  <td>{item.name || "—"}</td>
                  <td className="path-cell">{item.full_path}</td>
                  <td>{item.is_dir ? "Папка" : "Файл"}</td>
                  <td>{item.size ?? "—"}</td>
                  <td>{item.modified_at ?? "—"}</td>
                  <td>{item.source_root}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="mini-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleOpenPath(item.full_path);
                        }}
                      >
                        Открыть
                      </button>
                      <button
                        type="button"
                        className="mini-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleOpenParent(item.full_path);
                        }}
                      >
                        Родитель
                      </button>
                      <button
                        type="button"
                        className="mini-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleRevealPath(item.full_path);
                        }}
                      >
                        Показать
                      </button>
                      <button
                        type="button"
                        className="mini-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleCopyPath(item.full_path);
                        }}
                      >
                        Копия
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="status-bar">
          <span>Состояние: {status}</span>
          <span>Найдено: {results.length}</span>
          <span>Корней: {enabledRoots.length}</span>
          <span>ID поиска: {activeSearchId ?? "—"}</span>
          <span>Лимит: {limitReached ? "достигнут" : "не достигнут"}</span>
          <span>Время: {elapsedMs === null ? "—" : `${elapsedMs} мс`}</span>
          {selectedResult ? <span>Выбрано: {selectedResult.name || selectedResult.full_path}</span> : null}
        </div>
      </main>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} actions={commandActions} />
      <ToastHost items={toasts} onClose={closeToast} />
    </>
  );
}
