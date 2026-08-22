export default function KhoLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="h-9 w-48 animate-pulse rounded-full bg-muted" />
      <div className="mt-6 flex gap-6">
        <div className="glass-panel hidden w-72 shrink-0 animate-pulse rounded-2xl md:block" />
        <div className="glass-panel min-w-0 flex-1 rounded-2xl">
          <div className="border-b border-border/60 p-5">
            <div className="h-5 w-64 animate-pulse rounded-full bg-muted" />
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-16 animate-pulse rounded-xl bg-muted"
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
