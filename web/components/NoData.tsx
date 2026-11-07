export default function NoData({ title = "Data not loaded yet", children }: { title?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--border)] p-6 text-sm text-[var(--muted)]">
      <p className="font-medium text-[var(--fg)]">{title}</p>
      <div className="mt-1">
        {children ?? (
          <>Set <code>DATABASE_URL</code> in <code>web/.env.local</code> and load the DLD files with the <code>dpi</code> pipeline (see the README).</>
        )}
      </div>
    </div>
  );
}
