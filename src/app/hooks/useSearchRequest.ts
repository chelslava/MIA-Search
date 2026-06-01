import { useCallback, useMemo } from "preact/hooks";
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
  const {
    query,
    enabledRoots,
    primaryRoot,
    extensionsRaw,
    excludePathsRaw,
    maxDepthUnlimited,
    maxDepth,
    limit,
    strict,
    ignoreCase,
    includeHidden,
    entryKind,
    matchMode,
    sizeFilterEnabled,
    sizeComparison,
    sizeValue,
    sizeUnit,
    modifiedFilterEnabled,
    modifiedAfter,
    modifiedBefore,
    createdFilterEnabled,
    createdAfter,
    createdBefore,
    sortMode,
    searchBackend
  } = options;

  const requestInput = useMemo<BuildSearchRequestInput>(() => ({
    query,
    enabledRoots,
    primaryRoot: primaryRoot ?? "",
    extensionsRaw,
    excludePathsRaw,
    maxDepthUnlimited,
    maxDepth,
    limit,
    strict,
    ignoreCase,
    includeHidden,
    entryKind,
    matchMode,
    sizeFilterEnabled,
    sizeComparison,
    sizeValue,
    sizeUnit,
    modifiedFilterEnabled,
    modifiedAfter,
    modifiedBefore,
    createdFilterEnabled,
    createdAfter,
    createdBefore,
    sortMode,
    searchBackend
  }), [
    query,
    enabledRoots,
    primaryRoot,
    extensionsRaw,
    excludePathsRaw,
    maxDepthUnlimited,
    maxDepth,
    limit,
    strict,
    ignoreCase,
    includeHidden,
    entryKind,
    matchMode,
    sizeFilterEnabled,
    sizeComparison,
    sizeValue,
    sizeUnit,
    modifiedFilterEnabled,
    modifiedAfter,
    modifiedBefore,
    createdFilterEnabled,
    createdAfter,
    createdBefore,
    sortMode,
    searchBackend
  ]);

  const buildCurrentRequest = useCallback((): SearchRequest => {
    return buildSearchRequest(requestInput);
  }, [requestInput]);

  const validateDateFilters = useCallback((): DateValidationError[] => {
    return getDateValidationErrors(requestInput);
  }, [requestInput]);

  const isEmptyQuery = useMemo(
    () => !query.trim(),
    [query]
  );

  return {
    buildCurrentRequest,
    validateDateFilters,
    isEmptyQuery
  };
}
