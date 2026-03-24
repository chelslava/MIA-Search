import { useEffect, useMemo, useState } from "react";
import {
  cancelSearch,
  onSearchBatch,
  onSearchCancelled,
  onSearchDone,
  onSearchError,
  startSearch,
  tauriRuntimeAvailable
} from "../shared/tauri-client";
import type { SearchRequest, SearchResultItem, SortMode } from "../shared/search-types";
import "./styles.css";

type RootItem = {
  path: string;
  enabled: boolean;
};

const defaultRoots: RootItem[] = [{ path: ".", enabled: true }];
const sizeUnitMultipliers: Record<string, number> = {
  B: 1,
  KB: 1024,
  MB: 1024 * 1024,
  GB: 1024 * 1024 * 1024,
  TB: 1024 * 1024 * 1024 * 1024
};

export function App() {
  const [query, setQuery] = useState("");
  const [roots, setRoots] = useState<RootItem[]>(defaultRoots);
  const [newRoot, setNewRoot] = useState("");
  const [strict, setStrict] = useState(false);
  const [ignoreCase, setIgnoreCase] = useState(true);
  const [includeHidden, setIncludeHidden] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("Relevance");
  const [limit, setLimit] = useState(500);
  const [extensionsRaw, setExtensionsRaw] = useState("");
  const [sizeFilterEnabled, setSizeFilterEnabled] = useState(false);
  const [sizeComparison, setSizeComparison] = useState<"Smaller" | "Equal" | "Greater">("Greater");
  const [sizeValue, setSizeValue] = useState(1);
  const [sizeUnit, setSizeUnit] = useState<"B" | "KB" | "MB" | "GB" | "TB">("MB");
  const [createdAfter, setCreatedAfter] = useState("");
  const [createdBefore, setCreatedBefore] = useState("");
  const [modifiedAfter, setModifiedAfter] = useState("");
  const [modifiedBefore, setModifiedBefore] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [status, setStatus] = useState("Idle");
  const [activeSearchId, setActiveSearchId] = useState<number | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [searchStartedAt, setSearchStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  const enabledRoots = useMemo(
    () => roots.filter((root) => root.enabled).map((root) => root.path.trim()).filter(Boolean),
    [roots]
  );
  const selectedResult = useMemo(
    () => results.find((item) => item.full_path === selectedPath) ?? null,
    [results, selectedPath]
  );

  useEffect(() => {
    if (!tauriRuntimeAvailable) {
      return;
    }

    const unlistenHandlers: Array<() => void> = [];
    let alive = true;

    Promise.all([
      onSearchBatch((payload) => {
        setResults((previous) => previous.concat(payload.results));
      }),
      onSearchDone((payload) => {
        setStatus(`Done (${payload.total_results})`);
        setLimitReached(payload.limit_reached);
        setActiveSearchId(null);
        if (searchStartedAt !== null) {
          setElapsedMs(Date.now() - searchStartedAt);
        }
      }),
      onSearchCancelled((payload) => {
        setStatus(`Cancelled (#${payload.search_id})`);
        setActiveSearchId(null);
        if (searchStartedAt !== null) {
          setElapsedMs(Date.now() - searchStartedAt);
        }
      }),
      onSearchError((payload) => {
        setStatus(`Error: ${payload.message}`);
        setActiveSearchId(null);
        if (searchStartedAt !== null) {
          setElapsedMs(Date.now() - searchStartedAt);
        }
      })
    ])
      .then((unlisteners) => {
        if (!alive) {
          unlisteners.forEach((unlisten) => unlisten());
          return;
        }
        unlistenHandlers.push(...unlisteners);
      })
      .catch(() => {
        setStatus("Event subscription failed");
      });

    return () => {
      alive = false;
      unlistenHandlers.forEach((unlisten) => unlisten());
    };
  }, [searchStartedAt]);

  async function handleSearch(): Promise<void> {
    if (!tauriRuntimeAvailable) {
      setStatus("Tauri runtime not detected");
      return;
    }

    const request: SearchRequest = {
      query,
      roots: enabledRoots.length > 0 ? enabledRoots : ["."],
      extensions: extensionsRaw
        .split(",")
        .map((value) => value.trim().replace(/^\./, ""))
        .filter(Boolean),
      options: {
        max_depth: null,
        limit,
        strict,
        ignore_case: ignoreCase,
        include_hidden: includeHidden,
        entry_kind: "Any",
        size_filter: sizeFilterEnabled
          ? {
              comparison: sizeComparison,
              bytes: Math.max(0, sizeValue) * sizeUnitMultipliers[sizeUnit]
            }
          : null,
        created_filter: createdAfter
          ? { field: "Created", comparison: "After", value: new Date(createdAfter).toISOString() }
          : createdBefore
            ? { field: "Created", comparison: "Before", value: new Date(createdBefore).toISOString() }
            : null,
        modified_filter: modifiedAfter
          ? { field: "Modified", comparison: "After", value: new Date(modifiedAfter).toISOString() }
          : modifiedBefore
            ? { field: "Modified", comparison: "Before", value: new Date(modifiedBefore).toISOString() }
            : null,
        sort_mode: sortMode
      }
    };

    setResults([]);
    setSelectedPath(null);
    setLimitReached(false);
    setStatus("Searching...");
    setSearchStartedAt(Date.now());
    setElapsedMs(null);

    try {
      const response = await startSearch(request);
      setActiveSearchId(response.search_id);
      setStatus(`Running (#${response.search_id})`);
    } catch (error) {
      setStatus(`Search failed: ${String(error)}`);
      setActiveSearchId(null);
    }
  }

  async function handleCancel(): Promise<void> {
    if (!tauriRuntimeAvailable) {
      return;
    }
    try {
      await cancelSearch();
      setStatus("Cancelling...");
    } catch (error) {
      setStatus(`Cancel failed: ${String(error)}`);
    }
  }

  function handleAddRoot(): void {
    const path = newRoot.trim();
    if (!path) {
      return;
    }
    if (roots.some((root) => root.path === path)) {
      setNewRoot("");
      return;
    }
    setRoots((previous) => previous.concat({ path, enabled: true }));
    setNewRoot("");
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">MIA Search MVP</p>
          <h1>Cross-platform desktop file search.</h1>
          <p className="subcopy">Rust backend + streaming results + cancellable search.</p>
        </div>
        <div className="search-card">
          <label className="search-label" htmlFor="search-query">
            Search query
          </label>
          <input
            id="search-query"
            className="search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type file or directory name"
          />
          <div className="search-actions">
            <button type="button" className="button-primary" onClick={handleSearch}>
              Search
            </button>
            <button type="button" className="button-secondary" onClick={handleCancel}>
              Cancel
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                setQuery("");
                setResults([]);
                setStatus("Idle");
                setActiveSearchId(null);
              }}
            >
              Clear
            </button>
          </div>
        </div>
      </header>

      <section className="grid-layout" aria-label="Search workspace">
        <section className="panel">
          <div className="panel-title">Search Options</div>
          <div className="option-row">
            <label>
              <input type="checkbox" checked={strict} onChange={(e) => setStrict(e.target.checked)} /> strict
            </label>
            <label>
              <input
                type="checkbox"
                checked={ignoreCase}
                onChange={(e) => setIgnoreCase(e.target.checked)}
              />{" "}
              ignore_case
            </label>
            <label>
              <input
                type="checkbox"
                checked={includeHidden}
                onChange={(e) => setIncludeHidden(e.target.checked)}
              />{" "}
              include_hidden
            </label>
          </div>
          <div className="option-row">
            <label htmlFor="limit-input">limit</label>
            <input
              id="limit-input"
              className="mini-input"
              type="number"
              min={1}
              value={limit}
              onChange={(e) => setLimit(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
          <div className="option-row">
            <label htmlFor="sort-mode">sort</label>
            <select
              id="sort-mode"
              className="mini-input"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
            >
              <option value="Relevance">relevance</option>
              <option value="Name">name</option>
              <option value="Size">size</option>
              <option value="Modified">modified</option>
              <option value="Type">type</option>
            </select>
          </div>
          <div className="option-row">
            <label htmlFor="extensions-input">extensions</label>
            <input
              id="extensions-input"
              className="search-input compact-input"
              value={extensionsRaw}
              onChange={(e) => setExtensionsRaw(e.target.value)}
              placeholder="rs,md,txt"
            />
          </div>
          <div className="option-row">
            <label>
              <input
                type="checkbox"
                checked={sizeFilterEnabled}
                onChange={(e) => setSizeFilterEnabled(e.target.checked)}
              />{" "}
              size filter
            </label>
            <select
              className="mini-input"
              value={sizeComparison}
              onChange={(e) => setSizeComparison(e.target.value as "Smaller" | "Equal" | "Greater")}
              disabled={!sizeFilterEnabled}
            >
              <option value="Greater">greater</option>
              <option value="Smaller">smaller</option>
              <option value="Equal">equal</option>
            </select>
            <input
              className="mini-input"
              type="number"
              min={0}
              value={sizeValue}
              onChange={(e) => setSizeValue(Math.max(0, Number(e.target.value) || 0))}
              disabled={!sizeFilterEnabled}
            />
            <select
              className="mini-input"
              value={sizeUnit}
              onChange={(e) => setSizeUnit(e.target.value as "B" | "KB" | "MB" | "GB" | "TB")}
              disabled={!sizeFilterEnabled}
            >
              <option value="B">B</option>
              <option value="KB">KB</option>
              <option value="MB">MB</option>
              <option value="GB">GB</option>
              <option value="TB">TB</option>
            </select>
          </div>
          <div className="option-grid">
            <label>
              created_after
              <input
                className="search-input compact-input"
                type="datetime-local"
                value={createdAfter}
                onChange={(e) => setCreatedAfter(e.target.value)}
              />
            </label>
            <label>
              created_before
              <input
                className="search-input compact-input"
                type="datetime-local"
                value={createdBefore}
                onChange={(e) => setCreatedBefore(e.target.value)}
              />
            </label>
            <label>
              modified_after
              <input
                className="search-input compact-input"
                type="datetime-local"
                value={modifiedAfter}
                onChange={(e) => setModifiedAfter(e.target.value)}
              />
            </label>
            <label>
              modified_before
              <input
                className="search-input compact-input"
                type="datetime-local"
                value={modifiedBefore}
                onChange={(e) => setModifiedBefore(e.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">Roots</div>
          <div className="root-adder">
            <input
              className="search-input"
              value={newRoot}
              onChange={(event) => setNewRoot(event.target.value)}
              placeholder="Add root path"
            />
            <button type="button" className="button-secondary" onClick={handleAddRoot}>
              Add
            </button>
          </div>
          <ul className="root-list">
            {roots.map((root) => (
              <li key={root.path}>
                <label>
                  <input
                    type="checkbox"
                    checked={root.enabled}
                    onChange={(event) =>
                      setRoots((previous) =>
                        previous.map((item) =>
                          item.path === root.path ? { ...item, enabled: event.target.checked } : item
                        )
                      )
                    }
                  />{" "}
                  {root.path}
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel panel-results">
          <div className="panel-header">
            <div>
              <div className="panel-title">Results</div>
              <p className="panel-copy">{results.length} streamed items</p>
            </div>
          </div>

          <div className="results-list" role="list" aria-label="Search results">
            {results.map((item) => (
              <article
                className={`result-card${selectedPath === item.full_path ? " result-selected" : ""}`}
                key={item.full_path}
                role="listitem"
                onClick={() => setSelectedPath(item.full_path)}
              >
                <div>
                  <h3>{item.name || item.full_path}</h3>
                  <p>{item.full_path}</p>
                </div>
                <dl className="result-meta">
                  <div>
                    <dt>Type</dt>
                    <dd>{item.is_dir ? "Directory" : "File"}</dd>
                  </div>
                  <div>
                    <dt>Size</dt>
                    <dd>{item.size ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Root</dt>
                    <dd>{item.source_root}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">Details</div>
          {selectedResult ? (
            <dl className="status-grid">
              <div>
                <dt>Name</dt>
                <dd>{selectedResult.name || "—"}</dd>
              </div>
              <div>
                <dt>Path</dt>
                <dd>{selectedResult.full_path}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{selectedResult.is_dir ? "Directory" : "File"}</dd>
              </div>
              <div>
                <dt>Extension</dt>
                <dd>{selectedResult.extension ?? "—"}</dd>
              </div>
              <div>
                <dt>Modified</dt>
                <dd>{selectedResult.modified_at ?? "—"}</dd>
              </div>
              <div>
                <dt>Hidden</dt>
                <dd>{selectedResult.hidden ? "Yes" : "No"}</dd>
              </div>
            </dl>
          ) : (
            <p className="panel-copy">Select a result to see metadata.</p>
          )}
          <div className="panel-title status-title">Status</div>
          <dl className="status-grid">
            <div>
              <dt>State</dt>
              <dd>{status}</dd>
            </div>
            <div>
              <dt>Search ID</dt>
              <dd>{activeSearchId ?? "—"}</dd>
            </div>
            <div>
              <dt>Roots</dt>
              <dd>{enabledRoots.length}</dd>
            </div>
            <div>
              <dt>Limit reached</dt>
              <dd>{limitReached ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt>Elapsed</dt>
              <dd>{elapsedMs === null ? "—" : `${elapsedMs} ms`}</dd>
            </div>
            <div>
              <dt>Runtime</dt>
              <dd>{tauriRuntimeAvailable ? "Tauri" : "Web mode"}</dd>
            </div>
          </dl>
        </section>
      </section>
    </main>
  );
}
