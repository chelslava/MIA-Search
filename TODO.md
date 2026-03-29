# MIA Search - Improvement Roadmap

## Priority Legend
- 🔴 **Critical** - Security vulnerabilities, data loss risks
- 🟠 **High** - Functional bugs, major UX issues
- 🟡 **Medium** - Performance, code quality
- 🟢 **Low** - Nice to have, future enhancements

---

## 🔴 CRITICAL - Security

### ~~[SEC-1] Shell Command Injection in `open_path.rs`~~ ✅ DONE
### ~~[SEC-2] Shell Command Injection in `reveal_in_explorer.rs`~~ ✅ DONE
### ~~[SEC-3] Arbitrary Path Opening Without Validation~~ ✅ DONE (mitigated by SEC-1)
### ~~[SEC-4] File Permissions on Config Files~~ ✅ DONE
### ~~[SEC-5] Input Validation for SearchRequest~~ ✅ DONE

---

## 🟠 HIGH - Stability & Bugs

### ~~[STAB-1] Worker Thread Panics Silently Ignored~~ ✅ DONE
### ~~[STAB-2] JSON Parse Errors Silently Default~~ ✅ DONE
### ~~[BUG-1] Sort Order Incorrect for Size/Modified~~ ✅ DONE
### ~~[BUG-2] Index Rebuild Compares Root Count Instead of Paths~~ ✅ DONE
### ~~[BUG-3] Filter Size "Greater 0" Excludes Files with Unknown Size~~ ✅ DONE
### ~~[STAB-3] Index Version Compatibility Not Checked~~ ✅ DONE

---

## 🟡 MEDIUM - Performance

### [PERF-1] Metadata Call Per Search Result
**File:** `src-tauri/src/core/search_service.rs:297`
**Issue:** `MetadataService::lightweight_path` called synchronously for every match - blocks on slow filesystems.
**Fix:** Consider batch metadata retrieval or make async.

### [PERF-2] Results Re-sorted on Every Batch
**File:** `src/app/App.tsx:617-623`
**Issue:** Entire results array re-sorted O(n log n) on every batch flush.
**Fix:** Use heap/priority queue for incremental sorting, or maintain sorted order during insertion.

### ~~[PERF-3] Cards View Renders All Results~~ ✅ DONE
### ~~[PERF-4] HashSet Deduplication Without Capacity Hint~~ ✅ DONE

### [PERF-5] String Allocation in Matching
**File:** `src-tauri/src/core/index_service.rs`
**Issue:** `format!("{} {}", item.name, item.full_path)` allocates string per item.
**Fix:** Match against name first, then path only if needed.

---

## 🟢 LOW - Code Quality & Enhancements

### [QUAL-1] Incremental Search Only Works on Query Growth
**File:** `src/app/App.tsx:732-758`
**Issue:** Incremental plain search fails when deleting characters.
**Fix:** Store previous results for backtracking, or mark for rebuild.

### [QUAL-2] Keyboard Navigation Missing for Cards View
**File:** `src/app/components/results/ResultsWorkspace.tsx`
**Issue:** Arrow keys don't navigate in cards view.
**Fix:** Add keyboard navigation and scroll-into-view logic.

### ~~[A11Y-1] Missing ARIA Attributes~~ ✅ DONE
### ~~[A11Y-2] Progress Status Not Announced~~ ✅ DONE

### [TEST-1] Missing Test Coverage
**Files:** Multiple
**Gaps:**
- `persistence.rs` - concurrent access tests
- `open_path.rs` - path validation tests
- `reveal_in_explorer.rs` - path validation tests
- `index_service.rs` - empty snapshot, cancellation mid-stream
- `filters.rs` - `None` size edge cases
- `App.tsx` - race conditions, rapid search changes

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

## Completed Tasks

See CHANGELOG.md for details on completed items.

---

## Summary

**Completed in this session:**
- 4 Security fixes (SEC-1, SEC-2, SEC-4, SEC-5)
- 3 Bug fixes (BUG-1, BUG-2, BUG-3)
- 3 Stability improvements (STAB-1, STAB-2, STAB-3)
- 2 Performance improvements (PERF-3, PERF-4)
- 2 Accessibility improvements (A11Y-1, A11Y-2)

**Remaining for future work:**
- 2 Performance optimizations (PERF-1, PERF-2, PERF-5)
- 2 Quality improvements (QUAL-1, QUAL-2)
- 1 Test coverage (TEST-1)
- 6 Future features (FEAT-1 to FEAT-6)
