export default function KhoLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="mt-6 flex gap-6">
        <div className="hidden w-72 shrink-0 animate-pulse rounded-xl border border-border bg-muted/60 md:block" />
        <div className="min-w-0 flex-1 rounded-xl border border-border">
          <div className="border-b border-border p-4">
            <div className="h-5 w-64 animate-pulse rounded bg-muted" />
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-16 animate-pulse rounded-lg border border-border bg-muted/60"
                style={{ animationDelay: `${index * 80}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
      <p className="sr-only">Đang tải kho…</p>
    </div>
  );
}
