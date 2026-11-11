/** Placeholder shown while a data page loads. Pulse animation only; no figures. */
export default function PageSkeleton({ label }: { label: string }) {
  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6" aria-busy="true">
      <p className="sr-only" role="status">{label}</p>
      <div className="h-3 w-24 animate-pulse rounded bg-[var(--grid)]" />
      <div className="mt-3 h-8 w-2/3 animate-pulse rounded bg-[var(--grid)]" />
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-[var(--grid)]" />)}
      </div>
      <div className="mt-8 h-40 animate-pulse rounded-lg bg-[var(--grid)]" />
    </main>
  );
}
