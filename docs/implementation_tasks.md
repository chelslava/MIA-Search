# Backlog задач для реализации

## Статус выполнения (обновляется по ходу реализации)

Дата старта реализации: **24 марта 2026**

## Текущий прогресс

- Создан git-репозиторий.
- Создана базовая структура каталогов проекта.
- Собран минимальный backend-скелет в `src-tauri/**`.
- Frontend-часть и документация продолжают развиваться параллельно.

- `A-01` — Done
- `A-02` — Done
- `A-03` — Done
- `A-04` — Done
- `A-05` — Planned
- `B-01` — Done
- `B-02` — Done
- `B-03` — Done
- `B-04` — Done
- `B-05` — Done
- `B-06` — Done
- `B-07` — Done
- `C-01` — Done
- `C-02` — Done
- `C-03` — Done
- `C-04` — Done
- `C-05` — Done
- `D-01` — Done
- `D-02` — Done
- `D-03` — Planned
- `D-04` — Done
- `D-05` — Done
- `D-06` — Done
- `D-07` — Done
- `E-01` — Done
- `E-02` — Done
- `E-03` — Done
- `E-04` — Done
- `F-01`..`H-05` — Planned

Примечание:
- Факт создания структуры репозитория и модульных директорий закрывает `A-02`.
- Факт сборки backend-скелета закрывает `A-03` и `A-04`.
- Факт интеграции `rust_search` в `SearchService` закрывает `B-01`.
- Поддержка `location/more_locations` закрывает `B-02`.
- Поддержка `strict/ignore_case/hidden` закрывает `B-03`.
- Поддержка `depth/limit` и флага `limit_reached` закрывает `B-04`.
- Режимы files/dirs/mixed через `custom_filter` закрывают `B-05`.
- Потоковая выдача батчей через Tauri events (`search:batch`) закрывает `B-06`.
- Отмена поиска (ручная `search_cancel` и авто-отмена предыдущего запроса при новом `search_start`) закрывает `B-07`.
- Базовый UI запуска поиска и очистки закрывает `D-01`.
- Базовая панель root-путей (добавить/вкл/выкл) закрывает `D-02`.
- UI + request mapping для size/date фильтров закрывает `C-01` и `C-02`.
- Мультирасширение (N поисков + merge + dedupe) закрывает `C-03`.
- Режимы сортировки (relevance/name/size/modified/type) закрывают `C-04`.
- Этап сбора метаданных результатов закрывает `C-05`.
- Правая панель выбранного результата с метаданными закрывает `D-04`.
- Статус-область с count/status/limit/elapsed закрывает `D-05`.
- UX-блок (chips/reset, toast, skeleton) закрывает `D-06`.
- Горячие клавиши и командная палитра закрывают `D-07`.
- SettingsStore с загрузкой/сохранением на диск закрывает `E-01`.
- FavoritesStore + UI-отображение закрывает `E-03`.
- PresetsStore + сохранение/применение профилей в UI закрывает `E-04`.
- HistoryStore с ограничением размера истории закрывает `E-02`.
- Статусы будут обновляться после каждого завершённого блока работ.

Формат:
- ID: уникальный идентификатор задачи.
- Priority: `P0` (критично), `P1` (важно), `P2` (желательно).
- Estimate: оценка в днях.
- Depends on: зависимости.
- DoD: критерий готовности.

## Epic A. Базовая платформа и архитектура

### A-01. Инициализация проекта Tauri + React + TS
- Priority: P0
- Estimate: 1.0
- Depends on: -
- DoD:
  - Создан рабочий проект.
  - `src-tauri` и frontend собираются локально.
  - Есть базовый экран приложения.

### A-02. Базовая структура backend-слоёв
- Priority: P0
- Estimate: 0.5
- Depends on: A-01
- DoD:
  - Созданы модули `core`, `commands`, `storage`, `platform`.
  - Определены точки входа и зависимости между слоями.

### A-03. Контракт данных и типы
- Priority: P0
- Estimate: 0.5
- Depends on: A-02
- DoD:
  - Реализованы структуры `SearchRequest`, `SearchOptions`, `SearchFilter`, `SearchResultItem`.
  - Типы экспортируются в команды.

### A-04. IPC-команды Tauri (черновой набор)
- Priority: P0
- Estimate: 0.5
- Depends on: A-03
- DoD:
  - Есть команды: `search_start`, `search_cancel`, `settings_get`, `settings_set`.
  - Команды вызываются с frontend и возвращают корректные ответы.

### A-05. Логирование и базовая диагностика
- Priority: P1
- Estimate: 0.5
- Depends on: A-01
- DoD:
  - Настроен файл логов.
  - Логируются запуск/завершение поиска и ошибки.

## Epic B. Поисковое ядро (MVP)

### B-01. Интеграция `rust_search` через `SearchService`
- Priority: P0
- Estimate: 1.0
- Depends on: A-03
- DoD:
  - GUI не обращается к `SearchBuilder` напрямую.
  - `SearchService` преобразует `SearchRequest` в вызовы библиотеки.

### B-02. Поддержка корневого пути и дополнительных путей
- Priority: P0
- Estimate: 0.5
- Depends on: B-01
- DoD:
  - Поддержаны `location(...)` и `more_locations(...)`.
  - Поиск идёт по нескольким корням.

### B-03. Режимы strict / ignore_case / hidden
- Priority: P0
- Estimate: 0.5
- Depends on: B-01
- DoD:
  - Поддержаны `strict()`, `ignore_case()`, `hidden()`.
  - Настройки влияют на результат поиска.

### B-04. Глубина и лимит результатов
- Priority: P0
- Estimate: 0.5
- Depends on: B-01
- DoD:
  - Поддержаны `depth(...)` и `limit(...)`.
  - При достижении лимита формируется флаг `limit_reached`.

### B-05. Режимы type: files / dirs / mixed через `custom_filter`
- Priority: P0
- Estimate: 0.75
- Depends on: B-01
- DoD:
  - Реализованы 3 режима поиска.
  - Для files/dirs применяется `custom_filter(...)`.

### B-06. Потоковая выдача результатов
- Priority: P0
- Estimate: 1.0
- Depends on: B-01
- DoD:
  - Результаты отправляются батчами в UI.
  - Первый батч появляется до окончания полного обхода.

### B-07. Отмена поиска и отмена live-search запроса
- Priority: P0
- Estimate: 0.75
- Depends on: B-06
- DoD:
  - Ручная отмена останавливает текущую задачу.
  - Новый live-запрос отменяет предыдущий.

## Epic C. Расширенные фильтры и сортировки

### C-01. Фильтры по размеру
- Priority: P0
- Estimate: 0.75
- Depends on: B-01
- DoD:
  - Поддержаны `file_size_smaller/equal/greater`.
  - UI-конвертация единиц B/KB/MB/GB/TB реализована корректно.

### C-02. Фильтры по датам
- Priority: P0
- Estimate: 0.75
- Depends on: B-01
- DoD:
  - Поддержаны `created_before/after`, `modified_before/after`.
  - Корректная обработка timezone и пустых значений.

### C-03. Мультирасширение на уровне приложения
- Priority: P0
- Estimate: 1.0
- Depends on: B-01
- DoD:
  - Для N расширений выполняются N поисков.
  - Результаты объединяются и дедуплицируются.

### C-04. Сортировки: relevance/name/size/modified/type
- Priority: P0
- Estimate: 1.0
- Depends on: C-03
- DoD:
  - `relevance` использует `similarity_sort(...)`.
  - Остальные режимы сортируют на уровне приложения.

### C-05. Сбор метаданных результатов
- Priority: P0
- Estimate: 1.0
- Depends on: B-06
- DoD:
  - Для каждого результата заполнены: name, full_path, parent_path, type, ext, size, modified, hidden, source_root.
  - Ошибки чтения метаданных не прерывают поиск.

## Epic D. Интерфейс и UX

### D-01. Поисковая панель и запуск поиска
- Priority: P0
- Estimate: 0.75
- Depends on: A-04, B-06
- DoD:
  - Строка запроса, кнопки поиска и очистки работают.
  - Фокус и клавиатурная навигация корректны.

### D-02. Панель root-путей
- Priority: P0
- Estimate: 0.75
- Depends on: B-02
- DoD:
  - Можно добавить/удалить/временно отключить путь.
  - Передача активных путей в backend работает.

### D-03. Результаты: table/list/cards + виртуализация
- Priority: P1
- Estimate: 1.25
- Depends on: B-06
- DoD:
  - Есть 3 режима отображения.
  - Для больших списков используется виртуализация.

### D-04. Правая панель метаданных и быстрых действий
- Priority: P1
- Estimate: 0.75
- Depends on: C-05
- DoD:
  - Отображаются метаданные выбранного элемента.
  - Доступны быстрые действия.

### D-05. Статус-бар поиска
- Priority: P1
- Estimate: 0.5
- Depends on: B-06
- DoD:
  - Показываются count, scanned, status, elapsed, limit reached.

### D-06. Тема, toast, skeleton, чипы фильтров
- Priority: P1
- Estimate: 1.0
- Depends on: D-01
- DoD:
  - Есть светлая/тёмная тема.
  - Показаны активные фильтры и быстрый reset.
  - При загрузке отображаются skeleton.

### D-07. Горячие клавиши и командная палитра
- Priority: P1
- Estimate: 1.0
- Depends on: D-01
- DoD:
  - Работают: `Ctrl/Cmd+K`, `Ctrl/Cmd+F`, `Esc`, `Enter`, `Ctrl/Cmd+C`, `F5`.
  - Командная палитра открывается и выполняет действия.

## Epic E. Хранилища и пользовательские данные

### E-01. SettingsStore
- Priority: P0
- Estimate: 0.75
- Depends on: A-01
- DoD:
  - Настройки загружаются при старте и сохраняются при изменении.
  - Поддержаны параметры из ТЗ (минимум MVP-подмножество).

### E-02. HistoryStore
- Priority: P1
- Estimate: 0.75
- Depends on: A-01
- DoD:
  - Сохраняется история запросов и открытых результатов.
  - Есть ограничение размера истории.

### E-03. FavoritesStore
- Priority: P1
- Estimate: 0.5
- Depends on: A-01
- DoD:
  - Можно добавлять/удалять избранные пути.
  - Избранное отображается в UI.

### E-04. PresetsStore (профили поиска)
- Priority: P1
- Estimate: 1.0
- Depends on: E-01, D-02
- DoD:
  - Профиль сохраняет параметры и набор root-путей.
  - Профиль можно применить одним действием.

## Epic F. Платформенные действия

### F-01. Открытие файла/папки
- Priority: P0
- Estimate: 0.5
- Depends on: D-03
- DoD:
  - `open` работает на Windows, Linux, macOS.

### F-02. Показать в файловом менеджере и открыть parent
- Priority: P1
- Estimate: 0.75
- Depends on: F-01
- DoD:
  - `reveal` и `open parent` работают кроссплатформенно.

### F-03. Clipboard операции
- Priority: P1
- Estimate: 0.5
- Depends on: D-03
- DoD:
  - Копирование полного пути и имени работает стабильно.

## Epic G. Локализация и доступность

### G-01. Локализация RU/EN
- Priority: P1
- Estimate: 0.75
- Depends on: D-01
- DoD:
  - Переключение языка доступно в настройках.
  - Основные экраны локализованы.

### G-02. Доступность и клавиатурная навигация
- Priority: P1
- Estimate: 0.75
- Depends on: D-03
- DoD:
  - Все ключевые сценарии доступны с клавиатуры.
  - Фокусные состояния и контраст соответствуют базовым требованиям.

## Epic H. Качество и релиз

### H-01. Unit-тесты backend
- Priority: P0
- Estimate: 1.5
- Depends on: B-05, C-02, C-04
- DoD:
  - Покрыты сценарии из ТЗ: strict/ignore_case, size/date, files/dirs, merge, similarity.

### H-02. Integration-тесты поиска
- Priority: P0
- Estimate: 1.5
- Depends on: B-07, C-03
- DoD:
  - Тестируются hidden, depth, limit, multi-root, multi-ext, недоступные директории.

### H-03. UI-тесты ключевых сценариев
- Priority: P1
- Estimate: 1.0
- Depends on: D-07, E-04
- DoD:
  - Покрыты ввод запроса, фильтры, выбор результата, hotkeys, профили, история.

### H-04. Диагностический режим и метрики
- Priority: P1
- Estimate: 0.75
- Depends on: A-05, B-06
- DoD:
  - Показываются: time-to-first-result, total time, found, processed, access errors, filtered out.

### H-05. Кроссплатформенная сборка и smoke-test
- Priority: P0
- Estimate: 1.0
- Depends on: H-01, H-02
- DoD:
  - Сборки для Windows/Linux/macOS проходят.
  - Smoke-сценарии на 3 платформах закрыты.

## Рекомендуемый порядок выполнения (критический путь)
1. A-01 -> A-02 -> A-03 -> A-04
2. B-01 -> B-02/B-03/B-04/B-05
3. B-06 -> B-07
4. C-01/C-02/C-03 -> C-04 -> C-05
5. D-01 -> D-02 -> D-03 -> D-04 -> D-05
6. E-01 -> E-02/E-03/E-04
7. F-01 -> F-02/F-03
8. D-06/D-07 + G-01/G-02
9. H-01 -> H-02 -> H-03/H-04 -> H-05

## Sprint-расклад (пример на 5 спринтов)
- Sprint 1: A-01..A-05, B-01..B-03
- Sprint 2: B-04..B-07, D-01..D-02
- Sprint 3: C-01..C-05, D-03..D-05
- Sprint 4: E-01..E-04, F-01..F-03, D-06..D-07
- Sprint 5: G-01..G-02, H-01..H-05
