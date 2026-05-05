import { memo, useCallback } from "react";
import type { MouseEvent } from "react";
import type { SearchResultItem } from "../../../shared/search-types";
import { getFileIcon } from "../../utils/fileIcons";

export type { SearchResultItem };

interface ResultRowProps {
  item: SearchResultItem;
  selectedPath: string | null;
  selectedPaths: Set<string>;
  onSelectPath: (path: string) => void;
  onToggleSelection: (path: string, selected: boolean) => void;
  onResultContextMenu: (event: MouseEvent<HTMLTableRowElement>, item: SearchResultItem) => void;
  formatBytes: (size: number | null) => string;
  formatDate: (date: string | null) => string;
  t: (key: string, defaultValue: string, values?: Record<string, unknown>) => string;
  tOpenFile: string;
  tOpenParentFolder: string;
}

export const ResultRow = memo(function ResultRow({
  item,
  selectedPath,
  selectedPaths,
  onSelectPath,
  onToggleSelection,
  onResultContextMenu,
  formatBytes,
  formatDate,
  t,
  tOpenFile,
  tOpenParentFolder
}: ResultRowProps) {
  const isItemSelected = selectedPaths.has(item.full_path);
  const isFocused = selectedPath === item.full_path;

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      onToggleSelection(item.full_path, !isItemSelected);
    } else {
      onSelectPath(item.full_path);
    }
  }, [item.full_path, isItemSelected, onSelectPath, onToggleSelection]);

  const handleCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onToggleSelection(item.full_path, e.target.checked);
  }, [item.full_path, onToggleSelection]);

  const rowClassName = isItemSelected
    ? "cursor-pointer bg-[color-mix(in_srgb,var(--surface)_80%,var(--accent))] transition-colors hover:bg-[color-mix(in_srgb,var(--surface)_76%,var(--accent))] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-inset"
    : isFocused
    ? "cursor-pointer bg-[color-mix(in_srgb,var(--surface)_84%,var(--accent))] transition-colors hover:bg-[color-mix(in_srgb,var(--surface)_80%,var(--accent))] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-inset"
    : "cursor-pointer transition-colors hover:bg-[color-mix(in_srgb,var(--surface)_88%,var(--accent))] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-inset";

  return (
    <tr
      data-path={item.full_path}
      tabIndex={0}
      role="row"
      aria-selected={isFocused}
      className={rowClassName}
      onClick={handleClick}
      onContextMenu={(event: MouseEvent<HTMLTableRowElement>) => onResultContextMenu(event, item)}
      title={`${tOpenFile}: Enter, ${tOpenParentFolder}: Shift+Enter`}
    >
      <td className="border-b border-[var(--border)] px-1 py-1.5 whitespace-nowrap">
        <input
          type="checkbox"
          checked={isItemSelected}
          onChange={handleCheckboxChange}
          onClick={(e) => e.stopPropagation()}
          className="h-3.5 w-3.5 cursor-pointer accent-[var(--accent)]"
        />
      </td>
      <td className={`border-b border-[var(--border)] px-2 py-1.5 whitespace-nowrap ${item.hidden ? "text-[var(--muted)] opacity-60" : ""}`}>
        <span aria-hidden="true" className="text-base">
          {getFileIcon(item.extension, item.is_dir).icon}
        </span>
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
  );
}, (prev, next) => {
  return (
    prev.item.full_path === next.item.full_path &&
    prev.item.name === next.item.name &&
    prev.item.size === next.item.size &&
    prev.item.modified_at === next.item.modified_at &&
    prev.item.extension === next.item.extension &&
    prev.item.hidden === next.item.hidden &&
    prev.item.is_dir === next.item.is_dir &&
    prev.selectedPath === next.selectedPath &&
    prev.selectedPaths.has(prev.item.full_path) === next.selectedPaths.has(next.item.full_path)
  );
});

interface ResultCardProps {
  item: SearchResultItem;
  selectedPath: string | null;
  selectedPaths: Set<string>;
  onSelectPath: (path: string) => void;
  onToggleSelection: (path: string, selected: boolean) => void;
  formatBytes: (size: number | null) => string;
  t: (key: string, defaultValue: string, values?: Record<string, unknown>) => string;
}

export const ResultCard = memo(function ResultCard({
  item,
  selectedPath,
  selectedPaths,
  onSelectPath,
  onToggleSelection,
  formatBytes,
  t
}: ResultCardProps) {
  const isItemSelected = selectedPaths.has(item.full_path);
  const isFocused = selectedPath === item.full_path;

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      onToggleSelection(item.full_path, !isItemSelected);
    } else {
      onSelectPath(item.full_path);
    }
  }, [item.full_path, isItemSelected, onSelectPath, onToggleSelection]);

  const handleCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onToggleSelection(item.full_path, e.target.checked);
  }, [item.full_path, onToggleSelection]);

  const cardClassName = isItemSelected
    ? "cursor-pointer rounded-md border-2 border-[var(--accent)] bg-[color-mix(in_srgb,var(--surface)_88%,var(--accent))] p-2 transition-colors"
    : isFocused
    ? "cursor-pointer rounded-md border border-[var(--accent)] bg-[color-mix(in_srgb,var(--surface)_88%,var(--accent))] p-2 transition-colors"
    : "cursor-pointer rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 transition-colors hover:border-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--surface)_88%,var(--accent))]";

  return (
    <article
      role="listitem"
      aria-selected={isFocused}
      className={cardClassName}
      onClick={handleClick}
    >
      <div className="mb-1.5 flex items-start gap-1.5 text-xs font-semibold text-[var(--text)]">
        <input
          type="checkbox"
          checked={isItemSelected}
          onChange={handleCheckboxChange}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-pointer accent-[var(--accent)]"
        />
        <span aria-hidden="true" className="text-sm leading-none">
          {getFileIcon(item.extension, item.is_dir).icon}
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
  );
}, (prev, next) => {
  return (
    prev.item.full_path === next.item.full_path &&
    prev.item.name === next.item.name &&
    prev.item.size === next.item.size &&
    prev.item.extension === next.item.extension &&
    prev.item.hidden === next.item.hidden &&
    prev.item.is_dir === next.item.is_dir &&
    prev.selectedPath === next.selectedPath &&
    prev.selectedPaths.has(prev.item.full_path) === next.selectedPaths.has(next.item.full_path)
  );
});
