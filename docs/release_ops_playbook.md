# Release Ops Playbook (Go/No-Go + GitHub Release Template)

Дата обновления: **25 марта 2026**

## 1. Назначение

Единый операционный файл для команды релиза:
- принять решение `Go/No-Go`;
- выпустить релиз `v0.1.0` без пропусков шагов;
- использовать готовый шаблон публикации в GitHub Releases.

## 2. Роли на релиз

- `Release Owner`: ведет чеклист, принимает финальное решение.
- `QA Owner`: подтверждает smoke/checklist.
- `Build Owner`: собирает артефакты и проверяет воспроизводимость.
- `Docs Owner`: финализирует release notes и user-facing текст.

## 3. Go/No-Go Checklist

Отмечать только после фактической проверки.

## A. Build and Tests
- [ ] `npm run check` успешно.
- [ ] `npm run test` успешно.
- [ ] `npm run build` успешно.
- [ ] `cargo test` успешно.
- [ ] `cargo llvm-cov --summary-only` >= 80% Regions.
- [ ] `cargo tauri build` успешно (Windows, NSIS bundle).

## B. Artifact Validation
- [ ] Артефакт существует: `src-tauri/target/release/bundle/nsis/MIA Search_0.1.0_x64-setup.exe`.
- [ ] Release binary запускается без краша.
- [ ] Версия приложения совпадает с релизным тегом.

## C. Functional Smoke (Windows)
- [ ] Поиск `plain / wildcard / regex`.
- [ ] Multi-root и навигация по дереву.
- [ ] Cancel и повторный запуск поиска.
- [ ] Фильтры/сортировки.
- [ ] Действия результата: `open/open parent/reveal/copy`.
- [ ] Stores: `history/favorites/profiles/settings`.
- [ ] Hotkeys/command palette (включая `Ctrl/Cmd + Shift + R` для `Rebuild index`).

## D. Product/Docs Readiness
- [ ] `README.md` актуален.
- [ ] `docs/user_guide.md` актуален.
- [ ] `docs/release_notes_v0.1.0.md` актуален.
- [ ] В changelog/release notes отражены известные ограничения.

## E. Go/No-Go Decision
- [ ] Все пункты A-D закрыты.
- [ ] Нет открытых `P0`.
- [ ] Нет открытых `P1`, блокирующих базовый сценарий MVP.
- [ ] Решение `GO` зафиксировано в релизном комментарии/issue.

Если любой пункт выше не закрыт: решение `NO-GO`, перенос релиза.

## 4. Release Day Runbook

1. Выполнить checklist из раздела 3.
2. Создать тег:
   - `git tag v0.1.0`
   - `git push origin v0.1.0`
3. Создать GitHub Release по шаблону ниже.
4. Прикрепить артефакт `.exe` installer.
5. Проверить опубликованную страницу релиза (ссылки, формат, вложения).
6. Обновить статус в `docs/roadmap.md` и при необходимости в `README.md`.

## 5. GitHub Release Template

Скопируйте блок ниже в форму GitHub Release.

```md
# MIA Search v0.1.0 (MVP)

Release date: {{YYYY-MM-DD}}

## Highlights
- Desktop search app on Tauri 2 + React + TypeScript.
- Streaming file/folder search with cancel.
- Search modes: plain / wildcard / regex.
- Filters and sorting (type, extension, size, dates; relevance/name/size/modified/type).
- Scan/Index backend support with index controls in Search Settings.
- Async metadata enrichment pipeline for result details.

## What's Included
- Multi-root search and filesystem tree navigation.
- Result actions: open / open parent / reveal / copy.
- Persistence: settings / history / favorites / profiles.
- RU/EN localization.
- Auto-reindex controls (TTL + check interval), manual `Rebuild index`, index status panel.

## Quality Gate
- `cargo test` passed.
- `npm run check` passed.
- `npm run test` passed.
- `npm run build` passed.
- `cargo tauri build` passed (Windows NSIS).
- Backend coverage: 81.14% Regions.

## Artifact
- `MIA Search_0.1.0_x64-setup.exe`

## Known Limitations
- Linux/macOS release smoke and packaging are planned post-MVP.
- Advanced runtime performance diagnostics (TTFR/throughput/error metrics) are planned post-MVP.

## Upgrade/Install Notes
1. Download installer from Assets.
2. Run setup and complete installation wizard.
3. Launch `MIA Search` from Start menu.

## Full Docs
- User Guide: `docs/user_guide.md`
- Release Notes: `docs/release_notes_v0.1.0.md`
- Release Smoke Checklist: `docs/release_smoke_checklist.md`
```

## 6. Post-Release 24h Checklist

- [ ] Проверить входящие issues и классифицировать `P0/P1/P2`.
- [ ] Подтвердить отсутствие критичных crash/blocker report.
- [ ] При необходимости открыть hotfix-план с owner и ETA.
