# План релизов v0.1.3 и v0.1.4

## Текущее состояние
- MVP-функционал поиска реализован и стабилизирован на `v0.1.2`.
- Release/CI baseline усилен: version sync по тегу, smoke проверка инсталлятора, coverage gate.
- Основные пробелы: мало e2e сценариев, perf-smoke не интегрирован в обязательные проверки, отсутствуют exclude rules.

## v0.1.3 (Stabilization + Performance Baseline)

### P0
- [x] `exclude_paths` в `SearchRequest` (UI + backend) с фильтрацией результатов по path-маскам.
- [x] Расширенные тесты для search edge-cases:
  - [x] пустые/некорректные exclude;
  - [x] dedupe exclude токенов;
  - [x] backward compatibility сериализации/десериализации request.
- [x] Базовые диагностические ошибки для search pipeline (единый формат `[SEARCH_*]` + friendly rendering в UI status).

### P1
- [x] Подготовка perf-smoke как отдельного CI job (non-blocking) с выводом метрик в логах job.
- [x] Усиление интеграционных тестов на permission denied и missing path.

### P2
- [x] UX полировка фильтров (подсказки, локализация, примеры exclude-масок).

### Definition of Done
- `npm run check`, `npm run test`, `npm run build`, `cargo test` проходят.
- Backend coverage не ниже текущего gate.
- Документация обновлена (`user_guide`, release notes `v0.1.3`).

## v0.1.4 (Feature Depth + Reliability at Scale)

### P0
- Инкрементальная индексация (обновление изменённых путей без полного rebuild).
- E2E smoke сценарии критического пути:
  - search -> filters -> actions;
  - index rebuild -> status -> search fallback.

### P1
- Batch actions для результатов (multi-select + copy/open/reveal).
- Кэш метаданных и ленивое обогащение для ускорения больших выдач.

### P2
- Расширенная диагностика для саппорта:
  - структурированный runtime лог;
  - экспорт диагностического snapshot.

### Definition of Done
- Наблюдаемое ускорение повторных поисков в index mode.
- Стабильные e2e smoke проверки на CI.
- Снижение регрессий поиска по релизной статистике ошибок.

## Риски и контроль
- Риск: флаки perf тестов на CI.
  - Контроль: сначала non-blocking perf job, затем постепенный перевод в blocking.
- Риск: рост сложности контракта UI/backend.
  - Контроль: расширять `SearchRequest` только с backward-compatible default полями.

## Осталось до v0.1.3
1. Подготовить и проверить `docs/github_release_v0.1.3.md` (финальный body для тега).
2. Провести полный pre-release smoke на Windows installer (установка, запуск, базовый search flow).
3. Прогнать CI на PR `dev -> main` и убедиться, что `backend-perf-smoke` публикует метрики стабильно.
4. Сделать финальную вычитку `README`/`user_guide` на предмет терминологии и hotkeys.
