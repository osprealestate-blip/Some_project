"use client";
import { useT } from "./LangProvider";
import type { Currency } from "@/config/currency";
import { convertFromAed } from "@/config/currency";
import { formatConverted } from "@/lib/format";
import type { Bin } from "@/lib/stats";

/** Bars of how many sales fell in each price-per-sq-ft range. Real sales only; drawn when there are 8 or more. */
export default function Histogram({ bins, currency, title }: { bins: Bin[]; currency: Currency; title: string }) {
  const t = useT();
  const max = Math.max(...bins.map((b) => b.count), 1);
  const f = (n: number) => formatConverted(convertFromAed(n, currency), currency);
  return (
    <figure dir="ltr">
      <figcaption className="mb-2 text-sm font-semibold">{title}</figcaption>
      <div className="flex h-24 items-end gap-1" role="img" aria-label={`${title}: ${bins.map((b) => `${t("{a} to {b}", { a: f(b.from), b: f(b.to) })}, ${t("{n} sales", { n: b.count })}`).join("; ")}`}>
        {bins.map((b, i) => (
          <div key={i} className="flex h-full flex-1 flex-col justify-end" title={`${t("{a} to {b}", { a: f(b.from), b: f(b.to) })}: ${t("{n} sales", { n: b.count })}`}>
            <span className="mb-0.5 text-center text-[10px] tabular-nums text-[var(--muted)]">{b.count || ""}</span>
            <span className="block rounded-t bg-[var(--accent)]" style={{ height: `${(b.count / max) * 80}%`, minHeight: b.count ? 3 : 0 }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-[var(--muted)]"><span>{f(bins[0].from)}</span><span>{f(bins[bins.length - 1].to)} per sq ft</span></div>
    </figure>
  );
}
