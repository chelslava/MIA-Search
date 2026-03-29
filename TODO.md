# MIA Search - Improvement Roadmap

## Priority Legend
- 🔴 **Critical** - Security vulnerabilities, data loss risks
- 🟠 **High** - Functional bugs, major UX issues, performance bottlenecks
- 🟡 **Medium** - Performance, code quality
- 🟢 **Low** - Nice to have, future enhancements

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

---

## 🟡 MEDIUM - UX/UI

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
| Stability | 0 | 2 | 2 |
| UX/UI | 0 | 1 | 3 |

**Completed this session:**
- 3 Performance optimizations (PERF-1, PERF-2, PERF-3)
- 5 Stability improvements (STAB-1, STAB-2, STAB-3, STAB-6, STAB-7)
- 6 UX improvements (UX-1, UX-2, UX-3, UX-5, UX-6, UX-11)
