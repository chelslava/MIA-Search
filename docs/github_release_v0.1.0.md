# MIA Search v0.1.0 (MVP)

Release date: 2026-03-25

## Highlights
- Desktop search app on Tauri 2 + React + TypeScript.
- Streaming file/folder search with cancellation.
- Search modes: plain / wildcard / regex.
- Filters and sorting: type, extensions, size, dates; relevance/name/size/modified/type.
- Search backend options: Scan (default) and Index.

## What's Included
- Multi-root search and filesystem tree navigation.
- Result actions: open / open parent / reveal / copy.
- Persistence: settings / history / favorites / profiles.
- RU/EN localization.
- Index workflow in Search Settings:
  - backend selector (Scan/Index);
  - Rebuild index button;
  - index status panel (empty/ready, entries, updated_at);
  - auto-reindex with configurable TTL and check interval.
- Quick toggles below search input (no inline command typing required).

## Quality Gate
- `cargo test` passed.
- `npm run check` passed.
- `npm run test` passed.
- `npm run build` passed.
- `cargo tauri build` passed (Windows NSIS bundle).
- Backend coverage: 81.14% Regions.

## Artifact
- `MIA Search_0.1.0_x64-setup.exe`

## Known Limitations
- Linux/macOS release smoke and packaging are planned post-MVP.
- Advanced runtime metrics (TTFR/throughput/errors) are planned post-MVP.

## Install Notes
1. Download installer from Assets.
2. Run setup and complete installation wizard.
3. Launch MIA Search from Start menu.

## Docs
- `docs/user_guide.md`
- `docs/release_notes_v0.1.0.md`
- `docs/release_smoke_checklist.md`
- `docs/release_ops_playbook.md`
