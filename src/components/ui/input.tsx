import { JSX } from "preact/jsx-runtime";

interface InputProps {
  className?: string;
  type?: string;
  value?: string | number;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
  title?: string;
  id?: string;
  min?: number | string;
  max?: number | string;
  inputRef?: (el: HTMLInputElement | null) => void;
}

export function Input(props: InputProps) {
  const { className, type = "text", value, placeholder, disabled, onChange, title, id, min, max, inputRef } = props;
  
  const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    onChange?.(target.value);
  };
  
  return (
    <input
      ref={inputRef as any}
      type={type}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      title={title}
      id={id}
      min={min}
      max={max}
      onInput={handleInput}
      className={`flex h-8 min-w-0 w-full rounded-md border border-[var(--border)] bg-[var(--surface-alt)] px-2 py-1 text-xs text-[var(--text)] transition-colors duration-150 placeholder:text-[color-mix(in_srgb,var(--muted)_78%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-50 ${className || ""}`}
    />
  );
}
