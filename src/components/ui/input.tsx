import type { InputHTMLAttributes, ForwardedRef } from "react";
import { forwardRef } from "react";
import { cn } from "../../lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef(function Input(
  { className, type = "text", ...props }: InputProps,
  ref: ForwardedRef<HTMLInputElement>
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-8 min-w-0 w-full rounded-md border border-[var(--border)] bg-[var(--surface-alt)] px-2 py-1 text-xs text-[var(--text)] transition-colors duration-150 placeholder:text-[color-mix(in_srgb,var(--muted)_78%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});
