export default function InventoryLoading() {
  return (
    <div className="space-y-6">
      {/* Page Header Skeleton */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-64 animate-pulse rounded-md bg-slate-200" />
          <div className="h-4 w-[32rem] max-w-full animate-pulse rounded-md bg-surface-muted" />
        </div>

        <div className="h-8 w-28 animate-pulse rounded-lg bg-surface-muted" />
      </div>

      {/* KPI Skeletons */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm"
          >
            <div className="h-3 w-24 animate-pulse rounded bg-surface-muted" />
            <div className="mt-3 h-8 w-20 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>

      {/* Current Stock Skeleton */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-96 max-w-full animate-pulse rounded bg-surface-muted" />
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-surface-raised shadow-sm">
          <div className="h-12 animate-pulse border-b border-border bg-surface-muted" />

          <div className="space-y-0">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="grid grid-cols-7 gap-4 border-b border-border px-4 py-4"
              >
                {Array.from({ length: 7 }).map((__, cellIndex) => (
                  <div
                    key={cellIndex}
                    className="h-4 animate-pulse rounded bg-surface-muted"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transaction History Skeleton */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-80 max-w-full animate-pulse rounded bg-surface-muted" />
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-surface-raised shadow-sm">
          <div className="h-12 animate-pulse border-b border-border bg-surface-muted" />

          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="grid grid-cols-7 gap-4 border-b border-border px-4 py-4"
              >
                {Array.from({ length: 7 }).map((__, cellIndex) => (
                  <div
                    key={cellIndex}
                    className="h-4 animate-pulse rounded bg-surface-muted"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}