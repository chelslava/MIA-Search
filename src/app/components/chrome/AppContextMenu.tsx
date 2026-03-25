import type { AppContextMenuProps } from "./props";

export function AppContextMenu({
  contextMenu,
  onOpenPath,
  onOpenParent,
  onRevealPath,
  onCopyPath,
  onCopyName,
  onAddFavorite,
  onSetPrimaryRoot,
  onDeleteRoot,
  tr
}: AppContextMenuProps) {
  if (!contextMenu) return null;

  return (
    <div
      role="menu"
      className="context-menu absolute z-50 min-w-56 rounded-lg border border-slate-200 bg-white p-1.5 text-sm shadow-lg shadow-slate-900/10 ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20"
      style={{ left: contextMenu.x, top: contextMenu.y }}
    >
      {contextMenu.type === "result" ? (
        <>
          <button
            type="button"
            className="flex w-full items-center rounded-md px-3 py-2 text-left text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:bg-slate-100 focus-visible:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white dark:focus-visible:bg-slate-800"
            onClick={() => onOpenPath(contextMenu.item.full_path)}
          >
            {tr("app.context.open", "Открыть")}
          </button>
          <button
            type="button"
            className="flex w-full items-center rounded-md px-3 py-2 text-left text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:bg-slate-100 focus-visible:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white dark:focus-visible:bg-slate-800"
            onClick={() => onOpenParent(contextMenu.item.full_path)}
          >
            {tr("app.context.openParent", "Открыть родительскую папку")}
          </button>
          <button
            type="button"
            className="flex w-full items-center rounded-md px-3 py-2 text-left text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:bg-slate-100 focus-visible:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white dark:focus-visible:bg-slate-800"
            onClick={() => onRevealPath(contextMenu.item.full_path)}
          >
            {tr("app.context.reveal", "Показать в файловом менеджере")}
          </button>
          <button
            type="button"
            className="flex w-full items-center rounded-md px-3 py-2 text-left text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:bg-slate-100 focus-visible:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white dark:focus-visible:bg-slate-800"
            onClick={() => onCopyPath(contextMenu.item.full_path)}
          >
            {tr("app.context.copyPath", "Копировать полный путь")}
          </button>
          <button
            type="button"
            className="flex w-full items-center rounded-md px-3 py-2 text-left text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:bg-slate-100 focus-visible:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white dark:focus-visible:bg-slate-800"
            onClick={() => onCopyName(contextMenu.item.name)}
          >
            {tr("app.context.copyName", "Копировать имя")}
          </button>
          <button
            type="button"
            className="flex w-full items-center rounded-md px-3 py-2 text-left text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:bg-slate-100 focus-visible:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white dark:focus-visible:bg-slate-800"
            onClick={() => onAddFavorite(contextMenu.item.full_path)}
          >
            {tr("app.context.addFavorite", "Добавить в избранное")}
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            className="flex w-full items-center rounded-md px-3 py-2 text-left text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:bg-slate-100 focus-visible:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white dark:focus-visible:bg-slate-800"
            onClick={() => onSetPrimaryRoot(contextMenu.path)}
          >
            {tr("app.context.makePrimary", "Сделать основным")}
          </button>
          <button
            type="button"
            className="flex w-full items-center rounded-md px-3 py-2 text-left text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus-visible:bg-rose-50 focus-visible:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 dark:focus-visible:bg-rose-950/40"
            onClick={() => onDeleteRoot(contextMenu.path)}
          >
            {tr("app.context.delete", "Удалить")}
          </button>
        </>
      )}
    </div>
  );
}
