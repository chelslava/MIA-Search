import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  FsTreeNode,
  HistorySnapshot,
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

export async function indexStatus(): Promise<IndexStatusResponse> {
  return invoke<IndexStatusResponse>("index_status");
}

export async function indexRebuild(roots: string[]): Promise<IndexRebuildResponse> {
  return invoke<IndexRebuildResponse>("index_rebuild", { roots });
}

export async function indexRebuildCancel(): Promise<void> {
  await invoke("index_rebuild_cancel");
}

export async function searchEnrichMetadata(paths: string[]): Promise<SearchMetadataPatch[]> {
  if (paths.length === 0) return [];
  return invoke<SearchMetadataPatch[]>("search_enrich_metadata", { paths });
}
