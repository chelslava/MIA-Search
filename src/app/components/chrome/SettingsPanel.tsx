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
  debounceMs,
  onDebounceMsChange,
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
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.12)] backdrop-blur-sm"
      aria-label={tr("app.settings.ariaLabel", "Настройки")}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            {tr("app.settings.general", "Общие")}
          </h4>
          <label className="block space-y-2 text-sm font-medium text-[var(--text)]">
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
          <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] px-3 py-2">
            <div className="space-y-1">
              <div className="text-sm font-medium text-[var(--text)]">
                {tr("app.settings.liveSearchDefault", "Live search по умолчанию")}
              </div>
            </div>
            <Switch
              checked={liveSearch}
              onCheckedChange={onLiveSearchChange}
              aria-label={tr("app.settings.liveSearchDefault", "Live search по умолчанию")}
            />
          </div>
          <label className="block space-y-2 text-sm font-medium text-[var(--text)]">
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
        </div>
        <div className="space-y-4">
          <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            {tr("app.settings.customTheme", "Пользовательская тема")}
          </h4>
          <label className="block space-y-2 text-sm font-medium text-[var(--text)]">
            <span>{tr("app.settings.themeName.placeholder", "Имя темы")}</span>
            <Input
              placeholder={tr("app.settings.themeName.placeholder", "Имя темы")}
              value={newThemeName}
              onChange={(event) => onNewThemeNameChange(event.target.value)}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] px-3 py-2 text-sm font-medium text-[var(--text)]">
              <span>{tr("app.settings.themeBg", "Фон")}</span>
              <Input
                type="color"
                value={newThemeBg}
                onChange={(event) => onNewThemeBgChange(event.target.value)}
                aria-label={tr("app.settings.themeBg", "Фон")}
                className="h-10 w-14 cursor-pointer p-1"
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] px-3 py-2 text-sm font-medium text-[var(--text)]">
              <span>{tr("app.settings.themeText", "Текст")}</span>
              <Input
                type="color"
                value={newThemeText}
                onChange={(event) => onNewThemeTextChange(event.target.value)}
                aria-label={tr("app.settings.themeText", "Текст")}
                className="h-10 w-14 cursor-pointer p-1"
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] px-3 py-2 text-sm font-medium text-[var(--text)]">
              <span>{tr("app.settings.themeAccent", "Акцент")}</span>
              <Input
                type="color"
                value={newThemeAccent}
                onChange={(event) => onNewThemeAccentChange(event.target.value)}
                aria-label={tr("app.settings.themeAccent", "Акцент")}
                className="h-10 w-14 cursor-pointer p-1"
              />
            </label>
          </div>
          <Button type="button" onClick={onCreateCustomTheme} className="w-full sm:w-auto">
            {tr("app.settings.createTheme", "Создать тему")}
          </Button>
        </div>
      </div>
    </section>
  );
}
