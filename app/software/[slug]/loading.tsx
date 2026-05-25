export default function Loading() {
  return (
    <div className="min-h-screen bg-[oklch(0.985_0.006_250)]">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_44%] lg:px-8">
        <div className="space-y-5">
          <div className="h-8 w-40 animate-pulse rounded-full bg-slate-200" />
          <div className="h-12 w-4/5 animate-pulse rounded bg-slate-200" />
          <div className="h-5 w-full animate-pulse rounded bg-slate-200" />
          <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="aspect-[4/3] animate-pulse rounded-lg border border-slate-200 bg-slate-200" />
      </div>
    </div>
  );
}
