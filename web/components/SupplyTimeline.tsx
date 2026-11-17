import { count } from "@/lib/format";
import { supplyTimeline, type SupplyRow } from "@/lib/supplyTimeline";

/** Planned completions by quarter. Bars show projects with a date on file; the line under them says how many have none. */
export default function SupplyTimeline({ rows }: { rows: SupplyRow[] }) {
  const t = supplyTimeline(rows, new Date());
  const max = Math.max(1, ...t.quarters.map((x) => x.projects));
  if (t.total === 0) return null;
  return (
    <details className="mt-4 text-sm">
      <summary className="cursor-pointer font-medium">Planned completions by quarter</summary>
      <ul className="mt-2 space-y-1" aria-label="Projects with a planned date, by quarter">
        {t.quarters.map((x) => (
          <li key={x.label} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-2">
            <span className="text-xs text-[var(--muted)]">{x.label}</span>
            <span className="h-2 rounded bg-[var(--grid)]"><span className="block h-2 rounded bg-[var(--accent)]" style={{ width: `${(x.projects / max) * 100}%` }} /></span>
            <span className="text-xs tabular-nums">{x.projects} {x.projects === 1 ? "project" : "projects"}{x.units > 0 ? `, ${count(x.units)} units filed` : ""}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-[var(--muted)]">
        Later than {t.quarters[t.quarters.length - 1].label}: {t.beyond.projects}. Date already passed: {t.passed}. <strong className="font-medium text-[var(--fg)]">No date on file: {t.undated} of {t.total}</strong>, so the bars are not the whole picture.
        Units are the number filed for each project, not units left to sell. Dates are as filed and often change. This is not a forecast of supply or prices.
      </p>
    </details>
  );
}
