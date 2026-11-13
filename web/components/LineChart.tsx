"use client";

import { useMemo, useRef, useState } from "react";
import { type Currency, DEFAULT_CURRENCY, convertFromAed } from "@/config/currency";
import { useT } from "./LangProvider";
import { formatConverted, quarterLabel } from "@/lib/format";

export type Point = { period: string; value: number | null; count: number };

type Props = {
  title: string;
  points: Point[];
  /** "psf" = AED per sq ft, "aed" = short AED amount. Plain strings so a server page can pass them. */
  unit: "psf" | "aed";
  countLabel?: string;
  /** Display currency. Points are always AED; they are converted before drawing. */
  currency?: Currency;
};

const W = 640;
const H = 220;
const M = { top: 12, right: 12, bottom: 26, left: 88 };

function niceTicks(min: number, max: number, n = 4): number[] {
  if (min === max) { min *= 0.9; max *= 1.1; }
  const raw = (max - min) / n;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => s >= raw) ?? raw;
  const out = [];
  const top = Math.ceil(max / step) * step;
  for (let v = Math.floor(min / step) * step; v <= top + step * 0.001; v += step) out.push(v);
  return out;
}

/** One series over time: 2px line, gaps where a quarter has too few deals, crosshair tooltip, table view. */
export default function LineChart({ title, points: aedPoints, unit, countLabel = "deals", currency = DEFAULT_CURRENCY }: Props) {
  const t = useT();
  const points = useMemo(
    () => (currency === "AED" ? aedPoints : aedPoints.map((p) => ({ ...p, value: p.value == null ? null : convertFromAed(p.value, currency) }))),
    [aedPoints, currency],
  );
  const format = (n: number) => (unit === "psf" ? formatConverted(n, currency) : formatConverted(n, currency, { short: true }));
  const periodLabel = quarterLabel;
  const [hover, setHover] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const valid = points.filter((p) => p.value != null) as (Point & { value: number })[];

  const geo = useMemo(() => {
    if (valid.length === 0) return null;
    const vals = valid.map((p) => p.value);
    const ticks = niceTicks(Math.min(...vals), Math.max(...vals));
    const y0 = ticks[0];
    const y1 = ticks[ticks.length - 1];
    const x = (i: number) => M.left + (points.length === 1 ? (W - M.left - M.right) / 2 : (i * (W - M.left - M.right)) / (points.length - 1));
    const y = (v: number) => M.top + (1 - (v - y0) / (y1 - y0 || 1)) * (H - M.top - M.bottom);
    let d = "";
    let pen = false;
    points.forEach((p, i) => {
      if (p.value == null) { pen = false; return; }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`;
      pen = true;
    });
    const years = points.map((p, i) => ({ i, p })).filter(({ p }) => p.period.slice(5, 7) === "01");
    return { ticks, x, y, d, years };
  }, [points, valid]);

  if (!geo) return <p className="text-sm text-[var(--muted)]">Not enough deals to chart yet.</p>;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = svg.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    let dist = Infinity;
    points.forEach((_, i) => {
      const dd = Math.abs(geo.x(i) - px);
      if (dd < dist) { dist = dd; best = i; }
    });
    setHover(best);
  };
  const hp = hover != null ? points[hover] : null;
  const lastIdx = points.map((p) => p.value != null).lastIndexOf(true);
  const last = points[lastIdx];

  return (
    <figure className="viz-root" dir="ltr">
      <figcaption className="mb-1 text-sm font-medium">{title}</figcaption>
      <div className="relative">
        <svg
          ref={svg}
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full touch-none select-none"
          role="img"
          aria-label={t("{title}. Latest {period}: {value}.", { title, period: periodLabel(last.period), value: format(last.value!) })}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {geo.ticks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={W - M.right} y1={geo.y(t)} y2={geo.y(t)} stroke="var(--grid)" strokeWidth={1} />
              <text x={M.left - 8} y={geo.y(t)} dy="0.32em" textAnchor="end" fontSize={15} fill="var(--muted)">{format(t)}</text>
            </g>
          ))}
          {geo.years.map(({ i, p }) => (
            <text key={p.period} x={geo.x(i)} y={H - 8} textAnchor="middle" fontSize={15} fill="var(--muted)">{p.period.slice(0, 4)}</text>
          ))}
          <path d={geo.d} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {valid.length === 1 && <circle cx={geo.x(points.indexOf(valid[0]))} cy={geo.y(valid[0].value)} r={4} fill="var(--series-1)" />}
          <circle cx={geo.x(lastIdx)} cy={geo.y(last.value!)} r={4} fill="var(--series-1)" stroke="var(--panel)" strokeWidth={2} />
          {hp && (
            <g pointerEvents="none">
              <line x1={geo.x(hover!)} x2={geo.x(hover!)} y1={M.top} y2={H - M.bottom} stroke="var(--muted)" strokeWidth={1} strokeDasharray="3 3" />
              {hp.value != null && <circle cx={geo.x(hover!)} cy={geo.y(hp.value)} r={5} fill="var(--series-1)" stroke="var(--panel)" strokeWidth={2} />}
            </g>
          )}
        </svg>
        {hp && (
          <div
            className="pointer-events-none absolute top-1 rounded border border-[var(--border)] bg-[var(--panel)] px-2 py-1 text-xs shadow"
            style={{ left: `${(geo.x(hover!) / W) * 100}%`, transform: `translateX(${hover! > points.length / 2 ? "-105%" : "5%"})` }}
          >
            <div className="font-medium">{periodLabel(hp.period)}</div>
            <div className="tabular-nums">{hp.value != null ? format(hp.value) : "Too few deals"}</div>
            <div className="text-[var(--muted)]">{hp.count} {countLabel}</div>
          </div>
        )}
      </div>
      <details className="mt-1 text-xs text-[var(--muted)]">
        <summary className="cursor-pointer">Show as table</summary>
        <table className="mt-1 w-full text-start tabular-nums">
          <thead><tr><th className="text-start font-medium">{t("Period")}</th><th className="text-end font-medium">{t("Median")}</th><th className="text-end font-medium">{countLabel}</th></tr></thead>
          <tbody>
            {[...points].reverse().map((p) => (
              <tr key={p.period}><td>{periodLabel(p.period)}</td><td className="text-end">{p.value != null ? format(p.value) : "–"}</td><td className="text-end">{p.count}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
