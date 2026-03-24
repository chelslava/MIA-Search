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
import type { SearchRequest, SearchResultItem } from "../shared/search-types";
import "./styles.css";

type RootItem = {
  path: string;
  enabled: boolean;
};

const defaultRoots: RootItem[] = [{ path: ".", enabled: true }];

export function App() {
  const [query, setQuery] = useState("");
  const [roots, setRoots] = useState<RootItem[]>(defaultRoots);
  const [newRoot, setNewRoot] = useState("");
  const [strict, setStrict] = useState(false);
  const [ignoreCase, setIgnoreCase] = useState(true);
  const [includeHidden, setIncludeHidden] = useState(false);
  const [limit, setLimit] = useState(500);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [status, setStatus] = useState("Idle");
  const [activeSearchId, setActiveSearchId] = useState<number | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  const enabledRoots = useMemo(
    () => roots.filter((root) => root.enabled).map((root) => root.path.trim()).filter(Boolean),
    [roots]
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
      }),
      onSearchCancelled((payload) => {
        setStatus(`Cancelled (#${payload.search_id})`);
        setActiveSearchId(null);
      }),
      onSearchError((payload) => {
        setStatus(`Error: ${payload.message}`);
        setActiveSearchId(null);
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
  }, []);

  async function handleSearch(): Promise<void> {
    if (!tauriRuntimeAvailable) {
      setStatus("Tauri runtime not detected");
      return;
    }

    const request: SearchRequest = {
      query,
      roots: enabledRoots.length > 0 ? enabledRoots : ["."],
      extensions: [],
      options: {
        max_depth: null,
        limit,
        strict,
        ignore_case: ignoreCase,
        include_hidden: includeHidden,
        entry_kind: "Any",
        size_filter: null,
        created_filter: null,
        modified_filter: null,
        sort_mode: "Relevance"
      }
    };

    setResults([]);
    setLimitReached(false);
    setStatus("Searching...");

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
              <article className="result-card" key={item.full_path} role="listitem">
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
          <div className="panel-title">Status</div>
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
              <dt>Runtime</dt>
              <dd>{tauriRuntimeAvailable ? "Tauri" : "Web mode"}</dd>
            </div>
          </dl>
        </section>
      </section>
    </main>
  );
}
