# MIA Search - Improvement Roadmap

## Priority Legend
- 🔴 **Critical** - Security vulnerabilities, data loss risks
- 🟠 **High** - Functional bugs, major UX issues
- 🟡 **Medium** - Performance, code quality improvements
- 🟢 **Low** - Nice to have, future enhancements

---

## 🔴 Critical

*(None - all critical issues resolved)*

---

## 🟠 High

*(None - all high priority issues resolved)*

---

## 🟡 Medium - Security

### [SEC-13] Wildcard Pattern Creates Unbounded Regex
**File:** `src-tauri/src/core/search_service.rs:400-417`
**Effort:** S
**Status:** Fixed in SEC-12 - MAX_WILDCARD_COUNT=32 limit added.

### [SEC-14] Symlink Resolution TOCTOU Race
**File:** `src-tauri/src/platform/open_path.rs:38-56`
**Effort:** M
**Issue:** Symlink detection happens before and after canonicalization. Attacker could race between checks if symlink target changes.
**Fix:** Use single canonicalization step, perform all security checks on resolved path.

---

## 🟡 Medium - Stability

### [STAB-15] Index Rebuild Is Not Cancellable
**File:** `src-tauri/src/commands/index.rs:44-67`
**Effort:** S
**Status:** Fixed - added index_rebuild_cancel command and cancel flag storage in AppState.

### [STAB-16] Search Thread Panic Not Propagated to User
**File:** `src-tauri/src/core/search_service.rs:252-281`
**Effort:** M
**Status:** Fixed - added `worker_panicked` field to SearchStreamSummary and IndexSearchSummary. Panic flag tracked via Arc<AtomicBool>.
**Note:** Frontend can now display warning when worker_panicked is true.

### [STAB-17] Potential Memory Exhaustion with Large Index
**File:** `src-tauri/src/storage/index_store.rs`
**Effort:** L
**Issue:** Entire index loaded into memory with no size limits. For very large filesystems, could cause memory exhaustion.
**Fix:** Implement index size limits, pagination, or memory-mapped file approach.

### [STAB-18] No Graceful Shutdown for In-Progress Searches
**File:** `src-tauri/src/commands/search.rs:125-162`
**Effort:** M
**Issue:** Active search threads continue briefly after shutdown initiated. No explicit join with timeout.
**Fix:** Implement proper graceful shutdown with thread join timeout and resource cleanup.

### [STAB-19] Race Condition in Search Session Management
**File:** `src-tauri/src/core/search_service.rs:97-113`
**Effort:** S
**Status:** After analysis, already handled - all events check `is_active_search()` before emitting to frontend. Old search events are silently dropped if search_id doesn't match.
**Note:** No fix needed - existing mechanism is sufficient.

---

## 🟡 Medium - Performance

### [PERF-13] No Regex Caching in Index Mode
**File:** `src-tauri/src/core/index_service.rs:204-244`
**Effort:** S
**Status:** Fixed - added same thread-local regex cache as search_service.rs.

### [PERF-14] Unnecessary Clone on Every Index Snapshot
**File:** `src-tauri/src/storage/index_store.rs:47-49`
**Effort:** M
**Status:** Fixed - changed IndexStore to use Arc<IndexSnapshot> for cheap cloning.

### [PERF-15] Frontend Metadata Enrichment Creates Many Requests
**File:** `src/app/App.tsx:1277-1322`
**Effort:** S
**Status:** Fixed - added 100ms debounce to metadata enrichment requests.

### [PERF-16] Large App Component Causes Re-renders
**File:** `src/app/App.tsx`
**Effort:** L
**Issue:** App component has 50+ useState hooks. Any state change triggers full re-render. Component is 1700+ lines.
**Fix:** Split into smaller components with memoization. Use useReducer for related state.

### [PERF-4] Blocking Metadata Call in Hot Path
**File:** `src-tauri/src/core/metadata_service.rs:22-24`
**Effort:** L
**Issue:** `std::fs::metadata(path)` called synchronously for every result.
**Blocked by:** Requires async architecture.

### [PERF-9] String Allocation in dedup_path_key Hot Path
**File:** `src-tauri/src/core/search_service.rs:617-626`
**Effort:** M
**Issue:** On Windows, allocates new String with `replace` and `to_lowercase` for every path.
**Blocked by:** Requires changing HashSet to use hash-based dedup.

---

## 🟡 Medium - UX/UI

### [UX-25] No Feedback for Invalid Date Filters
**File:** `src-tauri/src/core/filters.rs:32-53`
**Effort:** M
**Issue:** Invalid date filter values silently ignored, treated as matching all results. Users don't know filter isn't working.
**Fix:** Return validation errors for invalid dates, display to user.

### [UX-26] Missing Accessibility Labels for Icon-Only Buttons
**File:** `src/app/components/chrome/TopBar.tsx:106-116`
**Effort:** S
**Status:** Fixed - added aria-label to filters toggle button. All other icon buttons already have aria-label.

### [UX-27] Error Messages Not Localized
**File:** `src-tauri/src/commands/search.rs:237-246`
**Effort:** M
**Issue:** Error codes returned as strings, frontend only does basic pattern matching. Full error messages remain in English.
**Fix:** Return structured error types that can be localized in frontend.

### [UX-28] Live Search Triggers on Non-Filter Changes
**File:** `src/app/App.tsx:1224-1275`
**Effort:** S
**Status:** Fixed - removed sortMode from live search trigger dependencies.

### [UX-18] Missing Loading State for Initial Index Build
**File:** `src/app/App.tsx:1038-1087`
**Effort:** M
**Issue:** Initial index rebuild happens silently, user sees empty results.
**Blocked by:** Requires UI design for loading overlay.

### [UX-19] Missing Error State in Results View
**File:** `src/app/App.tsx:1188-1213`
**Effort:** M
**Issue:** Search errors shown in status bar but results table shows stale data.
**Blocked by:** Requires passing error state to ResultsWorkspace.

---

## 🟡 Medium - Code Quality

### [QUAL-1] Duplicate Query Matcher Implementation
**Files:** `search_service.rs:150-163`, `index_service.rs:38-46`
**Effort:** S
**Status:** After analysis, implementations differ intentionally. search_service checks file_name separately, index_service checks full text. Keeping both.
**Note:** No fix needed - different behavior for different use cases.

### [QUAL-2] Duplicate Path Security Functions
**Files:** `open_path.rs:4-21`, `reveal_in_explorer.rs:4-17`
**Effort:** S
**Status:** Fixed - extracted to shared `path_security.rs` module.

### [QUAL-3] Type Mismatch Frontend/Backend
**Files:** `search-types.ts:123-129`, `commands/index.rs:111-125`
**Effort:** S
**Status:** Fixed - added "in_progress" to IndexStatusResponse status type.

### [QUAL-4] Large useEffect Dependencies
**File:** `src/app/App.tsx:1234-1275`
**Effort:** M
**Issue:** Live search useEffect has 20+ dependencies. Hook fragile and hard to reason about.
**Fix:** Split into separate effects with smaller dependencies.

---

## 🟢 Low - Security

### [SEC-15] Favorites Store Accepts Arbitrary Paths
**File:** `src-tauri/src/storage/favorites_store.rs:28-33`
**Effort:** S
**Status:** Fixed - added validate_path_for_read() in favorites_add_inner.

---

## 🟢 Low - Stability

### [STAB-20] Missing Error Handling for Metadata Operations
**File:** `src-tauri/src/core/metadata_service.rs:22-24`
**Effort:** S
**Issue:** Metadata failures silently ignored (returning default values). May lead to incorrect results without awareness.
**Fix:** Log metadata failures at debug level, optionally expose count of items with missing metadata.

### [STAB-8] Silent Index Version Mismatch
**File:** `src-tauri/src/storage/index_store.rs:37-43`
**Effort:** M
**Issue:** Only prints to stderr, no user notification.
**Note:** Current behavior functional - index rebuilds on version mismatch.

---

## 🟢 Low - Performance

### [PERF-17] JSON Serialization Uses Pretty Print
**File:** `src-tauri/src/storage/persistence.rs:62-80`
**Effort:** S
**Status:** Fixed - changed to_string_pretty to to_string for compact JSON.

### [PERF-18] to_lowercase Called Multiple Times
**File:** `src-tauri/src/core/search_service.rs:444-459`
**Effort:** S
**Status:** Fixed - pre-compute lower_query once and pass to score_relevance.

### [PERF-19] Allocation in Wildcard-to-Regex Loop
**File:** `src-tauri/src/core/search_service.rs:400-417`
**Effort:** S
**Issue:** Wildcard conversion allocates new String for every character in pattern.
**Fix:** Pre-calculate output size and allocate once.

---

## 🟢 Low - UX/UI

### [UX-21] History List Shows Only Raw Query Text
**File:** `src/app/components/sidebars/LeftSidebar.tsx:268-280`
**Effort:** S
**Issue:** Users cannot see roots or filters used in history items.

### [UX-23] Date Input Format Not Localized
**File:** `src/app/components/chrome/FiltersPanel.tsx:219-230`
**Effort:** M
**Issue:** `datetime-local` uses system format, not app language.

### [UX-29] Confirmation Dialog Uses Native confirm()
**File:** `src/app/components/sidebars/LeftSidebar.tsx:264-267`
**Effort:** M
**Issue:** `window.confirm()` doesn't match application UI, may be blocked or styled differently.
**Fix:** Implement custom confirmation modal.

### [UX-30] No Progress Indicator During Index Rebuild
**File:** `src-tauri/src/commands/index.rs:44-67`
**Effort:** M
**Issue:** Index rebuild shows "Rebuilding..." but no progress percentage or item count.

---

## 🟢 Low - Code Quality

### [QUAL-5] Dead Code - search_mapper Module
**File:** `src-tauri/src/core/search_mapper.rs`
**Effort:** S
**Issue:** `SearchPlan` and `request_to_plan` not imported anywhere.
**Fix:** Either integrate into search flow or remove.

### [QUAL-6] PartialEq Implementation in Wrong File
**File:** `src-tauri/src/core/search_service.rs:20-59`
**Effort:** S
**Issue:** `PartialEq` for `SearchOptions` implemented in `search_service.rs` but type defined in `models.rs`.
**Fix:** Move implementation to `models.rs`.

### [QUAL-7] Hardcoded Default Language
**File:** `src-tauri/src/storage/settings_store.rs:28`
**Effort:** S
**Issue:** Default language hardcoded to "ru". Should detect system language.
**Fix:** Use system language detection for default.

### [QUAL-8] Missing Documentation for Public APIs
**Files:** All Rust files
**Effort:** M
**Issue:** No rustdoc comments on public functions, structs, or enums.
**Fix:** Add `///` documentation comments to all public items.

### [QUAL-9] Frontend Test Coverage Minimal
**File:** `src/app/search-request.test.ts`
**Effort:** L
**Issue:** Only one test file with single test case. No tests for App.tsx, formatters, components.
**Fix:** Add tests for critical frontend logic.

---

## Future Features

### [FEAT-1] Search Content in Files
Full-text search within file contents (grep-like functionality).

### [FEAT-2] Saved Searches
Save frequently used search configurations.

### [FEAT-3] Search History Navigation
Navigate through previous searches with keyboard shortcuts.

### [FEAT-4] File Preview Panel
Preview file contents without opening.

### [FEAT-5] Batch Operations
Select multiple files for batch operations (copy, move, delete).

### [FEAT-6] Search Export
Export search results to CSV/JSON.

---

## Test Coverage Gaps

### [TEST-1] Missing Tests
- `search_service.rs` - worker thread panic recovery
- `App.tsx` - keyboard navigation edge cases
- `index_service.rs` - concurrent search + rebuild
- `actions.rs` - `actions_open_path` error handling
- `FiltersPanel.tsx` - date filter edge cases

---

## Summary

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Security | 0 | 0 | 1 | 0 | 1 |
| Stability | 0 | 0 | 2 | 1 | 3 |
| Performance | 0 | 0 | 4 | 2 | 6 |
| UX/UI | 0 | 0 | 4 | 4 | 8 |
| Code Quality | 0 | 0 | 2 | 5 | 7 |
| **Total** | **0** | **0** | **12** | **12** | **24** |

**Next Priority:** SEC-14, STAB-17, STAB-18 (Medium priority items)
