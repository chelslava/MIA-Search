import type { MouseEvent, RefObject } from "react";
import { useMemo } from "react";
import type { SearchResultItem, SortMode } from "../../../shared/search-types";
import type { DisplayMode, FilterChip } from "../../types";
import { Button } from "../../../components/ui/button";
import { Select } from "../../../components/ui/select";
import { EmptySearchResults } from "../../../components/ui/empty-state";
import { SkeletonRow, SkeletonCard } from "../../../components/ui/skeleton";
import { ResultRow, ResultCard } from "./ResultRow";
import { ROW_HEIGHT } from "../../utils/search-utils";

export type BatchAction = "copy" | "move" | "delete";

type ResultsWorkspaceProps = {
  containerRef?: RefObject<HTMLElement | null>;
  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
  chips: FilterChip[];
  onClearAllFilters: () => void;
  results: SearchResultItem[];
  selectedPath: string | null;
  onSelectPath: (path: string) => void;
  onResultContextMenu: (event: MouseEvent<HTMLTableRowElement>, item: SearchResultItem) => void;
  scrollTop: number;
  setScrollTop: (value: number) => void;
  listHeight: number;
  visibleRows: {
    topSpacer: number;
    bottomSpacer: number;
    items: SearchResultItem[];
  };
  formatBytes: (size: number | null) => string;
  formatDate: (date: string | null) => string;
  t: (key: string, defaultValue: string, values?: Record<string, unknown>) => string;
  isLoading?: boolean;
  error?: string | null;
  selectedPaths: Set<string>;
  onToggleSelection: (path: string, selected: boolean) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBatchAction: (action: BatchAction) => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  onExportClipboard: () => void;
  onContentSearch: (query: string) => void;
};

const CARD_HEIGHT = 80;
const CARDS_PER_ROW_SM = 2;
const CARDS_PER_ROW_XL = 3;

function useVisibleCards(
  results: SearchResultItem[],
  scrollTop: number,
  listHeight: number
): { topSpacer: number; bottomSpacer: number; items: SearchResultItem[] } {
  return useMemo(() => {
    if (results.length === 0 || listHeight <= 0) {
      return { topSpacer: 0, bottomSpacer: 0, items: [] };
    }
    const cardsPerRow = CARDS_PER_ROW_SM;
    const rowHeight = CARD_HEIGHT + 6;
    const totalRows = Math.ceil(results.length / cardsPerRow);
    const safeHeight = Math.max(200, listHeight);
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight));
    const visibleRowCount = Math.ceil(safeHeight / rowHeight) + 2;
    const endRow = Math.min(totalRows, startRow + visibleRowCount);
    const startIndex = startRow * cardsPerRow;
    const endIndex = Math.min(results.length, endRow * cardsPerRow);
    const topSpacer = startRow * rowHeight;
    const bottomSpacer = Math.max(0, (totalRows - endRow) * rowHeight);
    return {
      topSpacer,
      bottomSpacer,
      items: results.slice(startIndex, endIndex)
    };
  }, [results, scrollTop, listHeight]);
}

export function ResultsWorkspace({
  containerRef,
  displayMode,
  setDisplayMode,
  sortMode,
  setSortMode,
  chips,
  onClearAllFilters,
  results,
  selectedPath,
  onSelectPath,
  onResultContextMenu,
  scrollTop,
  setScrollTop,
  listHeight,
  visibleRows,
  formatBytes,
  formatDate,
  t,
  isLoading,
  error,
  selectedPaths,
  onToggleSelection,
    onSelectAll,
    onClearSelection,
    onBatchAction,
    onExportCsv,
    onExportJson,
    onExportClipboard,
    onContentSearch,
}: ResultsWorkspaceProps) {
  const visibleCards = useVisibleCards(results, scrollTop, listHeight);

  const renderSelectionBar = () => {
    if (selectedPaths.size === 0) return null;
    return (
      <div className="flex items-center gap-2 rounded-md border border-[var(--accent)] bg-[color-mix(in_srgb,var(--surface)_90%,var(--accent))] p-2 text-sm">
        <span className="font-medium">{selectedPaths.size} выбрано</span>
        <Button type="button" variant="outline" size="sm" onClick={onSelectAll}>
          {t("app.batch.selectAll", "Выбрать все")}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onClearSelection}>
          {t("app.batch.clearSelection", "Снять выбор")}
        </Button>
        <div className="ml-auto flex gap-1">
          <Button type="button" size="sm" onClick={() => onBatchAction("copy")}>
            {t("app.batch.copy", "Копировать")}
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => onBatchAction("move")}>
            {t("app.batch.move", "Переместить")}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onBatchAction("delete")}>
            {t("app.batch.delete", "Удалить")}
          </Button>
        </div>
      </div>
    );
  };

  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 overflow-auto p-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
          <span className="text-2xl" aria-hidden="true">⚠️</span>
          <div>
            <div className="font-medium text-[var(--text)]">{t("app.status.errorTitle", "Ошибка")}</div>
            <div className="text-sm text-[var(--muted)]">{error}</div>
          </div>
        </div>
      );
    }
    if (results.length === 0) {
      return <EmptySearchResults />;
    }
    return null;
  };

  return (
    <section ref={containerRef} className="flex h-full min-h-0 flex-col gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] p-2">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-alt)] p-2">
        <div className="flex flex-wrap gap-1">
          <Button
            type="button"
            size="sm"
            variant={displayMode === "table" ? "default" : "outline"}
            onClick={() => setDisplayMode("table")}
          >
            {t("app.labels.viewTable", "Таблица")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={displayMode === "compact" ? "default" : "outline"}
            onClick={() => setDisplayMode("compact")}
          >
            {t("app.labels.viewCompact", "Компактно")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={displayMode === "cards" ? "default" : "outline"}
            onClick={() => setDisplayMode("cards")}
          >
            {t("app.labels.viewCards", "Карточки")}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-1">
            <Select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="min-w-[14rem]"
            >
              <option value="Relevance">{t("app.labels.sortRelevance", "По релевантности")}</option>
              <option value="Name">{t("app.labels.sortName", "По имени")}</option>
              <option value="Size">{t("app.labels.sortSize", "По размеру")}</option>
              <option value="Modified">{t("app.labels.sortModified", "По дате изменения")}</option>
              <option value="Type">{t("app.labels.sortType", "По типу")}</option>
            </Select>
          </div>
          <div className="flex gap-1">
            {results.length > 0 && (
              <>
                <Button type="button" size="sm" variant="outline" onClick={onExportCsv}>
                  {t("app.export.csv", "CSV")}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={onExportJson}>
                  {t("app.export.json", "JSON")}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={onExportClipboard}>
                  {t("app.export.clipboard", "Буфер")}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => {
                  const query = prompt(t("app.contentSearch.prompt", "Введите текст для поиска в файлах:"));
                  if (query) onContentSearch(query);
                }}>
                  {t("app.contentSearch.button", "Поиск в файлах")}
                </Button>
              </>
            )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {chips.map((chip) => (
          <Button
            key={chip.id}
            type="button"
            variant="ghost"
            size="sm"
            onClick={chip.remove}
            className="h-auto rounded-md border border-[var(--border)] px-2 py-0.5 text-[11px] font-medium"
          >
            {chip.label} <span aria-hidden="true">✕</span>
          </Button>
        ))}
        {chips.length > 0 ? (
          <Button type="button" variant="outline" size="sm" onClick={onClearAllFilters}>
            {t("app.labels.resetAllFilters", "Сбросить все фильтры")}
          </Button>
        ) : null}
      </div>

      {renderSelectionBar()}

      {displayMode === "cards" ? (
        results.length === 0 || isLoading || error ? (
          <div className="min-h-0 flex-1 overflow-auto rounded-md border border-[var(--border)] bg-[var(--surface-alt)] p-1.5">
            {isLoading ? (
              <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : (
              renderEmptyState()
            )}
          </div>
        ) : (
        <div
          role="list"
          aria-label={t("app.labels.results", "Результаты поиска")}
          className="grid min-h-0 flex-1 auto-rows-min gap-1.5 overflow-auto rounded-md border border-[var(--border)] bg-[var(--surface-alt)] p-1.5 sm:grid-cols-2 xl:grid-cols-3"
          onScroll={(event) => setScrollTop((event.currentTarget as HTMLDivElement).scrollTop)}
        >
          {visibleCards.topSpacer > 0 ? (
            <div style={{ height: visibleCards.topSpacer, gridColumn: "1 / -1" }} />
          ) : null}
          {visibleCards.items.map((item) => (
            <ResultCard
              key={item.full_path}
              item={item}
              selectedPath={selectedPath}
              selectedPaths={selectedPaths}
              onSelectPath={onSelectPath}
              onToggleSelection={onToggleSelection}
              formatBytes={formatBytes}
              t={t}
            />
          ))}
          {visibleCards.bottomSpacer > 0 ? (
            <div style={{ height: visibleCards.bottomSpacer, gridColumn: "1 / -1" }} />
          ) : null}
        </div>
        )
      ) : results.length === 0 || isLoading || error ? (
        <div className="min-h-0 flex-1 flex items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-alt)]">
          {renderEmptyState()}
        </div>
      ) : (
        <div
          className="min-h-0 flex-1 overflow-auto rounded-md border border-[var(--border)] bg-[var(--surface-alt)]"
          onScroll={(event) => setScrollTop((event.currentTarget as HTMLDivElement).scrollTop)}
        >
          <table className="w-full table-fixed border-separate border-spacing-0 text-xs" role="grid" aria-label={t("app.results.ariaLabel", "Результаты поиска")}>
            <colgroup>
              <col style={{ width: "32px" }} />
              <col style={{ width: "36px" }} />
              <col style={{ width: "48%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "92px" }} />
              <col style={{ width: "124px" }} />
              <col style={{ width: "64px" }} />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-[var(--surface-alt)]">
              <tr className="text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="border-b border-[var(--border)] px-1 py-1.5 font-medium whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedPaths.size > 0 && selectedPaths.size === results.length}
                    ref={(el) => {
                      if (el) el.indeterminate = selectedPaths.size > 0 && selectedPaths.size < results.length;
                    }}
                    onChange={(e) => {
                      if (e.target.checked) onSelectAll();
                      else onClearSelection();
                    }}
                    className="h-3.5 w-3.5 cursor-pointer accent-[var(--accent)]"
                  />
                </th>
                <th className="border-b border-[var(--border)] px-2 py-1.5 font-medium whitespace-nowrap">{t("app.labels.colIcon", "Иконка")}</th>
                <th
                  className="border-b border-[var(--border)] px-2 py-1.5 font-medium whitespace-nowrap cursor-pointer hover:text-[var(--text)] select-none"
                  onClick={() => setSortMode(sortMode === "Name" ? "Name" : "Name")}
                  title={t("app.tooltips.toggleSort", "Переключить сортировку")}
                >
                  {t("app.labels.colName", "Имя")} {sortMode === "Name" ? "▼" : ""}
                </th>
                <th className="border-b border-[var(--border)] px-2 py-1.5 font-medium whitespace-nowrap">{t("app.labels.colPath", "Полный путь")}</th>
                <th
                  className="border-b border-[var(--border)] px-2 py-1.5 font-medium whitespace-nowrap cursor-pointer hover:text-[var(--text)] select-none"
                  onClick={() => setSortMode(sortMode === "Size" ? "Size" : "Size")}
                  title={t("app.tooltips.toggleSort", "Переключить сортировку")}
                >
                  {t("app.labels.colSize", "Размер")} {sortMode === "Size" ? "▼" : ""}
                </th>
                <th
                  className="border-b border-[var(--border)] px-2 py-1.5 font-medium whitespace-nowrap cursor-pointer hover:text-[var(--text)] select-none"
                  onClick={() => setSortMode(sortMode === "Modified" ? "Modified" : "Modified")}
                  title={t("app.tooltips.toggleSort", "Переключить сортировку")}
                >
                  {t("app.labels.colModified", "Дата изменения")} {sortMode === "Modified" ? "▼" : ""}
                </th>
                <th
                  className="border-b border-[var(--border)] px-2 py-1.5 font-medium whitespace-nowrap cursor-pointer hover:text-[var(--text)] select-none"
                  onClick={() => setSortMode(sortMode === "Type" ? "Type" : "Type")}
                  title={t("app.tooltips.toggleSort", "Переключить сортировку")}
                >
                  {t("app.labels.colType", "Тип")} {sortMode === "Type" ? "▼" : ""}
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.topSpacer > 0 ? (
                <tr>
                  <td colSpan={7} style={{ height: `${visibleRows.topSpacer}px`, padding: 0, borderBottom: "none" }} />
                </tr>
              ) : null}

              {visibleRows.items.map((item) => (
                <tr
                  key={item.full_path}
                  data-path={item.full_path}
                >
                  <td colSpan={7} style={{ padding: 0 }}>
                    <div style={{ height: ROW_HEIGHT }}>
                      <ResultRow
                        item={item}
                        selectedPath={selectedPath}
                        selectedPaths={selectedPaths}
                        onSelectPath={onSelectPath}
                        onToggleSelection={onToggleSelection}
                        onResultContextMenu={onResultContextMenu}
                        formatBytes={formatBytes}
                        formatDate={formatDate}
                        t={t}
                        tOpenFile={t("app.tooltips.openFile", "Открыть")}
                        tOpenParentFolder={t("app.tooltips.openParentFolder", "Родительская папка")}
                      />
                    </div>
                  </td>
                </tr>
              ))}

              {visibleRows.bottomSpacer > 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{ height: `${visibleRows.bottomSpacer}px`, padding: 0, borderBottom: "none" }}
                  />
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
