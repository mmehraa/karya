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
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            {displayValue}
          </p>

          {subtitle ? (
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          ) : null}
        </div>

        {icon ? (
          <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}