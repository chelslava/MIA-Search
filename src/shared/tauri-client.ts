import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  FsTreeNode,
  HistorySnapshot,
  IndexRebuildCancelResponse,
  IndexRebuildResponse,
  IndexStatusResponse,
  SearchMetadataPatch,
  SearchBatchEvent,
  SearchCancelResponse,
  SearchDoneEvent,
  SearchErrorEvent,
  SearchProfile,
  SearchRequest,
  SearchStartResponse
} from "./search-types";

function hasTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export const tauriRuntimeAvailable = hasTauriRuntime();

export async function startSearch(request: SearchRequest): Promise<SearchStartResponse> {
  return invoke<SearchStartResponse>("search_start", { request });
}

export async function cancelSearch(): Promise<SearchCancelResponse> {
  return invoke<SearchCancelResponse>("search_cancel");
}

export async function onSearchBatch(
  handler: (payload: SearchBatchEvent) => void
): Promise<UnlistenFn> {
  return listen<SearchBatchEvent>("search:batch", (event) => handler(event.payload));
}

export async function onSearchDone(handler: (payload: SearchDoneEvent) => void): Promise<UnlistenFn> {
  return listen<SearchDoneEvent>("search:done", (event) => handler(event.payload));
}

export async function onSearchCancelled(
  handler: (payload: { search_id: number }) => void
): Promise<UnlistenFn> {
  return listen("search:cancelled", (event) => handler(event.payload as { search_id: number }));
}

export async function onSearchError(handler: (payload: SearchErrorEvent) => void): Promise<UnlistenFn> {
  return listen<SearchErrorEvent>("search:error", (event) => handler(event.payload));
}

export async function favoritesList(): Promise<string[]> {
  return invoke<string[]>("favorites_list");
}

export async function favoritesAdd(path: string): Promise<string[]> {
  return invoke<string[]>("favorites_add", { path });
}

export async function favoritesRemove(path: string): Promise<boolean> {
  return invoke<boolean>("favorites_remove", { path });
}

export async function historyList(): Promise<HistorySnapshot> {
  return invoke<HistorySnapshot>("history_list");
}

export async function historyClear(): Promise<HistorySnapshot> {
  return invoke<HistorySnapshot>("history_clear");
}

export async function profilesList(): Promise<SearchProfile[]> {
  return invoke<SearchProfile[]>("profiles_list");
}

export async function profilesSave(profile: SearchProfile): Promise<SearchProfile> {
  return invoke<SearchProfile>("profiles_save", { profile });
}

export async function profilesDelete(profileId: string): Promise<boolean> {
  return invoke<boolean>("profiles_delete", { profileId });
}

export async function actionOpenPath(path: string): Promise<void> {
  await invoke("actions_open_path", { path });
}

export async function actionOpenParent(path: string): Promise<void> {
  await invoke("actions_open_parent", { path });
}

export async function actionRevealPath(path: string): Promise<void> {
  await invoke("actions_reveal_path", { path });
}

export async function actionCopyToClipboard(text: string): Promise<void> {
  await invoke("actions_copy_to_clipboard", { text });
}

export async function fsListRoots(): Promise<FsTreeNode[]> {
  return invoke<FsTreeNode[]>("fs_list_roots");
}

export async function fsListChildren(path: string): Promise<FsTreeNode[]> {
  return invoke<FsTreeNode[]>("fs_list_children", { path });
}

export async function fsPickFolder(): Promise<string | null> {
  const selected = await invoke<string | null>("fs_pick_folder");
  return selected ?? null;
}

export interface FilePreviewResponse {
  path: string;
  content: string | null;
  truncated: boolean;
  size: number;
  error: string | null;
}

export async function previewFile(path: string): Promise<FilePreviewResponse> {
  return invoke<FilePreviewResponse>("preview_file", { path });
}

export interface BatchOperationResult {
  source: string;
  destination: string | null;
  success: boolean;
  error: string | null;
}

export interface BatchOperationResponse {
  operation: string;
  total: number;
  successful: number;
  failed: number;
  results: BatchOperationResult[];
}

export async function batchCopy(sourcePaths: string[], destinationDir: string): Promise<BatchOperationResponse> {
  return invoke<BatchOperationResponse>("batch_copy", { sourcePaths, destinationDir });
}

export async function batchMove(sourcePaths: string[], destinationDir: string): Promise<BatchOperationResponse> {
  return invoke<BatchOperationResponse>("batch_move", { sourcePaths, destinationDir });
}

export async function batchDelete(paths: string[]): Promise<BatchOperationResponse> {
  return invoke<BatchOperationResponse>("batch_delete", { paths });
}

export interface ExportResponse {
  path: string | null;
  count: number;
  error: string | null;
}

export async function exportSearchResults(
  results: string[],
  format: "csv" | "json",
  includeMetadata: boolean
): Promise<ExportResponse> {
  return invoke("export_search_results", { results, format, includeMetadata });
}

export async function exportToClipboard(
  results: string[],
  format: "csv" | "json",
  includeMetadata: boolean
): Promise<ExportResponse> {
  return invoke("export_to_clipboard", { results, format, includeMetadata });
}

export async function contentSearch(
  paths: string[],
  query: string,
  caseSensitive: boolean,
  wholeWord: boolean,
  useRegex: boolean
): Promise<import("./search-types").ContentSearchResponse> {
  return invoke("content_search", { paths, query, caseSensitive, wholeWord, useRegex });
}

export async function indexStatus(): Promise<IndexStatusResponse> {
  return invoke<IndexStatusResponse>("index_status");
}

export async function indexRebuild(roots: string[]): Promise<IndexRebuildResponse> {
  return invoke<IndexRebuildResponse>("index_rebuild", { roots });
}

export async function indexRebuildCancel(): Promise<IndexRebuildCancelResponse> {
  return invoke<IndexRebuildCancelResponse>("index_rebuild_cancel");
}

export async function searchEnrichMetadata(paths: string[]): Promise<SearchMetadataPatch[]> {
  if (paths.length === 0) return [];
  return invoke<SearchMetadataPatch[]>("search_enrich_metadata", { paths });
}
