import type { StatusBarProps } from "./props";

export function StatusBar({ resultsCount, status, statusText, checkedPaths, activeSearchId, tr }: StatusBarProps) {
  return (
    <footer className="statusbar">
      <span>{tr("app.statusbar.found", "Найдено: {{count}} элементов", { count: resultsCount })}</span>
      <span>{tr("app.statusbar.status", "Статус: {{status}}", { status })}</span>
      <span>{tr("app.statusbar.time", "Время: {{elapsed}}", { elapsed: statusText.elapsed })}</span>
      {statusText.warning ? <span className="warning">{tr("app.statusbar.warningPrefix", "▲")} {statusText.warning}</span> : null}
      <span>{tr("app.statusbar.checked", "Проверено: {{count}}", { count: checkedPaths })}</span>
      <span>{tr("app.statusbar.searchId", "ID: {{id}}", { id: activeSearchId ?? "-" })}</span>
    </footer>
  );
}
