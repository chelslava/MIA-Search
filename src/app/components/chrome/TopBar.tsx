import { useMemo, useState } from "react";
import type { TopBarProps } from "./props";
import type { EntryKind } from "../../../shared/search-types";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";
import { Switch } from "../../../components/ui/switch";

export function TopBar({
  query,
  onQueryChange,
  regexEnabled,
  onClearQuery,
  searchInputRef,
  isSearching,
  onSearch,
  onCancelSearch,
  matchMode,
  onMatchModeChange,
  entryKind,
  onEntryKindChange,
  ignoreCase,
  onIgnoreCaseChange,
  liveSearch,
  onLiveSearchChange,
  includeHidden,
  onIncludeHiddenChange,
  extensionFilter,
  onExtensionFilterChange,
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
  const [activeHint, setActiveHint] = useState<string>("");

  const defaultHint = tr(
    "app.search.commandQuickHintDefault",
    "Быстрые переключатели: включайте режимы кнопками ниже"
  );

  const commandButtons = useMemo(
    () => [
      {
        id: "wc",
        label: tr("app.search.quickButtons.wc", "WC"),
        hint: tr("app.search.quickHints.wc", "Wildcard режим: * и ?"),
        active: matchMode === "Wildcard",
        onClick: () => onMatchModeChange("Wildcard"),
        disabled: false
      },
      {
        id: "re",
        label: tr("app.search.quickButtons.re", "RE"),
        hint: regexEnabled
          ? tr("app.search.quickHints.re", "Regex режим: регулярные выражения")
          : tr("app.search.quickHints.reDisabled", "Regex отключен в настройках"),
        active: matchMode === "Regex",
        onClick: () => onMatchModeChange("Regex"),
        disabled: !regexEnabled
      },
      {
        id: "plain",
        label: tr("app.search.quickButtons.plain", "PLAIN"),
        hint: tr("app.search.quickHints.plain", "Обычный текстовый поиск"),
        active: matchMode === "Plain",
        onClick: () => onMatchModeChange("Plain"),
        disabled: false
      },
      {
        id: "files",
        label: tr("app.search.quickButtons.files", "FILES"),
        hint: tr("app.search.quickHints.files", "Искать только файлы"),
        active: entryKind === "File",
        onClick: () => onEntryKindChange(entryKind === "File" ? "Any" : "File"),
        disabled: false
      },
      {
        id: "folders",
        label: tr("app.search.quickButtons.folders", "DIRS"),
        hint: tr("app.search.quickHints.folders", "Искать только папки"),
        active: entryKind === "Directory",
        onClick: () => onEntryKindChange(entryKind === "Directory" ? "Any" : "Directory"),
        disabled: false
      },
      {
        id: "case",
        label: tr("app.search.quickButtons.case", "Aa"),
        hint: tr("app.search.quickHints.case", "С учетом регистра"),
        active: !ignoreCase,
        onClick: () => onIgnoreCaseChange(!ignoreCase),
        disabled: false
      }
    ],
    [entryKind, ignoreCase, matchMode, onEntryKindChange, onIgnoreCaseChange, onMatchModeChange, regexEnabled, tr]
  );

  return (
    <header className="topbar grid gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] p-1.5">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto_auto_auto_auto_auto_auto] items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={onToggleLeftPanel}
          title={`${tr("app.tooltips.leftPanel", "Левая панель")} (${tr("app.tooltips.leftPanelHint", "Ctrl+B")})`}
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
            title={tr("app.tooltips.searchInputHint", "Ctrl+F - фокус, Enter - искать, F5 - обновить")}
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
              className="icon-btn absolute right-1 top-1 h-6 w-6 text-xs"
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
        <div className="toggle flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-alt)] px-2 py-1">
          <Switch
            checked={liveSearch}
            onCheckedChange={onLiveSearchChange}
            title={tr("app.tooltips.liveSearch", "Live search")}
            aria-label={tr("app.labels.live", "Live")}
            className="toggle"
          />
          <span className="text-xs text-[var(--text)]">{tr("app.labels.live", "Live")}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={onToggleFilters}
          title={`${tr("app.tooltips.filters", "Фильтры")} (${tr("app.tooltips.filtersHint", "Ctrl+Shift+F")})`}
          aria-label={tr("app.tooltips.filters", "Фильтры")}
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
          title={`${tr("app.tooltips.commandPalette", "Командная палитра")} (${tr("app.tooltips.commandPaletteHint", "Ctrl+K")})`}
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
          title={`${tr("app.tooltips.settings", "Настройки")} (${tr("app.tooltips.settingsHint", "Ctrl+,")})`}
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
          title={`${tr("app.tooltips.rightPanel", "Правая панель")} (${tr("app.tooltips.rightPanelHint", "Ctrl+Shift+B")})`}
          aria-label={tr("app.tooltips.rightPanel", "Правая панель")}
          className="icon-btn text-base"
        >
          ⫸
        </Button>
      </div>
      <div className="grid grid-cols-[auto_13rem_auto_minmax(0,1fr)] items-center gap-1 pl-8 pr-1">
        <div className="min-w-0 overflow-x-auto">
          <div className="flex min-w-max items-center gap-0.5">
            {commandButtons.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant={item.active ? "default" : "ghost"}
                size="sm"
                className={`h-5 rounded-sm border border-[var(--border)] bg-[var(--surface-alt)] px-1 text-[10px] leading-none ${item.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                onMouseEnter={() => setActiveHint(item.hint)}
                onFocus={() => setActiveHint(item.hint)}
                onMouseLeave={() => setActiveHint("")}
                onBlur={() => setActiveHint("")}
                onClick={item.onClick}
                disabled={item.disabled}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
        <Input
          value={extensionFilter}
          onChange={(event) => onExtensionFilterChange(event.target.value)}
          placeholder={tr("app.filters.extensions.placeholder", "rs, txt, md")}
          title={tr("app.search.extensionFilter", "Фильтр расширений")}
          className="h-6 px-1.5 text-[11px]"
        />
        <label className="inline-flex items-center gap-1 text-[11px] text-[var(--text)]">
          <input
            type="checkbox"
            checked={includeHidden}
            onChange={(event) => onIncludeHiddenChange(event.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--accent)]"
          />
          <span>{tr("app.filters.modes.hidden", "Включать скрытые")}</span>
        </label>
        <div className="truncate text-[10px] leading-tight text-[var(--muted)]">
          {activeHint || defaultHint}
        </div>
      </div>
    </header>
  );
}
