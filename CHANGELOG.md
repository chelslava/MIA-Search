# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Performance
- **[PERF-1]** Optimized QueryMatcher to use `to_ascii_lowercase()` instead of `to_lowercase()` - faster ASCII-only case conversion.
- **[PERF-2]** Removed redundant limit checks in search loop - was checked 3 times, now checked once per result.
- **[PERF-3]** Improved HashSet capacity estimation - now uses min(limit, 100000) to avoid frequent rehashing.

### Stability
- **[STAB-1]** Thread panic now sets cancel flag - prevents search from hanging when worker thread panics.
- **[STAB-2]** Added `lock_or_recover` helper for poisoned Mutex recovery - logs warning and recovers gracefully.

### UX/UI
- **[UX-1]** Fixed keyboard navigation in inputs - arrow keys now work when cursor is at start/end of text input.
- **[UX-2]** Added sortable column headers - click on Name, Size, Modified, Type columns to sort results.

### Security
- **[SEC-1]** Fixed shell command injection vulnerability in `open_path.rs`. Added path validation to reject shell metacharacters (`&`, `|`, `;`, `$`, backticks, newlines). Added canonicalization and URL rejection for non-local paths.
- **[SEC-2]** Fixed shell command injection vulnerability in `reveal_in_explorer.rs`. Added same path validation and canonicalization.
- **[SEC-4]** Added restrictive file permissions (0o600) for config files on Unix systems.
- **[SEC-5]** Added input validation for SearchRequest to prevent DoS attacks. Limits: max query length 1024, max roots 50, max extensions 20, max exclude_paths 50.

### Fixed
- **[BUG-1]** Fixed sort order for Size and Modified columns. Now sorts descending (largest/newest first) instead of ascending.
- **[BUG-2]** Fixed index rebuild comparison - now compares actual root paths instead of just count. Added `root_paths` field to `IndexStatusResponse`.
- **[BUG-3]** Fixed size filter behavior for files with unknown size. Files with `None` size are now included for "Greater" comparisons and excluded for "Equal" comparisons.

### Stability (continued)
- **[STAB-3]** Added index version compatibility check. Index is rebuilt automatically if version mismatch detected.

### Performance (continued)
- **[PERF-4]** Added capacity hint for HashSet deduplication to reduce rehashing during search.
- **[PERF-5]** Added virtual scrolling for cards view to prevent OOM with large result sets.

### Accessibility
- **[A11Y-1]** Added ARIA attributes to cards view (`role="list"`, `aria-label`, `aria-selected`) and table rows (`aria-selected`).
- **[A11Y-2]** Added ARIA live region to status bar (`role="status"`, `aria-live="polite"`, `aria-busy`) for screen reader announcements.
