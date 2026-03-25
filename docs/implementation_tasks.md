# Implementation Tasks (актуально на 25 марта 2026)

## 1. Summary

Статус проекта: **Pre-MVP Freeze**.

Фактически завершены все базовые эпики A-F и большая часть H.
Критические остатки для MVP: релизный Windows smoke и финальная пользовательская документация.

## 2. Current Board

## Done
- [x] A. Платформа и архитектура (`Tauri 2 + React + TS`, модульный backend).
- [x] B. Поисковое ядро (multi-root, stream, cancel, modes).
- [x] C. Фильтры и сортировки (size/date/ext, merge/dedupe, relevance/name/size/modified/type).
- [x] D. Основной UI (компактный layout, root panel, results, details, fixed statusbar).
- [x] E. Persistence (settings/history/favorites/profiles).
- [x] F. Платформенные действия (open/open parent/reveal/clipboard).
- [x] G-01. RU/EN локализация интерфейса.
- [x] H-01/H-02/H-03. Тесты backend/frontend smoke.
- [x] H-coverage. Полное backend coverage >= 80% (TOTAL Regions 81.14%).

## In Progress (MVP Gate)
- [ ] H-05. Финальный Windows release smoke на собранном артефакте.
- [ ] DOC-01. Финальная инструкция пользователя (запуск, поиск, команды).
- [ ] DOC-02. MVP release notes.

## Planned (Post-MVP)
- [ ] G-02. Расширенный accessibility аудит.
- [ ] H-04. Диагностические метрики в UI (TTFR, access errors, throughput).
- [ ] X-PLAT-01. Linux/macOS smoke + упаковка.
- [ ] CI-01. Автоматизированные мультиплатформенные сборки/проверки.

## 3. MVP Exit Checklist (операционный)

- [x] `cargo test` зелёный.
- [x] `cargo llvm-cov --summary-only` >= 80% (Regions).
- [x] `npm run check` зелёный.
- [x] `npm run test` зелёный.
- [ ] `cargo tauri build` (Windows) зелёный.
- [ ] Ручной smoke по `docs/release_smoke_checklist.md` (Windows) закрыт полностью.
- [ ] Финальные docs/README синхронизированы с фактическим поведением.

## 4. Suggested Execution Order (до MVP)

1. Прогнать `cargo tauri build` и исправить release-блокеры.
2. Пройти ручной Windows smoke на артефакте.
3. Финализировать пользовательскую документацию и release notes.
4. Поставить MVP tag (`v0.1.0`).
