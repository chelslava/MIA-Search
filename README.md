# MIA Search

Кроссплатформенный desktop-поиск файлов и папок на `Tauri 2 + React + Rust`.

## Текущий статус
- Этап: **MVP Candidate Ready**
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

Примечание:
- Автоматизированный release pipeline в GitHub Actions сейчас **Windows-only** и публикует NSIS-установщик (`.exe`).
- Локальная сборка на Linux/macOS возможна, но публикация артефактов из workflow сейчас настроена только для Windows.

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
- Быстрые toggle-кнопки режимов под строкой поиска (без ввода команд в query)
- Multi-root, дерево дисков/папок
- Потоковая выдача, отмена поиска
- Фильтры и сортировки
- Выбор backend поиска (`Scan/Index`) в настройках поиска
- `Rebuild index`, `index_status`, авто-индексация по TTL и интервалу проверки
- История, профили, избранное
- Open / Open parent / Reveal / Copy

## Документация
- [План реализации](docs/implementation_plan.md)
- [Руководство пользователя](docs/user_guide.md)
- [GitHub Release v0.1.0](docs/github_release_v0.1.0.md)
- [GitHub Release v0.1.1](docs/github_release_v0.1.1.md)
