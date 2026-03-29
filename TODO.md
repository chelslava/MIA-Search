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

### [STAB-14] Mutex Poison Recovery May Hide Data Corruption
**File:** `src-tauri/src/main.rs:30-38`
**Effort:** M
**Issue:** `lock_or_recover` recovers from poisoned mutex using inner value, potentially leading to inconsistent state if thread panicked mid-update.
**Fix:** Log error with stack trace, consider reinitializing affected store, mark state as potentially corrupted.

---

## 🟡 Medium - Security

### [SEC-13] Wildcard Pattern Creates Unbounded Regex
**File:** `src-tauri/src/core/search_service.rs:400-417`
**Effort:** S
**Issue:** Wildcard patterns converted to regex without limiting `*` or `?` characters. Pattern like `****...` generates `.*.*.*...` causing performance issues.
**Fix:** Limit number of wildcard characters before conversion.

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
**Issue:** `index_rebuild` creates new AtomicBool that is never set to true. Users cannot cancel an index rebuild.
**Fix:** Use global cancel flag stored in AppState, similar to search cancellation.

### [STAB-16] Search Thread Panic Not Propagated to User
**File:** `src-tauri/src/core/search_service.rs:252-281`
**Effort:** M
**Issue:** Worker thread panics caught and logged, but search continues with partial results. Users unaware search was incomplete.
**Fix:** Emit `search:warning` event when worker threads panic.

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
**Issue:** `SearchSession::start` cancels existing search before creating new one. Window where old search might emit events after being cancelled.
**Fix:** Ensure search IDs checked against all emitted events, add generation counter.

---

## 🟡 Medium - Performance

### [PERF-13] No Regex Caching in Index Mode
**File:** `src-tauri/src/core/index_service.rs:204-244`
**Effort:** S
**Issue:** Unlike `search_service.rs`, `index_service.rs` compiles regex patterns on every call without caching.
**Fix:** Add same regex caching mechanism used in `search_service.rs`.

### [PERF-14] Unnecessary Clone on Every Index Snapshot
**File:** `src-tauri/src/storage/index_store.rs:47-49`
**Effort:** M
**Issue:** `snapshot()` clones entire index including all entries. Called frequently during index-based searches.
**Fix:** Use `Arc<IndexSnapshot>` for cheap cloning, or implement copy-on-write.

### [PERF-15] Frontend Metadata Enrichment Creates Many Requests
**File:** `src/app/App.tsx:1277-1322`
**Effort:** S
**Issue:** Metadata enrichment runs on every scroll/visibility change with up to 64 paths. No debouncing across renders.
**Fix:** Add debouncing to metadata enrichment requests.

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
**Issue:** Several icon buttons use emoji without proper ARIA labels. Screen readers announce "button" with no context.
**Fix:** Add `aria-label` attributes to all icon-only buttons.

### [UX-27] Error Messages Not Localized
**File:** `src-tauri/src/commands/search.rs:237-246`
**Effort:** M
**Issue:** Error codes returned as strings, frontend only does basic pattern matching. Full error messages remain in English.
**Fix:** Return structured error types that can be localized in frontend.

### [UX-28] Live Search Triggers on Non-Filter Changes
**File:** `src/app/App.tsx:1224-1275`
**Effort:** S
**Issue:** Live search triggers on every change including sort_mode. Users may not expect search when changing sort.
**Fix:** Exclude sort_mode and other non-filter states from live search trigger.

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
**Files:** `search_service.rs:150-185`, `index_service.rs:29-58`
**Effort:** S
**Issue:** `QueryMatcher` enum duplicated between files with slight differences.
**Fix:** Extract to shared module.

### [QUAL-2] Duplicate Path Security Functions
**Files:** `open_path.rs:4-21`, `reveal_in_explorer.rs:4-17`
**Effort:** S
**Issue:** `is_safe_path`, `has_path_traversal`, `is_symlink` functions duplicated.
**Fix:** Extract to shared `path_security.rs` module.

### [QUAL-3] Type Mismatch Frontend/Backend
**Files:** `search-types.ts:123-128`, `commands/index.rs:18-25`
**Effort:** S
**Issue:** Frontend `IndexStatusResponse.status` typed as `"empty" | "ready"` but backend can return `"in_progress"`.
**Fix:** Update frontend type to include `"in_progress"`.

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
**Issue:** `favorites_add` accepts any path without validation. Malicious paths could be stored and exploited.
**Fix:** Validate paths before storing.

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
**Issue:** `save_json` uses `to_string_pretty` which is slower than compact JSON.
**Fix:** Use `to_string` (compact) for production.

### [PERF-18] to_lowercase Called Multiple Times
**File:** `src-tauri/src/core/search_service.rs:444-459`
**Effort:** S
**Issue:** `score_relevance` calls `to_lowercase()` on both name and query every time, query is constant.
**Fix:** Pre-compute lowercase query once.

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
| Security | 0 | 0 | 2 | 1 | 3 |
| Stability | 0 | 1 | 5 | 2 | 8 |
| Performance | 0 | 0 | 6 | 3 | 9 |
| UX/UI | 0 | 0 | 6 | 4 | 10 |
| Code Quality | 0 | 0 | 4 | 5 | 9 |
| **Total** | **0** | **1** | **22** | **15** | **38** |

**Next Priority:** STAB-14, STAB-15 (High/Medium priority items)
