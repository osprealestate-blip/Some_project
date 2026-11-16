import SourceNote from "@/components/SourceNote";
import { count } from "@/lib/format";
import { FDI_REAL_ESTATE, SECTOR, UNIT_SALES_BY_QUARTER } from "@/lib/marketContextData";
import { indexToFirst, quarterGaps } from "@/lib/marketContext";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Dubai market context",
  description: "Official open-data figures on Dubai's real estate sector: employment, output, foreign investment share and quarterly unit sales, with sources and gaps stated.",
  path: "/market-context",
});

const SRC = "Dubai Pulse open data";

function Bars({ rows, suffix = "" }: { rows: { label: string; value: number }[]; suffix?: string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <table className="mt-2 w-full text-sm tabular-nums">
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="border-b border-[var(--border)]">
            <th scope="row" className="w-20 py-1 pe-3 text-start font-normal text-[var(--muted)]">{r.label}</th>
            <td className="w-full py-1 pe-3"><div aria-hidden className="h-2 rounded bg-[var(--accent)]" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} /></td>
            <td className="py-1 text-end">{r.value.toLocaleString("en-US")}{suffix}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Page() {
  const employees = Object.entries(SECTOR["Number of Employees"]).map(([label, value]) => ({ label, value }));
  const outputIndex = indexToFirst(SECTOR.Output).map((r) => ({ label: r.year, value: r.index }));
  const addedIndex = indexToFirst(SECTOR["Value Added"]).map((r) => ({ label: r.year, value: r.index }));
  const fdi = Object.entries(FDI_REAL_ESTATE).map(([label, v]) => ({ label, value: v.share ?? 0 }));
  const quarters = Object.entries(UNIT_SALES_BY_QUARTER).sort(([a], [b]) => a.localeCompare(b)).map(([label, value]) => ({ label, value }));
  const gaps = quarterGaps(Object.keys(UNIT_SALES_BY_QUARTER));
  const fdiYears = Object.keys(FDI_REAL_ESTATE).map(Number);
  const fdiMissing: number[] = [];
  for (let y = Math.min(...fdiYears); y <= Math.max(...fdiYears); y++) if (!fdiYears.includes(y)) fdiMissing.push(y);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold">Dubai market context</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
        Official figures about Dubai&apos;s real estate sector, shown as published. They sit beside the building and area pages as background.
        <strong className="font-medium text-[var(--fg)]"> No cause or effect is claimed.</strong> We do not predict prices, and
        a rise or fall here does not tell you what a particular building will do.
      </p>

      <section className="mt-8">
        <h2 className="text-base font-semibold">People working in real estate activities</h2>
        <Bars rows={employees} />
        <SourceNote source={SRC} date="2026-11-03">Economic Indicators of Real Estate Activities, annual, 2015 to 2024. Counts of employees as published. The step up from 2022 to 2023 is in the published figures; we do not know whether it reflects growth, a change in coverage, or both.</SourceNote>
      </section>

      <section className="mt-8 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="text-base font-semibold">Sector output (2015 = 100)</h2>
          <Bars rows={outputIndex} />
        </div>
        <div>
          <h2 className="text-base font-semibold">Sector value added (2015 = 100)</h2>
          <Bars rows={addedIndex} />
        </div>
      </section>
      <SourceNote source={SRC} date="2026-11-03">Same file. The file does not state the currency unit, so we show each year as a share of 2015 instead of an amount. Not adjusted for inflation.</SourceNote>

      <section className="mt-8">
        <h2 className="text-base font-semibold">Real estate&apos;s share of foreign direct investment stock</h2>
        <Bars rows={fdi} suffix="%" />
        <SourceNote source={SRC} date="2026-11-03">Total Stock of Foreign Direct Investment by Economic Activity, share of the total as published, {Math.min(...fdiYears)} to {Math.max(...fdiYears)}.{fdiMissing.length ? ` ${fdiMissing.join(", ")} ${fdiMissing.length === 1 ? "is" : "are"} not in the file.` : ""} The jump in the latest year is as published; we have not checked what drives it.</SourceNote>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold">Units sold, by quarter</h2>
        <Bars rows={quarters} />
        <SourceNote source={SRC} date="2026-10-26">Real Estate Transactions, Emirate of Dubai: number of unit sales per quarter, 2019 onward.{gaps.length ? ` ${gaps.join(", ")} ${gaps.length === 1 ? "is" : "are"} missing from the file and left blank.` : ""} Our own building and area figures are counted from DLD transaction records and will not match these totals exactly.</SourceNote>
      </section>

      <section className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 text-sm">
        <h2 className="text-base font-semibold">Not shown yet</h2>
        <p className="mt-2 text-[var(--muted)]">
          Interest rates, oil prices, inflation, exchange rates and tourism are not on this page because we do not hold an open, dated source for them.
          They will be added only with a named source, a date and a link, never from memory. We also do not show news or comment on regional politics or security.
        </p>
      </section>
    </main>
  );
}
