# MVP Backlog (актуально на 25 марта 2026)

Цель MVP: стабильный desktop-поиск файлов/папок с потоковой выдачей, фильтрами, действиями над результатами и готовой Windows-сборкой.

## Must Have (для выхода в MVP)

## 1. Core и поиск
- [x] `SearchService` на Rust с потоковой выдачей батчами.
- [x] Multi-root, depth, limit, strict, ignore_case, include_hidden.
- [x] Режимы запроса: `plain`, `wildcard`, `regex`.
- [x] Отмена поиска (ручная и авто-отмена прошлого live-запроса).
- [x] Корректная обработка wildcard при лимитах (фикс внесён).

## 2. Фильтры и сортировка
- [x] Entry kind (files/dirs/all).
- [x] Расширения (single + multi merge/dedupe).
- [x] Размер и даты (created/modified).
- [x] Сортировки: relevance/name/size/modified/type.

## 3. UI и взаимодействие
- [x] Компактная верхняя панель поиска.
- [x] Быстрые кнопки команд под полем поиска + контекстные подсказки.
- [x] Левая панель root-путей + выбор папки через системный диалог.
- [x] Дерево дисков/папок (компактное).
- [x] Правая панель деталей.
- [x] Фиксированный статус-бар без растягивания.
- [x] Горячие клавиши и командная палитра.

## 4. Persistence и actions
- [x] Settings/History/Favorites/Profiles stores.
- [x] Open/Open parent/Reveal/Copy path/name.

## 5. Качество
- [x] Backend unit/integration tests.
- [x] Full backend coverage >= 80% (`cargo llvm-cov`: 81.14% Regions).
- [x] Frontend smoke (`npm run test`, `npm run check`).
- [ ] Финальный Windows release smoke (`cargo tauri build` + ручной чек-лист).

## 6. Документация и релиз
- [ ] Финализировать пользовательскую инструкцию запуска и сценарии поиска.
- [ ] Зафиксировать MVP release notes.

## Out of MVP (следующая фаза)
- Linux/macOS полный smoke и release-артефакты.
- Продвинутые диагностические метрики в UI.
- CI pipeline для мультиплатформенных сборок.
- Глубокий UX polish и дополнительные режимы представления.

## Definition of Done (MVP)
- Все пункты Must Have закрыты.
- Нету P0-блокеров по поиску/событиям/отображению результатов.
- Windows release-сборка проходит и подтверждена smoke-checklist.
