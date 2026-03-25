# Release Notes - v0.1.0 (MVP)

Дата: **25 марта 2026**

## Что вошло в MVP

- Desktop-приложение на `Tauri 2 + React + TypeScript`.
- Потоковый поиск файлов и папок с отменой.
- Режимы запроса: `plain`, `wildcard`, `regex`.
- Multi-root поиск, depth/limit, include hidden.
- Фильтры: тип, расширения, размер, created/modified.
- Сортировки: relevance/name/size/modified/type.
- Действия: open, open parent, reveal in explorer, copy.
- Persistence: settings/history/favorites/profiles.
- RU/EN локализация интерфейса.
- Backend coverage: **81.14% regions**.

## Изменения backend перед MVP freeze

- Двухфазная выдача результатов:
  - в search stream отправляются lightweight результаты;
  - метаданные догружаются отдельной командой `search_enrich_metadata`.
- Подключён и стабилизирован index backend:
  - `index_rebuild` и `index_status` доступны через tauri commands;
  - `SearchBackend::Index` использует snapshot индекса;
  - fallback на scan при пустом индексе.
- Добавлены базовые тесты на helper для metadata enrichment.

## UX/индексация после RC-стабилизации

- Быстрые кнопки под строкой поиска переведены в явные UI toggle-переключатели (`WC/RE/PLAIN`, `FILES/DIRS`, `Aa`).
- Управление backend поиска (`Scan/Index`) перенесено в настройки поиска.
- В блоке index добавлены:
  - кнопка `Rebuild index`;
  - индикатор `index_status` (`empty/ready`, `entries`, `updated_at`);
  - авто-реиндексация по TTL и интервалу проверки (параметры вынесены в Settings).
- Добавлена горячая клавиша `Ctrl/Cmd + Shift + R` для ручного `Rebuild index`.
- Снижен риск UI-фризов при стриме результатов: batched-обновления выдачи через кадр (`requestAnimationFrame`) и отложенный metadata enrichment.

## Проверки релиз-кандидата

- `cargo test` - зелёный.
- `cargo tauri build` - зелёный (Windows, NSIS bundle).
- `npm run check` - зелёный.
- `npm run test` - зелёный.
- `npm run build` - зелёный.

## Релизный артефакт

- Windows installer: `src-tauri/target/release/bundle/nsis/MIA Search_0.1.0_x64-setup.exe`.
