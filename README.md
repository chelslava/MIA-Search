# MIA Search

Кроссплатформенное desktop-приложение для мгновенного поиска файлов и папок.

![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?style=flat-square&logo=tauri)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![Rust](https://img.shields.io/badge/Rust-1.85+-CE422B?style=flat-square&logo=rust)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

## Возможности

### Поиск
- **Режимы поиска**: `Plain`, `Wildcard`, `Regex`
- **Быстрые фильтры**: toggle-кнопки режимов под строкой поиска
- **Multi-root**: поиск по нескольким дискам/папкам одновременно
- **Потоковая выдача**: результаты отображаются по мере нахождения
- **Отмена поиска**: остановка в любой момент

### Фильтрация и сортировка
- Расширения файлов
- Глубина вложенности
- Размер файла, дата изменения/создания
- Тип (файл/папка), скрытые элементы
- Сортировка по имени, размеру, дате, типу, релевантности

### Индексация
- **Scan Mode**: прямое сканирование файловой системы
- **Index Mode**: быстрый поиск по заранее построенному индексу
- Автоматическая переиндексация по TTL
- Ручной rebuild индекса

### Организация
- **История поиска**: навигация Alt+↑/↓
- **Профили**: сохранение и загрузка конфигураций поиска
- **Избранное**: быстрый доступ к частым путям

### Работа с результатами
- Открыть файл / родительскую папку / показать в проводнике
- Копировать путь или имя
- Групповые операции: копирование, перемещение, удаление
- Экспорт: CSV, JSON, буфер обмена
- Поиск по содержимому файлов

---

## Установка

### Windows
Скачайте установочный `.exe` из [последнего релиза](https://github.com/chelslava/MIA-Search/releases/latest).

### Сборка из исходников

```bash
# Клонирование
git clone https://github.com/chelslava/MIA-Search.git
cd MIA-Search

# Frontend
npm install
npm run dev

# Tauri (в отдельном терминале)
cd src-tauri
cargo tauri dev
```

### Релизная сборка
```bash
cd src-tauri
cargo tauri build
```

---

## Быстрые клавиши

| Клавиша | Действие |
|---------|----------|
| `Ctrl+K` / `Ctrl+F` | Фокус на поле поиска |
| `F5` | Новый поиск |
| `↑` / `↓` | Навигация по результатам |
| `Enter` | Открыть выбранный файл |
| `Shift+Enter` | Открыть родительскую папку |
| `Alt+↑` / `Alt+↓` | История поиска |
| `Ctrl+Shift+R` | Перестроить индекс |

---

## Разработка

### Команды
```bash
npm run check      # TypeScript проверка
npm run test       # Frontend тесты (Vitest)
npm run build      # Production сборка
npm run smoke      # Полная проверка (check + test + build)

cd src-tauri
cargo test         # Rust тесты
cargo clippy       # Линтер
cargo llvm-cov     # Покрытие кода
```

### Архитектура
```
Frontend (React 19 + TypeScript + Tailwind)
    ↓ IPC (Tauri commands)
Backend (Rust)
    ├── core/          # Поиск (scan + index)
    ├── storage/       # Персистентность (settings, history, profiles)
    └── platform/      # OS-специфичный код
```

### Статус проекта
- **Backend coverage**: 81%+ (`cargo llvm-cov`)
- **Frontend tests**: Vitest
- **CI/CD**: GitHub Actions (Windows)

---

## Документация

- [План реализации](docs/implementation_plan.md)
- [Руководство пользователя](docs/user_guide.md)
- [Changelog](docs)

---

## Лицензия

MIT
