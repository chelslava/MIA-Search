# Progress Log

## 2026-03-24

### Выполнено
- Инициализирован проект и базовая архитектура (`src-tauri/core/commands/storage/platform`).
- Реализован потоковый поиск и отмена в backend.
- Реализованы основные фильтры/сортировки и интеграция frontend-backend.
- Добавлены stores (settings/history/favorites/profiles) и базовый UI.

## 2026-03-25

### Выполнено
- Исправлен wildcard-поиск при лимитах (`/wc *.xls*` и аналогичные сценарии).
- Реализован параллельный поиск с потоковой выдачей:
  - worker pool с ограничением числа потоков;
  - безопасное объединение результатов через канал;
  - корректная отмена и `search_id`-безопасность событий.
- Существенно доработан компактный UI:
  - фиксированный status bar;
  - компактная левая панель с tree roots;
  - выбор root через системный диалог;
  - быстрые кнопки команд поиска с контекстными подсказками.
- Добавлен toggle включения regex в настройках.
- Расширены backend тесты по `core`, `commands`, `storage`, `platform`, `main`.
- Достигнуто покрытие backend >80%:
  - `cargo llvm-cov --summary-only`: **TOTAL Regions Cover 81.14%**.
- Проведены release perf-smoke прогоны (`plain`/`wildcard`) после перехода на streaming + parallel.
- Реализована двухфазная backend-выдача:
  - search stream отправляет lightweight результаты (без `size/created/modified`);
  - добавлена команда `search_enrich_metadata(paths)` для асинхронного догруза метаданных.
- Доведён index backend:
  - подтверждена работа `index_rebuild`/`index_status`;
  - `SearchBackend::Index` использует snapshot и fallback на scan при пустом индексе.
- Добавлены тесты для metadata helper и обновлённых search helper-ов.
- Успешно выполнен `cargo tauri build` (Windows, NSIS bundle).
- Добавлены финальные документы:
  - `docs/user_guide.md`;
  - `docs/release_notes_v0.1.0.md`.
- Обновлено управление режимами поиска:
  - быстрые кнопки под строкой работают как toggle-состояния;
  - команды в query для включения режимов больше не требуются.
- Управление index backend доведено до самодостаточного UX:
  - переключатель `Scan/Index` перенесён в настройки поиска;
  - добавлены `Rebuild index` и live-индикатор `index_status`;
  - добавлена авто-реиндексация по TTL/интервалу проверки.
- В Settings добавлены параметры авто-реиндексации:
  - `TTL авто-индекса (часы)`;
  - `Проверка индекса (мин)`.
- Добавлена горячая клавиша ручной реиндексации: `Ctrl/Cmd + Shift + R`.
- Для снижения UI-зависаний на стриме:
  - обновление результатов буферизуется и применяется батчами по кадрам;
  - metadata enrichment отложен до завершения активного поиска.

### Проверки
- `cargo test`: 68 passed, 0 failed, 2 ignored.
- `cargo tauri build`: успешно, артефакт `MIA Search_0.1.0_x64-setup.exe`.
- `npm run check`: успешно.
- `npm run test`: успешно.
- `npm run build`: успешно.

### Следующие шаги до MVP
- Проставить релизный тег `v0.1.0`.
