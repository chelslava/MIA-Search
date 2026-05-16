import { useRef } from "preact/hooks";

interface SwitchProps {
  className?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  id?: string;
  title?: string;
  "aria-label"?: string;
}

export function Switch(props: SwitchProps) {
  const { className, checked, onCheckedChange, id, title, "aria-label": ariaLabel } = props;
  const isChecked = Boolean(checked);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = () => {
    onCheckedChange?.(!isChecked);
  };

  return (
    <label
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface-alt)] px-1.5 py-1 text-xs text-[var(--text)] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--surface-alt)_78%,var(--accent))] ${className || ""}`}
      title={title}
    >
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        id={id}
        aria-label={ariaLabel}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="relative h-5 w-9 rounded-full border border-[var(--border)] transition-colors duration-150"
        style={{ backgroundColor: isChecked ? "var(--accent)" : "var(--surface)" }}
      >
        <span
          className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-[var(--text)] transition-transform duration-150"
          style={{ transform: isChecked ? "translateX(15px)" : "translateX(0px)" }}
        />
      </span>
    </label>
  );
}
