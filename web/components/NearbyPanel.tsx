import { lifeScore } from "@/lib/lifeScore";
import { metres } from "@/lib/format";
import type { Place } from "@/lib/queries";
import { POI_SOURCE } from "@/lib/sources";

const GROUP_ORDER: [string, string][] = [
  ["transit", "Getting around"],
  ["school", "Schools"],
  ["health", "Health"],
  ["daily_needs", "Daily needs"],
  ["lifestyle", "Lifestyle"],
];

export default function NearbyPanel({ places, placed }: { places: Place[]; placed: boolean }) {
  if (!placed) {
    return <p className="text-sm text-[var(--muted)]">This building is not on the map yet, so nearby places can&apos;t be shown.</p>;
  }
  if (places.length === 0) {
    return <p className="text-sm text-[var(--muted)]">No places loaded within 2 km yet.</p>;
  }
  const ls = lifeScore(places);
  const sources = [...new Set(places.map((p) => `${POI_SOURCE[p.source] ?? p.source} (${p.source_date})`))];
  return (
    <div>
      <div className="flex items-baseline gap-3">
        <div className="text-3xl font-semibold tabular-nums">{ls.score}</div>
        <div className="text-sm text-[var(--muted)]">Life Score out of 100 (basic)</div>
      </div>
      <ul className="mt-3 text-sm">
        {ls.groups.map((g) => (
          <li key={g.id} className="flex justify-between gap-2 border-b border-[var(--border)] py-1">
            <span>{g.label}</span>
            <span className="text-[var(--muted)] tabular-nums">
              {g.nearest ? `${metres(g.nearest.distance_m)} · ${Math.round(g.points)}/${g.weight}` : `none within 2 km · 0/${g.weight}`}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {GROUP_ORDER.map(([cat, label]) => {
          const list = places.filter((p) => p.category === cat).slice(0, 6);
          if (!list.length) return null;
          return (
            <div key={cat}>
              <h4 className="text-sm font-medium">{label}</h4>
              <ul className="mt-1 text-sm">
                {list.map((p, i) => (
                  <li key={`${p.name}-${i}`} className="flex justify-between gap-2 py-0.5">
                    <span className="truncate">
                      {p.name}
                      {p.attributes?.rating ? <span className="text-[var(--muted)]"> · KHDA {p.attributes.rating}</span> : null}
                      {p.attributes?.curriculum ? <span className="text-[var(--muted)]"> · {p.attributes.curriculum}</span> : null}
                    </span>
                    <span className="shrink-0 text-[var(--muted)] tabular-nums">
                      {p.attributes?.approx_location ? "≈ " : ""}{metres(p.distance_m)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-[var(--muted)]">
        Straight-line distances; ≈ marks a place whose official position is rounded to about 1 km. Score: each group earns full points within 400 m, falling to none at 2 km. Places: {sources.join("; ")}.
      </p>
    </div>
  );
}
