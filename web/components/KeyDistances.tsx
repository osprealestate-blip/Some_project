import { keyDistances, type Landmark } from "@/lib/landmarks";
import { metres } from "@/lib/format";
import type { Place } from "@/lib/queries";

/** Approximate distance and drive time to the nearest school and to key Dubai places, each with a route link. */
export default function KeyDistances({ lng, lat, places }: { lng: number; lat: number; places: Place[] }) {
  const school = places.filter((p) => p.category === "school").sort((a, b) => a.distance_m - b.distance_m)[0];
  const extra: Landmark[] = school
    ? [{ id: "school", name: `Nearest school: ${school.name}`, lng: school.lng, lat: school.lat }]
    : [];
  const rows = keyDistances(lng, lat, extra);
  return (
    <div>
      <ul className="divide-y divide-[var(--border)] text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-col gap-0.5 py-1.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
            <span className="min-w-0">{r.name}</span>
            <span className="flex shrink-0 items-baseline gap-3 tabular-nums">
              <span className="text-[var(--muted)]">{metres(r.straightM)} away</span>
              <span>~{r.minutes} min drive</span>
              <a className="link text-xs" href={r.routeUrl} target="_blank" rel="noopener noreferrer">Route</a>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-[var(--muted)]">
        Approximate: straight-line distance, with drive time estimated at typical off-peak speeds. Rush hour can take much longer.
        “Route” opens the real road route on OpenStreetMap.
      </p>
    </div>
  );
}
