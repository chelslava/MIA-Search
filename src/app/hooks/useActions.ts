import { useCallback } from "react";
import {
  actionCopyToClipboard,
  actionOpenParent,
  actionOpenPath,
  actionRevealPath,
  tauriRuntimeAvailable
} from "../../shared/tauri-client";

type ToastPusher = (text: string, kind: "info" | "success" | "error") => void;

type UseActionsResult = {
  handleOpenPath: (path: string) => Promise<void>;
  handleOpenParent: (path: string) => Promise<void>;
  handleRevealPath: (path: string) => Promise<void>;
  handleCopyPath: (path: string) => Promise<void>;
  handleCopyName: (name: string) => Promise<void>;
};

export function useActions(pushToast: ToastPusher, tr: (key: string, defaultValue: string) => string): UseActionsResult {
  const handleOpenPath = useCallback(async (path: string) => {
    if (!tauriRuntimeAvailable) return;
    try {
      await actionOpenPath(path);
    } catch {
      pushToast(tr("app.toast.openFailed", "Не удалось открыть элемент"), "error");
    }
  }, [pushToast, tr]);

  const handleOpenParent = useCallback(async (path: string) => {
    if (!tauriRuntimeAvailable) return;
    try {
      await actionOpenParent(path);
    } catch {
      pushToast(tr("app.toast.openParentFailed", "Не удалось открыть родительскую папку"), "error");
    }
  }, [pushToast, tr]);

  const handleRevealPath = useCallback(async (path: string) => {
    if (!tauriRuntimeAvailable) return;
    try {
      await actionRevealPath(path);
    } catch {
      pushToast(tr("app.toast.revealFailed", "Не удалось показать в проводнике"), "error");
    }
  }, [pushToast, tr]);

  const handleCopyPath = useCallback(async (path: string) => {
    if (!tauriRuntimeAvailable) return;
    try {
      await actionCopyToClipboard(path);
      pushToast(tr("app.toast.pathCopied", "Путь скопирован"), "success");
    } catch {
      pushToast(tr("app.toast.pathCopyFailed", "Не удалось скопировать путь"), "error");
    }
  }, [pushToast, tr]);

  const handleCopyName = useCallback(async (name: string) => {
    if (!tauriRuntimeAvailable) return;
    try {
      await actionCopyToClipboard(name);
      pushToast(tr("app.toast.nameCopied", "Имя скопировано"), "success");
    } catch {
      pushToast(tr("app.toast.nameCopyFailed", "Не удалось скопировать имя"), "error");
    }
  }, [pushToast, tr]);

  return {
    handleOpenPath,
    handleOpenParent,
    handleRevealPath,
    handleCopyPath,
    handleCopyName
  };
}
