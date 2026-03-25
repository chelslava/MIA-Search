import type { InputHTMLAttributes, ForwardedRef } from "react";
import { forwardRef } from "react";
import { cn } from "../../lib/utils";

export type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> & {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

export const Switch = forwardRef(function Switch(
  { className, checked, onCheckedChange, ...props }: SwitchProps,
  ref: ForwardedRef<HTMLInputElement>
) {
  return (
    <label
      className={cn(
        "inline-flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] px-3 py-2 text-sm text-[var(--text)] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--surface-alt)_78%,var(--accent))]",
        className
      )}
    >
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={(event) => onCheckedChange?.(event.target.checked)}
        className="peer sr-only"
        {...props}
      />
      <span
        aria-hidden="true"
        className="relative h-6 w-11 rounded-full border border-[var(--border)] bg-[var(--surface)] transition-colors duration-150 peer-checked:bg-[var(--accent)]"
      >
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-[var(--text)] shadow-sm transition-transform duration-150 peer-checked:translate-x-5" />
      </span>
    </label>
  );
});
