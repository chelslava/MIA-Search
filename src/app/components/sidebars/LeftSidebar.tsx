import type { HistorySnapshot, SearchProfile } from "../../../shared/search-types";
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
  favorites: string[];
  history: HistorySnapshot;
  profiles: SearchProfile[];
  onNewRootChange: (value: string) => void;
  onAddRoot: () => void;
  onRootEnabledChange: (path: string, enabled: boolean) => void;
  onRootContextMenu: (state: Extract<ContextMenuState, { type: "root" }>) => void;
  onNewProfileNameChange: (value: string) => void;
  onSaveProfile: () => void;
  onApplyProfile: (profile: SearchProfile) => void;
  onDeleteProfile: (profileId: string) => void | Promise<void>;
  onOpenFavorite: (path: string) => void | Promise<void>;
  onRemoveFavorite: (path: string) => void | Promise<void>;
  onClearHistory: () => void | Promise<void>;
  onSelectHistoryQuery: (query: string) => void;
  onDropRootPath: (path: string) => void;
};

export function LeftSidebar({
  tr,
  roots,
  primaryRoot,
  newRoot,
  newProfileName,
  favorites,
  history,
  profiles,
  onNewRootChange,
  onAddRoot,
  onRootEnabledChange,
  onRootContextMenu,
  onNewProfileNameChange,
  onSaveProfile,
  onApplyProfile,
  onDeleteProfile,
  onOpenFavorite,
  onRemoveFavorite,
  onClearHistory,
  onSelectHistoryQuery,
  onDropRootPath
}: LeftSidebarProps) {
  return (
    <aside
      className="left-panel space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-[var(--text)] shadow-sm"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const text = event.dataTransfer.getData("text/plain") || event.dataTransfer.getData("text/uri-list");
        if (text) onDropRootPath(text.replace("file://", "").trim());
      }}
    >
      <details open className="rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-3">
        <summary className="cursor-pointer list-none select-none rounded-lg px-2 py-1 text-sm font-semibold text-[var(--text)] transition-colors hover:bg-[var(--surface)]">
          {tr("app.roots.summary", "Корневые пути")}
        </summary>
        <div className="mt-3 space-y-3">
          <strong className="block text-sm font-medium text-[var(--text)]">
            {tr("app.roots.primary", "Основной: {{path}}", { path: primaryRoot })}
          </strong>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={newRoot}
              onChange={(event) => onNewRootChange(event.target.value)}
              placeholder={tr("app.roots.newPath.placeholder", "Новый путь")}
            />
            <Button type="button" variant="secondary" onClick={onAddRoot} className="shrink-0">
              {tr("app.roots.addPath", "Добавить путь")}
            </Button>
          </div>
          <ul className="space-y-2">
            {roots.map((root, index) => {
              const switchId = `root-enabled-${index}`;

              return (
                <li
                  key={root.path}
                  className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
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
                  <label htmlFor={switchId} className="min-w-0 cursor-pointer flex-1 truncate text-sm">
                    {root.path}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      </details>

      <details open className="rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-3">
        <summary className="cursor-pointer list-none select-none rounded-lg px-2 py-1 text-sm font-semibold text-[var(--text)] transition-colors hover:bg-[var(--surface)]">
          {tr("app.profiles.summary", "Профили поиска")}
        </summary>
        <div className="mt-3 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={newProfileName}
              onChange={(event) => onNewProfileNameChange(event.target.value)}
              placeholder={tr("app.profiles.name.placeholder", "Имя профиля")}
            />
            <Button type="button" variant="secondary" onClick={onSaveProfile} className="shrink-0">
              {tr("app.profiles.save", "Сохранить")}
            </Button>
          </div>
          <ul className="space-y-2">
            {profiles.map((profile) => (
              <li
                key={profile.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-w-0 flex-1 justify-start px-2 text-left font-normal"
                  onClick={() => onApplyProfile(profile)}
                >
                  <span className="truncate">📁 {profile.name}</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-full"
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

      <details open className="rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-3">
        <summary className="cursor-pointer list-none select-none rounded-lg px-2 py-1 text-sm font-semibold text-[var(--text)] transition-colors hover:bg-[var(--surface)]">
          {tr("app.favorites.summary", "Избранное")}
        </summary>
        <div className="mt-3 space-y-3">
          <ul className="space-y-2">
            {favorites.map((path) => (
              <li
                key={path}
                className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-w-0 flex-1 justify-start px-2 text-left font-normal"
                  onClick={() => void onOpenFavorite(path)}
                >
                  <span className="truncate">⭐ {path}</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-full"
                  onClick={() => void onRemoveFavorite(path)}
                  aria-label={tr("app.favorites.remove", "Удалить из избранного")}
                >
                  ✕
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </details>

      <details open className="rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-3">
        <summary className="cursor-pointer list-none select-none rounded-lg px-2 py-1 text-sm font-semibold text-[var(--text)] transition-colors hover:bg-[var(--surface)]">
          {tr("app.history.summary", "История поиска")}
        </summary>
        <div className="mt-3 space-y-3">
          <Button type="button" variant="ghost" className="w-full justify-start px-2 font-normal" onClick={() => void onClearHistory()}>
            {tr("app.history.clear", "Очистить историю")}
          </Button>
          <ul className="space-y-2">
            {history.queries.slice(0, 10).map((item, index) => (
              <li key={`${item.query}-${index}`} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-w-0 w-full justify-start px-2 text-left font-normal"
                  onClick={() => onSelectHistoryQuery(item.query)}
                >
                  <span className="truncate">{item.query || tr("app.history.emptyQuery", "(пустой запрос)")}</span>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </aside>
  );
}
