export type EntryKind = "Any" | "File" | "Directory";

export type SortMode = "Relevance" | "Name" | "Size" | "Modified" | "Type";
export type MatchMode = "Plain" | "Wildcard" | "Regex";
export type SearchBackend = "Scan" | "Index";

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
  match_mode: MatchMode;
  size_filter: SizeFilter | null;
  created_filter: DateFilter | null;
  modified_filter: DateFilter | null;
  sort_mode: SortMode;
  search_backend: SearchBackend;
}

export interface SearchRequest {
  query: string;
  roots: string[];
  extensions: string[];
  exclude_paths: string[];
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

export interface SearchMetadataPatch {
  full_path: string;
  extension?: string | null;
  size?: number | null;
  created_at?: string | null;
  modified_at?: string | null;
  hidden?: boolean;
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

export interface HistoryQueryEntry {
  query: string;
}

export interface HistorySnapshot {
  query_entries: HistoryQueryEntry[];
  opened_paths: string[];
}

export interface FsTreeNode {
  name: string;
  path: string;
  is_drive: boolean;
  has_children: boolean;
}

export interface IndexStatusResponse {
  status: "empty" | "ready" | "in_progress";
  entries: number;
  roots: number;
  root_paths: string[];
  updated_at: string;
  version_mismatch: boolean;
}

export interface IndexRebuildResponse {
  status: "ok";
  roots: number;
  entries: number;
  updated_at: string;
}
