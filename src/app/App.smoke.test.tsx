import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  startSearchMock: vi.fn(async () => ({ search_id: 42, status: "accepted" })),
  cancelSearchMock: vi.fn(async () => ({ search_id: 42, status: "cancelled" })),
  favoritesListMock: vi.fn(async () => []),
  favoritesAddMock: vi.fn(async () => []),
  favoritesRemoveMock: vi.fn(async () => true),
  historyListMock: vi.fn(async () => ({ queries: [], opened_paths: [] })),
  historyClearMock: vi.fn(async () => ({ queries: [], opened_paths: [] })),
  profilesListMock: vi.fn(async () => []),
  profilesSaveMock: vi.fn(async () => ({ id: "1", name: "profile", pinned: false, request: {} })),
  profilesDeleteMock: vi.fn(async () => true),
  actionOpenPathMock: vi.fn(async () => undefined),
  actionOpenParentMock: vi.fn(async () => undefined),
  actionRevealPathMock: vi.fn(async () => undefined),
  actionCopyToClipboardMock: vi.fn(async () => undefined),
  searchEnrichMetadataMock: vi.fn(async () => []),
  onSearchErrorMock: vi.fn(async (handler: (payload: any) => void) => {
    mocks.searchErrorHandler = handler;
    return () => {};
  }),
  searchErrorHandler: null as null | ((payload: any) => void)
}));

vi.mock("../shared/tauri-client", () => ({
  tauriRuntimeAvailable: true,
  startSearch: mocks.startSearchMock,
  cancelSearch: mocks.cancelSearchMock,
  favoritesList: mocks.favoritesListMock,
  favoritesAdd: mocks.favoritesAddMock,
  favoritesRemove: mocks.favoritesRemoveMock,
  historyList: mocks.historyListMock,
  historyClear: mocks.historyClearMock,
  profilesList: mocks.profilesListMock,
  profilesSave: mocks.profilesSaveMock,
  profilesDelete: mocks.profilesDeleteMock,
  actionOpenPath: mocks.actionOpenPathMock,
  actionOpenParent: mocks.actionOpenParentMock,
  actionRevealPath: mocks.actionRevealPathMock,
  actionCopyToClipboard: mocks.actionCopyToClipboardMock,
  searchEnrichMetadata: mocks.searchEnrichMetadataMock,
  onSearchBatch: async () => () => {},
  onSearchDone: async () => () => {},
  onSearchCancelled: async () => () => {},
  onSearchError: mocks.onSearchErrorMock
}));

import { App } from "./App";

describe("App smoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.searchErrorHandler = null;
  });

  it("renders main layout blocks", async () => {
    render(<App />);
    await waitFor(() => expect(mocks.favoritesListMock).toHaveBeenCalled());

    expect(screen.getByPlaceholderText("Поиск файлов и папок...")).toBeInTheDocument();
    expect(screen.getByText("Корневые пути")).toBeInTheDocument();
    expect(screen.getByText("Детали")).toBeInTheDocument();
    expect(screen.getByText(/Найдено:/i)).toBeInTheDocument();
  });

  it("starts search from top bar", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "🔎 Поиск" }));
    await waitFor(() => expect(mocks.startSearchMock).toHaveBeenCalledTimes(1));
  });

  it("opens command palette with Ctrl+K", async () => {
    render(<App />);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    await waitFor(() =>
      expect(screen.getByRole("dialog", { name: "Палитра команд" })).toBeInTheDocument()
    );
  });

  it("changes search mode from filters", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "⏷" }));
    await userEvent.click(screen.getByRole("radio", { name: /только файлы/i }));
    await userEvent.click(screen.getByRole("button", { name: "Применить" }));

    await waitFor(() => expect(mocks.startSearchMock).toHaveBeenCalledTimes(1));
    const firstCall = ((mocks.startSearchMock as any).mock.calls[0]?.[0] as any) ?? null;
    expect(firstCall?.options?.entry_kind).toBe("File");
  });

  it("passes exclude paths from filters into search request", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "⏷" }));
    await userEvent.type(
      screen.getByPlaceholderText("node_modules, .git, target"),
      " node_modules, .git, node_modules "
    );
    await userEvent.click(screen.getByRole("button", { name: "Применить" }));

    await waitFor(() => expect(mocks.startSearchMock).toHaveBeenCalledTimes(1));
    const firstCall = ((mocks.startSearchMock as any).mock.calls[0]?.[0] as any) ?? null;
    expect(firstCall?.exclude_paths).toEqual(["node_modules", ".git"]);
  });

  it("renders friendly status for coded search errors", async () => {
    render(<App />);
    await waitFor(() => expect(mocks.onSearchErrorMock).toHaveBeenCalled());
    expect(mocks.searchErrorHandler).not.toBeNull();

    await act(async () => {
      mocks.searchErrorHandler?.({
        search_id: 42,
        message: "[SEARCH_INVALID_QUERY] regex parse error: ["
      });
    });

    await waitFor(() =>
      expect(screen.getByText(/Ошибка запроса поиска:/i)).toBeInTheDocument()
    );
  });
});
