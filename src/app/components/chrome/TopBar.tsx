import { useMemo, useState } from "react";
import type { TopBarProps } from "./props";
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
  const [activeHint, setActiveHint] = useState<string>("");

  const defaultHint = tr(
    "app.search.commandQuickHintDefault",
    "Быстрые команды: вставьте токен кнопкой и сразу ищите"
  );

  function normalizeSpaces(value: string): string {
    return value.replace(/\s+/g, " ").trim();
  }

  function addToken(token: string): void {
    const current = normalizeSpaces(query);
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const tokenRegex = new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`, "i");
    if (tokenRegex.test(current)) {
      searchInputRef.current?.focus();
      return;
    }
    onQueryChange(current ? `${current} ${token}` : token);
    searchInputRef.current?.focus();
  }

  function setModeToken(token: string): void {
    const current = normalizeSpaces(query);
    const cleared = normalizeSpaces(
      current.replace(/(^|\s)(\/re|\/regex|\/wc|\/wildcard|\/plain)\b/gi, " ")
    );
    onQueryChange(cleared ? `${cleared} ${token}` : token);
    searchInputRef.current?.focus();
  }

  const commandButtons = useMemo(
    () => [
      {
        id: "wc",
        label: tr("app.search.quickButtons.wc", "WC"),
        hint: tr("app.search.quickHints.wc", "Wildcard режим: * и ?"),
        onClick: () => setModeToken("/wc"),
        disabled: false
      },
      {
        id: "re",
        label: tr("app.search.quickButtons.re", "RE"),
        hint: regexEnabled
          ? tr("app.search.quickHints.re", "Regex режим: регулярные выражения")
          : tr("app.search.quickHints.reDisabled", "Regex отключен в настройках"),
        onClick: () => setModeToken("/re"),
        disabled: !regexEnabled
      },
      {
        id: "plain",
        label: tr("app.search.quickButtons.plain", "PLAIN"),
        hint: tr("app.search.quickHints.plain", "Обычный текстовый поиск"),
        onClick: () => setModeToken("/plain"),
        disabled: false
      },
      {
        id: "files",
        label: tr("app.search.quickButtons.files", "FILES"),
        hint: tr("app.search.quickHints.files", "Искать только файлы"),
        onClick: () => addToken("/files"),
        disabled: false
      },
      {
        id: "folders",
        label: tr("app.search.quickButtons.folders", "DIRS"),
        hint: tr("app.search.quickHints.folders", "Искать только папки"),
        onClick: () => addToken("/folders"),
        disabled: false
      },
      {
        id: "case",
        label: tr("app.search.quickButtons.case", "Aa"),
        hint: tr("app.search.quickHints.case", "С учетом регистра"),
        onClick: () => addToken("/case"),
        disabled: false
      }
    ],
    [query, regexEnabled, tr]
  );

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
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 pl-10 pr-1">
        <div className="min-w-0 overflow-x-auto">
          <div className="flex min-w-max items-center gap-1">
            {commandButtons.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="ghost"
                size="sm"
                className="h-5 rounded-md border border-[var(--border)] bg-[var(--surface-alt)] px-1.5 text-[10px] leading-none"
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
        <div className="truncate text-[10px] leading-tight text-[var(--muted)]">
          {activeHint || defaultHint}
        </div>
      </div>
    </header>
  );
}
