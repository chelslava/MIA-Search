import type { RefObject } from "react";
import type { SearchResultItem, SortMode } from "../../../shared/search-types";
import type { DisplayMode, FilterChip } from "../../types";

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
  onResultContextMenu: (event: React.MouseEvent, item: SearchResultItem) => void;
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
    <section className="center-panel" ref={containerRef}>
      <div className="center-toolbar">
        <div className="inline-row">
          <button
            className={displayMode === "table" ? "mode-btn active" : "mode-btn"}
            type="button"
            onClick={() => setDisplayMode("table")}
          >
            {t("app.labels.viewTable", "Таблица")}
          </button>
          <button
            className={displayMode === "compact" ? "mode-btn active" : "mode-btn"}
            type="button"
            onClick={() => setDisplayMode("compact")}
          >
            {t("app.labels.viewCompact", "Компактно")}
          </button>
          <button
            className={displayMode === "cards" ? "mode-btn active" : "mode-btn"}
            type="button"
            onClick={() => setDisplayMode("cards")}
          >
            {t("app.labels.viewCards", "Карточки")}
          </button>
        </div>
        <div className="inline-row">
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
            <option value="Relevance">{t("app.labels.sortRelevance", "По релевантности")}</option>
            <option value="Name">{t("app.labels.sortName", "По имени")}</option>
            <option value="Size">{t("app.labels.sortSize", "По размеру")}</option>
            <option value="Modified">{t("app.labels.sortModified", "По дате изменения")}</option>
            <option value="Type">{t("app.labels.sortType", "По типу")}</option>
          </select>
          {isSearching ? (
            <button className="primary-btn" type="button" onClick={onCancelSearch}>
              {t("app.labels.cancelSearch", "Отменить поиск")}
            </button>
          ) : (
            <button className="primary-btn" type="button" onClick={onSearch}>
              {t("app.labels.search", "Поиск")}
            </button>
          )}
        </div>
      </div>

      <div className="chips-row">
        {chips.map((chip) => (
          <button key={chip.id} className="chip" type="button" onClick={chip.remove}>
            {chip.label} ✕
          </button>
        ))}
        {chips.length > 0 ? (
          <button className="ghost-btn" type="button" onClick={onClearAllFilters}>
            {t("app.labels.resetAllFilters", "Сбросить все фильтры")}
          </button>
        ) : null}
      </div>

      {displayMode === "cards" ? (
        <div className="cards-grid" onScroll={(event) => setScrollTop((event.target as HTMLDivElement).scrollTop)}>
          {results.map((item) => (
            <article
              key={item.full_path}
              className={selectedPath === item.full_path ? "result-card selected" : "result-card"}
              onClick={() => onSelectPath(item.full_path)}
            >
              <div className="card-title">
                {item.is_dir ? "📁" : "📄"} {item.name || t("app.labels.noName", "Без имени")}
              </div>
              <div className="card-path">{item.full_path}</div>
              <div className="card-meta">
                {item.is_dir ? t("app.labels.dir", "Папка") : t("app.labels.file", "Файл")} •{" "}
                {formatBytes(item.size) || "-"}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div
          className={displayMode === "compact" ? "results-wrap compact" : "results-wrap"}
          onScroll={(event) => setScrollTop((event.target as HTMLDivElement).scrollTop)}
        >
          <table className="results-table">
            <thead>
              <tr>
                <th>{t("app.labels.colIcon", "Иконка")}</th>
                <th>{t("app.labels.colName", "Имя")}</th>
                <th>{t("app.labels.colPath", "Полный путь")}</th>
                <th>{t("app.labels.colSize", "Размер")}</th>
                <th>{t("app.labels.colModified", "Дата изменения")}</th>
                <th>{t("app.labels.colType", "Тип")}</th>
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
                  className={selectedPath === item.full_path ? "selected" : ""}
                  onClick={() => onSelectPath(item.full_path)}
                  onContextMenu={(event) => onResultContextMenu(event, item)}
                >
                  <td className={item.hidden ? "muted-40" : ""}>{item.is_dir ? "📁" : "📄"}</td>
                  <td className={item.is_dir ? "name-cell dir" : "name-cell"}>
                    {item.name || t("app.labels.noName", "Без имени")}
                  </td>
                  <td className="path-cell">{item.full_path}</td>
                  <td>{item.is_dir ? "" : formatBytes(item.size)}</td>
                  <td>{formatDate(item.modified_at)}</td>
                  <td>{item.is_dir ? t("app.labels.dir", "Папка") : t("app.labels.file", "Файл")}</td>
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
