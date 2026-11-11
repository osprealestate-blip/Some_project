import Term from "./Term";
import type { TermId } from "@/lib/glossary";

/** `term` adds a tap-for-definition on the label (see lib/glossary.ts). */
export default function Stat({ label, value, note, term }: { label: string; value: string; note?: string; term?: TermId }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
      <div className="text-xs text-[var(--muted)]">{term ? <Term id={term}>{label}</Term> : label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
      {note && <div className="mt-0.5 text-xs text-[var(--muted)]">{note}</div>}
    </div>
  );
}
