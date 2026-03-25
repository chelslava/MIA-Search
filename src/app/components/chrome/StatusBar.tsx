import type { StatusBarProps } from "./props";

export function StatusBar({ resultsCount, status, statusText, checkedPaths, activeSearchId, tr }: StatusBarProps) {
  return (
    <footer className="statusbar flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] text-[var(--muted)]">
      <span className="rounded-full border border-[var(--border)] bg-[var(--surface-alt)] px-2 py-0.5 whitespace-nowrap text-[var(--text)]">
        {tr("app.statusbar.found", "Найдено: {{count}} элементов", { count: resultsCount })}
      </span>
      <span className="rounded-full border border-[var(--border)] bg-[var(--surface-alt)] px-2 py-0.5 whitespace-nowrap text-[var(--text)]">
        {tr("app.statusbar.status", "Статус: {{status}}", { status })}
      </span>
      <span className="rounded-full border border-[var(--border)] bg-[var(--surface-alt)] px-2 py-0.5 whitespace-nowrap text-[var(--text)]">
        {tr("app.statusbar.time", "Время: {{elapsed}}", { elapsed: statusText.elapsed })}
      </span>
      {statusText.warning ? (
        <span className="warning rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 whitespace-nowrap text-amber-300">
          {tr("app.statusbar.warningPrefix", "▲")} {statusText.warning}
        </span>
      ) : null}
      <span className="rounded-full border border-[var(--border)] bg-[var(--surface-alt)] px-2 py-0.5 whitespace-nowrap text-[var(--text)]">
        {tr("app.statusbar.checked", "Проверено: {{count}}", { count: checkedPaths })}
      </span>
      <span className="rounded-full border border-[var(--border)] bg-[var(--surface-alt)] px-2 py-0.5 whitespace-nowrap text-[var(--text)]">
        {tr("app.statusbar.searchId", "ID: {{id}}", { id: activeSearchId ?? "-" })}
      </span>
    </footer>
  );
}
