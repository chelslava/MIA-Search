import type { EntryKind, MatchMode, SearchBackend, SearchRequest, SizeComparison, SortMode } from "../shared/search-types";
import { toIsoOrNull } from "./formatters";

type BuildSearchRequestInput = {
  query: string;
  enabledRoots: string[];
  primaryRoot: string;
  extensionsRaw: string;
  excludePathsRaw: string;
  maxDepthUnlimited: boolean;
  maxDepth: number;
  limit: number | null;
  strict: boolean;
  ignoreCase: boolean;
  includeHidden: boolean;
  entryKind: EntryKind;
  matchMode: MatchMode;
  sizeFilterEnabled: boolean;
  sizeComparison: SizeComparison;
  sizeValue: number;
  sizeUnit: "B" | "KB" | "MB" | "GB" | "TB";
  modifiedFilterEnabled: boolean;
  modifiedAfter: string;
  modifiedBefore: string;
  createdFilterEnabled: boolean;
  createdAfter: string;
  createdBefore: string;
  sortMode: SortMode;
  searchBackend: SearchBackend;
};

const sizeUnitMultipliers: Record<string, number> = {
  B: 1,
  KB: 1024,
  MB: 1024 ** 2,
  GB: 1024 ** 3,
  TB: 1024 ** 4
};

export function buildSearchRequest(input: BuildSearchRequestInput): SearchRequest {
  const fallbackRoot =
    typeof navigator !== "undefined" && /windows/i.test(navigator.userAgent) ? "C:\\" : "/";
  const createdAfterIso = input.createdFilterEnabled ? toIsoOrNull(input.createdAfter) : null;
  const createdBeforeIso = input.createdFilterEnabled ? toIsoOrNull(input.createdBefore) : null;
  const modifiedAfterIso = input.modifiedFilterEnabled ? toIsoOrNull(input.modifiedAfter) : null;
  const modifiedBeforeIso = input.modifiedFilterEnabled ? toIsoOrNull(input.modifiedBefore) : null;
  const uiExtensions = input.extensionsRaw
    .split(",")
    .map((value) => value.trim().replace(/^\./, ""))
    .filter(Boolean);
  const mergedExtensions = Array.from(new Set(uiExtensions));
  const excludePaths = Array.from(
    new Set(
      input.excludePathsRaw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );

  return {
    query: input.query.trim(),
    roots: input.enabledRoots.length > 0 ? input.enabledRoots : [input.primaryRoot || fallbackRoot],
    extensions: mergedExtensions,
    exclude_paths: excludePaths,
    options: {
      max_depth: input.maxDepthUnlimited ? null : input.maxDepth,
      limit: input.limit,
      strict: input.strict,
      ignore_case: input.ignoreCase,
      include_hidden: input.includeHidden,
      entry_kind: input.entryKind,
      match_mode: input.matchMode,
      size_filter: input.sizeFilterEnabled
        ? {
            comparison: input.sizeComparison,
            bytes: Math.max(0, input.sizeValue) * sizeUnitMultipliers[input.sizeUnit]
          }
        : null,
      created_filter: createdAfterIso
        ? { field: "Created", comparison: "After", value: createdAfterIso }
        : createdBeforeIso
          ? { field: "Created", comparison: "Before", value: createdBeforeIso }
          : null,
      modified_filter: modifiedAfterIso
        ? { field: "Modified", comparison: "After", value: modifiedAfterIso }
        : modifiedBeforeIso
          ? { field: "Modified", comparison: "Before", value: modifiedBeforeIso }
          : null,
      sort_mode: input.sortMode,
      search_backend: input.searchBackend
    }
  };
}
