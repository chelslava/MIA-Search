import type { ButtonHTMLAttributes, ForwardedRef } from "react";
import { forwardRef } from "react";
import { cn } from "../../lib/utils";

type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "icon";
type ButtonSize = "default" | "sm" | "lg" | "icon";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "border-[var(--accent)] bg-[var(--accent)] text-white hover:brightness-110 focus-visible:ring-[var(--accent)]",
  secondary:
    "border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text)] hover:bg-[color-mix(in_srgb,var(--surface-alt)_78%,var(--accent))] focus-visible:ring-[var(--accent)]",
  outline:
    "border-[var(--border)] bg-transparent text-[var(--text)] hover:bg-[var(--surface-alt)] focus-visible:ring-[var(--accent)]",
  ghost:
    "border-transparent bg-transparent text-[var(--text)] hover:bg-[var(--surface-alt)] focus-visible:ring-[var(--accent)]",
  icon:
    "border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text)] hover:bg-[color-mix(in_srgb,var(--surface-alt)_78%,var(--accent))] focus-visible:ring-[var(--accent)]"
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-9 px-3 text-sm",
  lg: "h-11 px-5 text-sm",
  icon: "h-10 w-10 p-0"
};

export const Button = forwardRef(function Button(
  { className, variant = "default", size = "default", type = "button", ...props }: ButtonProps,
  ref: ForwardedRef<HTMLButtonElement>
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
});
