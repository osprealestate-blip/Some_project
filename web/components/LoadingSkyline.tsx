"use client";
import { useT } from "@/components/LangProvider";

/** A small skyline whose towers rise one after another while data loads. Plain SVG and CSS, no photo.
 *  Motion is turned off by the global reduced-motion rule, leaving a still skyline. `label` is English and is
 *  translated here, so callers pass a literal and the Arabic dictionary covers it. */
export default function LoadingSkyline({ label, className = "" }: { label: string; className?: string }) {
  const t = useT();
  const heights = [26, 40, 54, 34, 62, 44, 30];
  return (
    <div role="status" className={`flex flex-col items-center gap-3 text-[var(--accent)] ${className}`}>
      <svg viewBox="0 0 98 66" width="98" height="66" aria-hidden="true" focusable="false">
        <g fill="currentColor">
          {heights.map((h, i) => (
            <rect key={i} className="dpi-tower" style={{ animationDelay: `${i * 0.12}s` }} x={i * 14} y={66 - h} width="10" height={h} rx="2" />
          ))}
        </g>
      </svg>
      <span className="text-sm font-medium text-[var(--muted)]">{t(label)}</span>
    </div>
  );
}
