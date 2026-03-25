# MIA Search

Кроссплатформенный desktop-поиск файлов и папок на `Tauri 2 + React + Rust`.

## Текущий статус
- Этап: **Pre-MVP Freeze**
- Backend покрытие: **81.14% Regions** (`cargo llvm-cov`)
- Основной функционал поиска и UI реализован

## Запуск в dev

### Frontend
```bash
npm install
npm run dev
```

### Tauri app
```bash
cd src-tauri
cargo tauri dev
```

## Сборка release (Windows/Linux/macOS)
```bash
cd src-tauri
cargo tauri build
```

## Проверки качества
```bash
npm run check
npm run test
npm run build
cd src-tauri
cargo test
cargo llvm-cov --summary-only
```

## Основные возможности
- Поиск `plain`, `wildcard`, `regex`
- Multi-root, дерево дисков/папок
- Потоковая выдача, отмена поиска
- Фильтры и сортировки
- История, профили, избранное
- Open / Open parent / Reveal / Copy

## Документация
- [Roadmap](docs/roadmap.md)
- [MVP Backlog](docs/mvp_backlog.md)
- [Implementation Tasks](docs/implementation_tasks.md)
- [Progress Log](docs/progress_log.md)
- [Release Smoke Checklist](docs/release_smoke_checklist.md)
