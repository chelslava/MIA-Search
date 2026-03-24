import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  actionCopyToClipboardMock: vi.fn(async () => undefined)
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
  onSearchBatch: async () => () => {},
  onSearchDone: async () => () => {},
  onSearchCancelled: async () => () => {},
  onSearchError: async () => () => {}
}));

import { App } from "./App";

describe("App smoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders core sections", async () => {
    render(<App />);
    await waitFor(() => expect(mocks.favoritesListMock).toHaveBeenCalled());

    expect(screen.getByText("Файл")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Имя" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Путь" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Действия" })).toBeInTheDocument();
  });

  it("starts search from UI", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Найти" }));

    await waitFor(() => {
      expect(mocks.startSearchMock).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText(/Состояние:\s*Выполняется \(#42\)/i)).toBeInTheDocument();
  });

  it("opens command palette with Ctrl+K and closes with Esc", async () => {
    render(<App />);

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(screen.getByRole("dialog", { name: "Палитра команд" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Палитра команд" })).not.toBeInTheDocument()
    );
  });

  it("resets active filters", async () => {
    render(<App />);
    const strictCheckbox = screen.getByRole("checkbox", { name: /строго/i });
    await userEvent.click(strictCheckbox);
    expect(strictCheckbox).toBeChecked();

    await userEvent.click(screen.getByRole("button", { name: "Сброс" }));
    expect(strictCheckbox).not.toBeChecked();
  });
});
