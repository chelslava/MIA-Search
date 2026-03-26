# MIA Search v0.1.3

Release date: 2026-03-26 (planned)

## Highlights
- `exclude_paths` filter in search request (UI + backend).
- Unified search error codes (`SEARCH_INVALID_QUERY`, `SEARCH_STATE_ERROR`, `SEARCH_EXECUTION_ERROR`) with friendly UI status rendering.
- CI enhancement: non-blocking backend perf-smoke job.
- Backend resilience tests for `missing path` and `permission denied` scenarios.

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
