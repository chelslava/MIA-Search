# Release Smoke Checklist

Дата последнего прогона: **25 марта 2026**

## Frontend smoke
- [x] `npm run check`
- [x] `npm run test` (Vitest UI smoke)
- [x] `npm run build`
- [x] `npm run smoke`

## Backend smoke
- [x] `cargo check`
- [x] `cargo test`

## Manual scenario smoke (Windows)
- [x] Запуск поиска из UI
- [x] Потоковая выдача результатов
- [x] Отмена поиска
- [x] Фильтры (extension, size, date)
- [x] Сортировки (relevance/name/size/modified/type)
- [x] Действия над результатами (open/open parent/reveal/copy)
- [x] Favorites / History / Profiles persistence
- [x] Горячие клавиши и командная палитра

## Cross-platform packaging smoke
- [x] Windows: локальные smoke-проверки выполнены
- [ ] Linux: smoke-проверки не выполнялись в текущем окружении
- [ ] macOS: smoke-проверки не выполнялись в текущем окружении

## Notes
- В текущем sandbox `vite`/`vitest` иногда требуют elevated запуск из-за `spawn EPERM`.
- Для финального релиза нужен отдельный прогон smoke на Linux и macOS.
