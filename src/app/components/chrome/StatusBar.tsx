import type { StatusBarProps } from "./props";

export function StatusBar({ resultsCount, status, statusText, checkedPaths, activeSearchId, tr }: StatusBarProps) {
  const isSearching = activeSearchId !== null;
  return (
    <footer
      role="status"
      aria-live="polite"
      aria-busy={isSearching}
      className="statusbar flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[11px] text-[var(--muted)]"
    >
      <span className="rounded-sm border border-[var(--border)] bg-[var(--surface-alt)] px-1.5 py-0.5 whitespace-nowrap text-[var(--text)]">
        {tr("app.statusbar.found", "Найдено: {{count}} элементов", { count: resultsCount })}
      </span>
      <span className="rounded-sm border border-[var(--border)] bg-[var(--surface-alt)] px-1.5 py-0.5 whitespace-nowrap text-[var(--text)]">
        {tr("app.statusbar.status", "Статус: {{status}}", { status })}
      </span>
      <span className="rounded-sm border border-[var(--border)] bg-[var(--surface-alt)] px-1.5 py-0.5 whitespace-nowrap text-[var(--text)]">
        {tr("app.statusbar.time", "Время: {{elapsed}}", { elapsed: statusText.elapsed })}
      </span>
      {statusText.warning ? (
        <span className="warning rounded-sm border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 whitespace-nowrap text-amber-300">
          {tr("app.statusbar.warningPrefix", "▲")} {statusText.warning}
        </span>
      ) : null}
      <span className="rounded-sm border border-[var(--border)] bg-[var(--surface-alt)] px-1.5 py-0.5 whitespace-nowrap text-[var(--text)]">
        {tr("app.statusbar.checked", "Проверено: {{count}}", { count: checkedPaths })} {statusText.progress !== "-" ? `(${statusText.progress})` : ""}
      </span>
      <span className="rounded-sm border border-[var(--border)] bg-[var(--surface-alt)] px-1.5 py-0.5 whitespace-nowrap text-[var(--text)]">
        {tr("app.statusbar.ttfr", "TTFR: {{value}}", { value: statusText.ttfr })}
      </span>
      <span className="rounded-sm border border-[var(--border)] bg-[var(--surface-alt)] px-1.5 py-0.5 whitespace-nowrap text-[var(--text)]">
        {tr("app.statusbar.throughput", "Скорость: {{value}}", { value: statusText.throughput })}
      </span>
      <span className="rounded-sm border border-[var(--border)] bg-[var(--surface-alt)] px-1.5 py-0.5 whitespace-nowrap text-[var(--text)]">
        {tr("app.statusbar.errors", "Ошибки: {{count}}", { count: statusText.errors })}
      </span>
      <span className="rounded-sm border border-[var(--border)] bg-[var(--surface-alt)] px-1.5 py-0.5 whitespace-nowrap text-[var(--text)]">
        {tr("app.statusbar.searchId", "ID: {{id}}", { id: activeSearchId ?? "-" })}
      </span>
    </footer>
  );
}
