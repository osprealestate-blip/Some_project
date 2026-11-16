/** Planned completions by quarter, from the dates DLD has on file. Units are units *filed* for the project, not units for sale.
 *  Projects with no date, or a date already past, are counted apart and never given a date. */
export type SupplyRow = { completion_date: string | null; no_of_units?: number | null; dld_status?: string | null };
export type Quarter = { label: string; start: string; projects: number; units: number; unitsUnknown: number };
export type Timeline = { quarters: Quarter[]; beyond: { projects: number; units: number }; passed: number; undated: number; total: number };


export function supplyTimeline(rows: SupplyRow[], today: Date, quartersAhead = 8): Timeline {
  const y0 = today.getUTCFullYear();
  const q0 = Math.floor(today.getUTCMonth() / 3);
  const quarters: Quarter[] = Array.from({ length: quartersAhead }, (_, i) => {
    const idx = q0 + i;
    const y = y0 + Math.floor(idx / 4);
    const qi = idx % 4;
    return { label: `Q${qi + 1} ${y}`, start: `${y}-${String(qi * 3 + 1).padStart(2, "0")}-01`, projects: 0, units: 0, unitsUnknown: 0 };
  });
  const out: Timeline = { quarters, beyond: { projects: 0, units: 0 }, passed: 0, undated: 0, total: 0 };
  const todayMs = Date.UTC(y0, today.getUTCMonth(), today.getUTCDate());
  for (const r of rows) {
    if (r.dld_status === "FINISHED") continue;
    out.total++;
    if (!r.completion_date) { out.undated++; continue; }
    const t = Date.parse(`${r.completion_date.slice(0, 10)}T00:00:00Z`);
    if (Number.isNaN(t)) { out.undated++; continue; }
    if (t < todayMs) { out.passed++; continue; }
    const d = new Date(t);
    const i = (d.getUTCFullYear() - y0) * 4 + Math.floor(d.getUTCMonth() / 3) - q0;
    if (i >= quartersAhead) { out.beyond.projects++; out.beyond.units += r.no_of_units ?? 0; continue; }
    const bucket = quarters[i];
    bucket.projects++;
    if (r.no_of_units != null) bucket.units += r.no_of_units; else bucket.unitsUnknown++;
  }
  return out;
}
