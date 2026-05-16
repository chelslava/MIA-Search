import type { ComponentChildren } from "preact";

interface SelectProps {
  className?: string;
  value?: string | number;
  disabled?: boolean;
  onChange?: (value: string) => void;
  children?: ComponentChildren;
}

export function Select(props: SelectProps) {
  const { className, value, disabled, onChange, children } = props;
  
  const handleChange = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    if (target && typeof target.value === "string") {
      onChange?.(target.value);
    }
  };
  
  return (
    <select
      className={`flex h-8 min-w-0 rounded-md border border-[var(--border)] bg-[var(--surface-alt)] px-2 py-1 text-xs text-[var(--text)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-50 ${className || ""}`}
      value={value}
      disabled={disabled}
      onChange={handleChange}
    >
      {children}
    </select>
  );
}
