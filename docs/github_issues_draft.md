# GitHub Issues Draft

Ниже готовые заготовки задач для переноса в GitHub Issues.
Рекомендуемые labels: `epic`, `backend`, `frontend`, `infra`, `ux`, `qa`, `p0`, `p1`, `p2`.

## 1. [P0] Bootstrap Tauri 2 + React + TypeScript
- Labels: `epic:platform`, `infra`, `p0`
- Depends on: -
- Description:
  - Инициализировать desktop-проект на Tauri 2.
  - Подключить React + TypeScript.
  - Настроить базовую структуру директорий `src-tauri/` и `src/`.
- Acceptance Criteria:
  - Проект собирается и запускается локально.
  - Есть базовый экран приложения.
  - Работает hot-reload для frontend.

## 2. [P0] Implement backend layering and core models
- Labels: `epic:platform`, `backend`, `p0`
- Depends on: #1
- Description:
  - Создать слои: `core`, `commands`, `storage`, `platform`.
  - Реализовать `SearchRequest`, `SearchOptions`, `SearchFilter`, `SearchResultItem`.
- Acceptance Criteria:
  - Модели валидируются и используются в Tauri-командах.
  - GUI не связан напрямую с `SearchBuilder`.

## 3. [P0] Create SearchService wrapper over rust_search
- Labels: `epic:search`, `backend`, `p0`
- Depends on: #2
- Description:
  - Реализовать обёртку над `rust_search` с маппингом параметров из `SearchRequest`.
  - Поддержать query, root(s), ext (single), strict, ignore_case, hidden, depth, limit.
- Acceptance Criteria:
  - Запросы выполняются через единый `SearchService`.
  - Набор параметров влияет на выдачу в тестах.

## 4. [P0] Add entry kind modes via custom_filter (files/dirs/mixed)
- Labels: `epic:search`, `backend`, `p0`
- Depends on: #3
- Description:
  - Реализовать режимы поиска: только файлы, только директории, смешанный.
  - Использовать `custom_filter(...)` для files/dirs режимов.
- Acceptance Criteria:
  - Для каждого режима возвращаются корректные типы результатов.

## 5. [P0] Stream search results to UI + cancellation
- Labels: `epic:search`, `backend`, `frontend`, `p0`
- Depends on: #3
- Description:
  - Отправлять результаты в UI батчами.
  - Добавить ручную отмену и авто-отмену для live search.
- Acceptance Criteria:
  - Первый батч приходит до полного завершения поиска.
  - Отмена останавливает активный поиск без падений.

## 6. [P0] Build MVP search UI
- Labels: `epic:ui`, `frontend`, `p0`
- Depends on: #5
- Description:
  - Поисковая строка, кнопки search/clear.
  - Панель root-путей.
  - Список результатов и действие `open` + `copy path`.
- Acceptance Criteria:
  - Поиск запускается из UI.
  - Результаты отображаются потоково.

## 7. [P0] Add size and date filters
- Labels: `epic:filters`, `backend`, `frontend`, `p0`
- Depends on: #3
- Description:
  - Size: greater/smaller/equal + B/KB/MB/GB/TB.
  - Date: created before/after, modified before/after.
- Acceptance Criteria:
  - Фильтры корректно влияют на выдачу.
  - Есть unit-тесты для преобразования фильтров.

## 8. [P0] Implement multi-extension search (app-level orchestration)
- Labels: `epic:filters`, `backend`, `p0`
- Depends on: #3
- Description:
  - Выполнять несколько поисков (по одному на расширение).
  - Объединять результаты, удалять дубликаты.
- Acceptance Criteria:
  - Несколько расширений задаются через UI.
  - Итоговая выдача без дубликатов.

## 9. [P0] Implement sorting modes incl. similarity_sort
- Labels: `epic:search`, `backend`, `frontend`, `p0`
- Depends on: #8
- Description:
  - Сортировки: relevance/name/size/modified/type.
  - Для relevance использовать `similarity_sort(...)`.
- Acceptance Criteria:
  - Смена режима сортировки обновляет выдачу.
  - relevance использует API библиотеки.

## 10. [P0] MetadataService and enriched result cards
- Labels: `epic:search`, `backend`, `frontend`, `p0`
- Depends on: #5
- Description:
  - Пост-обработка путей: name, full path, parent, ext, size, modified, hidden, source root.
- Acceptance Criteria:
  - Каждая запись в UI содержит ключевые метаданные.
  - Ошибки метаданных логируются и не роняют поиск.

## 11. [P1] Settings, history, favorites, presets storage
- Labels: `epic:state`, `backend`, `frontend`, `p1`
- Depends on: #6
- Description:
  - Реализовать local store: настройки, история, избранное, профили.
- Acceptance Criteria:
  - Данные сохраняются между запусками.
  - Профиль применяет параметры одним действием.

## 12. [P1] UX polish: themes, chips, toasts, skeleton, status bar
- Labels: `epic:ux`, `frontend`, `p1`
- Depends on: #6
- Description:
  - Темы light/dark/system.
  - Активные фильтры-чипы и reset all.
  - Toast/skeleton/status bar.
- Acceptance Criteria:
  - UI отзывчивый и информативный при долгом поиске.

## 13. [P1] Virtualized results and keyboard shortcuts
- Labels: `epic:ux`, `frontend`, `p1`
- Depends on: #6
- Description:
  - Виртуализация длинных списков.
  - Горячие клавиши из ТЗ.
- Acceptance Criteria:
  - Нет лагов на больших объёмах.
  - Хоткеи работают по спецификации.

## 14. [P1] Cross-platform file actions
- Labels: `epic:platform`, `backend`, `p1`
- Depends on: #10
- Description:
  - Open, open parent, reveal in explorer/finder, clipboard.
- Acceptance Criteria:
  - Действия работают на Windows/Linux/macOS.

## 15. [P1] Localization RU/EN and accessibility baseline
- Labels: `epic:i18n`, `frontend`, `p1`
- Depends on: #12
- Description:
  - Локализация двух языков.
  - Базовая доступность: фокус, контраст, keyboard-only flow.
- Acceptance Criteria:
  - UI переключается между RU/EN.
  - Ключевые сценарии доступны с клавиатуры.

## 16. [P0] Test suite: unit + integration + UI smoke
- Labels: `epic:qa`, `qa`, `p0`
- Depends on: #9, #10
- Description:
  - Unit, integration и UI тесты по ТЗ.
- Acceptance Criteria:
  - Критические сценарии покрыты.
  - CI прогоняет тесты без регрессий.

## 17. [P0] Release builds for Windows/Linux/macOS
- Labels: `epic:release`, `infra`, `qa`, `p0`
- Depends on: #16
- Description:
  - Настроить release pipeline и smoke-check сборок на 3 платформах.
- Acceptance Criteria:
  - Есть успешные релизные артефакты для 3 ОС.
  - Выполнен финальный checklist приёмки.
