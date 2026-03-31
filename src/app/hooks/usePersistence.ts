import { useState, useCallback, useMemo, useEffect } from "react";
import type { FsTreeNode, HistorySnapshot, SearchProfile } from "../../shared/search-types";
import {
  favoritesAdd,
  favoritesList,
  favoritesRemove,
  historyClear,
  historyList,
  profilesDelete,
  profilesList,
  profilesSave,
  tauriRuntimeAvailable
} from "../../shared/tauri-client";
import type { SearchRequest } from "../../shared/search-types";

type UsePersistenceResult = {
  favorites: string[];
  history: HistorySnapshot;
  profiles: SearchProfile[];
  refreshPersistenceData: () => Promise<void>;
  handleAddFavorite: (path: string) => Promise<void>;
  handleRemoveFavorite: (path: string) => Promise<void>;
  handleSaveProfile: (name: string, request: SearchRequest) => Promise<void>;
  handleDeleteProfile: (profileId: string) => Promise<void>;
  handleClearHistory: () => Promise<void>;
};

export function usePersistence(): UsePersistenceResult {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [history, setHistory] = useState<HistorySnapshot>({ query_entries: [], opened_paths: [] });
  const [profiles, setProfiles] = useState<SearchProfile[]>([]);

  const refreshPersistenceData = useCallback(async () => {
    if (!tauriRuntimeAvailable) return;
    try {
      const [favItems, historySnapshot, profileItems] = await Promise.all([
        favoritesList(),
        historyList(),
        profilesList()
      ]);
      setFavorites(favItems);
      setHistory(historySnapshot);
      setProfiles(profileItems);
    } catch {
      // Silent fail - persistence errors shouldn't crash the app
    }
  }, []);

  const handleAddFavorite = useCallback(async (path: string) => {
    if (!tauriRuntimeAvailable) return;
    try {
      const updated = await favoritesAdd(path);
      setFavorites(updated);
    } catch {
      // Silent fail
    }
  }, []);

  const handleRemoveFavorite = useCallback(async (path: string) => {
    if (!tauriRuntimeAvailable) return;
    try {
      await favoritesRemove(path);
      setFavorites((prev) => prev.filter((item) => item !== path));
    } catch {
      // Silent fail
    }
  }, []);

  const handleSaveProfile = useCallback(async (name: string, request: SearchRequest) => {
    if (!tauriRuntimeAvailable || !name.trim()) return;
    try {
      await profilesSave({
        id: "",
        name: name.trim(),
        pinned: false,
        request
      });
      await refreshPersistenceData();
    } catch {
      // Silent fail
    }
  }, [refreshPersistenceData]);

  const handleDeleteProfile = useCallback(async (profileId: string) => {
    if (!tauriRuntimeAvailable) return;
    try {
      await profilesDelete(profileId);
      setProfiles((prev) => prev.filter((item) => item.id !== profileId));
    } catch {
      // Silent fail
    }
  }, []);

  const handleClearHistory = useCallback(async () => {
    if (!tauriRuntimeAvailable) return;
    try {
      const snapshot = await historyClear();
      setHistory(snapshot);
    } catch {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    void refreshPersistenceData();
  }, [refreshPersistenceData]);

  return {
    favorites,
    history,
    profiles,
    refreshPersistenceData,
    handleAddFavorite,
    handleRemoveFavorite,
    handleSaveProfile,
    handleDeleteProfile,
    handleClearHistory
  };
}

export function useFilesystemTree() {
  const [computerRoots, setComputerRoots] = useState<FsTreeNode[]>([]);
  const [treeChildren, setTreeChildren] = useState<Record<string, FsTreeNode[]>>({});
  const [expandedTree, setExpandedTree] = useState<string[]>([]);

  const loadComputerRoots = useCallback(async () => {
    if (!tauriRuntimeAvailable) return;
    try {
      const { fsListRoots } = await import("../../shared/tauri-client");
      const rootsFromFs = await fsListRoots();
      setComputerRoots(rootsFromFs);
    } catch {
      // Silent fail
    }
  }, []);

  const loadTreeChildren = useCallback(async (path: string) => {
    if (!tauriRuntimeAvailable) return;
    if (treeChildren[path]) return;
    try {
      const { fsListChildren } = await import("../../shared/tauri-client");
      const children = await fsListChildren(path);
      setTreeChildren((prev) => ({ ...prev, [path]: children }));
    } catch {
      setTreeChildren((prev) => ({ ...prev, [path]: [] }));
    }
  }, [treeChildren]);

  const handleToggleTreeExpand = useCallback((path: string) => {
    setExpandedTree((prev) => {
      if (prev.includes(path)) {
        return prev.filter((item) => item !== path);
      }
      void loadTreeChildren(path);
      return prev.concat(path);
    });
  }, [loadTreeChildren]);

  useEffect(() => {
    void loadComputerRoots();
  }, [loadComputerRoots]);

  return {
    computerRoots,
    treeChildren,
    expandedTree,
    setExpandedTree,
    handleToggleTreeExpand,
    loadTreeChildren
  };
}
