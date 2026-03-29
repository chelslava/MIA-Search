# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Security
- **[SEC-1]** Fixed shell command injection vulnerability in `open_path.rs`. Added path validation to reject shell metacharacters (`&`, `|`, `;`, `$`, backticks, newlines). Added canonicalization and URL rejection for non-local paths.
- **[SEC-2]** Fixed shell command injection vulnerability in `reveal_in_explorer.rs`. Added same path validation and canonicalization.
- **[SEC-4]** Added restrictive file permissions (0o600) for config files on Unix systems.
- **[SEC-5]** Added input validation for SearchRequest to prevent DoS attacks. Limits: max query length 1024, max roots 50, max extensions 20, max exclude_paths 50.

### Fixed
- **[BUG-1]** Fixed sort order for Size and Modified columns. Now sorts descending (largest/newest first) instead of ascending.
- **[BUG-2]** Fixed index rebuild comparison - now compares actual root paths instead of just count. Added `root_paths` field to `IndexStatusResponse`.
- **[BUG-3]** Fixed size filter behavior for files with unknown size. Files with `None` size are now included for "Greater" comparisons and excluded for "Equal" comparisons.

### Stability
- **[STAB-1]** Worker thread panics are now logged instead of silently ignored.
- **[STAB-2]** JSON parse errors and file read errors are now logged with context.
- **[STAB-3]** Added index version compatibility check. Index is rebuilt automatically if version mismatch detected.

### Performance
- **[PERF-4]** Added capacity hint for HashSet deduplication to reduce rehashing during search.
- **[PERF-3]** Added virtual scrolling for cards view to prevent OOM with large result sets.

### Accessibility
- **[A11Y-1]** Added ARIA attributes to cards view (`role="list"`, `aria-label`, `aria-selected`) and table rows (`aria-selected`).
- **[A11Y-2]** Added ARIA live region to status bar (`role="status"`, `aria-live="polite"`, `aria-busy`) for screen reader announcements.
