import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  SearchBatchEvent,
  SearchCancelResponse,
  SearchDoneEvent,
  SearchErrorEvent,
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
