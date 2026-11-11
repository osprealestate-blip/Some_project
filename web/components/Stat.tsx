import Term from "./Term";
import type { TermId } from "@/lib/glossary";

/** `term` adds a tap-for-definition on the label (see lib/glossary.ts). */
export default function Stat({ label, value, note, term, meaning, inv = false }: { inv?: boolean; label: string; value: string; note?: string; term?: TermId; meaning?: string }) {
  return (
    <div className={`rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3 ${inv ? "inv-only" : ""}`}>
      <div className="text-xs text-[var(--muted)]">{term ? <Term id={term}>{label}</Term> : label}</div>
      <div className="mt-1 break-words text-lg font-semibold tabular-nums">{value}</div>
      {note && <div className="mt-0.5 text-xs text-[var(--muted)]">{note}</div>}
      {meaning && <div className="mt-1.5 text-xs leading-snug text-[var(--muted)]">{meaning}</div>}
    </div>
  );
}
