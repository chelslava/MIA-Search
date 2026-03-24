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

  return (
    <div className="toast-host" aria-label="Notifications" aria-live="polite">
      {items.map((item) => (
        <article
          key={item.id}
          className={`toast toast-${item.kind ?? "info"}`}
          role={item.kind === "error" ? "alert" : "status"}
        >
          <div className="toast-content">
            <span className="toast-kind">{item.kind ?? "info"}</span>
            <p className="toast-text">{item.text}</p>
          </div>
          <button
            type="button"
            className="toast-close"
            aria-label="Close notification"
            onClick={() => onClose(item.id)}
          >
            Close
          </button>
        </article>
      ))}
    </div>
  );
}
