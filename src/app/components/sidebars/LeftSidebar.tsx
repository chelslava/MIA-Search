import type { HistorySnapshot, SearchProfile } from "../../../shared/search-types";
import type { ContextMenuState, RootItem } from "../../types";

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
      className="left-panel"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const text = event.dataTransfer.getData("text/plain") || event.dataTransfer.getData("text/uri-list");
        if (text) onDropRootPath(text.replace("file://", "").trim());
      }}
    >
      <details open>
        <summary>{tr("app.roots.summary", "Корневые пути")}</summary>
        <div className="section-block">
          <strong>{tr("app.roots.primary", "Основной: {{path}}", { path: primaryRoot })}</strong>
          <div className="inline-row">
            <input value={newRoot} onChange={(event) => onNewRootChange(event.target.value)} placeholder={tr("app.roots.newPath.placeholder", "Новый путь")} />
            <button type="button" onClick={onAddRoot}>
              {tr("app.roots.addPath", "Добавить путь")}
            </button>
          </div>
          <ul className="list">
            {roots.map((root) => (
              <li
                key={root.path}
                onContextMenu={(event) => {
                  event.preventDefault();
                  onRootContextMenu({ type: "root", x: event.clientX, y: event.clientY, path: root.path });
                }}
              >
                <label>
                  <input
                    type="checkbox"
                    checked={root.enabled}
                    onChange={(event) => onRootEnabledChange(root.path, event.target.checked)}
                  />
                  <span>{root.path}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      </details>

      <details open>
        <summary>{tr("app.profiles.summary", "Профили поиска")}</summary>
        <div className="section-block">
          <div className="inline-row">
            <input
              value={newProfileName}
              onChange={(event) => onNewProfileNameChange(event.target.value)}
              placeholder={tr("app.profiles.name.placeholder", "Имя профиля")}
            />
            <button type="button" onClick={onSaveProfile}>
              {tr("app.profiles.save", "Сохранить")}
            </button>
          </div>
          <ul className="list">
            {profiles.map((profile) => (
              <li key={profile.id}>
                <button type="button" className="link-btn" onClick={() => onApplyProfile(profile)}>
                  📁 {profile.name}
                </button>
                <button type="button" className="x-btn" onClick={() => void onDeleteProfile(profile.id)}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      </details>

      <details open>
        <summary>{tr("app.favorites.summary", "Избранное")}</summary>
        <div className="section-block">
          <ul className="list">
            {favorites.map((path) => (
              <li key={path}>
                <button type="button" className="link-btn" onClick={() => void onOpenFavorite(path)}>
                  ⭐ {path}
                </button>
                <button type="button" className="x-btn" onClick={() => void onRemoveFavorite(path)}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      </details>

      <details open>
        <summary>{tr("app.history.summary", "История поиска")}</summary>
        <div className="section-block">
          <button type="button" className="ghost-btn" onClick={() => void onClearHistory()}>
            {tr("app.history.clear", "Очистить историю")}
          </button>
          <ul className="list">
            {history.queries.slice(0, 10).map((item, index) => (
              <li key={`${item.query}-${index}`}>
                <button type="button" className="link-btn" onClick={() => onSelectHistoryQuery(item.query)}>
                  {item.query || tr("app.history.emptyQuery", "(пустой запрос)")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </aside>
  );
}
