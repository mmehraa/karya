import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number | null | undefined;
  subtitle?: string;
  icon?: ReactNode;
  emptyPlaceholder?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  emptyPlaceholder = "Not recorded",
}: StatCardProps) {
  const displayValue =
    value === null || value === undefined || value === ""
      ? emptyPlaceholder
      : value;

  return (
    <div className="rounded-xl border border-border bg-surface-raised p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-secondary">{title}</p>

          <p className="mt-2 break-words text-2xl font-semibold tracking-tight text-text-primary">
            {displayValue}
          </p>

          {subtitle ? (
            <p className="mt-1 text-xs text-text-muted">{subtitle}</p>
          ) : null}
        </div>

        {icon ? (
          <div className="shrink-0 rounded-lg bg-accent-soft p-2 text-accent">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}