/** Two plain bars for one figure: this building against the median of its community. No colour judgement: a longer bar
 *  is only a bigger number, and the text says it in words as well. */
import { makeT, type T } from "@/lib/i18n";

export default function CompareBars({ label, building, community, communityName, format, t = makeT("en") }: {
  label: string; building: number | null; community: number | null; communityName: string; format: (n: number) => string; t?: T;
}) {
  if (building == null || community == null) return null;
  const max = Math.max(building, community) || 1;
  const row = (name: string, v: number, tone: string) => (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 shrink-0 truncate text-[var(--muted)]">{name}</span>
      <span className="h-2.5 flex-1 rounded-full bg-[var(--grid)]"><span className="block h-full rounded-full" style={{ width: `${Math.max(3, (v / max) * 100)}%`, background: tone }} /></span>
      <span className="w-20 shrink-0 text-end font-semibold tabular-nums text-[var(--fg)]">{format(v)}</span>
    </div>
  );
  return (
    <div role="img" aria-label={t("{label}: this building {a}, {name} median {b}", { label: t(label), a: format(building), name: communityName, b: format(community) })} className="space-y-1">
      <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">{t(label)}</div>
      {row(t("This building"), building, "var(--accent)")}
      {row(t("{name} median", { name: communityName }), community, "var(--muted)")}
    </div>
  );
}
