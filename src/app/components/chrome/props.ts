import type { RefObject } from "react";
import type { EntryKind, SearchResultItem, SizeComparison, SortMode } from "../../../shared/search-types";
import type { ContextMenuState, DisplayMode, FilterChip, RootItem, ThemePreset } from "../../types";

export type TranslateFn = (key: string, defaultValue: string, values?: Record<string, unknown>) => string;

export type AppLanguage = "ru" | "en";
export type ThemeUnit = "B" | "KB" | "MB" | "GB" | "TB";
export type LimitMode = "100" | "500" | "1000" | "custom" | "none";

export type TopBarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  regexEnabled: boolean;
  onClearQuery: () => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  isSearching: boolean;
  onSearch: () => void;
  onCancelSearch: () => void;
  liveSearch: boolean;
  onLiveSearchChange: (value: boolean) => void;
  onToggleFilters: () => void;
  themeId: string;
  onThemeChange: (value: string) => void;
  themeOptions: ThemePreset[];
  onOpenCommandPalette: () => void;
  onToggleSettings: () => void;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
  tr: TranslateFn;
};

export type FiltersPanelProps = {
  entryKind: EntryKind;
  onEntryKindChange: (value: EntryKind) => void;
  extensionsRaw: string;
  onExtensionsRawChange: (value: string) => void;
  maxDepthUnlimited: boolean;
  onMaxDepthUnlimitedChange: (value: boolean) => void;
  maxDepth: number;
  onMaxDepthChange: (value: number) => void;
  sizeFilterEnabled: boolean;
  onSizeFilterEnabledChange: (value: boolean) => void;
  sizeComparison: SizeComparison;
  onSizeComparisonChange: (value: SizeComparison) => void;
  sizeValue: number;
  onSizeValueChange: (value: number) => void;
  sizeUnit: ThemeUnit;
  onSizeUnitChange: (value: ThemeUnit) => void;
  modifiedFilterEnabled: boolean;
  onModifiedFilterEnabledChange: (value: boolean) => void;
  modifiedAfter: string;
  onModifiedAfterChange: (value: string) => void;
  modifiedBefore: string;
  onModifiedBeforeChange: (value: string) => void;
  createdFilterEnabled: boolean;
  onCreatedFilterEnabledChange: (value: boolean) => void;
  createdAfter: string;
  onCreatedAfterChange: (value: string) => void;
  createdBefore: string;
  onCreatedBeforeChange: (value: string) => void;
  strict: boolean;
  onStrictChange: (value: boolean) => void;
  ignoreCase: boolean;
  onIgnoreCaseChange: (value: boolean) => void;
  includeHidden: boolean;
  onIncludeHiddenChange: (value: boolean) => void;
  limitMode: LimitMode;
  onLimitModeChange: (value: LimitMode) => void;
  customLimit: number;
  onCustomLimitChange: (value: number) => void;
  onApply: () => void;
  onResetAll: () => void;
  tr: TranslateFn;
};

export type SettingsPanelProps = {
  language: AppLanguage;
  onLanguageChange: (value: AppLanguage) => void;
  liveSearch: boolean;
  onLiveSearchChange: (value: boolean) => void;
  regexEnabled: boolean;
  onRegexEnabledChange: (value: boolean) => void;
  debounceMs: number;
  onDebounceMsChange: (value: number) => void;
  newThemeName: string;
  onNewThemeNameChange: (value: string) => void;
  newThemeBg: string;
  onNewThemeBgChange: (value: string) => void;
  newThemeText: string;
  onNewThemeTextChange: (value: string) => void;
  newThemeAccent: string;
  onNewThemeAccentChange: (value: string) => void;
  onCreateCustomTheme: () => void;
  tr: TranslateFn;
};

export type StatusText = {
  elapsed: string;
  warning: string | null;
};

export type StatusBarProps = {
  resultsCount: number;
  status: string;
  statusText: StatusText;
  checkedPaths: number;
  activeSearchId: number | null;
  tr: TranslateFn;
};

export type AppContextMenuProps = {
  contextMenu: ContextMenuState;
  onOpenPath: (path: string) => void;
  onOpenParent: (path: string) => void;
  onRevealPath: (path: string) => void;
  onCopyPath: (path: string) => void;
  onCopyName: (name: string) => void;
  onAddFavorite: (path: string) => void;
  onSetPrimaryRoot: (path: string) => void;
  onDeleteRoot: (path: string) => void;
  tr: TranslateFn;
};

export type ChromeFilterChip = FilterChip;
export type ChromeDisplayMode = DisplayMode;
export type ChromeRootItem = RootItem;
export type ChromeSearchResultItem = SearchResultItem;
export type ChromeSortMode = SortMode;
