import FacilityChips from "./FacilityChips";
import type { NearestFacility } from "@/lib/facilities";
import type { Verdict } from "@/lib/verdict";

type Tile = { label: string; value: string };

/** The answer first: a one-line read, the four numbers people ask about, and the nearest places. Sits at the top of the
 *  full building page, so nobody has to scroll to find out what this building is. */
export default function AtAGlance({ verdict, tiles, facilities }: { verdict: Verdict | null; tiles: Tile[]; facilities: NearestFacility[] }) {
  return (
    <section aria-label="At a glance" className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">At a glance</h2>
      {verdict && <p className="mt-1.5 border-s-2 border-[var(--accent)] ps-3 text-base leading-snug">{verdict.text}</p>}
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label}>
            <dt className="text-xs text-[var(--muted)]">{t.label}</dt>
            <dd className="text-lg font-semibold tabular-nums">{t.value}</dd>
          </div>
        ))}
      </dl>
      {facilities.length > 0 && (
        <div className="mt-3">
          <h3 className="mb-1.5 text-xs text-[var(--muted)]">Nearest places, straight-line distance</h3>
          <FacilityChips facilities={facilities} showNames />
        </div>
      )}
    </section>
  );
}
