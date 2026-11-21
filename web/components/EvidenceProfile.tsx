import type { EvidenceRow } from "@/lib/evidenceProfile";

const TONE = { Available: "var(--good)", Partial: "var(--warn)", "Not available": "var(--muted)" } as const;

/** A small block: what we hold for this building and what we do not. Words as well as colour, so it reads without colour. */
export default function EvidenceProfile({ rows }: { rows: EvidenceRow[] }) {
  return (
    <section aria-label="What we know about this building" className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">What we know about this building</h2>
      <ul className="mt-2 space-y-1.5 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="grid grid-cols-[auto_1fr] items-baseline gap-x-2">
            <span aria-hidden className="h-2 w-2 translate-y-[-1px] rounded-full" style={{ background: TONE[r.level] }} />
            <span>
              <strong className="font-medium">{r.label}:</strong>{" "}
              <span className={r.level === "Not available" ? "text-[var(--muted)]" : ""}>{r.level}</span>
              <span className="block text-xs text-[var(--muted)]">{r.detail}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-[var(--muted)]">Sources: DLD open data, OpenStreetMap and hand checks. Not available means we hold nothing reliable, not that the answer is zero.</p>
    </section>
  );
}
