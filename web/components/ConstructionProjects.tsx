import SourceNote from "@/components/SourceNote";
import SupplyTimeline from "@/components/SupplyTimeline";
import { count, day, pct } from "@/lib/format";
import { handoverSummary, type ConstructionProject } from "@/lib/queries";

/** Date of the DLD Projects export we loaded (docs/datasets.md). Update when the file is refreshed. */
const PROJECTS_FILE_DATE = "2026-07-06";

const STATUS: Record<string, string> = { ACTIVE: "Under construction", NOT_STARTED: "Not started", PENDING: "Registration pending" };

/** Projects DLD lists as not finished in a community, including off-plan launches that have no sales yet,
 *  with the dates DLD has on file. Facts only: no verdict on supply, no estimate of when units will be sold. */
export default function ConstructionProjects({ rows }: { rows: ConstructionProject[] }) {
  if (rows.length === 0) return null;
  const s = handoverSummary(rows, new Date());
  const by = (st: string) => rows.filter((r) => r.dld_status === st).length;
  const shown = rows.slice(0, 12);
  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold">Projects under construction and off-plan</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        DLD lists {rows.length} projects here that are not finished: {by("ACTIVE")} under construction, {by("NOT_STARTED")} not started
        and {by("PENDING")} pending registration. {s.dueNext12m} have a date in the next 12 months,
        {s.overdue > 0 ? ` ${s.overdue} are past their recorded date,` : ""} {s.undated} have no date on file.
      </p>
      <SupplyTimeline rows={rows} />
      <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {shown.map((r, i) => (
          <li key={`${r.name}-${i}`} className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
            <div className="font-medium" dir="auto">{r.name}</div>
            <div className="text-xs text-[var(--muted)]">
              {(r.dld_status && STATUS[r.dld_status]) || r.dld_status || "Status not given"}.{" "}
              {r.master_project ? `${r.master_project}. ` : ""}
              {r.developer ? <span dir="auto">{r.developer}. </span> : null}
              {r.percent_completed != null ? `${pct(r.percent_completed / 100, 0)} built. ` : ""}
              {r.no_of_units ? `${count(r.no_of_units)} units filed${r.no_of_buildings ? ` in ${count(r.no_of_buildings)} ${r.no_of_buildings === 1 ? "building" : "buildings"}` : ""}. ` : ""}
              {r.completion_date ? `Date on file: ${day(r.completion_date)}.` : "No date on file."}
            </div>
          </li>
        ))}
      </ul>
      {rows.length > shown.length && <p className="mt-2 text-xs text-[var(--muted)]">Showing {shown.length} of {rows.length}, soonest date first.</p>}
      <SourceNote source="DLD Projects open data (Dubai Pulse)" date={PROJECTS_FILE_DATE}>
        Project names and developers are shown as DLD files them, mostly in Arabic. Units are the number filed for the project, not units still
        for sale. Dates are as filed and often change. A project appears here whether or not it has sold anything yet. This is a list of facts, not a forecast.
      </SourceNote>
    </section>
  );
}
