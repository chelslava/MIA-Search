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
  const isChecked = Boolean(checked);

  return (
    <label
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface-alt)] px-1.5 py-1 text-xs text-[var(--text)] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--surface-alt)_78%,var(--accent))]",
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
        className="relative h-5 w-9 rounded-full border border-[var(--border)] transition-colors duration-150"
        style={{ backgroundColor: isChecked ? "var(--accent)" : "var(--surface)" }}
      >
        <span
          className={cn(
            "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-[var(--text)] transition-transform duration-150"
          )}
          style={{ transform: isChecked ? "translateX(15px)" : "translateX(0px)" }}
        />
      </span>
    </label>
  );
});
