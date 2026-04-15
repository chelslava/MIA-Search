import { useState, useCallback } from "react";
import type { ToastItem } from "../../widgets/ToastHost";

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((text: string, kind: ToastItem["kind"] = "info"): void => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((previous) => previous.concat({ id, text, kind }));
    const dismissTime = Math.max(2000, Math.min(5000, text.length * 50));
    window.setTimeout(() => {
      setToasts((previous) => previous.filter((item) => item.id !== id));
    }, dismissTime);
  }, []);

  const closeToast = useCallback((id: string): void => {
    setToasts((previous) => previous.filter((item) => item.id !== id));
  }, []);

  return {
    toasts,
    pushToast,
    closeToast
  };
}
