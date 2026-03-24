# Progress Log

## 2026-03-24

### Выполнено
- Инициализирован git-репозиторий в `d:/Repo/MIA-Search`.
- Создана структура проекта по ТЗ (`src-tauri`, `src`, `public`, `docs`).
- Поднят минимальный frontend-скелет (`React + TypeScript`) с базовым `App`.
- Поднят backend-скелет Tauri с модулями `commands/core/storage/platform`.
- Подключён `rust_search = 2.1.0` и реализован `SearchService::execute(...)`.
- Реализованы:
  - multi-root (`location` + `more_locations`);
  - strict / ignore_case / hidden;
  - depth / limit;
  - files / dirs / mixed через `custom_filter`;
  - ответ `search_start` с подтверждением запуска и `search_id`.
  - потоковая выдача через события Tauri: `search:batch`, `search:done`, `search:cancelled`, `search:error`;
  - отмена текущего поиска при `search_cancel`;
  - авто-отмена предыдущего поиска при новом `search_start`.
  - frontend-интеграция с Tauri commands/events:
    - invoke: `search_start`, `search_cancel`;
    - listen: `search:batch`, `search:done`, `search:cancelled`, `search:error`;
  - UI-секции для `D-01` и `D-02`: search controls, roots panel, потоковый список результатов и статус.
  - UI-фильтры: extension list, size filter, date filters.
  - Мультирасширение в backend: N запусков + merge + dedupe.
  - Переключаемые режимы сортировки: relevance / name / size / modified / type.
  - Правая панель метаданных выбранного результата (`D-04`).
  - Статус-область с elapsed временем (`D-05`).
  - persistence-блок:
    - загрузка state на старте (`AppState::bootstrap`, stores `load()`);
    - сохранение settings/profiles/favorites/history на диск (`persist()`);
    - команды `favorites_*` и `history_*`.
  - UI-подключение persistence:
    - отображение favorites/history/profiles;
    - сохранение и применение профилей;
    - добавление/удаление избранного для выбранного результата.
  - Для истории добавлен лимит размера (`max_history_entries`) с обрезкой старых записей.

### Проверки
- `cargo check` (в `src-tauri`) проходит успешно.
- `npm run check` проходит успешно.
- `npm run build` проходит успешно (в sandbox запуск требуется с elevated permissions из-за `spawn EPERM`).

### Ограничения окружения
- В sandbox `vite build` периодически падает с `spawn EPERM`; elevated-run решает проблему.

### Следующий шаг
- Перейти к UX-блоку `D-06`/`D-07` (chips/toast/skeleton/hotkeys/command palette).
