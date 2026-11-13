"use client";
import { useT } from "./LangProvider";
import type { RouteMap } from "@/lib/routeLines";
import { minutesLabel, type RouteMode } from "@/lib/routing";
import { FACILITIES, ICON_PATHS, km, type FacilityId, type NearestFacility } from "@/lib/facilities";

/** Small line icons, one per facility kind. Colour always comes with an icon and a label, never colour alone. */
export function FacilityIcon({ id, className = "h-4 w-4" }: { id: FacilityId; className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: ICON_PATHS[id] }} />;
}

type Props = {
  facilities: NearestFacility[]; showNames?: boolean; className?: string;
  /** When set, each chip is a button that shows or hides that kind's line on the map. */
  onToggle?: (id: FacilityId) => void; hidden?: FacilityId[];
  /** Real routes, when Walk or Drive is chosen. Minutes show only for a kind with a route; the straight-line km stays beside them. */
  routes?: RouteMap; mode?: "line" | RouteMode;
};

/** The nearest metro, hospital, school, mall and park as chips: icon, label and straight-line km.
 *  Neon lines on the map (a later step) will reuse these colours and icons. */
export default function FacilityChips({ facilities, showNames = false, className = "", onToggle, hidden = [], routes, mode = "line" }: Props) {
  const t = useT();
  return (
    <ul className={`grid gap-1.5 ${showNames ? "sm:grid-cols-2" : "grid-cols-2"} ${className}`}>
      {FACILITIES.map((f) => {
        const hit = facilities.find((x) => x.id === f.id);
        const off = hidden.includes(f.id);
        const body = (
          <>
            <span style={{ color: f.colour }} className={`grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--panel)] ring-1 ring-current ${off ? "opacity-40" : ""}`}>
              <FacilityIcon id={f.id} />
            </span>
            <span className={`min-w-0 text-start leading-tight ${off ? "opacity-50" : ""}`}>
              <span className="block text-[11px] text-[var(--muted)]">{t(f.label)}</span>
              <span className="block truncate text-[13px] font-semibold tabular-nums text-[var(--fg)]">
                {hit ? `${hit.approx ? "≈ " : ""}${km(hit.distanceM, t("km"))}` : "–"}
              </span>
              {hit && mode !== "line" && (
                <span className="block truncate text-[11px] font-medium" style={{ color: f.colour }}>
                  {routes?.[f.id] ? minutesLabel(routes[f.id]!.minutes, mode, t) : routes?.[f.id] === null ? t("no route found") : t("finding route…")}
                </span>
              )}
              {showNames && hit && <span className="block truncate text-[11px] text-[var(--muted)]">{hit.name}</span>}
            </span>
          </>
        );
        const box = "flex min-w-0 items-center gap-2 rounded-lg bg-[var(--grid)] px-2 py-1.5 ring-1 ring-[var(--border)]";
        return (
          <li key={f.id}>
            {onToggle ? (
              <button type="button" aria-pressed={!off} onClick={() => onToggle(f.id)} title={off ? t("Show {kind} on the map", { kind: t(f.label) }) : t("Hide {kind} on the map", { kind: t(f.label) })} className={`${box} w-full hover:ring-[var(--accent)]`}>{body}</button>
            ) : <div className={box}>{body}</div>}
          </li>
        );
      })}
    </ul>
  );
}
