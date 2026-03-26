# MIA Search v0.1.2

Release date: 2026-03-26

## Highlights
- Release hardening for stable publishing.
- Enforced version sync between tag and app manifests in release workflow.
- Added installer smoke check in release pipeline (presence, size, SHA256).
- Added backend coverage gate in CI.
- Added MIT license and cleaned documentation set.

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
