# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Performance
- **[PERF-1]** Optimized QueryMatcher to use `to_ascii_lowercase()` instead of `to_lowercase()` - faster ASCII-only case conversion.
- **[PERF-2]** Removed redundant limit checks in search loop - was checked 3 times, now checked once per result.
- **[PERF-3]** Improved HashSet capacity estimation - now uses min(limit, 100000) to avoid frequent rehashing.
- **[PERF-5]** Eliminated string allocation in index matching - matches name first, then path only if needed.
- **[PERF-7]** Cache current directory at search start - avoids repeated `current_dir()` syscalls.
- **[PERF-8]** Use `to_ascii_lowercase()` for extension matching - faster than `to_lowercase()` for ASCII.
- **[PERF-11]** Added parallel metadata enrichment using rayon - speeds up batch metadata retrieval.
- **[PERF-12]** Added thread-local regex cache for wildcard/regex patterns - avoids recompilation on repeated searches.
- **[PERF-13]** Added regex caching to index_service.rs - same cache mechanism as search_service.
- **[PERF-14]** Changed IndexStore to use Arc<IndexSnapshot> for cheap snapshot cloning.
- **[PERF-15]** Added 100ms debounce to frontend metadata enrichment requests.

### Stability
- **[STAB-1]** Thread panic now sets cancel flag - prevents search from hanging when worker thread panics.
- **[STAB-2]** Added `lock_or_recover` helper for poisoned Mutex recovery - logs warning and recovers gracefully.
- **[STAB-3]** Reset all search state atomically on search start error - prevents inconsistent UI state.
- **[STAB-4]** Added `shutting_down` flag to prevent search thread from emitting events after app shutdown.
- **[STAB-6]** Individual event listener registration - if one fails, others still register correctly.
- **[STAB-7]** Added `checkInProgress` flag to prevent concurrent index rebuild checks.
- **[STAB-10]** Fixed TOCTOU race condition in path canonicalization - re-validates canonicalized path for symlinks, traversal sequences, and unsafe characters after resolution.
- **[STAB-11]** Added memory cap for seen_paths deduplication - clears and resizes when exceeding limit*10 to prevent unbounded memory growth.
- **[STAB-13]** Added max=999 limit on size filter input to prevent integer overflow.
- **[STAB-14]** Improved mutex poison recovery logging - now reports detailed error info for debugging.
- **[STAB-15]** Added index_rebuild_cancel command - users can now cancel index rebuild operation.
- **[STAB-16]** Added worker_panicked flag to search summary - frontend can now warn users about incomplete results.
- **[STAB-9]** Added error logging for failed directory reads in has_dir_children.

### UX/UI
- **[UX-1]** Fixed keyboard navigation in inputs - arrow keys now work when cursor is at start/end of text input.
- **[UX-2]** Added sortable column headers - click on Name, Size, Modified, Type columns to sort results.
- **[UX-3]** Split live search effects - query changes use adaptive debounce, filter changes use standard debounce.
- **[UX-5]** Added visual feedback for disabled buttons - `opacity-50 cursor-not-allowed` classes.
- **[UX-6]** Added title attribute to progress line showing checked paths count.
- **[UX-7]** Removed redundant "Copy path" button from DetailsSidebar - kept inline copy button.
- **[UX-8]** Extracted responsive breakpoint to constant for easier maintenance.
- **[UX-9]** Added clamping to depth number input to keep in sync with slider range.
- **[UX-10]** Toast dismiss time now proportional to message length (50ms/char, min 2s, max 5s).
- **[UX-11]** Added `aria-hidden="true"` to emoji icons for screen reader compatibility.
- **[UX-20]** Added smooth scrolling for keyboard navigation in results.
- **[UX-22]** Added confirmation dialog before clearing search history.
- **[UX-24]** Added col-resize cursor feedback during splitter drag.
- **[UX-26]** Added aria-label to filters toggle button for accessibility.
- **[UX-28]** Removed sortMode from live search triggers - changing sort no longer triggers new search.
- **[UX-25]** Added date validation feedback - invalid date filters now show toast error instead of being silently ignored.
- **[UX-29]** Replaced native confirm() with custom ConfirmDialog component - matches app styling and supports keyboard navigation.

### Performance
- **[PERF-19]** Pre-calculate output size in wildcard-to-regex conversion - allocates once instead of per-character.

### Code Quality
- **[PERF-6]** Improved NaN handling in relevance sorting - NaN scores are now sorted to the end instead of being treated as equal.

### Security
- **[SEC-1]** Fixed shell command injection vulnerability in `open_path.rs`. Added path validation to reject shell metacharacters (`&`, `|`, `;`, `$`, backticks, newlines). Added canonicalization and URL rejection for non-local paths.
- **[SEC-2]** Fixed shell command injection vulnerability in `reveal_in_explorer.rs`. Added same path validation and canonicalization.
- **[SEC-4]** Added restrictive file permissions (0o600) for config files on Unix systems.
- **[SEC-5]** Added input validation for SearchRequest to prevent DoS attacks. Limits: max query length 1024, max roots 50, max extensions 20, max exclude_paths 50.
- **[SEC-6]** Added symlink rejection in `open_path.rs` and `reveal_in_explorer.rs` - prevents following malicious symlinks to sensitive system files.
- **[SEC-7]** Added path traversal validation - rejects paths containing `..` components that could escape intended directories.
- **[SEC-8]** Fixed sensitive data exposure in history - now stores only query text, not full SearchRequest with roots/exclude_paths.
- **[SEC-10]** Added length validation for individual exclude_paths entries - max 256 chars each to prevent DoS.
- **[SEC-11]** Added path validation in `fs_list_children` - same security checks as open_path to prevent directory traversal attacks.
- **[SEC-12]** Added protection against ReDoS attacks - max regex pattern length (256 chars), max wildcard count (32) for wildcard patterns.
- **[SEC-14]** Fixed TOCTOU race in symlink resolution - removed pre-canonicalization symlink check, now only validates resolved path.
- **[QUAL-2]** Extracted path security functions to shared `path_security.rs` module for code reuse.
- **[QUAL-7]** Auto-detect system language for default setting instead of hardcoding "ru".
- **[QUAL-8]** Added rustdoc comments to public APIs in models.rs and search_service.rs.

### Stability
- **[STAB-18]** Graceful shutdown on window close - cancels active searches and sets shutting_down flag.
- **[STAB-8]** Added version_mismatch flag to index status - users now see toast notification when index needs rebuild.

### Stability
- **[STAB-10]** Fixed TOCTOU race condition in path canonicalization - re-validates canonicalized path for symlinks, traversal sequences, and unsafe characters after resolution.
- **[STAB-11]** Added memory cap for seen_paths deduplication - clears and resizes when exceeding limit*10 to prevent unbounded memory growth.
- **[STAB-13]** Added max=999 limit on size filter input to prevent integer overflow.
- **[STAB-14]** Improved mutex poison recovery logging - now reports detailed error info for debugging.
- **[STAB-15]** Added index_rebuild_cancel command - users can now cancel index rebuild operation.
- **[STAB-9]** Added error logging for failed directory reads in has_dir_children.

### UX/UI
- **[UX-20]** Added smooth scrolling for keyboard navigation in results.
- **[UX-22]** Added confirmation dialog before clearing search history.
- **[UX-24]** Added col-resize cursor feedback during splitter drag.

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
