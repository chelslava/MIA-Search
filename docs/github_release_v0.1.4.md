# MIA Search v0.1.4

Release date: 2026-03-26

## Highlights
- Version sync fix for release automation (`tag == package/cargo/tauri version`).
- v0.1.3 stabilization package delivered from `dev` to `main`:
  - `exclude_paths` support (UI + backend),
  - unified `[SEARCH_*]` error codes with friendly UI status,
  - CI non-blocking backend perf-smoke job,
  - resilience tests for `missing path` and `permission denied`.

## Quality
- `npm run check` passed.
- `npm run test` passed.
- `npm run build` passed.
- `cargo test` passed.

## Artifact
- Windows installer is published by release workflow:
  - `MIA Search_<version>_x64-setup.exe`

## Notes
- Release pipeline is currently Windows-only (NSIS).
- Local builds on Linux/macOS are supported, but workflow artifact publishing is Windows-only.
