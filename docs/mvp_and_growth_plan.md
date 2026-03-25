# MVP And Growth Plan (March 25, 2026)

## 1. Current Product State

### Functional status
- Core search workflow is implemented and stable (`plain/wildcard/regex`, multi-root, filters, sorting).
- Streaming search and cancellation are implemented.
- Two-phase result model is implemented:
  - lightweight stream batches first;
  - async metadata enrichment afterwards.
- Search backends are implemented:
  - `Scan` is default;
  - `Index` is optional and managed in Search Settings.
- Index UX is self-contained:
  - `Rebuild index`;
  - `index_status` (`empty/ready`, entries, updated_at);
  - auto-reindex by TTL and check interval (configurable in Settings);
  - hotkey `Ctrl/Cmd + Shift + R`.

### Quality status
- Backend tests: green.
- Frontend smoke tests: green.
- Coverage: backend regions > 80%.
- Windows release build: green (`NSIS` bundle).

### Remaining gaps before launch governance
- Final release decision and tag policy (`v0.1.0` go/no-go checkpoint).
- Explicit post-release support workflow (P0/P1 triage, hotfix SLA).
- Cross-platform release validation (Linux/macOS) is still post-MVP.

## 2. MVP Launch Plan

## Phase A: Release Decision (1 day)
1. Re-run release checks (`cargo test`, `npm run check/test/build`, `cargo tauri build`).
2. Final smoke on release artifact.
3. Go/no-go meeting and freeze scope to critical fixes only.

## Phase B: Public MVP Release (1 day)
1. Create tag `v0.1.0`.
2. Publish release notes (`docs/release_notes_v0.1.0.md`).
3. Attach Windows installer artifact.

## Phase C: Early Support Window (7-14 days)
1. Monitor incoming issues and classify as `P0/P1/P2`.
2. Ship only high-impact fixes during stabilization window.
3. Capture telemetry/feedback themes and convert to post-MVP backlog.

## 3. Post-MVP Growth Plan

## Stream G1: Reliability and Performance (April 2026)
1. Add runtime metrics in UI (TTFR, throughput, access errors).
2. Optimize large-root performance and rendering stability.
3. Expand regression coverage for edge-case file systems and permissions.

## Stream G2: Platform Expansion (April-May 2026)
1. Linux/macOS smoke and packaging.
2. Cross-platform CI builds with release checks.
3. Platform-specific action parity (`open/reveal/clipboard`).

## Stream G3: Product Maturity (May 2026+)
1. Improve index lifecycle (incremental/background refresh strategies).
2. Extend command palette and profile workflows.
3. Accessibility audit and prioritized fixes.

## 4. Success Criteria

### MVP success
- Stable Windows release with no open P0 blockers.
- All release checklist items verified and documented.
- Reproducible build and smoke process.

### Growth success (first 1-2 releases post-MVP)
- Cross-platform release path established.
- Performance metrics visible and actionable.
- Faster triage-to-fix cycle with CI-supported release quality gates.
