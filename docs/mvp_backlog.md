# MVP Backlog (до первого релиза)

Цель MVP: закрыть базовый и продвинутый поиск из ТЗ с потоковой выдачей, без полной финализации UX/i18n.

## Scope MVP (Must Have)

1. Платформа и архитектура
- [x] Инициализация `Tauri 2 + React + TS`
- [x] Backend-слои и модели данных (`SearchRequest`, `SearchResultItem`, ...)
- [x] IPC-команды поиска и настроек

2. Core поиск
- [x] `SearchService`-обёртка над `rust_search`
- [x] Поддержка multi-root (`location` + `more_locations`)
- [x] Поддержка `strict`, `ignore_case`, `hidden`, `depth`, `limit`
- [x] Режимы files/dirs/mixed через `custom_filter`
- [x] Потоковая выдача батчами
- [x] Отмена поиска (ручная + для live mode)

3. Фильтры и сортировка
- [x] Фильтр по расширению (single)
- [x] Мультирасширение на уровне приложения (merge + dedupe)
- [x] Фильтры размера (>, <, =)
- [x] Фильтры дат (created/modified before/after)
- [x] Сортировки: relevance (`similarity_sort`), name, size, modified, type

4. UI MVP
- [x] Строка поиска + search/clear
- [x] Панель корневых путей
- [x] Список результатов (минимум table/list)
- [x] Базовая правая панель метаданных
- [x] Статус-бар: count/status/time/limit reached
- [x] Чипы активных фильтров + reset
- [x] Toast/skeleton/hotkeys/command palette

5. Действия над результатами
- [x] Open
- [x] Open parent
- [x] Reveal in file manager
- [x] Copy full path / copy name

6. Базовое хранение данных
- [x] Настройки (минимальный набор)
- [x] История запросов
- [x] Профили поиска (минимально: save/load)

7. Качество MVP
- [x] Unit-тесты ядра (минимальный критичный набор)
- [x] Integration-тесты (multi-root, limits, hidden, filters)
- [ ] Smoke на целевой ОС (минимум Windows)

## Out of MVP (в следующую фазу)
- Полная локализация RU/EN.
- Командная палитра.
- Продвинутые UX-анимации и cards-view.
- Полный набор accessibility-проверок.
- Расширенная диагностика и экспорт/импорт настроек.
- Полноценные кроссплатформенные release-пайплайны.

## Definition of Done для MVP
- Поиск не блокирует интерфейс.
- Результаты приходят потоково.
- Доступны файлы/директории/смешанный режим.
- Работают фильтры по расширению, глубине, лимиту, размеру, датам.
- Работает релевантная сортировка через `similarity_sort`.
- Есть история и сохранённые профили (базово).
- Стабильная desktop-сборка минимум для Windows.
