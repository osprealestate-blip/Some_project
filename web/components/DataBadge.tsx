import { dataConfidence } from "@/lib/confidence";
import { day } from "@/lib/format";

/** "Last update" and a plain data-confidence label for the headline figures. */
export default function DataBadge({ saleCount, periodEnd }: { saleCount: number | null | undefined; periodEnd: string | null | undefined }) {
  const c = dataConfidence(saleCount);
  const tone = c.level === "good" ? "var(--good)" : c.level === "limited" ? "var(--warn)" : "var(--muted)";
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
      <span>Data up to <strong className="font-medium text-[var(--fg)]">{periodEnd ? day(periodEnd) : "not available"}</strong></span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: tone }} />
        Data confidence: <strong className="font-medium text-[var(--fg)]">{c.label}</strong> ({c.detail})
      </span>
    </p>
  );
}
