export type EntryKind = "Any" | "File" | "Directory";

export type SortMode = "Relevance" | "Name" | "Size" | "Modified" | "Type";

export type SizeComparison = "Smaller" | "Equal" | "Greater";

export type DateComparison = "Before" | "After";
export type DateField = "Created" | "Modified";

export interface SizeFilter {
  comparison: SizeComparison;
  bytes: number;
}

export interface DateFilter {
  field: DateField;
  comparison: DateComparison;
  value: string;
}

export interface SearchOptions {
  max_depth: number | null;
  limit: number | null;
  strict: boolean;
  ignore_case: boolean;
  include_hidden: boolean;
  entry_kind: EntryKind;
  size_filter: SizeFilter | null;
  created_filter: DateFilter | null;
  modified_filter: DateFilter | null;
  sort_mode: SortMode;
}

export interface SearchRequest {
  query: string;
  roots: string[];
  extensions: string[];
  options: SearchOptions;
}

export interface SearchResultItem {
  name: string;
  full_path: string;
  parent_path: string;
  is_file: boolean;
  is_dir: boolean;
  extension: string | null;
  size: number | null;
  created_at: string | null;
  modified_at: string | null;
  hidden: boolean;
  score: number | null;
  source_root: string;
}

export interface SearchStartResponse {
  search_id: number;
  status: string;
}

export interface SearchCancelResponse {
  search_id: number | null;
  status: string;
}

export interface SearchBatchEvent {
  search_id: number;
  results: SearchResultItem[];
}

export interface SearchDoneEvent {
  search_id: number;
  total_results: number;
  limit_reached: boolean;
}

export interface SearchCancelledEvent {
  search_id: number;
}

export interface SearchErrorEvent {
  search_id: number;
  message: string;
}

export interface SearchProfile {
  id: string;
  name: string;
  request: SearchRequest;
  pinned: boolean;
}

export interface HistorySnapshot {
  queries: SearchRequest[];
  opened_paths: string[];
}

export interface FsTreeNode {
  name: string;
  path: string;
  is_drive: boolean;
  has_children: boolean;
}
