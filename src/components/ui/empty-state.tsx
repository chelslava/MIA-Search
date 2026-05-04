import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex h-full flex-col items-center justify-center gap-3 text-center ${className}`}>
      <div className="rounded-full bg-[var(--surface-alt)] p-4 text-4xl" role="img" aria-hidden="true">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-[var(--text)]">{title}</p>
        {description && <p className="text-xs text-[var(--muted)]">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function EmptySearchResults() {
  return (
    <EmptyState
      icon="🔍"
      title="No results found"
      description="Try adjusting your search query or filters"
    />
  );
}

export function EmptyHistory() {
  return (
    <EmptyState
      icon="📜"
      title="No search history"
      description="Your recent searches will appear here"
    />
  );
}

export function EmptyFavorites() {
  return (
    <EmptyState
      icon="⭐"
      title="No favorites yet"
      description="Pin your frequently used files and folders"
    />
  );
}

export function EmptyRoots() {
  return (
    <EmptyState
      icon="📂"
      title="No folders selected"
      description="Add folders to start searching"
    />
  );
}

export function EmptySelection() {
  return (
    <EmptyState
      icon="👈"
      title="Select an item"
      description="Choose a file or folder from the results"
      className="min-h-32"
    />
  );
}
