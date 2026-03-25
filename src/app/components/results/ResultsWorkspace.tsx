import type { MouseEvent, RefObject } from "react";
import type { SearchResultItem, SortMode } from "../../../shared/search-types";
import type { DisplayMode, FilterChip } from "../../types";
import { Button } from "../../../components/ui/button";
import { Select } from "../../../components/ui/select";

type ResultsWorkspaceProps = {
  containerRef?: RefObject<HTMLElement | null>;
  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
  isSearching: boolean;
  onCancelSearch: () => void;
  onSearch: () => void;
  chips: FilterChip[];
  onClearAllFilters: () => void;
  results: SearchResultItem[];
  selectedPath: string | null;
  onSelectPath: (path: string) => void;
  onResultContextMenu: (event: MouseEvent<HTMLTableRowElement>, item: SearchResultItem) => void;
  scrollTop: number;
  setScrollTop: (value: number) => void;
  visibleRows: {
    topSpacer: number;
    bottomSpacer: number;
    items: SearchResultItem[];
  };
  formatBytes: (size: number | null) => string;
  formatDate: (date: string | null) => string;
  t: (key: string, defaultValue: string, values?: Record<string, unknown>) => string;
};

export function ResultsWorkspace({
  containerRef,
  displayMode,
  setDisplayMode,
  sortMode,
  setSortMode,
  isSearching,
  onCancelSearch,
  onSearch,
  chips,
  onClearAllFilters,
  results,
  selectedPath,
  onSelectPath,
  onResultContextMenu,
  setScrollTop,
  visibleRows,
  formatBytes,
  formatDate,
  t
}: ResultsWorkspaceProps) {
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
          {isSearching ? (
            <Button type="button" variant="secondary" onClick={onCancelSearch} className="whitespace-nowrap">
              {t("app.labels.cancelSearch", "Отменить поиск")}
            </Button>
          ) : (
            <Button type="button" onClick={onSearch} className="whitespace-nowrap">
              {t("app.labels.search", "Поиск")}
            </Button>
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

      {displayMode === "cards" ? (
        <div
          className="grid min-h-0 flex-1 auto-rows-min gap-1.5 overflow-auto rounded-md border border-[var(--border)] bg-[var(--surface-alt)] p-1.5 sm:grid-cols-2 xl:grid-cols-3"
          onScroll={(event) => setScrollTop((event.currentTarget as HTMLDivElement).scrollTop)}
        >
          {results.map((item) => (
            <article
              key={item.full_path}
              className={
                selectedPath === item.full_path
                  ? "cursor-pointer rounded-md border border-[var(--accent)] bg-[color-mix(in_srgb,var(--surface)_88%,var(--accent))] p-2 transition-colors"
                  : "cursor-pointer rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 transition-colors hover:border-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--surface)_88%,var(--accent))]"
              }
              onClick={() => onSelectPath(item.full_path)}
            >
              <div className="mb-1.5 flex items-start gap-1.5 text-xs font-semibold text-[var(--text)]">
                <span aria-hidden="true" className="text-sm leading-none">
                  {item.is_dir ? "📁" : "📄"}
                </span>
                <span className="min-w-0 break-words">
                  {item.name || t("app.labels.noName", "Без имени")}
                </span>
              </div>
              <div className="mb-1 break-all text-[11px] text-[var(--muted)]">{item.full_path}</div>
              <div className="text-[11px] text-[var(--muted)]">
                {item.is_dir ? t("app.labels.dir", "Папка") : t("app.labels.file", "Файл")} {"•"}{" "}
                {formatBytes(item.size) || "-"}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div
          className="min-h-0 flex-1 overflow-auto rounded-md border border-[var(--border)] bg-[var(--surface-alt)]"
          onScroll={(event) => setScrollTop((event.currentTarget as HTMLDivElement).scrollTop)}
        >
          <table className="w-full table-fixed border-separate border-spacing-0 text-xs">
            <colgroup>
              <col style={{ width: "68px" }} />
              <col style={{ width: "56%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "92px" }} />
              <col style={{ width: "124px" }} />
              <col style={{ width: "64px" }} />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-[var(--surface-alt)]">
              <tr className="text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="border-b border-[var(--border)] px-2 py-1.5 font-medium whitespace-nowrap">{t("app.labels.colIcon", "Иконка")}</th>
                <th className="border-b border-[var(--border)] px-2 py-1.5 font-medium whitespace-nowrap">{t("app.labels.colName", "Имя")}</th>
                <th className="border-b border-[var(--border)] px-2 py-1.5 font-medium whitespace-nowrap">{t("app.labels.colPath", "Полный путь")}</th>
                <th className="border-b border-[var(--border)] px-2 py-1.5 font-medium whitespace-nowrap">{t("app.labels.colSize", "Размер")}</th>
                <th className="border-b border-[var(--border)] px-2 py-1.5 font-medium whitespace-nowrap">{t("app.labels.colModified", "Дата изменения")}</th>
                <th className="border-b border-[var(--border)] px-2 py-1.5 font-medium whitespace-nowrap">{t("app.labels.colType", "Тип")}</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.topSpacer > 0 ? (
                <tr>
                  <td colSpan={6} style={{ height: `${visibleRows.topSpacer}px`, padding: 0, borderBottom: "none" }} />
                </tr>
              ) : null}

              {visibleRows.items.map((item) => (
                <tr
                  data-path={item.full_path}
                  key={item.full_path}
                  className={
                    selectedPath === item.full_path
                      ? "cursor-pointer bg-[color-mix(in_srgb,var(--surface)_84%,var(--accent))] transition-colors hover:bg-[color-mix(in_srgb,var(--surface)_80%,var(--accent))]"
                      : "cursor-pointer transition-colors hover:bg-[color-mix(in_srgb,var(--surface)_88%,var(--accent))]"
                  }
                  onClick={() => onSelectPath(item.full_path)}
                  onContextMenu={(event: MouseEvent<HTMLTableRowElement>) => onResultContextMenu(event, item)}
                >
                  <td className={`border-b border-[var(--border)] px-2 py-1.5 whitespace-nowrap ${item.hidden ? "text-[var(--muted)] opacity-60" : ""}`}>
                    {item.is_dir ? "📁" : "📄"}
                  </td>
                  <td className={`border-b border-[var(--border)] px-2 py-1.5 ${item.is_dir ? "font-medium text-[var(--text)]" : "text-[var(--text)]"}`}>
                    <span className="block truncate" title={item.name || t("app.labels.noName", "Без имени")}>
                      {item.name || t("app.labels.noName", "Без имени")}
                    </span>
                  </td>
                  <td className="max-w-0 truncate border-b border-[var(--border)] px-2 py-1.5 text-[var(--muted)]" title={item.full_path}>
                    {item.full_path}
                  </td>
                  <td className="border-b border-[var(--border)] px-2 py-1.5 whitespace-nowrap text-[var(--text)]">
                    {item.is_dir ? "" : formatBytes(item.size)}
                  </td>
                  <td className="border-b border-[var(--border)] px-2 py-1.5 whitespace-nowrap text-[var(--text)]">
                    {formatDate(item.modified_at)}
                  </td>
                  <td className="border-b border-[var(--border)] px-2 py-1.5 whitespace-nowrap text-[var(--text)]">
                    {item.is_dir ? t("app.labels.dir", "Папка") : t("app.labels.file", "Файл")}
                  </td>
                </tr>
              ))}

              {visibleRows.bottomSpacer > 0 ? (
                <tr>
                  <td
                    colSpan={6}
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
