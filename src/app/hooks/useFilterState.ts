import { useState, useCallback, useMemo, useEffect } from "react";
import type { EntryKind, MatchMode, SearchBackend, SizeComparison, SortMode } from "../../shared/search-types";

type FilterState = {
  strict: boolean;
  ignoreCase: boolean;
  includeHidden: boolean;
  entryKind: EntryKind;
  extensionsRaw: string;
  excludePathsRaw: string;
  matchMode: MatchMode;
  sortMode: SortMode;
  searchBackend: SearchBackend;
  maxDepthUnlimited: boolean;
  maxDepth: number;
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
  limitMode: "100" | "500" | "1000" | "custom" | "none";
  customLimit: number;
};

type FilterStateActions = {
  setStrict: React.Dispatch<React.SetStateAction<boolean>>;
  setIgnoreCase: React.Dispatch<React.SetStateAction<boolean>>;
  setIncludeHidden: React.Dispatch<React.SetStateAction<boolean>>;
  setEntryKind: React.Dispatch<React.SetStateAction<EntryKind>>;
  setExtensionsRaw: React.Dispatch<React.SetStateAction<string>>;
  setExcludePathsRaw: React.Dispatch<React.SetStateAction<string>>;
  setMatchMode: React.Dispatch<React.SetStateAction<MatchMode>>;
  setSortMode: React.Dispatch<React.SetStateAction<SortMode>>;
  setSearchBackend: React.Dispatch<React.SetStateAction<SearchBackend>>;
  setMaxDepthUnlimited: React.Dispatch<React.SetStateAction<boolean>>;
  setMaxDepth: React.Dispatch<React.SetStateAction<number>>;
  setSizeFilterEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setSizeComparison: React.Dispatch<React.SetStateAction<SizeComparison>>;
  setSizeValue: React.Dispatch<React.SetStateAction<number>>;
  setSizeUnit: React.Dispatch<React.SetStateAction<"B" | "KB" | "MB" | "GB" | "TB">>;
  setModifiedFilterEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setModifiedAfter: React.Dispatch<React.SetStateAction<string>>;
  setModifiedBefore: React.Dispatch<React.SetStateAction<string>>;
  setCreatedFilterEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setCreatedAfter: React.Dispatch<React.SetStateAction<string>>;
  setCreatedBefore: React.Dispatch<React.SetStateAction<string>>;
  setLimitMode: React.Dispatch<React.SetStateAction<"100" | "500" | "1000" | "custom" | "none">>;
  setCustomLimit: React.Dispatch<React.SetStateAction<number>>;
  clearAllFilters: () => void;
};

export function useFilterState(): FilterState & FilterStateActions {
  const [strict, setStrict] = useState(false);
  const [ignoreCase, setIgnoreCase] = useState(true);
  const [includeHidden, setIncludeHidden] = useState(false);
  const [entryKind, setEntryKind] = useState<EntryKind>("Any");
  const [extensionsRaw, setExtensionsRaw] = useState("");
  const [excludePathsRaw, setExcludePathsRaw] = useState("");
  const [matchMode, setMatchMode] = useState<MatchMode>("Plain");
  const [sortMode, setSortMode] = useState<SortMode>("Relevance");
  const [searchBackend, setSearchBackend] = useState<SearchBackend>("Scan");
  const [maxDepthUnlimited, setMaxDepthUnlimited] = useState(true);
  const [maxDepth, setMaxDepth] = useState(3);
  const [sizeFilterEnabled, setSizeFilterEnabled] = useState(false);
  const [sizeComparison, setSizeComparison] = useState<SizeComparison>("Greater");
  const [sizeValue, setSizeValue] = useState(1);
  const [sizeUnit, setSizeUnit] = useState<"B" | "KB" | "MB" | "GB" | "TB">("MB");
  const [modifiedFilterEnabled, setModifiedFilterEnabled] = useState(false);
  const [modifiedAfter, setModifiedAfter] = useState("");
  const [modifiedBefore, setModifiedBefore] = useState("");
  const [createdFilterEnabled, setCreatedFilterEnabled] = useState(false);
  const [createdAfter, setCreatedAfter] = useState("");
  const [createdBefore, setCreatedBefore] = useState("");
  const [limitMode, setLimitMode] = useState<"100" | "500" | "1000" | "custom" | "none">("500");
  const [customLimit, setCustomLimit] = useState(500);

  const clearAllFilters = useCallback(() => {
    setEntryKind("Any");
    setMatchMode("Plain");
    setExtensionsRaw("");
    setExcludePathsRaw("");
    setMaxDepthUnlimited(true);
    setMaxDepth(3);
    setSizeFilterEnabled(false);
    setModifiedFilterEnabled(false);
    setCreatedFilterEnabled(false);
    setStrict(false);
    setIgnoreCase(true);
    setIncludeHidden(false);
    setLimitMode("500");
    setCustomLimit(500);
  }, []);

  return {
    strict,
    ignoreCase,
    includeHidden,
    entryKind,
    extensionsRaw,
    excludePathsRaw,
    matchMode,
    sortMode,
    searchBackend,
    maxDepthUnlimited,
    maxDepth,
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
    limitMode,
    customLimit,
    setStrict,
    setIgnoreCase,
    setIncludeHidden,
    setEntryKind,
    setExtensionsRaw,
    setExcludePathsRaw,
    setMatchMode,
    setSortMode,
    setSearchBackend,
    setMaxDepthUnlimited,
    setMaxDepth,
    setSizeFilterEnabled,
    setSizeComparison,
    setSizeValue,
    setSizeUnit,
    setModifiedFilterEnabled,
    setModifiedAfter,
    setModifiedBefore,
    setCreatedFilterEnabled,
    setCreatedAfter,
    setCreatedBefore,
    setLimitMode,
    setCustomLimit,
    clearAllFilters
  };
}

export function useSettingsState() {
  const [liveSearch, setLiveSearch] = useState(true);
  const [regexEnabled, setRegexEnabled] = useState<boolean>(() => localStorage.getItem("mia.regexEnabled") !== "false");
  const [debounceMs, setDebounceMs] = useState(300);
  const [indexTtlHours, setIndexTtlHours] = useState<number>(() => {
    const raw = Number(localStorage.getItem("mia.indexTtlHours"));
    if (!Number.isFinite(raw) || raw <= 0) return 6;
    return Math.max(1, Math.min(168, Math.round(raw)));
  });
  const [indexCheckIntervalMinutes, setIndexCheckIntervalMinutes] = useState<number>(() => {
    const raw = Number(localStorage.getItem("mia.indexCheckIntervalMinutes"));
    if (!Number.isFinite(raw) || raw <= 0) return 15;
    return Math.max(1, Math.min(120, Math.round(raw)));
  });

  useEffect(() => {
    localStorage.setItem("mia.regexEnabled", regexEnabled ? "true" : "false");
  }, [regexEnabled]);

  useEffect(() => {
    localStorage.setItem("mia.indexTtlHours", String(indexTtlHours));
  }, [indexTtlHours]);

  useEffect(() => {
    localStorage.setItem("mia.indexCheckIntervalMinutes", String(indexCheckIntervalMinutes));
  }, [indexCheckIntervalMinutes]);

  useEffect(() => {
    if (!regexEnabled) {
      // This will be handled by the parent component
    }
  }, [regexEnabled]);

  return {
    liveSearch,
    setLiveSearch,
    regexEnabled,
    setRegexEnabled,
    debounceMs,
    setDebounceMs,
    indexTtlHours,
    setIndexTtlHours,
    indexCheckIntervalMinutes,
    setIndexCheckIntervalMinutes
  };
}

export function useLayoutState() {
  const [displayMode, setDisplayMode] = useState<"table" | "compact" | "cards">("table");
  const [leftVisible, setLeftVisible] = useState(true);
  const [rightVisible, setRightVisible] = useState(true);
  const [leftWidth, setLeftWidth] = useState(260);
  const [rightWidth, setRightWidth] = useState(280);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    if (window.innerWidth < 1024) {
      setLeftVisible(false);
      setRightVisible(false);
    }
  }, []);

  return {
    displayMode,
    setDisplayMode,
    leftVisible,
    setLeftVisible,
    rightVisible,
    setRightVisible,
    leftWidth,
    setLeftWidth,
    rightWidth,
    setRightWidth,
    settingsOpen,
    setSettingsOpen,
    filtersOpen,
    setFiltersOpen,
    paletteOpen,
    setPaletteOpen
  };
}
