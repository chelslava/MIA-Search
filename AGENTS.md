# AGENTS.md

Guidelines for AI coding agents working on MIA Search.

## Project Overview

MIA Search is a cross-platform desktop file/folder search application built with Tauri 2, React, and Rust.

- Frontend: React 19 + TypeScript + Vite + Tailwind CSS + i18next
- Backend: Rust (Tauri 2)
- Test frameworks: Vitest (frontend), cargo test (backend)

## Build/Lint/Test Commands

### Frontend (root directory)

```bash
npm install                  # Install dependencies
npm run dev                  # Start Vite dev server
npm run build                # Production build
npm run check                # TypeScript type check (tsc --noEmit)
npm run test                 # Run all tests
npm run test:watch           # Run tests in watch mode
vitest run src/app/search-request.test.ts   # Run single test file
vitest run --reporter=verbose               # Run with verbose output
npm run smoke                # Run check + test + build (full validation)
```

### Backend (src-tauri directory)

```bash
cd src-tauri
cargo build                  # Debug build
cargo build --release        # Release build
cargo test                   # Run all tests
cargo test search_service    # Run tests matching pattern
cargo test -- --test-threads=1              # Single-threaded tests
cargo clippy -- -D warnings   # Lint with clippy
cargo fmt -- --check          # Check formatting
cargo llvm-cov --summary-only # Coverage report
```

### Tauri Application

```bash
cd src-tauri
cargo tauri dev              # Development mode with hot reload
cargo tauri build            # Production build (creates installer)
```

## Code Style Guidelines

### TypeScript/React

**Imports**: Group and order imports logically:
1. React hooks and libraries
2. Internal shared types (`../shared/...`)
3. Internal components (`./components/...`)
4. Utilities and helpers
5. Styles (CSS imports last)

```typescript
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SearchRequest, SearchResultItem } from "../shared/search-types";
import { buildSearchRequest } from "./search-request";
import "./styles.css";
```

**Types**: Use `type` for type aliases, `interface` for object shapes. Prefer explicit typing over `any`.

```typescript
type SortMode = "Relevance" | "Name" | "Size" | "Modified" | "Type";
interface SearchOptions {
  max_depth: number | null;
  limit: number | null;
}
```

**Naming**:
- Components: PascalCase (`SearchPanel`, `ResultsWorkspace`)
- Functions/variables: camelCase (`handleSearch`, `selectedPath`)
- Constants: SCREAMING_SNAKE_CASE for global constants (`DEFAULT_INDEX_TTL_HOURS`)
- Private/helpers: underscore prefix optional for internal functions
- Files: kebab-case for utilities (`search-request.ts`), PascalCase for components (`App.tsx`)

**Formatting**:
- Indent: 2 spaces
- Semicolons: required
- Quotes: double quotes for JSX, single quotes for JS strings preferred
- Trailing commas: use in multi-line structures

**Error Handling**:
- Use try/catch for async operations
- Provide user-friendly error messages via i18n
- Log errors appropriately, avoid silent failures

```typescript
try {
  await someAsyncOperation();
} catch {
  pushToast(tr("app.toast.operationFailed", "Operation failed"), "error");
}
```

**React Patterns**:
- Prefer functional components with hooks
- Use `useMemo` for expensive computations
- Use `useCallback` for functions passed as props
- Keep component state minimal and derived state computed

### Rust

**Imports**: Group by external crates first, then internal modules:

```rust
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

use crate::core::models::SearchRequest;
use crate::storage::index_store::IndexStore;
```

**Naming**:
- Types/structs/enums: PascalCase (`SearchRequest`, `EntryKind`)
- Functions/variables: snake_case (`search_start`, `cancel_flag`)
- Constants: SCREAMING_SNAKE_CASE (`DEFAULT_LIMIT`)
- Modules: snake_case (`search_service`)

**Error Handling**:
- Return `Result<T, String>` for Tauri commands
- Use `.map_err(|_| "error message".to_string())` for error conversion
- Use `?` operator for error propagation

```rust
pub fn search_cancel(state: State<'_, AppState>) -> Result<SearchCancelResponse, String> {
  let session = state.search_session.lock()
    .map_err(|_| "search session lock poisoned".to_string())?;
  Ok(SearchCancelResponse { search_id: session.cancel(), status: "cancelled".to_string() })
}
```

**Structs and Enums**:
- Derive `Debug, Clone, Serialize, Deserialize` for data types
- Implement `Default` trait where appropriate
- Use `Option<T>` for nullable fields

**Testing**:
- Place tests in `#[cfg(test)] mod tests { ... }` block at file end
- Use `tempfile` crate for filesystem tests requiring temporary directories
- Test edge cases and error conditions

## Architecture Notes

- Frontend communicates with Rust backend via Tauri IPC commands
- Shared types between frontend/backend should stay in sync (`search-types.ts` ↔ `models.rs`)
- State management: React useState/useRef for UI state, Rust AppState for backend persistence
- Search events flow: `search:batch`, `search:done`, `search:cancelled`, `search:error`

## Validation Before Commit

Run these commands before submitting changes:

```bash
npm run check && npm run test && npm run build
cd src-tauri && cargo test && cargo clippy -- -D warnings
```
