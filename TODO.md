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

## 🟡 Medium

### [PERF-4] Blocking Metadata Call in Hot Path
**File:** `src-tauri/src/core/metadata_service.rs:22-24`
**Effort:** L
**Issue:** `std::fs::metadata(path)` is called synchronously for every result.
**Blocked by:** Requires async architecture or batched parallel retrieval.

### [PERF-9] String Allocation in dedup_path_key Hot Path
**File:** `src-tauri/src/core/search_service.rs:617-626`
**Effort:** M
**Issue:** On Windows, allocates new String with `replace` and `to_lowercase` for every path.
**Blocked by:** Requires changing HashSet to use hash-based dedup.

### [UX-18] Missing Loading State for Initial Index Build
**File:** `src/app/App.tsx:1038-1087`
**Effort:** M
**Issue:** Initial index rebuild happens silently, user sees empty results.
**Blocked by:** Requires UI design for loading overlay in ResultsWorkspace.

### [UX-19] Missing Error State in Results View
**File:** `src/app/App.tsx:1188-1213`
**Effort:** M
**Issue:** Search errors shown in status bar but results table shows stale data.
**Blocked by:** Requires passing error state to ResultsWorkspace component.

---

## 🟢 Low

### [STAB-8] Silent Index Version Mismatch
**File:** `src-tauri/src/storage/index_store.rs:37-43`
**Effort:** M
**Issue:** Only prints to stderr, no user notification.
**Note:** Current behavior is functional - index rebuilds on version mismatch. Low priority since auto-rebuild works.

### [UX-21] History List Shows Only Raw Query Text
**File:** `src/app/components/sidebars/LeftSidebar.tsx:268-280`
**Effort:** S
**Issue:** Users cannot see roots or filters used in history items.

### [UX-23] Date Input Format Not Localized
**File:** `src/app/components/chrome/FiltersPanel.tsx:219-230`
**Effort:** M
**Issue:** `datetime-local` uses system format, not app language.

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

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Security | 0 | 0 | 0 | 0 |
| Stability | 0 | 0 | 0 | 1 |
| Performance | 0 | 0 | 2 | 0 |
| UX/UI | 0 | 0 | 2 | 2 |

**All security issues resolved!**

**Remaining: 7 items** (2 blocked by architecture, 5 low priority)
