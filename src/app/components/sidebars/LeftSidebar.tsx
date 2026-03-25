import type { FsTreeNode, HistorySnapshot, SearchProfile } from "../../../shared/search-types";
import type { ContextMenuState, RootItem } from "../../types";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Switch } from "../../../components/ui/switch";

export type TranslateFn = (key: string, defaultValue: string, values?: Record<string, unknown>) => string;

export type LeftSidebarProps = {
  tr: TranslateFn;
  roots: RootItem[];
  primaryRoot: string;
  newProfileName: string;
  history: HistorySnapshot;
  profiles: SearchProfile[];
  computerRoots: FsTreeNode[];
  treeChildren: Record<string, FsTreeNode[]>;
  expandedTree: string[];
  historyOpen: boolean;
  onToggleHistoryOpen: () => void;
  onToggleTreeExpand: (path: string) => void;
  onSelectTreeRoot: (path: string) => void;
  onPickRootPath: () => void | Promise<void>;
  onRemoveRoot: (path: string) => void;
  onRootEnabledChange: (path: string, enabled: boolean) => void;
  onRootContextMenu: (state: Extract<ContextMenuState, { type: "root" }>) => void;
  onNewProfileNameChange: (value: string) => void;
  onSaveProfile: () => void;
  onApplyProfile: (profile: SearchProfile) => void;
  onDeleteProfile: (profileId: string) => void | Promise<void>;
  onClearHistory: () => void | Promise<void>;
  onSelectHistoryQuery: (query: string) => void;
  onDropRootPath: (path: string) => void;
};

function TreeBranch({
  nodes,
  level,
  expandedTree,
  treeChildren,
  onToggleTreeExpand,
  onSelectTreeRoot
}: {
  nodes: FsTreeNode[];
  level: number;
  expandedTree: string[];
  treeChildren: Record<string, FsTreeNode[]>;
  onToggleTreeExpand: (path: string) => void;
  onSelectTreeRoot: (path: string) => void;
}) {
  return (
    <ul className="space-y-0.5">
      {nodes.map((node) => {
        const expanded = expandedTree.includes(node.path);
        const children = treeChildren[node.path] ?? [];
        return (
          <li key={node.path}>
            <div
              className="flex items-center gap-0.5 rounded-sm px-0.5 py-0 hover:bg-[var(--surface)]"
              style={{ paddingLeft: `${level * 8 + 1}px` }}
            >
              {node.has_children ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-4 w-4 rounded-sm p-0 text-[10px]"
                  onClick={() => onToggleTreeExpand(node.path)}
                  aria-label={expanded ? "collapse" : "expand"}
                >
                  {expanded ? "▾" : "▸"}
                </Button>
              ) : (
                <span className="inline-block h-4 w-4" />
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-4 min-w-0 flex-1 justify-start rounded-sm px-0.5 text-left text-[11px] font-normal leading-none"
                onClick={() => onSelectTreeRoot(node.path)}
                title={node.path}
              >
                <span className="mr-0.5 inline-flex w-3 justify-center text-[10px]" aria-hidden="true">
                  {node.is_drive ? "💽" : "📁"}
                </span>
                <span className="block min-w-0 flex-1 truncate text-left">{node.name}</span>
              </Button>
            </div>
            {expanded && children.length > 0 ? (
              <TreeBranch
                nodes={children}
                level={level + 1}
                expandedTree={expandedTree}
                treeChildren={treeChildren}
                onToggleTreeExpand={onToggleTreeExpand}
                onSelectTreeRoot={onSelectTreeRoot}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function LeftSidebar({
  tr,
  roots,
  primaryRoot,
  newProfileName,
  history,
  profiles,
  computerRoots,
  treeChildren,
  expandedTree,
  historyOpen,
  onToggleHistoryOpen,
  onToggleTreeExpand,
  onSelectTreeRoot,
  onPickRootPath,
  onRemoveRoot,
  onRootEnabledChange,
  onRootContextMenu,
  onNewProfileNameChange,
  onSaveProfile,
  onApplyProfile,
  onDeleteProfile,
  onClearHistory,
  onSelectHistoryQuery,
  onDropRootPath
}: LeftSidebarProps) {
  return (
    <aside
      className="left-panel space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 text-[var(--text)] shadow-sm"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const text = event.dataTransfer.getData("text/plain") || event.dataTransfer.getData("text/uri-list");
        if (text) onDropRootPath(text.replace("file://", "").trim());
      }}
    >
      <details open className="rounded-md border border-[var(--border)] bg-[var(--surface-alt)] p-1.5">
        <summary className="cursor-pointer list-none select-none rounded-sm px-1 py-0.5 text-[11px] font-semibold text-[var(--text)] transition-colors hover:bg-[var(--surface)]">
          {tr("app.roots.summary", "Корневые пути")}
        </summary>
        <div className="mt-1.5 space-y-1.5">
          <strong className="block text-[11px] font-medium text-[var(--text)]">
            {tr("app.roots.primary", "Основной: {{path}}", { path: primaryRoot })}
          </strong>
          <div className="flex">
            <Button type="button" variant="secondary" size="sm" onClick={() => void onPickRootPath()} className="h-7 w-full px-2 text-[11px]">
              {tr("app.roots.pickPath", "Выбрать...")}
            </Button>
          </div>
          <ul className="space-y-1">
            {roots.map((root, index) => {
              const switchId = `root-enabled-${index}`;

              return (
                <li
                  key={root.path}
                  className="flex items-center gap-1 rounded-sm border border-[var(--border)] bg-[var(--surface)] px-1.5 py-1"
                  onContextMenu={(event) => {
                    event.preventDefault();
                    onRootContextMenu({ type: "root", x: event.clientX, y: event.clientY, path: root.path });
                  }}
                >
                  <Switch
                    id={switchId}
                    checked={root.enabled}
                    onCheckedChange={(checked) => onRootEnabledChange(root.path, checked)}
                  />
                  <label htmlFor={switchId} className="min-w-0 cursor-pointer flex-1 truncate text-[11px] leading-none">
                    {root.path}
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 rounded-sm text-[11px]"
                    onClick={() => onRemoveRoot(root.path)}
                    aria-label={tr("app.roots.removePath", "Удалить путь")}
                    title={tr("app.roots.removePath", "Удалить путь")}
                  >
                    ✕
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      </details>

      <details open className="rounded-md border border-[var(--border)] bg-[var(--surface-alt)] p-1.5">
        <summary className="cursor-pointer list-none select-none rounded-sm px-1 py-0.5 text-[11px] font-semibold text-[var(--text)] transition-colors hover:bg-[var(--surface)]">
          {tr("app.computer.summary", "Этот компьютер")}
        </summary>
        <div className="mt-1.5 max-h-64 overflow-auto rounded-sm border border-[var(--border)] bg-[var(--surface)] p-0.5">
          <TreeBranch
            nodes={computerRoots}
            level={0}
            expandedTree={expandedTree}
            treeChildren={treeChildren}
            onToggleTreeExpand={onToggleTreeExpand}
            onSelectTreeRoot={onSelectTreeRoot}
          />
        </div>
      </details>

      <details open className="rounded-md border border-[var(--border)] bg-[var(--surface-alt)] p-1.5">
        <summary className="cursor-pointer list-none select-none rounded-sm px-1 py-0.5 text-[11px] font-semibold text-[var(--text)] transition-colors hover:bg-[var(--surface)]">
          {tr("app.profiles.summary", "Профили поиска")}
        </summary>
        <div className="mt-1.5 space-y-1.5">
          <div className="flex flex-col gap-1 sm:flex-row">
            <Input
              value={newProfileName}
              onChange={(event) => onNewProfileNameChange(event.target.value)}
              placeholder={tr("app.profiles.name.placeholder", "Имя профиля")}
            />
            <Button type="button" variant="secondary" size="sm" onClick={onSaveProfile} className="h-7 shrink-0 px-2 text-[11px]">
              {tr("app.profiles.save", "Сохранить")}
            </Button>
          </div>
          <ul className="space-y-1">
            {profiles.map((profile) => (
              <li
                key={profile.id}
                className="flex items-center justify-between gap-1 rounded-sm border border-[var(--border)] bg-[var(--surface)] px-1.5 py-1"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-w-0 flex-1 justify-start px-1 text-left text-[11px] font-normal"
                  onClick={() => onApplyProfile(profile)}
                >
                  <span className="truncate">📁 {profile.name}</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0 rounded-sm text-[11px]"
                  onClick={() => void onDeleteProfile(profile.id)}
                  aria-label={tr("app.profiles.delete", "Удалить профиль")}
                >
                  ✕
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </details>

      <section className="rounded-md border border-[var(--border)] bg-[var(--surface-alt)] p-1.5">
        <Button type="button" variant="ghost" size="sm" className="h-6 w-full justify-between px-1 text-[11px] font-semibold" onClick={onToggleHistoryOpen}>
          {tr("app.history.summary", "История поиска")}
          <span>{historyOpen ? "▾" : "▸"}</span>
        </Button>
        {historyOpen ? (
          <div className="mt-1.5 space-y-1.5">
            <Button type="button" variant="ghost" size="sm" className="h-6 w-full justify-start px-1 text-[11px] font-normal" onClick={() => void onClearHistory()}>
              {tr("app.history.clear", "Очистить историю")}
            </Button>
            <ul className="space-y-1">
              {history.queries.slice(0, 10).map((item, index) => (
                <li key={`${item.query}-${index}`} className="rounded-sm border border-[var(--border)] bg-[var(--surface)] px-1.5 py-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 min-w-0 w-full justify-start px-1 text-left text-[11px] font-normal"
                    onClick={() => onSelectHistoryQuery(item.query)}
                  >
                    <span className="truncate">{item.query || tr("app.history.emptyQuery", "(пустой запрос)")}</span>
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </aside>
  );
}
