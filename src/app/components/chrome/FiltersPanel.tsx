import type { EntryKind } from "../../../shared/search-types";
import type { FiltersPanelProps } from "./props";

export function FiltersPanel({
  entryKind,
  onEntryKindChange,
  extensionsRaw,
  onExtensionsRawChange,
  maxDepthUnlimited,
  onMaxDepthUnlimitedChange,
  maxDepth,
  onMaxDepthChange,
  sizeFilterEnabled,
  onSizeFilterEnabledChange,
  sizeComparison,
  onSizeComparisonChange,
  sizeValue,
  onSizeValueChange,
  sizeUnit,
  onSizeUnitChange,
  modifiedFilterEnabled,
  onModifiedFilterEnabledChange,
  modifiedAfter,
  onModifiedAfterChange,
  modifiedBefore,
  onModifiedBeforeChange,
  createdFilterEnabled,
  onCreatedFilterEnabledChange,
  createdAfter,
  onCreatedAfterChange,
  createdBefore,
  onCreatedBeforeChange,
  strict,
  onStrictChange,
  ignoreCase,
  onIgnoreCaseChange,
  includeHidden,
  onIncludeHiddenChange,
  limitMode,
  onLimitModeChange,
  customLimit,
  onCustomLimitChange,
  onApply,
  onResetAll,
  tr
}: FiltersPanelProps) {
  const setEntryKind = (value: EntryKind) => onEntryKindChange(value);

  return (
    <section className="filters-panel" aria-label={tr("app.filters.ariaLabel", "Расширенные фильтры")}>
      <div className="filter-grid">
        <fieldset>
          <legend>{tr("app.filters.kind.legend", "Тип элементов")}</legend>
          <label><input type="radio" checked={entryKind === "Any"} onChange={() => setEntryKind("Any")} /> {tr("app.filters.kind.any", "Файлы и папки")}</label>
          <label><input type="radio" checked={entryKind === "File"} onChange={() => setEntryKind("File")} /> {tr("app.filters.kind.file", "Только файлы")}</label>
          <label><input type="radio" checked={entryKind === "Directory"} onChange={() => setEntryKind("Directory")} /> {tr("app.filters.kind.directory", "Только папки")}</label>
        </fieldset>
        <fieldset>
          <legend>{tr("app.filters.extensions.legend", "Расширения")}</legend>
          <input value={extensionsRaw} onChange={(event) => onExtensionsRawChange(event.target.value)} placeholder={tr("app.filters.extensions.placeholder", "rs, txt, md")} />
          <small>{tr("app.filters.extensions.hint", "Разделяйте значения запятыми")}</small>
        </fieldset>
        <fieldset>
          <legend>{tr("app.filters.depth.legend", "Глубина")}</legend>
          <label><input type="checkbox" checked={maxDepthUnlimited} onChange={(event) => onMaxDepthUnlimitedChange(event.target.checked)} /> {tr("app.filters.depth.unlimited", "Без ограничений")}</label>
          <input type="range" min={0} max={10} value={maxDepth} disabled={maxDepthUnlimited} onChange={(event) => onMaxDepthChange(Number(event.target.value))} />
          <input type="number" min={0} max={10} value={maxDepth} disabled={maxDepthUnlimited} onChange={(event) => onMaxDepthChange(Number(event.target.value))} />
        </fieldset>
        <fieldset>
          <legend>{tr("app.filters.size.legend", "Размер")}</legend>
          <label><input type="checkbox" checked={sizeFilterEnabled} onChange={(event) => onSizeFilterEnabledChange(event.target.checked)} /> {tr("app.filters.size.enabled", "Учитывать")}</label>
          <div className="inline-row">
            <select value={sizeComparison} disabled={!sizeFilterEnabled} onChange={(event) => onSizeComparisonChange(event.target.value as FiltersPanelProps["sizeComparison"])}>
              <option value="Greater">{tr("app.filters.size.comparison.greater", "больше")}</option><option value="Smaller">{tr("app.filters.size.comparison.smaller", "меньше")}</option><option value="Equal">{tr("app.filters.size.comparison.equal", "равно")}</option>
            </select>
            <input type="number" min={0} value={sizeValue} disabled={!sizeFilterEnabled} onChange={(event) => onSizeValueChange(Math.max(0, Number(event.target.value) || 0))} />
            <select value={sizeUnit} disabled={!sizeFilterEnabled} onChange={(event) => onSizeUnitChange(event.target.value as FiltersPanelProps["sizeUnit"]) }>
              <option value="B">B</option><option value="KB">KB</option><option value="MB">MB</option><option value="GB">GB</option><option value="TB">TB</option>
            </select>
          </div>
        </fieldset>
        <fieldset>
          <legend>{tr("app.filters.modified.legend", "Дата изменения")}</legend>
          <label><input type="checkbox" checked={modifiedFilterEnabled} onChange={(event) => onModifiedFilterEnabledChange(event.target.checked)} /> {tr("app.filters.modified.enabled", "Учитывать")}</label>
          <div className="inline-row">
            <input type="datetime-local" disabled={!modifiedFilterEnabled} value={modifiedAfter} onChange={(event) => onModifiedAfterChange(event.target.value)} />
            <input type="datetime-local" disabled={!modifiedFilterEnabled} value={modifiedBefore} onChange={(event) => onModifiedBeforeChange(event.target.value)} />
          </div>
        </fieldset>
        <fieldset>
          <legend>{tr("app.filters.created.legend", "Дата создания")}</legend>
          <label><input type="checkbox" checked={createdFilterEnabled} onChange={(event) => onCreatedFilterEnabledChange(event.target.checked)} /> {tr("app.filters.created.enabled", "Учитывать")}</label>
          <div className="inline-row">
            <input type="datetime-local" disabled={!createdFilterEnabled} value={createdAfter} onChange={(event) => onCreatedAfterChange(event.target.value)} />
            <input type="datetime-local" disabled={!createdFilterEnabled} value={createdBefore} onChange={(event) => onCreatedBeforeChange(event.target.value)} />
          </div>
        </fieldset>
        <fieldset>
          <legend>{tr("app.filters.modes.legend", "Режимы")}</legend>
          <label><input type="checkbox" checked={strict} onChange={(event) => onStrictChange(event.target.checked)} /> {tr("app.filters.modes.strict", "Строгий режим")}</label>
          <label><input type="checkbox" checked={ignoreCase} onChange={(event) => onIgnoreCaseChange(event.target.checked)} /> {tr("app.filters.modes.ignoreCase", "Игнорировать регистр")}</label>
          <label><input type="checkbox" checked={includeHidden} onChange={(event) => onIncludeHiddenChange(event.target.checked)} /> {tr("app.filters.modes.hidden", "Включать скрытые")}</label>
        </fieldset>
        <fieldset>
          <legend>{tr("app.filters.limit.legend", "Лимит результатов")}</legend>
          <label><input type="radio" checked={limitMode === "100"} onChange={() => onLimitModeChange("100")} /> 100</label>
          <label><input type="radio" checked={limitMode === "500"} onChange={() => onLimitModeChange("500")} /> 500</label>
          <label><input type="radio" checked={limitMode === "1000"} onChange={() => onLimitModeChange("1000")} /> 1000</label>
          <label><input type="radio" checked={limitMode === "custom"} onChange={() => onLimitModeChange("custom")} /> {tr("app.filters.limit.custom", "Пользовательский")}</label>
          <input type="number" min={1} disabled={limitMode !== "custom"} value={customLimit} onChange={(event) => onCustomLimitChange(Math.max(1, Number(event.target.value) || 1))} />
          <label><input type="radio" checked={limitMode === "none"} onChange={() => onLimitModeChange("none")} /> {tr("app.filters.limit.none", "Без лимита")}</label>
        </fieldset>
      </div>
      <div className="filters-actions">
        <button className="primary-btn" type="button" onClick={onApply}>{tr("app.filters.apply", "Применить")}</button>
        <button className="ghost-btn" type="button" onClick={onResetAll}>{tr("app.filters.resetAll", "Сбросить все")}</button>
      </div>
    </section>
  );
}
