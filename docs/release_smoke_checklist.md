# Release Smoke Checklist

Дата последнего обновления: **26 марта 2026**

## Автоматические проверки
- [ ] `npm run check`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `cargo check`
- [ ] `cargo test`
- [ ] `cargo llvm-cov --summary-only` >= 80% regions
- [ ] `cargo tauri build` (Windows release, NSIS bundle)

## Ручной smoke (Windows)
- [ ] Запуск release-версии после `cargo tauri build`
- [ ] Поиск: plain / wildcard / regex
- [ ] Поиск по нескольким root (включая дерево дисков)
- [ ] Отмена поиска и повторный запуск
- [ ] Фильтры и сортировки
- [ ] Действия результата: open / open parent / reveal / copy
- [ ] Проверка stores: history / favorites / profiles / settings
- [ ] Проверка горячих клавиш и command palette

## Кроссплатформенный smoke
- [ ] Linux
- [ ] macOS

## Примечания
- Для финального MVP-билда обязательна ручная проверка именно release-артефакта.
- В sandbox-окружениях возможны ошибки `spawn EPERM` для `vite/vitest`; это не всегда дефект кода.
- Для каждого релиза храните отдельный заполненный отчет в релизном issue/PR.
