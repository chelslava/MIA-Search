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
  newRoot: string;
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
  onNewRootChange: (value: string) => void;
  onAddRoot: () => void;
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
    <ul className="space-y-1">
      {nodes.map((node) => {
        const expanded = expandedTree.includes(node.path);
        const children = treeChildren[node.path] ?? [];
        return (
          <li key={node.path}>
            <div
              className="flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-[var(--surface)]"
              style={{ paddingLeft: `${level * 10 + 2}px` }}
            >
              {node.has_children ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5 rounded-md"
                  onClick={() => onToggleTreeExpand(node.path)}
                  aria-label={expanded ? "collapse" : "expand"}
                >
                  {expanded ? "▾" : "▸"}
                </Button>
              ) : (
                <span className="inline-block h-5 w-5" />
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 min-w-0 flex-1 justify-start px-1.5 text-left font-normal"
                onClick={() => onSelectTreeRoot(node.path)}
                title={node.path}
              >
                <span className="mr-1 inline-flex w-4 justify-center" aria-hidden="true">
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
  newRoot,
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
  onNewRootChange,
  onAddRoot,
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
      className="left-panel space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-[var(--text)] shadow-sm"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const text = event.dataTransfer.getData("text/plain") || event.dataTransfer.getData("text/uri-list");
        if (text) onDropRootPath(text.replace("file://", "").trim());
      }}
    >
      <details open className="rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] p-2">
        <summary className="cursor-pointer list-none select-none rounded-md px-1.5 py-1 text-xs font-semibold text-[var(--text)] transition-colors hover:bg-[var(--surface)]">
          {tr("app.roots.summary", "Корневые пути")}
        </summary>
        <div className="mt-2 space-y-2">
          <strong className="block text-xs font-medium text-[var(--text)]">
            {tr("app.roots.primary", "Основной: {{path}}", { path: primaryRoot })}
          </strong>
          <div className="flex flex-col gap-1.5 sm:flex-row">
            <Input
              value={newRoot}
              onChange={(event) => onNewRootChange(event.target.value)}
              placeholder={tr("app.roots.newPath.placeholder", "Новый путь")}
            />
            <Button type="button" variant="secondary" size="sm" onClick={onAddRoot} className="shrink-0">
              {tr("app.roots.addPath", "Добавить путь")}
            </Button>
          </div>
          <ul className="space-y-1.5">
            {roots.map((root, index) => {
              const switchId = `root-enabled-${index}`;

              return (
                <li
                  key={root.path}
                  className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5"
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
                  <label htmlFor={switchId} className="min-w-0 cursor-pointer flex-1 truncate text-xs">
                    {root.path}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      </details>

      <details open className="rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] p-2">
        <summary className="cursor-pointer list-none select-none rounded-md px-1.5 py-1 text-xs font-semibold text-[var(--text)] transition-colors hover:bg-[var(--surface)]">
          {tr("app.computer.summary", "Этот компьютер")}
        </summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-md border border-[var(--border)] bg-[var(--surface)] p-1.5">
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

      <details open className="rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] p-2">
        <summary className="cursor-pointer list-none select-none rounded-md px-1.5 py-1 text-xs font-semibold text-[var(--text)] transition-colors hover:bg-[var(--surface)]">
          {tr("app.profiles.summary", "Профили поиска")}
        </summary>
        <div className="mt-2 space-y-2">
          <div className="flex flex-col gap-1.5 sm:flex-row">
            <Input
              value={newProfileName}
              onChange={(event) => onNewProfileNameChange(event.target.value)}
              placeholder={tr("app.profiles.name.placeholder", "Имя профиля")}
            />
            <Button type="button" variant="secondary" size="sm" onClick={onSaveProfile} className="shrink-0">
              {tr("app.profiles.save", "Сохранить")}
            </Button>
          </div>
          <ul className="space-y-1.5">
            {profiles.map((profile) => (
              <li
                key={profile.id}
                className="flex items-center justify-between gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-w-0 flex-1 justify-start px-1.5 text-left font-normal text-xs"
                  onClick={() => onApplyProfile(profile)}
                >
                  <span className="truncate">📁 {profile.name}</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 rounded-full"
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

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] p-2">
        <Button type="button" variant="ghost" size="sm" className="w-full justify-between px-1.5 font-semibold text-xs" onClick={onToggleHistoryOpen}>
          {tr("app.history.summary", "История поиска")}
          <span>{historyOpen ? "▾" : "▸"}</span>
        </Button>
        {historyOpen ? (
          <div className="mt-2 space-y-2">
            <Button type="button" variant="ghost" size="sm" className="w-full justify-start px-1.5 font-normal text-xs" onClick={() => void onClearHistory()}>
              {tr("app.history.clear", "Очистить историю")}
            </Button>
            <ul className="space-y-1.5">
              {history.queries.slice(0, 10).map((item, index) => (
                <li key={`${item.query}-${index}`} className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="min-w-0 w-full justify-start px-1.5 text-left font-normal text-xs"
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
