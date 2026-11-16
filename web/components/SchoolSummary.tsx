import { summariseSchools, type SchoolRatingRow } from "@/lib/schoolSummary";
import { POI_SOURCE } from "@/lib/sources";

/** Schools near the building by KHDA rating: counts only, no label for who the area suits. */
export default function SchoolSummary({ rows, sourceDate }: { rows: SchoolRatingRow[]; sourceDate?: string | null }) {
  const s = summariseSchools(rows);
  if (!s.rows.length) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold">Schools by KHDA rating</h3>
      <table className="mt-2 w-full text-sm">
        <thead className="text-xs text-[var(--muted)]">
          <tr className="border-b border-[var(--border)]">
            <th className="py-1 text-start font-medium">KHDA rating</th>
            <th className="py-1 text-end font-medium">Within 2 km</th>
            <th className="py-1 text-end font-medium">Within 5 km</th>
          </tr>
        </thead>
        <tbody>
          {s.rows.map((r) => (
            <tr key={r.label} className="border-b border-[var(--border)]">
              <th scope="row" className="py-1 text-start font-normal">{r.label}</th>
              <td className="py-1 text-end tabular-nums">{r.within2}</td>
              <td className="py-1 text-end tabular-nums">{r.within5}</td>
            </tr>
          ))}
          <tr>
            <th scope="row" className="py-1 text-start font-medium">All schools</th>
            <td className="py-1 text-end font-medium tabular-nums">{s.total2}</td>
            <td className="py-1 text-end font-medium tabular-nums">{s.total5}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-2 text-xs text-[var(--muted)]">
        Source: {POI_SOURCE.khda}{sourceDate ? `, loaded ${sourceDate}` : ""}. Straight-line distances, not travel time. School positions are rounded to about 1 km, so counts near the edge of a radius can be off. Ratings are KHDA&apos;s own; a count says nothing about places or fit.
      </p>
    </div>
  );
}
