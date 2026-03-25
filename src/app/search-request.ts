import type { EntryKind, SearchRequest, SizeComparison, SortMode } from "../shared/search-types";
import { toIsoOrNull } from "./formatters";

type BuildSearchRequestInput = {
  query: string;
  enabledRoots: string[];
  primaryRoot: string;
  extensionsRaw: string;
  maxDepthUnlimited: boolean;
  maxDepth: number;
  limit: number | null;
  strict: boolean;
  ignoreCase: boolean;
  includeHidden: boolean;
  entryKind: EntryKind;
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
};

const sizeUnitMultipliers: Record<string, number> = {
  B: 1,
  KB: 1024,
  MB: 1024 ** 2,
  GB: 1024 ** 3,
  TB: 1024 ** 4
};

export function buildSearchRequest(input: BuildSearchRequestInput): SearchRequest {
  const createdAfterIso = input.createdFilterEnabled ? toIsoOrNull(input.createdAfter) : null;
  const createdBeforeIso = input.createdFilterEnabled ? toIsoOrNull(input.createdBefore) : null;
  const modifiedAfterIso = input.modifiedFilterEnabled ? toIsoOrNull(input.modifiedAfter) : null;
  const modifiedBeforeIso = input.modifiedFilterEnabled ? toIsoOrNull(input.modifiedBefore) : null;

  return {
    query: input.query,
    roots: input.enabledRoots.length > 0 ? input.enabledRoots : [input.primaryRoot || "."],
    extensions: input.extensionsRaw
      .split(",")
      .map((value) => value.trim().replace(/^\./, ""))
      .filter(Boolean),
    options: {
      max_depth: input.maxDepthUnlimited ? null : input.maxDepth,
      limit: input.limit,
      strict: input.strict,
      ignore_case: input.ignoreCase,
      include_hidden: input.includeHidden,
      entry_kind: input.entryKind,
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
      sort_mode: input.sortMode
    }
  };
}
