import type { TopBarProps } from "./props";

export function TopBar({
  query,
  onQueryChange,
  onClearQuery,
  searchInputRef,
  isSearching,
  onSearch,
  onCancelSearch,
  liveSearch,
  onLiveSearchChange,
  onToggleFilters,
  themeId,
  onThemeChange,
  themeOptions,
  onOpenCommandPalette,
  onToggleSettings,
  onToggleLeftPanel,
  onToggleRightPanel,
  tr
}: TopBarProps) {
  return (
    <header className="topbar">
      <button className="icon-btn" type="button" onClick={onToggleLeftPanel} title={tr("app.tooltips.leftPanel", "Левая панель")}>☰</button>
      <input
        ref={searchInputRef}
        className="search-input"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={tr("app.search.placeholder", "Поиск файлов и папок...")}
      />
      {query ? (
        <button className="icon-btn" type="button" onClick={onClearQuery} title={tr("app.tooltips.clear", "Очистить")}>✕</button>
      ) : null}
      {isSearching ? (
        <button className="primary-btn" type="button" onClick={onCancelSearch}>
          {tr("app.actions.cancelSearch", "Отменить поиск")}
        </button>
      ) : (
        <button className="primary-btn" type="button" onClick={onSearch}>
          {tr("app.actions.searchTop", "🔎 Поиск")}
        </button>
      )}
      <label className="toggle" title={tr("app.tooltips.liveSearch", "Live search") }>
        <input type="checkbox" checked={liveSearch} onChange={(event) => onLiveSearchChange(event.target.checked)} />
        <span>{tr("app.labels.live", "Live")}</span>
      </label>
      <button className="icon-btn" type="button" onClick={onToggleFilters} title={tr("app.tooltips.filters", "Фильтры")}>⏷</button>
      <select className="theme-select" value={themeId} onChange={(event) => onThemeChange(event.target.value)}>
        {themeOptions.map((theme) => (
          <option value={theme.id} key={theme.id}>🎨 {theme.name}</option>
        ))}
      </select>
      <button className="icon-btn" type="button" onClick={onOpenCommandPalette} title={tr("app.tooltips.commandPalette", "Командная палитра")}>⌘K</button>
      <button className="icon-btn" type="button" onClick={onToggleSettings} title={tr("app.tooltips.settings", "Настройки")}>⚙</button>
      <button className="icon-btn" type="button" onClick={onToggleRightPanel} title={tr("app.tooltips.rightPanel", "Правая панель")}>⫸</button>
    </header>
  );
}
