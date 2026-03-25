import type { SettingsPanelProps } from "./props";

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
    <section className="settings-panel" aria-label={tr("app.settings.ariaLabel", "Настройки")}>
      <div className="settings-grid">
        <div>
          <h4>{tr("app.settings.general", "Общие")}</h4>
          <label>
            {tr("app.settings.language", "Язык")}
            <select value={language} onChange={(event) => onLanguageChange(event.target.value as SettingsPanelProps["language"]) }>
              <option value="ru">{tr("app.settings.language.ru", "Русский")}</option><option value="en">{tr("app.settings.language.en", "English")}</option>
            </select>
          </label>
          <label>
            {tr("app.settings.liveSearchDefault", "Live search по умолчанию")}
            <input type="checkbox" checked={liveSearch} onChange={(event) => onLiveSearchChange(event.target.checked)} />
          </label>
          <label>
            {tr("app.settings.debounce", "Debounce (мс)")}
            <input type="number" min={100} max={2000} value={debounceMs} onChange={(event) => onDebounceMsChange(Math.max(100, Number(event.target.value) || 300))} />
          </label>
        </div>
        <div>
          <h4>{tr("app.settings.customTheme", "Пользовательская тема")}</h4>
          <input placeholder={tr("app.settings.themeName.placeholder", "Имя темы")} value={newThemeName} onChange={(event) => onNewThemeNameChange(event.target.value)} />
          <label>{tr("app.settings.themeBg", "Фон")} <input type="color" value={newThemeBg} onChange={(event) => onNewThemeBgChange(event.target.value)} /></label>
          <label>{tr("app.settings.themeText", "Текст")} <input type="color" value={newThemeText} onChange={(event) => onNewThemeTextChange(event.target.value)} /></label>
          <label>{tr("app.settings.themeAccent", "Акцент")} <input type="color" value={newThemeAccent} onChange={(event) => onNewThemeAccentChange(event.target.value)} /></label>
          <button className="primary-btn" type="button" onClick={onCreateCustomTheme}>{tr("app.settings.createTheme", "Создать тему")}</button>
        </div>
      </div>
    </section>
  );
}
