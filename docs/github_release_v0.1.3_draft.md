# MIA Search v0.1.3 (Draft)

Release date: TBD

## Planned Highlights
- `exclude_paths` filter in search request (UI + backend).
- Unified search error codes (`SEARCH_INVALID_QUERY`, `SEARCH_STATE_ERROR`, `SEARCH_EXECUTION_ERROR`) with friendly UI status rendering.
- CI enhancement: non-blocking backend perf-smoke job.
- Backend resilience tests for `missing path` and `permission denied` scenarios.

## Validation Checklist (Draft)
- `npm run check`
- `npm run test`
- `npm run build`
- `cargo test`
- GitHub Actions `CI` green on `dev`

## Notes
- This is a draft release note and may change before final tag publication.
