import type { TopBarProps } from "./props";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";
import { Switch } from "../../../components/ui/switch";

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
    <header className="topbar grid gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[0_10px_30px_rgba(0,0,0,0.12)] backdrop-blur-sm">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto_auto_auto_auto_auto_auto] items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={onToggleLeftPanel}
          title={tr("app.tooltips.leftPanel", "Левая панель")}
          aria-label={tr("app.tooltips.leftPanel", "Левая панель")}
          className="icon-btn text-base"
        >
          ☰
        </Button>
        <div className="relative min-w-0">
          <Input
            ref={searchInputRef}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={tr("app.search.placeholder", "Поиск файлов и папок...")}
            className="search-input pr-11"
          />
          {query ? (
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={onClearQuery}
              title={tr("app.tooltips.clear", "Очистить")}
              aria-label={tr("app.tooltips.clear", "Очистить")}
              className="icon-btn absolute right-1 top-1 h-8 w-8 text-sm"
            >
              ✕
            </Button>
          ) : null}
        </div>
        {isSearching ? (
          <Button variant="secondary" type="button" onClick={onCancelSearch} className="primary-btn whitespace-nowrap">
            {tr("app.actions.cancelSearch", "Отменить поиск")}
          </Button>
        ) : (
          <Button variant="default" type="button" onClick={onSearch} className="primary-btn whitespace-nowrap">
            {tr("app.actions.searchTop", "🔎 Поиск")}
          </Button>
        )}
        <div className="toggle flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] px-3 py-2">
          <Switch
            checked={liveSearch}
            onCheckedChange={onLiveSearchChange}
            title={tr("app.tooltips.liveSearch", "Live search")}
            aria-label={tr("app.labels.live", "Live")}
            className="toggle"
          />
          <span className="text-sm text-[var(--text)]">{tr("app.labels.live", "Live")}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={onToggleFilters}
          title={tr("app.tooltips.filters", "Фильтры")}
          className="icon-btn text-base"
        >
          ⏷
        </Button>
        <Select
          value={themeId}
          onChange={(event) => onThemeChange(event.target.value)}
          className="theme-select min-w-[11rem]"
          aria-label={tr("app.tooltips.theme", "Тема")}
        >
          {themeOptions.map((theme) => (
            <option value={theme.id} key={theme.id}>
              🎨 {theme.name}
            </option>
          ))}
        </Select>
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={onOpenCommandPalette}
          title={tr("app.tooltips.commandPalette", "Командная палитра")}
          aria-label={tr("app.tooltips.commandPalette", "Командная палитра")}
          className="icon-btn text-base"
        >
          ⌘K
        </Button>
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={onToggleSettings}
          title={tr("app.tooltips.settings", "Настройки")}
          aria-label={tr("app.tooltips.settings", "Настройки")}
          className="icon-btn text-base"
        >
          ⚙
        </Button>
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={onToggleRightPanel}
          title={tr("app.tooltips.rightPanel", "Правая панель")}
          aria-label={tr("app.tooltips.rightPanel", "Правая панель")}
          className="icon-btn text-base"
        >
          ⫸
        </Button>
      </div>
      <div className="min-w-0 pl-10 pr-1 text-[11px] leading-tight text-[var(--muted)]">
        {tr(
          "app.search.commandHints",
          "Команды: /wc *.rs  /re ^main.*\\.ts$  /plain текст  /files /folders  ext:rs,md  /case /nocase"
        )}
      </div>
    </header>
  );
}
