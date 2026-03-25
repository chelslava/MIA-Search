# Implementation Tasks (актуально на 25 марта 2026)

## 1. Summary

Статус проекта: **MVP Candidate Ready**.

Фактически завершены все базовые эпики A-F и H-гейт для MVP.
Остаются post-MVP задачи по accessibility, диагностике и мультиплатформенному release.
Поиск по умолчанию работает через `Scan`, `Index` включается отдельно в настройках поиска.

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
- [x] H-05. Финальный Windows release smoke на собранном артефакте.
- [x] DOC-01. Финальная инструкция пользователя (запуск, поиск, команды).
- [x] DOC-02. MVP release notes.

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
- [x] `cargo tauri build` (Windows) зелёный.
- [x] Ручной smoke по `docs/release_smoke_checklist.md` (Windows) закрыт полностью.
- [x] Финальные docs/README синхронизированы с фактическим поведением.

## 4. Suggested Execution Order (до MVP)

1. Поставить MVP tag (`v0.1.0`).
2. Подготовить и опубликовать GitHub Release c `release_notes_v0.1.0.md`.
3. Зафиксировать baseline smoke-report для Windows-артефакта.
4. Использовать операционный файл релиза: `docs/release_ops_playbook.md`.

## 5. Suggested Execution Order (после MVP)

1. Закрыть `X-PLAT-01`: Linux/macOS smoke и упаковка.
2. Закрыть `CI-01`: автоматизировать build/test/release-check в CI.
3. Закрыть `H-04`: вывести метрики производительности в UI (TTFR, throughput, errors).
4. Закрыть `G-02`: accessibility аудит и исправления критичных замечаний.
