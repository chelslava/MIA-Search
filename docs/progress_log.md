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

### Проверки
- `cargo test`: 61 passed, 0 failed.
- `npm run check`: успешно.
- `npm run test`: успешно (локально; в sandbox возможны ограничения `spawn EPERM`).

### Следующие шаги до MVP
- Финальный `cargo tauri build` и ручной Windows smoke на артефакте.
- Завершение пользовательской документации и MVP release notes.
