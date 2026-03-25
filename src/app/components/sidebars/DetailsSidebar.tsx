import type { SearchResultItem } from "../../../shared/search-types";
import { formatBytes, formatDate } from "../../formatters";

export type TranslateFn = (key: string, defaultValue: string, values?: Record<string, unknown>) => string;

export type DetailsSidebarProps = {
  tr: TranslateFn;
  selectedResult: SearchResultItem | null;
  onCopyPath: (path: string) => void | Promise<void>;
  onOpenPath: (path: string) => void | Promise<void>;
  onOpenParent: (path: string) => void | Promise<void>;
  onRevealPath: (path: string) => void | Promise<void>;
  onAddFavorite: (path: string) => void | Promise<void>;
};

export function DetailsSidebar({
  tr,
  selectedResult,
  onCopyPath,
  onOpenPath,
  onOpenParent,
  onRevealPath,
  onAddFavorite
}: DetailsSidebarProps) {
  return (
    <aside className="right-panel">
      <h3>{tr("app.details.title", "Детали")}</h3>
      {selectedResult ? (
        <div className="detail-grid">
          <div className="detail-icon">{selectedResult.is_dir ? "📁" : "📄"}</div>
          <div>
            <strong>{selectedResult.name || tr("app.common.unnamed", "Без имени")}</strong>
          </div>
          <label>{tr("app.details.fullPath", "Полный путь")}</label>
          <div className="copy-row">
            <span className="truncate">{selectedResult.full_path}</span>
            <button type="button" onClick={() => void onCopyPath(selectedResult.full_path)}>
              {tr("app.details.copy", "Копия")}
            </button>
          </div>
          <label>{tr("app.details.size", "Размер")}</label>
          <div>{selectedResult.is_dir ? "" : formatBytes(selectedResult.size)}</div>
          <label>{tr("app.details.created", "Дата создания")}</label>
          <div>{formatDate(selectedResult.created_at)}</div>
          <label>{tr("app.details.modified", "Дата изменения")}</label>
          <div>{formatDate(selectedResult.modified_at)}</div>
          <label>{tr("app.details.hidden", "Скрытый")}</label>
          <div>{selectedResult.hidden ? tr("app.common.yes", "Да") : tr("app.common.no", "Нет")}</div>
          <label>{tr("app.details.sourceRoot", "Корневой источник")}</label>
          <div>{selectedResult.source_root}</div>
          <div className="actions-stack">
            <button type="button" onClick={() => void onOpenPath(selectedResult.full_path)}>
              {tr("app.details.open", "Открыть")}
            </button>
            <button type="button" onClick={() => void onOpenParent(selectedResult.full_path)}>
              {tr("app.details.openParent", "Открыть родительскую папку")}
            </button>
            <button type="button" onClick={() => void onRevealPath(selectedResult.full_path)}>
              {tr("app.details.reveal", "Показать в файловом менеджере")}
            </button>
            <button type="button" onClick={() => void onCopyPath(selectedResult.full_path)}>
              {tr("app.details.copyPath", "Копировать путь")}
            </button>
            <button type="button" onClick={() => void onAddFavorite(selectedResult.full_path)}>
              {tr("app.details.addFavorite", "Добавить в избранное")}
            </button>
          </div>
        </div>
      ) : (
        <p className="muted">{tr("app.details.empty", "Выберите элемент в списке результатов.")}</p>
      )}
    </aside>
  );
}
