# MIA Search - Improvement Roadmap

## Priority Legend
- 🔴 **Critical** - Security vulnerabilities, data loss risks
- 🟠 **High** - Functional bugs, major UX issues, performance bottlenecks
- 🟡 **Medium** - Performance, code quality
- 🟢 **Low** - Nice to have, future enhancements

---

## 🔴 CRITICAL - Security

### [SEC-6] Symlink Following Without Validation
**File:** `src-tauri/src/platform/open_path.rs:25-27`
**Issue:** `canonicalize()` follows symlinks. A malicious symlink could point to sensitive system files.
**Fix:** Validate symlink targets or reject symlinks entirely.

### [SEC-7] No Path Traversal Validation
**File:** `src-tauri/src/platform/open_path.rs:17-42`
**Issue:** `is_safe_path` only checks shell metacharacters, not path traversal (`../../etc/passwd`).
**Fix:** Add path traversal validation.

---

## 🟠 HIGH - Stability

### [STAB-10] TOCTOU Race in open_path Canonicalization
**File:** `src-tauri/src/platform/open_path.rs:25-27`
**Issue:** File could be moved between validation and execution. Canonicalized path could differ from validated path.
**Fix:** Re-validate canonicalized path after resolution.

---

## 🟠 HIGH - Security

### [SEC-8] Sensitive Data in History Persistence
**File:** `src-tauri/src/storage/history_store.rs:28-30`
**Issue:** SearchRequest with potentially sensitive paths persisted to disk in plain JSON.
**Fix:** Add privacy setting or encrypt sensitive fields.

---

## 🟡 MEDIUM - Performance

### [PERF-4] Blocking Metadata Call in Hot Path
**File:** `src-tauri/src/core/metadata_service.rs:22-24`
**Issue:** `std::fs::metadata(path)` is called synchronously for every result.
**Fix:** Consider async metadata fetch or batched parallel retrieval.
**Note:** Requires significant architectural changes - defer to future work.

### [PERF-9] String Allocation in dedup_path_key Hot Path
**File:** `src-tauri/src/core/search_service.rs:604-613`
**Issue:** On Windows, allocates new String with `replace` and `to_lowercase` for every path.
**Fix:** Use hash-based dedup or compute hash directly without allocation.

### [PERF-11] Sequential Metadata Enrichment Blocks UI
**File:** `src-tauri/src/commands/search.rs:286-293`
**Issue:** 64 sequential filesystem calls for metadata enrichment.
**Fix:** Use parallel processing with `rayon`.

### [PERF-12] Regex Compilation on Every Wildcard Search
**File:** `src-tauri/src/core/search_service.rs:381-398`
**Issue:** Wildcard patterns converted to regex and compiled on every call.
**Fix:** Add thread-local cache for compiled patterns.

---

## 🟡 MEDIUM - Stability

### [STAB-5] Channel Sender Dropped Early
**File:** `src-tauri/src/core/search_service.rs:269`
**Status:** After analysis, this is correct behavior - workers hold cloned senders.
**Note:** No fix needed - pattern is correct.

### [STAB-11] Unbounded seen_paths Memory Growth
**File:** `src-tauri/src/core/search_service.rs:229`
**Issue:** HashSet can grow unbounded for large searches without limit.
**Fix:** Cap the dedup set size or use bounded cache.

### [STAB-12] Workers Don't Check shutting_down Flag
**File:** `src-tauri/src/core/search_service.rs:245-268`
**Issue:** Worker threads check `cancel_flag` but not `shutting_down`.
**Fix:** Pass `shutting_down` Arc to workers.

### [SEC-9] File Descriptor Leak on Worker Panic
**File:** `src-tauri/src/core/search_service.rs:244-269`
**Issue:** If worker panics mid-scan, file handles may not be properly closed.
**Fix:** Use `catch_unwind` or ensure library handles cleanup on drop.

---

## 🟡 MEDIUM - UX/UI

### [UX-18] Missing Loading State for Initial Index Build
**File:** `src/app/App.tsx:1038-1087`
**Issue:** Initial index rebuild happens silently, user sees empty results.
**Fix:** Add explicit loading overlay during initial index build.

### [UX-19] Missing Error State in Results View
**File:** `src/app/App.tsx:1188-1213`
**Issue:** Search errors shown in status bar but results table shows stale data.
**Fix:** Add error state UI in ResultsWorkspace.

---

## 🟢 LOW - Performance

### [PERF-8] Extension Parsing Creates New Strings
**File:** `src-tauri/src/core/index_service.rs:245-250`
**Issue:** Lowercase conversion for every extension check.
**Fix:** Pre-normalize extensions once during request parsing.

### [PERF-10] Redundant Clone in to_lightweight_item
**File:** `src-tauri/src/commands/search.rs:279-284`
**Issue:** Entire SearchResultItem cloned just to null out 3 fields.
**Fix:** Consider `LightweightSearchResultItem` type or optimize clone.

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

### [STAB-13] Integer Overflow in Size Filter
**File:** `src-tauri/src/core/models.rs:86`
**Issue:** Large size values (999TB) could overflow when multiplied by unit.
**Fix:** Add overflow protection in frontend.

### [SEC-10] No Input Validation on exclude_paths
**File:** `src-tauri/src/core/search_service.rs:450-459`
**Issue:** exclude_paths not validated for malicious patterns.
**Fix:** Add length limit and pattern validation.

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

### [UX-20] No Visual Feedback for Keyboard Navigation
**File:** `src/app/App.tsx:1406-1428`
**Issue:** Arrow key navigation lacks smooth scroll.
**Fix:** Add `behavior: "smooth"` to scrollIntoView.

### [UX-21] History List Shows Only Raw Query Text
**File:** `src/app/components/sidebars/LeftSidebar.tsx:268-280`
**Issue:** Users cannot see roots or filters used in history items.
**Fix:** Show truncated context with roots.

### [UX-22] No Confirmation for Clear History
**File:** `src/app/components/sidebars/LeftSidebar.tsx:264`
**Issue:** Clearing history is immediate without confirmation.
**Fix:** Add confirmation dialog.

### [UX-23] Date Input Format Not Localized
**File:** `src/app/components/chrome/FiltersPanel.tsx:219-230`
**Issue:** `datetime-local` uses system format, not app language.
**Fix:** Use localized date picker or add format hints.

### [UX-24] Splitter Drag Cursor Feedback Missing
**File:** `src/app/App.tsx:1334-1354`
**Issue:** Cursor doesn't change to `col-resize` during splitter drag.
**Fix:** Add cursor style to splitter.

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
| Security | 1 | 1 | 1 | 1 |
| Stability | 0 | 1 | 3 | 3 |
| Performance | 0 | 0 | 4 | 2 |
| UX/UI | 0 | 0 | 2 | 7 |

**Priority Order:**
1. SEC-6: Symlink validation (Critical)
2. SEC-7: Path traversal validation (Critical)
3. STAB-10: TOCTOU race (High)
4. SEC-8: Sensitive data in history (High)
