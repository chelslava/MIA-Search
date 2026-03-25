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
    <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} role="menu">
      {contextMenu.type === "result" ? (
        <>
          <button type="button" onClick={() => onOpenPath(contextMenu.item.full_path)}>{tr("app.context.open", "Открыть")}</button>
          <button type="button" onClick={() => onOpenParent(contextMenu.item.full_path)}>{tr("app.context.openParent", "Открыть родительскую папку")}</button>
          <button type="button" onClick={() => onRevealPath(contextMenu.item.full_path)}>{tr("app.context.reveal", "Показать в файловом менеджере")}</button>
          <button type="button" onClick={() => onCopyPath(contextMenu.item.full_path)}>{tr("app.context.copyPath", "Копировать полный путь")}</button>
          <button type="button" onClick={() => onCopyName(contextMenu.item.name)}>{tr("app.context.copyName", "Копировать имя")}</button>
          <button type="button" onClick={() => onAddFavorite(contextMenu.item.full_path)}>{tr("app.context.addFavorite", "Добавить в избранное")}</button>
        </>
      ) : (
        <>
          <button type="button" onClick={() => onSetPrimaryRoot(contextMenu.path)}>{tr("app.context.makePrimary", "Сделать основным")}</button>
          <button type="button" onClick={() => onDeleteRoot(contextMenu.path)}>{tr("app.context.delete", "Удалить")}</button>
        </>
      )}
    </div>
  );
}
