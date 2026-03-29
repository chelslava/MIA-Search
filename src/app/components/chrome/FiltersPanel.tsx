import type { EntryKind, SearchBackend } from "../../../shared/search-types";
import type { FiltersPanelProps } from "./props";
import { useId } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";
import { Switch } from "../../../components/ui/switch";

export function FiltersPanel({
  entryKind,
  onEntryKindChange,
  extensionsRaw,
  onExtensionsRawChange,
  excludePathsRaw,
  onExcludePathsRawChange,
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
  searchBackend,
  onSearchBackendChange,
  indexStatus,
  indexUpdatedAtLabel,
  isRebuildingIndex,
  onRebuildIndex,
  indexHint,
  limitMode,
  onLimitModeChange,
  customLimit,
  onCustomLimitChange,
  onApply,
  onResetAll,
  tr
}: FiltersPanelProps) {
  const baseId = useId();
  const setEntryKind = (value: EntryKind) => onEntryKindChange(value);
  const maxDepthUnlimitedId = `${baseId}-max-depth-unlimited`;
  const sizeFilterEnabledId = `${baseId}-size-filter-enabled`;
  const modifiedFilterEnabledId = `${baseId}-modified-filter-enabled`;
  const createdFilterEnabledId = `${baseId}-created-filter-enabled`;
  const strictId = `${baseId}-strict`;
  const ignoreCaseId = `${baseId}-ignore-case`;
  const includeHiddenId = `${baseId}-include-hidden`;

  return (
    <section
      className="space-y-2 rounded-md border border-[var(--border)] bg-[var(--surface)] p-2"
      aria-label={tr("app.filters.ariaLabel", "Расширенные фильтры")}
    >
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        <fieldset className="space-y-2 rounded-sm border border-[var(--border)] bg-[var(--surface-alt)] p-2">
          <legend className="px-1 text-xs font-medium text-[var(--text)]">{tr("app.filters.kind.legend", "Тип элементов")}</legend>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[var(--text)]">
            <input
              type="radio"
              checked={entryKind === "Any"}
              onChange={() => setEntryKind("Any")}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            {tr("app.filters.kind.any", "Файлы и папки")}
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[var(--text)]">
            <input
              type="radio"
              checked={entryKind === "File"}
              onChange={() => setEntryKind("File")}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            {tr("app.filters.kind.file", "Только файлы")}
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[var(--text)]">
            <input
              type="radio"
              checked={entryKind === "Directory"}
              onChange={() => setEntryKind("Directory")}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            {tr("app.filters.kind.directory", "Только папки")}
          </label>
        </fieldset>

        <fieldset className="space-y-2 rounded-sm border border-[var(--border)] bg-[var(--surface-alt)] p-2">
          <legend className="px-1 text-xs font-medium text-[var(--text)]">{tr("app.filters.extensions.legend", "Расширения")}</legend>
          <Input
            value={extensionsRaw}
            onChange={(event) => onExtensionsRawChange(event.target.value)}
            placeholder={tr("app.filters.extensions.placeholder", "rs, txt, md")}
          />
          <small className="text-xs text-[var(--muted)]">{tr("app.filters.extensions.hint", "Разделяйте значения запятыми")}</small>
        </fieldset>

        <fieldset className="space-y-2 rounded-sm border border-[var(--border)] bg-[var(--surface-alt)] p-2">
          <legend className="px-1 text-xs font-medium text-[var(--text)]">
            {tr("app.filters.exclude.legend", "Исключить пути")}
          </legend>
          <Input
            value={excludePathsRaw}
            onChange={(event) => onExcludePathsRawChange(event.target.value)}
            placeholder={tr("app.filters.exclude.placeholder", "node_modules, .git, target")}
          />
          <small className="text-xs text-[var(--muted)]">
            {tr("app.filters.exclude.hint", "Разделяйте маски запятыми")}
          </small>
        </fieldset>

        <fieldset className="space-y-2 rounded-sm border border-[var(--border)] bg-[var(--surface-alt)] p-2">
          <legend className="px-1 text-xs font-medium text-[var(--text)]">{tr("app.filters.depth.legend", "Глубина")}</legend>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={maxDepthUnlimitedId} className="text-xs text-[var(--text)]">
              {tr("app.filters.depth.unlimited", "Без ограничений")}
            </label>
            <Switch
              id={maxDepthUnlimitedId}
              checked={maxDepthUnlimited}
              onCheckedChange={onMaxDepthUnlimitedChange}
            />
          </div>
          <input
            type="range"
            min={0}
            max={10}
            value={maxDepth}
            disabled={maxDepthUnlimited}
            onChange={(event) => onMaxDepthChange(Number(event.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--surface)] accent-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
          />
          <Input
            type="number"
            min={0}
            max={10}
            value={maxDepth}
            disabled={maxDepthUnlimited}
            onChange={(event) => onMaxDepthChange(Number(event.target.value))}
          />
        </fieldset>

        <fieldset className="space-y-2 rounded-sm border border-[var(--border)] bg-[var(--surface-alt)] p-2">
          <legend className="px-1 text-xs font-medium text-[var(--text)]">{tr("app.filters.size.legend", "Размер")}</legend>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={sizeFilterEnabledId} className="text-xs text-[var(--text)]">
              {tr("app.filters.size.enabled", "Учитывать")}
            </label>
            <Switch
              id={sizeFilterEnabledId}
              checked={sizeFilterEnabled}
              onCheckedChange={onSizeFilterEnabledChange}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Select
              value={sizeComparison}
              disabled={!sizeFilterEnabled}
              onChange={(event) => onSizeComparisonChange(event.target.value as FiltersPanelProps["sizeComparison"])}
            >
              <option value="Greater">{tr("app.filters.size.comparison.greater", "больше")}</option>
              <option value="Smaller">{tr("app.filters.size.comparison.smaller", "меньше")}</option>
              <option value="Equal">{tr("app.filters.size.comparison.equal", "равно")}</option>
            </Select>
            <Input
              type="number"
              min={0}
              max={999}
              value={sizeValue}
              disabled={!sizeFilterEnabled}
              onChange={(event) => onSizeValueChange(Math.min(999, Math.max(0, Number(event.target.value) || 0)))}
            />
            <Select
              value={sizeUnit}
              disabled={!sizeFilterEnabled}
              onChange={(event) => onSizeUnitChange(event.target.value as FiltersPanelProps["sizeUnit"])}
            >
              <option value="B">B</option>
              <option value="KB">KB</option>
              <option value="MB">MB</option>
              <option value="GB">GB</option>
              <option value="TB">TB</option>
            </Select>
          </div>
        </fieldset>

        <fieldset className="space-y-2 rounded-sm border border-[var(--border)] bg-[var(--surface-alt)] p-2">
          <legend className="px-1 text-xs font-medium text-[var(--text)]">{tr("app.filters.modified.legend", "Дата изменения")}</legend>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={modifiedFilterEnabledId} className="text-xs text-[var(--text)]">
              {tr("app.filters.modified.enabled", "Учитывать")}
            </label>
            <Switch
              id={modifiedFilterEnabledId}
              checked={modifiedFilterEnabled}
              onCheckedChange={onModifiedFilterEnabledChange}
            />
          </div>
          <div className="grid gap-2">
            <Input
              type="datetime-local"
              disabled={!modifiedFilterEnabled}
              value={modifiedAfter}
              onChange={(event) => onModifiedAfterChange(event.target.value)}
            />
            <Input
              type="datetime-local"
              disabled={!modifiedFilterEnabled}
              value={modifiedBefore}
              onChange={(event) => onModifiedBeforeChange(event.target.value)}
            />
          </div>
        </fieldset>

        <fieldset className="space-y-2 rounded-sm border border-[var(--border)] bg-[var(--surface-alt)] p-2">
          <legend className="px-1 text-xs font-medium text-[var(--text)]">{tr("app.filters.created.legend", "Дата создания")}</legend>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={createdFilterEnabledId} className="text-xs text-[var(--text)]">
              {tr("app.filters.created.enabled", "Учитывать")}
            </label>
            <Switch
              id={createdFilterEnabledId}
              checked={createdFilterEnabled}
              onCheckedChange={onCreatedFilterEnabledChange}
            />
          </div>
          <div className="grid gap-2">
            <Input
              type="datetime-local"
              disabled={!createdFilterEnabled}
              value={createdAfter}
              onChange={(event) => onCreatedAfterChange(event.target.value)}
            />
            <Input
              type="datetime-local"
              disabled={!createdFilterEnabled}
              value={createdBefore}
              onChange={(event) => onCreatedBeforeChange(event.target.value)}
            />
          </div>
        </fieldset>

        <fieldset className="space-y-2 rounded-sm border border-[var(--border)] bg-[var(--surface-alt)] p-2">
          <legend className="px-1 text-xs font-medium text-[var(--text)]">{tr("app.filters.modes.legend", "Режимы")}</legend>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={strictId} className="text-xs text-[var(--text)]">
              {tr("app.filters.modes.strict", "Строгий режим")}
            </label>
            <Switch
              id={strictId}
              checked={strict}
              onCheckedChange={onStrictChange}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={ignoreCaseId} className="text-xs text-[var(--text)]">
              {tr("app.filters.modes.ignoreCase", "Игнорировать регистр")}
            </label>
            <Switch
              id={ignoreCaseId}
              checked={ignoreCase}
              onCheckedChange={onIgnoreCaseChange}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={includeHiddenId} className="text-xs text-[var(--text)]">
              {tr("app.filters.modes.hidden", "Включать скрытые")}
            </label>
            <Switch
              id={includeHiddenId}
              checked={includeHidden}
              onCheckedChange={onIncludeHiddenChange}
            />
          </div>
        </fieldset>

        <fieldset className="space-y-2 rounded-sm border border-[var(--border)] bg-[var(--surface-alt)] p-2">
          <legend className="px-1 text-xs font-medium text-[var(--text)]">{tr("app.filters.limit.legend", "Лимит результатов")}</legend>
          <div className="flex flex-wrap gap-2">
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[var(--text)]">
              <input
                type="radio"
                checked={limitMode === "100"}
                onChange={() => onLimitModeChange("100")}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              100
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[var(--text)]">
              <input
                type="radio"
                checked={limitMode === "500"}
                onChange={() => onLimitModeChange("500")}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              500
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[var(--text)]">
              <input
                type="radio"
                checked={limitMode === "1000"}
                onChange={() => onLimitModeChange("1000")}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              1000
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[var(--text)]">
              <input
                type="radio"
                checked={limitMode === "custom"}
                onChange={() => onLimitModeChange("custom")}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              {tr("app.filters.limit.custom", "Пользовательский")}
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[var(--text)]">
              <input
                type="radio"
                checked={limitMode === "none"}
                onChange={() => onLimitModeChange("none")}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              {tr("app.filters.limit.none", "Без лимита")}
            </label>
          </div>
          <Input
            type="number"
            min={1}
            disabled={limitMode !== "custom"}
            value={customLimit}
            onChange={(event) => onCustomLimitChange(Math.max(1, Number(event.target.value) || 1))}
          />
        </fieldset>

        <fieldset className="space-y-2 rounded-sm border border-[var(--border)] bg-[var(--surface-alt)] p-2">
          <legend className="px-1 text-xs font-medium text-[var(--text)]">
            {tr("app.filters.backend.legend", "Backend поиска")}
          </legend>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <Select
              value={searchBackend}
              onChange={(event) => onSearchBackendChange(event.target.value as SearchBackend)}
            >
              <option value="Index">{tr("app.filters.backend.index", "Index")}</option>
              <option value="Scan">{tr("app.filters.backend.scan", "Scan")}</option>
            </Select>
            <Button
              type="button"
              variant="outline"
              onClick={onRebuildIndex}
              disabled={isRebuildingIndex}
            >
              {isRebuildingIndex
                ? tr("app.filters.backend.rebuilding", "Rebuilding...")
                : tr("app.filters.backend.rebuild", "Rebuild index")}
            </Button>
          </div>
          <div className="rounded-sm border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] text-[var(--muted)]">
            <div>
              {tr("app.filters.backend.status", "Статус")}: {indexStatus?.status ?? "-"}
            </div>
            <div>
              {tr("app.filters.backend.entries", "Entries")}: {indexStatus?.entries ?? 0}
            </div>
            <div>
              {tr("app.filters.backend.updatedAt", "Updated")}: {indexUpdatedAtLabel}
            </div>
            {indexHint ? <div>{indexHint}</div> : null}
          </div>
        </fieldset>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onApply}>
          {tr("app.filters.apply", "Применить")}
        </Button>
        <Button type="button" variant="outline" onClick={onResetAll}>
          {tr("app.filters.resetAll", "Сбросить все")}
        </Button>
      </div>
    </section>
  );
}
