import type { SettingsPanelProps } from "./props";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";
import { Switch } from "../../../components/ui/switch";

export function SettingsPanel({
  language,
  onLanguageChange,
  liveSearch,
  onLiveSearchChange,
  regexEnabled,
  onRegexEnabledChange,
  debounceMs,
  onDebounceMsChange,
  indexTtlHours,
  onIndexTtlHoursChange,
  indexCheckIntervalMinutes,
  onIndexCheckIntervalMinutesChange,
  newThemeName,
  onNewThemeNameChange,
  newThemeBg,
  onNewThemeBgChange,
  newThemeText,
  onNewThemeTextChange,
  newThemeAccent,
  onNewThemeAccentChange,
  onCreateCustomTheme,
  tr
}: SettingsPanelProps) {
  return (
    <section
      className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-1.5"
      aria-label={tr("app.settings.ariaLabel", "Настройки")}
    >
      <div className="grid gap-1.5 lg:grid-cols-2">
        <div className="space-y-1.5">
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            {tr("app.settings.general", "Общие")}
          </h4>
          <label className="block space-y-1 text-[11px] font-medium text-[var(--text)]">
            <span>{tr("app.settings.language", "Язык")}</span>
            <Select
              value={language}
              onChange={(event) => onLanguageChange(event.target.value as SettingsPanelProps["language"])}
              className="w-full"
            >
              <option value="ru">{tr("app.settings.language.ru", "Русский")}</option>
              <option value="en">{tr("app.settings.language.en", "English")}</option>
            </Select>
          </label>
          <div className="flex items-center justify-between gap-1.5 rounded-sm border border-[var(--border)] bg-[var(--surface-alt)] px-1.5 py-1">
            <div className="space-y-0.5">
              <div className="text-[11px] font-medium text-[var(--text)]">
                {tr("app.settings.liveSearchDefault", "Live search по умолчанию")}
              </div>
            </div>
            <Switch
              checked={liveSearch}
              onCheckedChange={onLiveSearchChange}
              aria-label={tr("app.settings.liveSearchDefault", "Live search по умолчанию")}
            />
          </div>
          <div className="flex items-center justify-between gap-1.5 rounded-sm border border-[var(--border)] bg-[var(--surface-alt)] px-1.5 py-1">
            <div className="space-y-0.5">
              <div className="text-[11px] font-medium text-[var(--text)]">
                {tr("app.settings.regexEnabled", "Включить regex")}
              </div>
            </div>
            <Switch
              checked={regexEnabled}
              onCheckedChange={onRegexEnabledChange}
              aria-label={tr("app.settings.regexEnabled", "Включить regex")}
            />
          </div>
          <label className="block space-y-1 text-[11px] font-medium text-[var(--text)]">
            <span>{tr("app.settings.debounce", "Debounce (мс)")}</span>
            <Input
              type="number"
              min={100}
              max={2000}
              value={debounceMs}
              onChange={(event) => onDebounceMsChange(Math.max(100, Number(event.target.value) || 300))}
              className="w-full"
            />
          </label>
          <label className="block space-y-1 text-[11px] font-medium text-[var(--text)]">
            <span>{tr("app.settings.indexTtlHours", "TTL авто-индекса (часы)")}</span>
            <Input
              type="number"
              min={1}
              max={168}
              value={indexTtlHours}
              onChange={(event) =>
                onIndexTtlHoursChange(Math.max(1, Math.min(168, Number(event.target.value) || 6)))
              }
              className="w-full"
            />
          </label>
          <label className="block space-y-1 text-[11px] font-medium text-[var(--text)]">
            <span>{tr("app.settings.indexCheckIntervalMinutes", "Проверка индекса (мин)")}</span>
            <Input
              type="number"
              min={1}
              max={120}
              value={indexCheckIntervalMinutes}
              onChange={(event) =>
                onIndexCheckIntervalMinutesChange(
                  Math.max(1, Math.min(120, Number(event.target.value) || 15))
                )
              }
              className="w-full"
            />
          </label>
        </div>
        <div className="space-y-1.5">
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            {tr("app.settings.customTheme", "Пользовательская тема")}
          </h4>
          <label className="block space-y-1 text-[11px] font-medium text-[var(--text)]">
            <span>{tr("app.settings.themeName.placeholder", "Имя темы")}</span>
            <Input
              placeholder={tr("app.settings.themeName.placeholder", "Имя темы")}
              value={newThemeName}
              onChange={(event) => onNewThemeNameChange(event.target.value)}
            />
          </label>
          <div className="grid gap-1.5 sm:grid-cols-3">
            <label className="flex items-center justify-between gap-1.5 rounded-sm border border-[var(--border)] bg-[var(--surface-alt)] px-1.5 py-1 text-[11px] font-medium text-[var(--text)]">
              <span>{tr("app.settings.themeBg", "Фон")}</span>
              <Input
                type="color"
                value={newThemeBg}
                onChange={(event) => onNewThemeBgChange(event.target.value)}
                aria-label={tr("app.settings.themeBg", "Фон")}
                className="h-7 w-11 cursor-pointer p-1"
              />
            </label>
            <label className="flex items-center justify-between gap-1.5 rounded-sm border border-[var(--border)] bg-[var(--surface-alt)] px-1.5 py-1 text-[11px] font-medium text-[var(--text)]">
              <span>{tr("app.settings.themeText", "Текст")}</span>
              <Input
                type="color"
                value={newThemeText}
                onChange={(event) => onNewThemeTextChange(event.target.value)}
                aria-label={tr("app.settings.themeText", "Текст")}
                className="h-7 w-11 cursor-pointer p-1"
              />
            </label>
            <label className="flex items-center justify-between gap-1.5 rounded-sm border border-[var(--border)] bg-[var(--surface-alt)] px-1.5 py-1 text-[11px] font-medium text-[var(--text)]">
              <span>{tr("app.settings.themeAccent", "Акцент")}</span>
              <Input
                type="color"
                value={newThemeAccent}
                onChange={(event) => onNewThemeAccentChange(event.target.value)}
                aria-label={tr("app.settings.themeAccent", "Акцент")}
                className="h-7 w-11 cursor-pointer p-1"
              />
            </label>
          </div>
          <Button type="button" onClick={onCreateCustomTheme} className="h-7 w-full px-2 text-[11px] sm:w-auto">
            {tr("app.settings.createTheme", "Создать тему")}
          </Button>
        </div>
      </div>
    </section>
  );
}
