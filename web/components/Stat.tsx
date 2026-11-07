export default function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
      {note && <div className="mt-0.5 text-xs text-[var(--muted)]">{note}</div>}
    </div>
  );
}
