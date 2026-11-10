"use client";

import { useMemo, useRef, useState } from "react";
import { Currency, DEFAULT_CURRENCY, convertFromAed } from "@/config/currency";
import { formatConverted, quarterLabel } from "@/lib/format";

export type Point = { period: string; value: number | null; count: number };

type Props = {
  title: string;
  points: Point[];
  /** "psf" = AED per sq ft, "aed" = short AED amount. Plain strings so a server page can pass them. */
  unit: "psf" | "aed";
  countLabel?: string;
  currency?: Currency;
};

const W = 640;
const H = 220;
const M = { top: 12, right: 12, bottom: 26, left: 64 };

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
export default function LineChart({
  title,
  points,
  unit,
  countLabel = "deals",
  currency = DEFAULT_CURRENCY,
}: Props) {
  const convertedPoints = useMemo(() => {
    if (currency === "AED") return points;
    return points.map((p) => ({
      ...p,
      value: p.value != null ? convertFromAed(p.value, currency) : null,
    }));
  }, [points, currency]);

  const format = (n: number) => {
    if (unit === "psf") {
      return formatConverted(n, currency);
    }
    return formatConverted(n, currency, { short: true });
  };

  const periodLabel = quarterLabel;
  const [hover, setHover] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const valid = convertedPoints.filter((p) => p.value != null) as (Point & { value: number })[];

  const geo = useMemo(() => {
    if (valid.length === 0) return null;
    const vals = valid.map((p) => p.value);
    const ticks = niceTicks(Math.min(...vals), Math.max(...vals));
    const y0 = ticks[0];
    const y1 = ticks[ticks.length - 1];
    const x = (i: number) => M.left + (convertedPoints.length === 1 ? (W - M.left - M.right) / 2 : (i * (W - M.left - M.right)) / (convertedPoints.length - 1));
    const y = (v: number) => H - M.bottom - ((v - y0) / (y1 - y0 || 1)) * (H - M.top - M.bottom);

    // Segment into continuous runs
    const segs: string[] = [];
    let cur = "";
    convertedPoints.forEach((p, i) => {
      if (p.value == null) { cur = ""; return; }
      const pt = `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`;
      cur = cur ? `${cur} L ${pt}` : `M ${pt}`;
      if (cur && (i === convertedPoints.length - 1 || convertedPoints[i + 1]?.value == null)) segs.push(cur);
    });

    return { ticks, x, y, segs };
  }, [convertedPoints, valid]);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium">{title}</h3>
        {hover != null && convertedPoints[hover]?.value != null && (
          <span className="text-xs font-semibold tabular-nums text-[var(--accent)]">
            {format(convertedPoints[hover].value!)} ({convertedPoints[hover].count} {countLabel})
          </span>
        )}
      </div>

      <div className="relative mt-2">
        <svg
          ref={svg}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full overflow-visible font-sans text-[10px]"
          onPointerLeave={() => setHover(null)}
          onPointerMove={(e) => {
            const rect = svg.current?.getBoundingClientRect();
            if (!rect || convertedPoints.length === 0) return;
            const relX = (e.clientX - rect.left) / rect.width;
            const svgX = relX * W;
            const clamped = Math.max(M.left, Math.min(W - M.right, svgX));
            const i = convertedPoints.length === 1
              ? 0
              : Math.round(((clamped - M.left) / (W - M.left - M.right)) * (convertedPoints.length - 1));
            setHover(i);
          }}
        >
          {geo && (
            <>
              {/* Ticks */}
              {geo.ticks.map((t) => (
                <g key={t} className="text-[var(--muted)]">
                  <line x1={M.left} x2={W - M.right} y1={geo.y(t)} y2={geo.y(t)} stroke="currentColor" strokeOpacity={0.15} />
                  <text x={M.left - 6} y={geo.y(t) + 3} textAnchor="end" fill="currentColor">
                    {format(t)}
                  </text>
                </g>
              ))}

              {/* X labels (first, last, and hover) */}
              {convertedPoints.map((p, i) => {
                const show = i === 0 || i === convertedPoints.length - 1 || i === hover;
                if (!show) return null;
                return (
                  <text
                    key={p.period}
                    x={geo.x(i)}
                    y={H - 6}
                    textAnchor={i === 0 ? "start" : i === convertedPoints.length - 1 ? "end" : "middle"}
                    fill="currentColor"
                    className="text-[var(--muted)]"
                  >
                    {periodLabel(p.period)}
                  </text>
                );
              })}

              {/* Paths */}
              {geo.segs.map((d, i) => (
                <path key={i} d={d} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              ))}

              {/* Points */}
              {convertedPoints.map((p, i) =>
                p.value != null ? (
                  <circle
                    key={p.period}
                    cx={geo.x(i)}
                    cy={geo.y(p.value)}
                    r={hover === i ? 4 : 2}
                    fill={hover === i ? "var(--accent)" : "var(--panel)"}
                    stroke="var(--accent)"
                    strokeWidth={1.5}
                  />
                ) : null
              )}

              {/* Hover guide */}
              {hover != null && (
                <line
                  x1={geo.x(hover)}
                  x2={geo.x(hover)}
                  y1={M.top}
                  y2={H - M.bottom}
                  stroke="var(--fg)"
                  strokeDasharray="2 2"
                  strokeOpacity={0.3}
                />
              )}
            </>
          )}
        </svg>

        {!geo && (
          <div className="flex h-36 items-center justify-center text-xs text-[var(--muted)]">
            Not enough data across quarters.
          </div>
        )}
      </div>
    </div>
  );
}
