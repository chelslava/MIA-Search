import { useState, useCallback } from "preact/hooks";
import type { ToastItem } from "../../widgets/ToastHost";

export interface ToastHistoryItem extends ToastItem {
  timestamp: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [toastHistory, setToastHistory] = useState<ToastHistoryItem[]>([]);

  const pushToast = useCallback((text: string, kind: ToastItem["kind"] = "info"): void => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const newItem: ToastItem = { id, text, kind };
    setToasts((previous) => previous.concat(newItem));
    setToastHistory((previous) => [{ ...newItem, timestamp: Date.now() }, ...previous].slice(0, 50));
    const dismissTime = Math.max(2000, Math.min(5000, text.length * 50));
    window.setTimeout(() => {
      setToasts((previous) => previous.filter((item) => item.id !== id));
    }, dismissTime);
  }, []);

  const closeToast = useCallback((id: string): void => {
    setToasts((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const clearToastHistory = useCallback((): void => {
    setToastHistory([]);
  }, []);

  return {
    toasts,
    toastHistory,
    pushToast,
    closeToast,
    clearToastHistory
  };
}
