import type { ReactNode } from "react";

interface SkeletonProps {
  className?: string;
  count?: number;
  children?: ReactNode;
}

export function Skeleton({ className = "", count = 1 }: SkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <>
      {items.map((i) => (
        <div
          key={i}
          className={`animate-pulse rounded bg-[var(--border)] ${className}`}
        />
      ))}
    </>
  );
}

export function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="border-b border-[var(--border)] px-2 py-3">
        <div className="h-5 w-5 rounded bg-[var(--border)]" />
      </td>
      <td className="border-b border-[var(--border)] px-2 py-3">
        <div className="h-4 w-48 rounded bg-[var(--border)]" />
      </td>
      <td className="border-b border-[var(--border)] px-2 py-3">
        <div className="h-4 w-full max-w-xs rounded bg-[var(--border)]" />
      </td>
      <td className="border-b border-[var(--border)] px-2 py-3">
        <div className="h-4 w-16 rounded bg-[var(--border)]" />
      </td>
      <td className="border-b border-[var(--border)] px-2 py-3">
        <div className="h-4 w-24 rounded bg-[var(--border)]" />
      </td>
      <td className="border-b border-[var(--border)] px-2 py-3">
        <div className="h-4 w-16 rounded bg-[var(--border)]" />
      </td>
    </tr>
  );
}

export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-md border border-[var(--border)] bg-[var(--surface-alt)] p-3">
      <div className="mb-2 flex items-center gap-2">
        <div className="h-6 w-6 rounded bg-[var(--border)]" />
        <div className="h-4 w-32 rounded bg-[var(--border)]" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-[var(--border)]" />
        <div className="h-3 w-3/4 rounded bg-[var(--border)]" />
      </div>
    </div>
  );
}

export function SkeletonSidebar() {
  return (
    <div className="animate-pulse space-y-2 p-2">
      <div className="h-8 w-full rounded bg-[var(--border)]" />
      <div className="h-6 w-3/4 rounded bg-[var(--border)]" />
      <div className="h-6 w-full rounded bg-[var(--border)]" />
      <div className="h-6 w-1/2 rounded bg-[var(--border)]" />
      <div className="h-6 w-full rounded bg-[var(--border)]" />
      <div className="mt-4 h-8 w-full rounded bg-[var(--border)]" />
      <div className="h-6 w-3/4 rounded bg-[var(--border)]" />
      <div className="h-6 w-full rounded bg-[var(--border)]" />
    </div>
  );
}
