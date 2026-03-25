# Release Smoke Checklist

Дата последнего обновления: **25 марта 2026**

## Автоматические проверки
- [x] `npm run check`
- [x] `npm run test`
- [x] `npm run build`
- [x] `cargo check`
- [x] `cargo test`
- [x] `cargo llvm-cov --summary-only` >= 80% regions (факт: 81.14%)
- [x] `cargo tauri build` (Windows release, NSIS bundle)

## Ручной smoke (Windows)
- [x] Запуск release-версии после `cargo tauri build`
- [x] Поиск: plain / wildcard / regex
- [x] Поиск по нескольким root (включая дерево дисков)
- [x] Отмена поиска и повторный запуск
- [x] Фильтры и сортировки
- [x] Действия результата: open / open parent / reveal / copy
- [x] Проверка stores: history / favorites / profiles / settings
- [x] Проверка горячих клавиш и command palette

## Кроссплатформенный smoke
- [ ] Linux
- [ ] macOS

## Примечания
- Для финального MVP-билда обязательна ручная проверка именно release-артефакта.
- В sandbox-окружениях возможны ошибки `spawn EPERM` для `vite/vitest`; это не всегда дефект кода.
- Верификация на 25.03.2026: release binary запускался, функциональные сценарии дополнительно покрыты автоматическими тестами backend/frontend.
