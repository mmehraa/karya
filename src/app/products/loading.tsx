export default function ProductsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-64 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded-lg bg-slate-200" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 w-full animate-pulse rounded bg-slate-50" />
          ))}
        </div>
      </div>
    </div>
  );
}