# MIA Search v0.1.1

Release date: 2026-03-26

## Highlights
- CI expanded to cross-platform matrix (Windows, Linux, macOS).
- Release workflow improved to resolve release body by tag (`docs/github_release_<tag>.md`).
- New runtime status metrics in UI:
  - `TTFR` (time to first result batch),
  - `Throughput` (checked items per second),
  - `Errors` counter for search stream failures.

## Quality
- `npm run check` passed.
- `npm run test` passed.
- `npm run build` passed.
- `cargo test` passed.

## Artifact
- Windows installer is published by release workflow:
  - `MIA Search_<version>_x64-setup.exe`

## Notes
- `Scan` remains default backend.
- `Index` can be enabled in Search Settings with manual/automatic reindex controls.
