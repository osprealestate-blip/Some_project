import SourceNote from "@/components/SourceNote";
import { day, pct } from "@/lib/format";
import { handoverSummary, type ConstructionProject } from "@/lib/queries";

/** Date of the DLD Projects export we loaded (docs/datasets.md). Update when the file is refreshed. */
const PROJECTS_FILE_DATE = "2026-07-06";

/** Projects DLD marks as under construction in a community, with handover dates where DLD has them.
 *  Facts only: no unit counts, no oversupply verdict, because the DLD Projects file has neither. */
export default function ConstructionProjects({ rows }: { rows: ConstructionProject[] }) {
  if (rows.length === 0) return null;
  const s = handoverSummary(rows, new Date());
  const shown = rows.slice(0, 12);
  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold">Under construction and handover dates</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {s.underConstruction} projects here are marked under construction by DLD: {s.dueNext12m} with a completion date in the next 12 months,
        {s.overdue > 0 ? ` ${s.overdue} past their recorded date,` : ""} {s.undated} with no date on file.
      </p>
      <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {shown.map((r) => (
          <li key={r.name} className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
            <div className="font-medium">{r.name}</div>
            <div className="text-xs text-[var(--muted)]">
              {r.developer ? `${r.developer}. ` : ""}
              {r.percent_completed != null ? `${pct(r.percent_completed / 100, 0)} built. ` : ""}
              {r.completion_date ? `Completion date on file: ${day(r.completion_date)}.` : "No completion date on file."}
            </div>
          </li>
        ))}
      </ul>
      {rows.length > shown.length && <p className="mt-2 text-xs text-[var(--muted)]">Showing {shown.length} of {rows.length}, soonest first.</p>}
      <SourceNote source="DLD Projects open data (Dubai Pulse)" date={PROJECTS_FILE_DATE}>
        Only projects that appear in the sales we hold are listed, so this is not every project in the area. Dates are as filed and often change. Units still to be built are not published here.
      </SourceNote>
    </section>
  );
}
