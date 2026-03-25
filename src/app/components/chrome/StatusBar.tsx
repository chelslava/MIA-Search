import type { StatusBarProps } from "./props";

export function StatusBar({ resultsCount, status, statusText, checkedPaths, activeSearchId, tr }: StatusBarProps) {
  return (
    <footer className="statusbar flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--muted)]">
      <span className="rounded-full border border-[var(--border)] bg-[var(--surface-alt)] px-2.5 py-1 text-[var(--text)]">
        {tr("app.statusbar.found", "Найдено: {{count}} элементов", { count: resultsCount })}
      </span>
      <span className="rounded-full border border-[var(--border)] bg-[var(--surface-alt)] px-2.5 py-1 text-[var(--text)]">
        {tr("app.statusbar.status", "Статус: {{status}}", { status })}
      </span>
      <span className="rounded-full border border-[var(--border)] bg-[var(--surface-alt)] px-2.5 py-1 text-[var(--text)]">
        {tr("app.statusbar.time", "Время: {{elapsed}}", { elapsed: statusText.elapsed })}
      </span>
      {statusText.warning ? (
        <span className="warning rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-amber-300">
          {tr("app.statusbar.warningPrefix", "▲")} {statusText.warning}
        </span>
      ) : null}
      <span className="rounded-full border border-[var(--border)] bg-[var(--surface-alt)] px-2.5 py-1 text-[var(--text)]">
        {tr("app.statusbar.checked", "Проверено: {{count}}", { count: checkedPaths })}
      </span>
      <span className="rounded-full border border-[var(--border)] bg-[var(--surface-alt)] px-2.5 py-1 text-[var(--text)]">
        {tr("app.statusbar.searchId", "ID: {{id}}", { id: activeSearchId ?? "-" })}
      </span>
    </footer>
  );
}
