import { useTranslation } from "react-i18next";

type ToastKind = "info" | "success" | "error";

export interface ToastItem {
  id: string;
  text: string;
  kind?: ToastKind;
}

interface ToastHostProps {
  items: ToastItem[];
  onClose: (id: string) => void;
}

export function ToastHost({ items, onClose }: ToastHostProps) {
  const { t } = useTranslation();

  if (items.length === 0) {
    return null;
  }

  const kindLabel: Record<ToastKind, string> = {
    info: t("toast.kind.info"),
    success: t("toast.kind.success"),
    error: t("toast.kind.error")
  };

  return (
    <div className="toast-host" aria-label={t("toast.hostLabel")} aria-live="polite">
      {items.map((item) => (
        <article
          key={item.id}
          className={`toast toast-${item.kind ?? "info"}`}
          role={item.kind === "error" ? "alert" : "status"}
        >
          <div className="toast-content">
            <span className="toast-kind">{kindLabel[item.kind ?? "info"]}</span>
            <p className="toast-text">{item.text}</p>
          </div>
          <button
            type="button"
            className="toast-close"
            aria-label={t("toast.closeButtonAriaLabel")}
            onClick={() => onClose(item.id)}
          >
            {t("toast.closeButton")}
          </button>
        </article>
      ))}
    </div>
  );
}
