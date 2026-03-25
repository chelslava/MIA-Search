import type { SelectHTMLAttributes, ForwardedRef } from "react";
import { forwardRef } from "react";
import { cn } from "../../lib/utils";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef(function Select(
  { className, children, ...props }: SelectProps,
  ref: ForwardedRef<HTMLSelectElement>
) {
  return (
    <select
      ref={ref}
      className={cn(
        "flex h-8 min-w-0 rounded-md border border-[var(--border)] bg-[var(--surface-alt)] px-2 py-1 text-xs text-[var(--text)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});
