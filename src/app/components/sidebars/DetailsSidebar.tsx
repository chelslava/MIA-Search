import type { SearchResultItem } from "../../../shared/search-types";
import { formatBytes, formatDate } from "../../formatters";
import { Button } from "../../../components/ui/button";

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
    <aside className="flex h-full flex-col gap-4 border-l border-[var(--border)] bg-[var(--surface)] p-4 text-[var(--text)] shadow-[0_10px_30px_rgba(0,0,0,0.12)]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          {tr("app.details.title", "Детали")}
        </h3>
      </div>
      {selectedResult ? (
        <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xl">
              {selectedResult.is_dir ? "📁" : "📄"}
            </div>
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-base font-semibold">
                {selectedResult.name || tr("app.common.unnamed", "Без имени")}
              </strong>
            </div>
          </div>

          <dl className="grid gap-3 text-sm">
            <div className="grid gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
              <dt className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                {tr("app.details.fullPath", "Полный путь")}
              </dt>
              <dd className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate">{selectedResult.full_path}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void onCopyPath(selectedResult.full_path)}
                  className="shrink-0"
                >
                  {tr("app.details.copy", "Копия")}
                </Button>
              </dd>
            </div>
            <div className="grid gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
              <dt className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                {tr("app.details.size", "Размер")}
              </dt>
              <dd>{selectedResult.is_dir ? "" : formatBytes(selectedResult.size)}</dd>
            </div>
            <div className="grid gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
              <dt className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                {tr("app.details.created", "Дата создания")}
              </dt>
              <dd>{formatDate(selectedResult.created_at)}</dd>
            </div>
            <div className="grid gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
              <dt className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                {tr("app.details.modified", "Дата изменения")}
              </dt>
              <dd>{formatDate(selectedResult.modified_at)}</dd>
            </div>
            <div className="grid gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
              <dt className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                {tr("app.details.hidden", "Скрытый")}
              </dt>
              <dd>{selectedResult.hidden ? tr("app.common.yes", "Да") : tr("app.common.no", "Нет")}</dd>
            </div>
            <div className="grid gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
              <dt className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                {tr("app.details.sourceRoot", "Корневой источник")}
              </dt>
              <dd className="break-all">{selectedResult.source_root}</dd>
            </div>
          </dl>

          <div className="grid gap-2">
            <Button type="button" onClick={() => void onOpenPath(selectedResult.full_path)} className="w-full">
              {tr("app.details.open", "Открыть")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void onOpenParent(selectedResult.full_path)}
              className="w-full"
            >
              {tr("app.details.openParent", "Открыть родительскую папку")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void onRevealPath(selectedResult.full_path)}
              className="w-full"
            >
              {tr("app.details.reveal", "Показать в файловом менеджере")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => void onCopyPath(selectedResult.full_path)}
              className="w-full"
            >
              {tr("app.details.copyPath", "Копировать путь")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void onAddFavorite(selectedResult.full_path)}
              className="w-full"
            >
              {tr("app.details.addFavorite", "Добавить в избранное")}
            </Button>
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3 text-sm text-[var(--muted)]">
          {tr("app.details.empty", "Выберите элемент в списке результатов.")}
        </p>
      )}
    </aside>
  );
}
