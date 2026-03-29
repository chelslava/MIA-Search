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
**Note:** Requires significant architectural changes - defer to future work.

---

## 🟡 MEDIUM - Stability

### [STAB-5] Channel Sender Dropped Early
**File:** `src-tauri/src/core/search_service.rs:269`
**Status:** After analysis, this is correct behavior - workers hold cloned senders.
**Note:** No fix needed - pattern is correct.

---

## 🟢 LOW - Performance

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

| Category | Completed |
|----------|-----------|
| Performance | 5 (PERF-1,2,3,5,7) |
| Stability | 6 (STAB-1,2,3,4,6,7) |
| UX/UI | 7 (UX-1,2,3,5,6,7,11) |
| Code Quality | 1 (PERF-6) |

**Remaining:**
- 1 Medium performance (PERF-4 - requires architecture changes)
- 1 Low performance (PERF-8)
- 2 Low stability (STAB-8, STAB-9)
- 3 Low UX/UI (UX-8, UX-9, UX-10)
- 6 Future features
- 1 Test coverage
