# План реализации проекта MIA Search (Rust_Search + Tauri)

## 1. Инициация и каркас (1 неделя)
- Утвердить архитектуру: `Core Search Layer` / `Application Layer` / `Presentation Layer`.
- Поднять проект: `Tauri 2 + React + TypeScript + Tailwind + shadcn/ui`.
- Создать базовые Rust-модули: `models`, `search_service`, `metadata_service`, `settings_service`.
- Подключить логирование и формат хранения настроек (`JSON` или `TOML`).
- Результат этапа: запускается desktop-приложение с рабочим IPC между UI и Rust.

## 2. MVP-поиск (2 недели)
- Реализовать модели: `SearchRequest`, `SearchOptions`, `SearchFilter`, `SearchResultItem`.
- Сделать backend-обёртку над `SearchBuilder` (GUI не должен работать с ним напрямую).
- Поддержать параметры поиска: query, roots, strict, ignore_case, hidden, depth, limit, ext (1 расширение).
- Добавить `custom_filter` для режимов: только файлы / только директории / смешанный.
- Реализовать потоковую выдачу результатов и отмену поиска.
- UI: строка поиска, roots panel, список результатов, действия `open` и `copy path`.
- Результат этапа: рабочий неблокирующий поиск с потоковыми результатами.

## 3. Расширенные фильтры и сортировка (1.5 недели)
- Фильтры размера: `greater/smaller/equal` + единицы B..TB.
- Фильтры дат: created/modified before/after.
- Мультирасширение на уровне приложения: несколько запусков + merge + dedupe + общая сортировка.
- Сортировки: relevance (`similarity_sort`), name, size, modified, type.
- Сбор метаданных отдельным этапом после получения путей.
- Результат этапа: полный набор фильтров и сортировок из ТЗ.

## 4. Состояние, профили, история, избранное (1 неделя)
- Реализовать хранилища: history, favorites, presets, settings.
- UI для сохранённых профилей и недавних директорий.
- Поддержать включение/выключение root-путей и сохранение наборов путей.
- Результат этапа: повторяемые сценарии поиска в 1 клик.

## 5. UX и производительность (1 неделя)
- Debounce и live search с авто-отменой предыдущего поиска.
- Виртуализированный список результатов.
- Горячие клавиши, командная палитра, контекстное меню, toast, skeleton.
- Светлая/тёмная тема, статус-бар (progress, scanned, time, limit reached).
- Результат этапа: отзывчивый и удобный интерфейс.

## 6. Платформенные действия и стабильность (0.5-1 неделя)
- Реализовать `open`, `open parent`, `reveal in explorer/finder`, `clipboard`.
- Обработать ошибки доступа и недоступные каталоги без аварий.
- Логи: search runs, errors, system actions; диагностический режим.
- Результат этапа: кроссплатформенная стабильная работа системных действий.

## 7. Локализация и финализация (0.5 недели)
- Реализовать i18n RU/EN и переключение языка.
- Добавить настройки: тема, debounce, default limit, hidden default, date/size format и другое.
- Финальная полировка UX.
- Результат этапа: функционально завершённая сборка.

## 8. Тестирование и релиз (1-1.5 недели)
- Unit-тесты: маппинг request, strict/ignore_case, size/date filters, custom_filter, merge/similarity.
- Integration-тесты: hidden/depth/limits/multi-root/multi-ext/permission errors.
- UI-тесты ключевых сценариев и hotkeys.
- Smoke-тесты и сборки для Windows, Linux и macOS.
- Результат этапа: релиз-кандидат, проходящий критерии приёмки.

## Milestones
1. Неделя 1: каркас + IPC.
2. Неделя 3: готовый MVP-поиск.
3. Неделя 5: все фильтры и сортировки.
4. Неделя 7: профили, история, UX и производительность.
5. Неделя 9-10: тесты, локализация, релиз.

## Backlog v0.1.3 (Stabilization + Performance Baseline)

### P0
- [x] `exclude_paths` в `SearchRequest` (UI + backend) с фильтрацией результатов по path-маскам.
- [x] Тесты edge-case для exclude (пустые значения, dedupe, совместимость сериализации/истории).
- [x] Базовая стабилизация сообщений ошибок pipeline поиска для UI (единый формат `[SEARCH_*]` + friendly status).

### P1
- [x] Подготовка perf-smoke как отдельного CI job (non-blocking) с логированием TTFR/throughput.
- [x] Интеграционные тесты на `permission denied` и `missing path`.

### P2
- [x] UX-полировка фильтров: подсказки и примеры масок для исключений.

### Definition of Done v0.1.3
- Проходят `npm run check`, `npm run test`, `npm run build`, `cargo test`.
- Покрытие backend не ниже CI gate.
- Обновлены `user_guide` и release notes для `v0.1.3`.

## Backlog v0.1.4 (Feature Depth + Reliability)

### P0
- Инкрементальная индексация без полного rebuild.
- E2E smoke сценарии: `search -> filters -> actions` и `index rebuild -> fallback`.

### P1
- Batch actions по выдаче (multi-select + copy/open/reveal).
- Кэш метаданных + ленивое обогащение для больших выборок.

### P2
- Диагностический snapshot для поддержки (структурные логи + экспорт).

### Definition of Done v0.1.4
- Ускорение повторных поисков в index mode.
- Стабильный e2e smoke в CI.
- Снижение регрессий по релизной статистике ошибок.

## Осталось до v0.1.3
1. Подготовить финальные release notes `v0.1.3` под тег.
2. Выполнить pre-release smoke на Windows installer.
3. Закрыть PR `dev -> main` после зеленого CI.
