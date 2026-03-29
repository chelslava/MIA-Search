# MIA Search - Improvement Roadmap

## Priority Legend
- 🔴 **Critical** - Security vulnerabilities, data loss risks
- 🟠 **High** - Functional bugs, major UX issues, performance bottlenecks
- 🟡 **Medium** - Performance, code quality
- 🟢 **Low** - Nice to have, future enhancements

---

## 🔴 CRITICAL - Security

(No critical security issues remaining)

---

## 🟠 HIGH - Stability

(No high stability issues remaining)

---

## 🟠 HIGH - Security

(No high security issues remaining)

---

## 🟡 MEDIUM - Performance

### [PERF-4] Blocking Metadata Call in Hot Path
**File:** `src-tauri/src/core/metadata_service.rs:22-24`
**Issue:** `std::fs::metadata(path)` is called synchronously for every result.
**Fix:** Consider async metadata fetch or batched parallel retrieval.
**Note:** Requires significant architectural changes - defer to future work.

### [PERF-9] String Allocation in dedup_path_key Hot Path
**File:** `src-tauri/src/core/search_service.rs:617-626`
**Issue:** On Windows, allocates new String with `replace` and `to_lowercase` for every path.
**Status:** Deferred - requires changing HashSet to use hash-based dedup. Current impact is minimal on typical filesystems.
**Note:** Consider implementing in future if profiling shows this is a bottleneck.

### [PERF-11] Sequential Metadata Enrichment Blocks UI
**File:** `src-tauri/src/commands/search.rs:286-293`
**Status:** Fixed - added rayon for parallel processing.
**Note:** Now uses `par_iter()` for parallel metadata enrichment.

### [PERF-12] Regex Compilation on Every Wildcard Search
**File:** `src-tauri/src/core/search_service.rs:381-398`
**Status:** Fixed - added thread-local cache for compiled regex patterns.
**Note:** Cache stores up to 64 patterns, clears when full.

---

## 🟡 MEDIUM - Stability

### [STAB-5] Channel Sender Dropped Early
**File:** `src-tauri/src/core/search_service.rs:269`
**Status:** After analysis, this is correct behavior - workers hold cloned senders.
**Note:** No fix needed - pattern is correct.

### [STAB-12] Workers Don't Check shutting_down Flag
**File:** `src-tauri/src/core/search_service.rs:245-268`
**Issue:** Worker threads check `cancel_flag` but not `shutting_down`.
**Status:** After analysis, `cancel_flag` already handles cancellation. Workers stop when channel is dropped or cancel_flag is true. Adding `shutting_down` check would be redundant.
**Note:** No fix needed - existing mechanism is sufficient.

### [SEC-9] File Descriptor Leak on Worker Panic
**File:** `src-tauri/src/core/search_service.rs:244-269`
**Status:** Added `catch_unwind` wrapper around worker logic to ensure proper cleanup on panic.
**Note:** Fixed - workers now catch panics gracefully.

---

## 🟡 MEDIUM - UX/UI

### [UX-18] Missing Loading State for Initial Index Build
**File:** `src/app/App.tsx:1038-1087`
**Issue:** Initial index rebuild happens silently, user sees empty results.
**Status:** Deferred - requires UI design for loading overlay in ResultsWorkspace.
**Note:** `isRebuildingIndex` state exists, need to pass to ResultsWorkspace and show loading UI.

### [UX-19] Missing Error State in Results View
**File:** `src/app/App.tsx:1188-1213`
**Issue:** Search errors shown in status bar but results table shows stale data.
**Status:** Deferred - requires passing error state to ResultsWorkspace component.
**Note:** `searchErrorCount` state exists, need to design error UI in results area.

---

## 🟢 LOW - Performance

### [PERF-8] Extension Parsing Creates New Strings
**File:** `src-tauri/src/core/index_service.rs:261-268`
**Status:** Fixed - use `to_ascii_lowercase()` instead of `to_lowercase()` for faster ASCII conversion.
**Note:** Extensions are typically ASCII, so this avoids Unicode overhead.

### [PERF-10] Redundant Clone in to_lightweight_item
**File:** `src-tauri/src/commands/search.rs:291-296`
**Status:** After analysis, no clone needed - function takes ownership and mutates in place.
**Note:** Pattern is already optimal: `into_iter().map(to_lightweight_item).collect()` moves items.

---

## 🟢 LOW - Stability

### [STAB-8] Silent Index Version Mismatch
**File:** `src-tauri/src/storage/index_store.rs:37-43`
**Issue:** Only prints to stderr, no user notification.
**Status:** Deferred - version mismatch triggers index rebuild automatically. Adding event emission requires architectural changes (passing AppHandle to IndexStore).
**Note:** Current behavior is functional - index rebuilds on version mismatch.

### [STAB-9] has_dir_children Ignores Errors
**File:** `src-tauri/src/commands/actions.rs:23-28`
**Status:** Fixed - added error logging for failed directory reads.
**Note:** Still returns false on error (can't determine if children exist), but now logs the reason.

### [STAB-13] Integer Overflow in Size Filter
**File:** `src-tauri/src/core/models.rs:86`
**Status:** Fixed - added max=999 limit on size value input in frontend.
**Note:** 999TB = ~1 exabyte, well within u64 range.

### [SEC-10] No Input Validation on exclude_paths
**File:** `src-tauri/src/core/search_service.rs:450-459`
**Status:** Fixed - added max length validation (256 chars) per exclude_path entry.
**Note:** Count limit already existed (MAX_EXCLUDE_PATHS=50).

---

## 🟢 LOW - UX/UI

### [UX-8] Hardcoded Breakpoint
**File:** `src/app/App.tsx:1445-1448`
**Status:** Fixed - extracted to RESPONSIVE_BREAKPOINT constant for easier maintenance.
**Note:** Full configurability would require settings store changes.

### [UX-9] Range Slider and Number Input Desync
**File:** `src/app/components/chrome/FiltersPanel.tsx:144-160`
**Status:** Fixed - added clamping to number input to keep values in sync with slider range (0-10).
**Note:** Both inputs now always produce values within the same range.

### [UX-10] Toast Auto-Dismiss Time Hardcoded
**File:** `src/app/App.tsx:518-524`
**Status:** Fixed - dismiss time now proportional to message length (50ms/char, min 2s, max 5s).
**Note:** Longer messages get more time to read.

### [UX-20] No Visual Feedback for Keyboard Navigation
**File:** `src/app/App.tsx:1406-1428`
**Status:** Fixed - added `behavior: "smooth"` to scrollIntoView for arrow key navigation.
**Note:** Smooth scrolling provides better visual feedback when navigating results.

### [UX-21] History List Shows Only Raw Query Text
**File:** `src/app/components/sidebars/LeftSidebar.tsx:268-280`
**Issue:** Users cannot see roots or filters used in history items.
**Fix:** Show truncated context with roots.

### [UX-22] No Confirmation for Clear History
**File:** `src/app/components/sidebars/LeftSidebar.tsx:264`
**Status:** Fixed - added `window.confirm` dialog before clearing history.
**Note:** Uses native browser confirm for simplicity.

### [UX-23] Date Input Format Not Localized
**File:** `src/app/components/chrome/FiltersPanel.tsx:219-230`
**Issue:** `datetime-local` uses system format, not app language.
**Fix:** Use localized date picker or add format hints.

### [UX-24] Splitter Drag Cursor Feedback Missing
**File:** `src/app/App.tsx:1334-1354`
**Status:** Fixed - added `col-resize` cursor during splitter drag.
**Note:** Cursor changes on mousedown and reverts on mouseup.

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
| UX/UI | 0 | 0 | 0 | 3 |

**All security issues resolved!**

**Remaining items:**
- STAB-8: Silent Index Version Mismatch (deferred)
- PERF-4, PERF-9: Require architectural changes
- UX-21, UX-23: Minor UX improvements
