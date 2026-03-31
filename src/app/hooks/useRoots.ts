import { useState, useCallback, useMemo } from "react";
import type { RootItem } from "../types";
import { DEFAULT_ROOT_PATH } from "../utils/search-utils";
import { fsPickFolder, tauriRuntimeAvailable } from "../../shared/tauri-client";

type UseRootsResult = {
  roots: RootItem[];
  primaryRoot: string;
  enabledRoots: string[];
  setRoots: React.Dispatch<React.SetStateAction<RootItem[]>>;
  setPrimaryRoot: React.Dispatch<React.SetStateAction<string>>;
  upsertRoot: (path: string) => void;
  handleRemoveRoot: (path: string) => void;
  handlePickRootPath: () => Promise<void>;
  handleSelectTreeRoot: (path: string) => void;
};

export function useRoots(): UseRootsResult {
  const [roots, setRoots] = useState<RootItem[]>([{ path: DEFAULT_ROOT_PATH, enabled: true }]);
  const [primaryRoot, setPrimaryRoot] = useState(DEFAULT_ROOT_PATH);

  const enabledRoots = useMemo(
    () => roots.filter((root) => root.enabled).map((root) => root.path.trim()).filter(Boolean),
    [roots]
  );

  const upsertRoot = useCallback((path: string) => {
    const normalized = path.trim();
    if (!normalized) return;
    setRoots((prev) => {
      if (prev.some((root) => root.path === normalized)) return prev;
      return prev.concat({ path: normalized, enabled: true });
    });
  }, []);

  const handleRemoveRoot = useCallback((path: string) => {
    setRoots((prev) => {
      const next = prev.filter((item) => item.path !== path);
      if (next.length === 0) {
        setPrimaryRoot(DEFAULT_ROOT_PATH);
        return [{ path: DEFAULT_ROOT_PATH, enabled: true }];
      }
      if (!next.some((item) => item.path === primaryRoot)) {
        setPrimaryRoot(next[0]?.path ?? DEFAULT_ROOT_PATH);
      }
      return next;
    });
  }, [primaryRoot]);

  const handlePickRootPath = useCallback(async () => {
    if (!tauriRuntimeAvailable) return;
    try {
      const selected = await fsPickFolder();
      if (!selected) return;
      upsertRoot(selected);
      setPrimaryRoot(selected);
    } catch {
      // Silent fail
    }
  }, [upsertRoot]);

  const handleSelectTreeRoot = useCallback((path: string) => {
    upsertRoot(path);
    setPrimaryRoot(path);
  }, [upsertRoot]);

  return {
    roots,
    primaryRoot,
    enabledRoots,
    setRoots,
    setPrimaryRoot,
    upsertRoot,
    handleRemoveRoot,
    handlePickRootPath,
    handleSelectTreeRoot
  };
}
