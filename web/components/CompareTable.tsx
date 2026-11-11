import Link from "next/link";
import type { Currency } from "@/config/currency";
import { type CompareFigures, compareHref, rentBasis } from "@/lib/compare";
import { count, formatPsf, formatShortPrice, pct } from "@/lib/format";

type Row = { label: string; cell: (f: CompareFigures) => string };

/** Side-by-side figures, one column per building. Rows are plain values: nothing is ranked or highlighted. */
export default function CompareTable({ figures, currency }: { figures: CompareFigures[]; currency: Currency }) {
  const slugs = figures.map((f) => f.slug);
  const dash = (v: string | null) => v ?? "–";
  const groups: { title: string; rows: Row[] }[] = [
    {
      title: "The building",
      rows: [
        { label: "Area", cell: (f) => f.community },
        { label: "Completed", cell: (f) => dash(f.completionYear?.toString() ?? null) },
        { label: "Floors", cell: (f) => dash(f.floors?.toString() ?? null) },
        { label: "Units", cell: (f) => (f.units == null ? "–" : count(f.units)) },
      ],
    },
    {
      title: "Sales, last 12 months",
      rows: [
        { label: "Sales recorded", cell: (f) => (f.sales12m == null ? "–" : count(f.sales12m)) },
        { label: "Median price per sq ft", cell: (f) => formatPsf(f.psf, currency) },
        { label: "Change on a year earlier", cell: (f) => pct(f.psfChange, 1, true) },
        { label: "Median sale price", cell: (f) => formatShortPrice(f.medianPrice, currency) },
      ],
    },
    {
      title: "Rent and yield (estimates)",
      rows: [
        { label: "Median annual rent", cell: (f) => formatShortPrice(f.rent, currency) },
        { label: "Rent figure is for", cell: (f) => rentBasis(f) },
        { label: "Rent contracts", cell: (f) => (f.rentContracts == null ? "–" : count(f.rentContracts)) },
        { label: "Gross yield", cell: (f) => pct(f.grossYield) },
      ],
    },
  ];

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-sm">
        <caption className="sr-only">Buildings compared side by side</caption>
        <thead>
          <tr className="border-b border-[var(--border)] align-bottom">
            <td className="w-36 py-2" />
            {figures.map((f) => (
              <th key={f.slug} scope="col" className="py-2 pe-3 text-start font-semibold">
                <Link className="link" href={`/building/${f.slug}`}>{f.name}</Link>
                <div className="mt-1">
                  <Link className="text-xs font-normal text-[var(--muted)] underline" href={compareHref(slugs.filter((s) => s !== f.slug))} aria-label={`Remove ${f.name} from the comparison`}>Remove</Link>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        {groups.map((g) => (
          <tbody key={g.title}>
            <tr><th colSpan={figures.length + 1} scope="colgroup" className="pt-5 pb-1 text-start text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{g.title}</th></tr>
            {g.rows.map((r) => (
              <tr key={r.label} className="border-b border-[var(--border)]">
                <th scope="row" className="py-1.5 pe-3 text-start font-normal text-[var(--muted)]">{r.label}</th>
                {figures.map((f) => <td key={f.slug} className="py-1.5 pe-3 tabular-nums">{r.cell(f)}</td>)}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
