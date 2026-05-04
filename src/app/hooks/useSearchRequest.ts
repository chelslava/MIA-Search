import { useCallback, useMemo } from "react";
import type { SearchRequest } from "../../shared/search-types";
import { buildSearchRequest, getDateValidationErrors, type DateValidationError, type BuildSearchRequestInput } from "../search-request";

type UseSearchRequestOptions = Omit<BuildSearchRequestInput, "enabledRoots" | "primaryRoot" | "extensionsRaw" | "excludePathsRaw"> & {
  enabledRoots: string[];
  primaryRoot: string | null;
  extensionsRaw: string;
  excludePathsRaw: string;
};

export type { DateValidationError };

export function useSearchRequest(options: UseSearchRequestOptions) {
  const buildCurrentRequest = useCallback((): SearchRequest => {
    return buildSearchRequest({
      query: options.query,
      enabledRoots: options.enabledRoots,
      primaryRoot: options.primaryRoot ?? "",
      extensionsRaw: options.extensionsRaw,
      excludePathsRaw: options.excludePathsRaw,
      maxDepthUnlimited: options.maxDepthUnlimited,
      maxDepth: options.maxDepth,
      limit: options.limit,
      strict: options.strict,
      ignoreCase: options.ignoreCase,
      includeHidden: options.includeHidden,
      entryKind: options.entryKind,
      matchMode: options.matchMode,
      sizeFilterEnabled: options.sizeFilterEnabled,
      sizeComparison: options.sizeComparison,
      sizeValue: options.sizeValue,
      sizeUnit: options.sizeUnit,
      modifiedFilterEnabled: options.modifiedFilterEnabled,
      modifiedAfter: options.modifiedAfter,
      modifiedBefore: options.modifiedBefore,
      createdFilterEnabled: options.createdFilterEnabled,
      createdAfter: options.createdAfter,
      createdBefore: options.createdBefore,
      sortMode: options.sortMode,
      searchBackend: options.searchBackend
    });
  }, [options]);

  const validateDateFilters = useCallback((): DateValidationError[] => {
    return getDateValidationErrors({
      query: options.query,
      enabledRoots: options.enabledRoots,
      primaryRoot: options.primaryRoot ?? "",
      extensionsRaw: options.extensionsRaw,
      excludePathsRaw: options.excludePathsRaw,
      maxDepthUnlimited: options.maxDepthUnlimited,
      maxDepth: options.maxDepth,
      limit: options.limit,
      strict: options.strict,
      ignoreCase: options.ignoreCase,
      includeHidden: options.includeHidden,
      entryKind: options.entryKind,
      matchMode: options.matchMode,
      sizeFilterEnabled: options.sizeFilterEnabled,
      sizeComparison: options.sizeComparison,
      sizeValue: options.sizeValue,
      sizeUnit: options.sizeUnit,
      modifiedFilterEnabled: options.modifiedFilterEnabled,
      modifiedAfter: options.modifiedAfter,
      modifiedBefore: options.modifiedBefore,
      createdFilterEnabled: options.createdFilterEnabled,
      createdAfter: options.createdAfter,
      createdBefore: options.createdBefore,
      sortMode: options.sortMode,
      searchBackend: options.searchBackend
    });
  }, [options]);

  const isEmptyQuery = useMemo(
    () => !options.query.trim(),
    [options.query]
  );

  return {
    buildCurrentRequest,
    validateDateFilters,
    isEmptyQuery
  };
}
