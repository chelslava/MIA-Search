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
  if (items.length === 0) {
    return null;
  }

  const kindLabel: Record<ToastKind, string> = {
    info: "инфо",
    success: "успех",
    error: "ошибка"
  };

  return (
    <div className="toast-host" aria-label="Уведомления" aria-live="polite">
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
            aria-label="Закрыть уведомление"
            onClick={() => onClose(item.id)}
          >
            Закрыть
          </button>
        </article>
      ))}
    </div>
  );
}
