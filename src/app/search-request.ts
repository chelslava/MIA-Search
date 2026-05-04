import type { EntryKind, MatchMode, SearchBackend, SearchRequest, SizeComparison, SortMode } from "../shared/search-types";
import { toIsoOrNull } from "./formatters";

/**
 * Represents a date validation error for a specific filter field.
 * @property field - The name of the field that failed validation
 * @property rawValue - The original value that failed to parse as a valid date
 */
export type DateValidationError = {
  field: "modifiedAfter" | "modifiedBefore" | "createdAfter" | "createdBefore";
  rawValue: string;
};

/**
 * Input parameters for building a search request.
 * Maps UI state to backend search request format.
 */
export type BuildSearchRequestInput = {
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

/**
 * Validates date filter inputs and returns errors for invalid values.
 * Checks that date strings can be parsed as ISO 8601 format.
 *
 * @param input - The search input containing date filter values
 * @returns Array of validation errors for fields with invalid dates
 *
 * @example
 * const errors = getDateValidationErrors({
 *   modifiedAfter: "2024-01-01",
 *   modifiedBefore: "invalid-date",
 *   // ...other fields
 * });
 * // errors will contain entry for "modifiedBefore"
 */
export function getDateValidationErrors(input: BuildSearchRequestInput): DateValidationError[] {
  const errors: DateValidationError[] = [];

  const check = (enabled: boolean, rawValue: string, field: DateValidationError["field"]) => {
    if (!enabled || !rawValue || !rawValue.trim()) return;
    const iso = toIsoOrNull(rawValue);
    if (iso === null) {
      errors.push({ field, rawValue });
    }
  };

  check(input.createdFilterEnabled, input.createdAfter, "createdAfter");
  check(input.createdFilterEnabled, input.createdBefore, "createdBefore");
  check(input.modifiedFilterEnabled, input.modifiedAfter, "modifiedAfter");
  check(input.modifiedFilterEnabled, input.modifiedBefore, "modifiedBefore");

  return errors;
}

/**
 * Builds a SearchRequest object from UI input parameters.
 * Normalizes and validates input values, applying defaults where necessary.
 *
 * @param input - The UI input parameters for the search
 * @returns A normalized SearchRequest object for the backend
 *
 * @example
 * const request = buildSearchRequest({
 *   query: "*.ts",
 *   enabledRoots: ["C:\\src"],
 *   matchMode: "Wildcard",
 *   // ...other parameters
 * });
 */
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
