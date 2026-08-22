export default function AppGroupLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />
      <p className="sr-only">Đang tải…</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-xl border border-border bg-muted/60"
            style={{ animationDelay: `${index * 80}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
