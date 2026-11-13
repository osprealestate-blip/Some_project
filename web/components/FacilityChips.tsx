import { FACILITIES, km, type FacilityId, type NearestFacility } from "@/lib/facilities";

/** Small line icons, one per facility kind. Colour always comes with an icon and a label, never colour alone. */
export function FacilityIcon({ id, className = "h-4 w-4" }: { id: FacilityId; className?: string }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...p}>
      {id === "metro" && <><rect x="6" y="3" width="12" height="14" rx="3" /><path d="M6 11h12M9 21l2-4M15 21l-2-4" /><circle cx="9.5" cy="14" r=".6" /><circle cx="14.5" cy="14" r=".6" /></>}
      {id === "hospital" && <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M12 8v8M8 12h8" /></>}
      {id === "school" && <><path d="M3 9l9-5 9 5-9 5-9-5z" /><path d="M7 11.5V16c2 2 8 2 10 0v-4.5" /></>}
      {id === "mall" && <><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8a3 3 0 016 0" /></>}
      {id === "park" && <><circle cx="12" cy="9" r="5" /><path d="M12 14v7" /></>}
    </svg>
  );
}

type Props = { facilities: NearestFacility[]; showNames?: boolean; className?: string };

/** The nearest metro, hospital, school, mall and park as chips: icon, label and straight-line km.
 *  Neon lines on the map (a later step) will reuse these colours and icons. */
export default function FacilityChips({ facilities, showNames = false, className = "" }: Props) {
  return (
    <ul className={`grid gap-1.5 ${showNames ? "sm:grid-cols-2" : "grid-cols-2"} ${className}`}>
      {FACILITIES.map((f) => {
        const hit = facilities.find((x) => x.id === f.id);
        return (
          <li key={f.id} className="flex min-w-0 items-center gap-2 rounded-lg bg-[var(--grid)] px-2 py-1.5 ring-1 ring-[var(--border)]">
            <span style={{ color: f.colour }} className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--panel)] ring-1 ring-current">
              <FacilityIcon id={f.id} />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block text-[11px] text-[var(--muted)]">{f.label}</span>
              <span className="block truncate text-[13px] font-semibold tabular-nums text-[var(--fg)]">
                {hit ? `${hit.approx ? "≈ " : ""}${km(hit.distanceM)}` : "–"}
              </span>
              {showNames && hit && <span className="block truncate text-[11px] text-[var(--muted)]">{hit.name}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
