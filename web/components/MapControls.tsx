"use client";

import { useEffect, useState } from "react";
import type { Currency } from "@/config/currency";
import { day } from "@/lib/format";
import {
  DEFAULT_SETTINGS, METRICS, METRIC_IDS, PALETTES, PALETTE_IDS, type LegendItem, type MapSettings, type MetricId, type ScaleMode,
} from "@/lib/mapMetrics";
import { DISCLAIMER } from "@/lib/sources";
import { DEFAULT_THEME, THEMES, THEME_IDS, type ThemeId } from "@/lib/mapThemes";

type Props = {
  compact: boolean;
  settings: MapSettings;
  theme: ThemeId;
  currency: Currency;
  legend: LegendItem[];
  hidden: number[];
  periodEnd: string | null;
  onSettings: (s: MapSettings) => void;
  onTheme: (t: ThemeId) => void;
  onToggleClass: (cls: number) => void;
};

const SCALES: { id: ScaleMode; label: string; hint: string }[] = [
  { id: "recommended", label: "Dubai bands", hint: "Fixed ranges, same meaning in every area" },
  { id: "quantile", label: "Equal groups", hint: "Same number of buildings in each colour" },
  { id: "custom", label: "My range", hint: "Pick the low and high value" },
];

const gradient = (colors: readonly string[]) => `linear-gradient(90deg, ${colors.join(", ")})`;

/** Legend and map settings: what colours the buildings, the colour scale, and the basemap theme. */
export default function MapControls(p: Props) {
  const { settings: s, currency } = p;
  const def = METRICS[s.metric];
  const [open, setOpen] = useState(true);
  const [tuning, setTuning] = useState(false);

  // Start folded on phones so the map stays visible.
  useEffect(() => {
    if (window.matchMedia("(max-width: 639px)").matches) setOpen(false);
  }, []);

  const toDisplay = (v: number | null) => (v == null ? "" : String(Math.round(def.toDisplay(v, currency) * 100) / 100));
  const setMetric = (metric: MetricId) =>
    p.onSettings({ ...s, metric, palette: METRICS[metric].palette, min: null, max: null, mode: s.mode === "custom" ? "recommended" : s.mode });
  const setMode = (mode: ScaleMode) => {
    if (mode === "custom" && (s.min == null || s.max == null)) {
      const b = def.breaks;
      p.onSettings({ ...s, mode, min: b[0], max: b[b.length - 1] });
    } else p.onSettings({ ...s, mode });
  };
  const setBound = (key: "min" | "max", text: string) => {
    const n = Number(text.replace(/,/g, ""));
    if (text.trim() === "" || !Number.isFinite(n)) return;
    p.onSettings({ ...s, mode: "custom", [key]: def.fromDisplay(n, currency) });
  };

  const metricSelect = (
    <label className="flex min-w-0 flex-1 items-center gap-2">
      <span className="shrink-0 text-[var(--muted)]">Colour by</span>
      <select
        value={s.metric}
        onChange={(e) => setMetric(e.target.value as MetricId)}
        className="min-w-0 flex-1 rounded border border-[var(--border)] bg-[var(--bg)] px-1.5 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
      >
        {METRIC_IDS.map((id) => <option key={id} value={id}>{METRICS[id].label}</option>)}
      </select>
    </label>
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute bottom-[5.5rem] start-2 z-10 flex items-center gap-2 rounded-full sm:bottom-auto sm:start-auto sm:end-2 sm:top-2 border border-[var(--border)] bg-[var(--panel)]/95 px-3 py-1.5 text-xs shadow-md backdrop-blur"
        aria-expanded="false"
      >
        <span className="inline-block h-2.5 w-12 rounded-full" style={{ background: gradient(p.legend.filter((l) => l.cls >= 0).map((l) => l.color)) }} />
        <span className="font-medium">{def.label}</span>
        <span aria-hidden className="inline-block sm:rotate-180">▴</span>
      </button>
    );
  }

  return (
    <div className="absolute bottom-[5.5rem] start-2 z-10 flex max-h-[calc(100%-7rem)] w-[min(300px,calc(100%-1rem))] sm:bottom-auto sm:start-auto sm:end-2 sm:top-2 sm:max-h-[calc(100%-9rem)] flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)]/95 text-xs shadow-lg backdrop-blur">
      <div className="flex items-center gap-1.5 border-b border-[var(--border)] px-2.5 py-2">
        {metricSelect}
        {!p.compact && (
          <button
            type="button"
            onClick={() => setTuning((t) => !t)}
            aria-expanded={tuning}
            title="Colours, scale and map theme"
            className={`rounded border px-1.5 py-1 ${tuning ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)]"}`}
          >
            <span aria-hidden>⚙</span><span className="sr-only">Map settings</span>
          </button>
        )}
        <button type="button" onClick={() => setOpen(false)} title="Hide legend" className="rounded border border-[var(--border)] px-1.5 py-1" aria-expanded="true">
          <span aria-hidden className="inline-block sm:rotate-180">▾</span><span className="sr-only">Hide legend</span>
        </button>
      </div>

      <div className="overflow-y-auto px-2.5 py-2">
        <div className="mb-1 font-medium">{def.title}</div>
        <ul className="space-y-0.5" aria-label="Legend: click a row to show or hide those buildings">
          {p.legend.map((l) => {
            const off = p.hidden.includes(l.cls);
            return (
              <li key={l.cls}>
                <button
                  type="button"
                  onClick={() => p.onToggleClass(l.cls)}
                  aria-pressed={!off}
                  className={`flex w-full items-center gap-2 rounded px-1 py-0.5 text-start hover:bg-[var(--grid)] ${off ? "opacity-40" : ""}`}
                >
                  <span className="inline-block h-3 w-3 shrink-0 rounded-sm ring-1 ring-black/10" style={{ background: l.color }} />
                  <span className={`flex-1 tabular-nums ${off ? "line-through" : ""}`}>{l.label}</span>
                  <span className="tabular-nums text-[var(--muted)]">{l.count}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-1.5 text-[11px] leading-snug text-[var(--muted)]">
          Click a row to hide or show it. Grey: too few deals for a figure.{" "}
          Source: {def.source}{p.periodEnd ? `, data to ${day(p.periodEnd)}` : ""}.
          {def.estimate && <> <strong className="font-medium">{DISCLAIMER}</strong></>}
        </p>

        {tuning && !p.compact && (
          <div className="mt-3 space-y-3 border-t border-[var(--border)] pt-3">
            <fieldset>
              <legend className="mb-1 font-medium">Colours</legend>
              <div className="grid grid-cols-3 gap-1.5">
                {PALETTE_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => p.onSettings({ ...s, palette: id })}
                    aria-pressed={s.palette === id}
                    title={PALETTES[id].label}
                    className={`rounded border p-1 ${s.palette === id ? "border-[var(--accent)] ring-1 ring-[var(--accent)]" : "border-[var(--border)]"}`}
                  >
                    <span className="block h-3 rounded-sm" style={{ background: gradient(PALETTES[id].colors) }} />
                    <span className="sr-only">{PALETTES[id].label}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-1 font-medium">Scale</legend>
              <div className="space-y-1">
                {SCALES.map((sc) => (
                  <label key={sc.id} className="flex cursor-pointer items-start gap-2">
                    <input type="radio" name="dpi-scale" checked={s.mode === sc.id} onChange={() => setMode(sc.id)} className="mt-0.5" />
                    <span><span className="font-medium">{sc.label}</span> <span className="text-[var(--muted)]">{sc.hint}</span></span>
                  </label>
                ))}
              </div>
              {s.mode === "custom" && (
                <div className="mt-2 flex items-center gap-1.5">
                  <input
                    key={`min-${s.metric}-${currency}`}
                    type="number" inputMode="decimal" aria-label="Low value" defaultValue={toDisplay(s.min)}
                    onBlur={(e) => setBound("min", e.target.value)} onKeyDown={(e) => e.key === "Enter" && setBound("min", (e.target as HTMLInputElement).value)}
                    className="w-20 rounded border border-[var(--border)] bg-[var(--bg)] px-1.5 py-1 tabular-nums"
                  />
                  <span>to</span>
                  <input
                    key={`max-${s.metric}-${currency}`}
                    type="number" inputMode="decimal" aria-label="High value" defaultValue={toDisplay(s.max)}
                    onBlur={(e) => setBound("max", e.target.value)} onKeyDown={(e) => e.key === "Enter" && setBound("max", (e.target as HTMLInputElement).value)}
                    className="w-20 rounded border border-[var(--border)] bg-[var(--bg)] px-1.5 py-1 tabular-nums"
                  />
                  <span className="text-[var(--muted)]">{def.unit(currency)}</span>
                </div>
              )}
            </fieldset>

            <fieldset>
              <legend className="mb-1 font-medium">Map theme</legend>
              <div className="grid grid-cols-4 gap-1.5">
                {THEME_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => p.onTheme(id)}
                    aria-pressed={p.theme === id}
                    className={`flex flex-col items-center gap-1 rounded border p-1 ${p.theme === id ? "border-[var(--accent)] ring-1 ring-[var(--accent)]" : "border-[var(--border)]"}`}
                  >
                    <span className="block h-6 w-full rounded-sm ring-1 ring-black/10" style={{ background: `linear-gradient(135deg, ${THEMES[id].baseBuilding} 0 50%, ${THEMES[id].dark ? "#14171b" : "#f4f2ee"} 50% 100%)` }} />
                    <span className="text-[11px]">{THEMES[id].label}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <button
              type="button"
              onClick={() => { p.onSettings(DEFAULT_SETTINGS); p.onTheme(DEFAULT_THEME); }}
              className="link text-[11px]"
            >
              Reset to defaults
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
