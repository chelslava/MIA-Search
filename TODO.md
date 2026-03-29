# MIA Search - Improvement Roadmap

## Priority Legend
- 🔴 **Critical** - Security vulnerabilities, data loss risks
- 🟠 **High** - Functional bugs, major UX issues, performance bottlenecks
- 🟡 **Medium** - Performance, code quality
- 🟢 **Low** - Nice to have, future enhancements

---

## 🟠 HIGH - Stability

### [STAB-3] Search UI State Inconsistency on Error
**File:** `src/app/App.tsx:789-796`
**Issue:** If `startSearch` fails, `isSearching` is set to false but `searchStartedAt` may remain set.
**Fix:** Reset all search-related state atomically on error.

---

## 🟠 HIGH - UX/UI

### [UX-3] Live Search Triggers on Every Filter Change
**File:** `src/app/App.tsx:1212-1250`
**Issue:** Changing filters triggers new search immediately without debounce.
**Fix:** Debounce filter changes or require explicit search button click.

---

## 🟡 MEDIUM - Performance

### [PERF-4] Blocking Metadata Call in Hot Path
**File:** `src-tauri/src/core/metadata_service.rs:22-24`
**Issue:** `std::fs::metadata(path)` is called synchronously for every result.
**Fix:** Consider async metadata fetch or batched parallel retrieval.

### [PERF-5] String Allocation in Index Matching
**File:** `src-tauri/src/core/index_service.rs:163`
**Issue:** `format!("{} {}", item.name, item.full_path)` allocates on every item.
**Fix:** Use combined search without allocation or pre-computed search field.

### [PERF-6] Partial Comparison Fallback in Ranking
**File:** `src-tauri/src/core/ranking.rs:6-16`
**Issue:** `partial_cmp` returns `Equal` for NaN, potentially breaking sort stability.
**Fix:** Use `total_cmp` or explicit NaN handling.

---

## 🟡 MEDIUM - Stability

### [STAB-4] Search Thread May Outlive App
**File:** `src-tauri/src/commands/search.rs:113-140`
**Issue:** Spawned thread holds `AppHandle` clone but no cancellation on app shutdown.
**Fix:** Add shutdown flag check or use `tauri::async_runtime` for proper lifecycle.

### [STAB-5] Channel Sender Dropped Early
**File:** `src-tauri/src/core/search_service.rs:269`
**Issue:** `drop(tx)` happens before workers complete.
**Fix:** Move `drop(tx)` after worker join or use proper channel closing pattern.

### [STAB-6] Event Listeners May Not Unregister on Unmount
**File:** `src/app/App.tsx:1206-1209`
**Issue:** If `Promise.all` rejects, `unlisten` may be partially populated.
**Fix:** Add error handling for each listener registration individually.

### [STAB-7] Index Auto-Rebuild Race Condition
**File:** `src/app/App.tsx:1039-1078`
**Issue:** Multiple concurrent stale checks may trigger multiple rebuilds.
**Fix:** Add mutex/flag for rebuild-in-progress check at interval level.

---

## 🟡 MEDIUM - UX/UI

### [UX-5] No Visual Feedback for Disabled Buttons
**File:** `src/app/components/chrome/TopBar.tsx:217-233`
**Issue:** Disabled regex button looks similar to enabled.
**Fix:** Add `opacity-50 cursor-not-allowed` classes for disabled state.

### [UX-6] Indeterminate Progress Indicator
**File:** `src/app/App.tsx:1474`
**Issue:** Progress line shows no actual progress percentage.
**Fix:** Show checked paths count or progress percentage.

### [UX-7] Redundant Action Buttons
**File:** `src/app/components/sidebars/DetailsSidebar.tsx:96-132`
**Issue:** "Copy path" appears twice.
**Fix:** Consolidate to single copy button or differentiate functionality.

---

## 🟢 LOW - Performance

### [PERF-7] Current Directory Lookup on Every Call
**File:** `src-tauri/src/core/search_service.rs:596-602`
**Issue:** `std::env::current_dir()` called per path resolution.
**Fix:** Cache current directory at search start.

### [PERF-8] Extension Parsing Creates New Strings
**File:** `src-tauri/src/core/index_service.rs:245-250`
**Issue:** Lowercase conversion for every extension check.
**Fix:** Pre-normalize extensions once during request parsing.

---

## 🟢 LOW - Stability

### [STAB-8] Silent Index Version Mismatch
**File:** `src-tauri/src/storage/index_store.rs:37-43`
**Issue:** Only prints to stderr, no user notification.
**Fix:** Emit event to frontend about index rebuild need.

### [STAB-9] has_dir_children Ignores Errors
**File:** `src-tauri/src/commands/actions.rs:23-28`
**Issue:** Returns `false` on permission denied, may hide folders.
**Fix:** Log permission errors or propagate with different semantics.

---

## 🟢 LOW - UX/UI

### [UX-8] Hardcoded Breakpoint
**File:** `src/app/App.tsx:1412-1416`
**Issue:** Sidebars hidden at exactly 1024px without configuration.
**Fix:** Make responsive breakpoint configurable.

### [UX-9] Range Slider and Number Input Desync
**File:** `src/app/components/chrome/FiltersPanel.tsx:144-160`
**Issue:** Two separate inputs for same value can desync.
**Fix:** Use single controlled input or synchronize explicitly.

### [UX-10] Toast Auto-Dismiss Time Hardcoded
**File:** `src/app/App.tsx:518-523`
**Issue:** 2400ms fixed, may be too short for long messages.
**Fix:** Make dismiss time configurable or proportional to message length.

### [UX-11] Emoji Icons Not Marked as Decorative
**File:** `src/app/components/results/ResultsWorkspace.tsx:173-176`
**Issue:** Folder/file emoji icons are decorative but not marked.
**Fix:** Add `aria-hidden="true"` to emoji spans.

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

| Category | High | Medium | Low |
|----------|------|--------|-----|
| Performance | 0 | 3 | 2 |
| Stability | 1 | 4 | 2 |
| UX/UI | 1 | 3 | 4 |

**Completed this session:**
- 3 Performance optimizations (PERF-1, PERF-2, PERF-3)
- 2 Stability improvements (STAB-1, STAB-2)
- 2 UX improvements (UX-1, UX-2)
