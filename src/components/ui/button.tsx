import type { ComponentChildren } from "preact";

type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "icon";
type ButtonSize = "default" | "sm" | "lg" | "icon";

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: () => void;
  children?: ComponentChildren;
  title?: string;
  "aria-label"?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

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
  default: "h-8 px-2.5 py-1 text-xs",
  sm: "h-7 px-2 text-[11px]",
  lg: "h-9 px-3 text-xs",
  icon: "h-8 w-8 p-0"
};

export function Button(props: ButtonProps) {
  const { className, variant = "default", size = "default", type = "button", ...rest } = props;
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md border font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent disabled:pointer-events-none disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className || ""}`}
      {...rest}
    />
  );
}
