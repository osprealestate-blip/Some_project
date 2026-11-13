"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { useT } from "./LangProvider";
import { FACILITIES } from "@/lib/facilities";
import { filterParam, parseFilter, type MapFilter } from "@/lib/mapFilter";

const UNDER: [string, string][] = [["1000000", "Under AED 1M"], ["1500000", "Under AED 1.5M"], ["2500000", "Under AED 2.5M"], ["5000000", "Under AED 5M"]];

function setFilter(f: MapFilter | null) {
  const sp = new URLSearchParams(window.location.search);
  if (f) sp.set("f", filterParam(f)); else sp.delete("f");
  window.history.pushState(null, "", `/map${sp.toString() ? `?${sp}` : ""}`);
}

/** "Filters" in the map toolbar. Closed by default; only filters we hold real data for (median price ceiling, distance to places). */
export default function MapFilterMenu() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const cur = parseFilter(useSearchParams().get("f"));
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);
  const chip = (on: boolean) => `rounded-full border px-3 py-1.5 text-xs ${on ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--border)] hover:bg-[var(--grid)]"}`;
  return (
    <div className="shrink-0">
      <button type="button" aria-expanded={open} aria-controls="map-filter-menu" onClick={() => setOpen((o) => !o)} className={`rounded-full px-3 py-1.5 font-medium ${cur ? "bg-[var(--accent)] text-white" : "hover:bg-[var(--grid)]"}`}>
        {t("Filters")}{cur ? " •" : ""}
      </button>
      {open && createPortal(
        <div id="map-filter-menu" role="region" aria-label={t("Map filters")} className="dpi-glass fixed bottom-24 left-1/2 z-20 w-72 max-w-[calc(100vw-24px)] -translate-x-1/2 rounded-2xl p-3 text-start">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{t("Median sale price")}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {UNDER.map(([v, l]) => <button key={v} type="button" aria-pressed={cur?.type === "under" && cur.value === v} className={chip(cur?.type === "under" && cur.value === v)} onClick={() => setFilter({ type: "under", value: v })}>{t(l)}</button>)}
          </div>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{t("Near a place (straight-line)")}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {FACILITIES.map((f) => <button key={f.id} type="button" aria-pressed={cur?.type === "near" && cur.value === f.id} className={chip(cur?.type === "near" && cur.value === f.id)} onClick={() => setFilter({ type: "near", value: f.id })}>{t(f.label)}</button>)}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[11px] leading-snug text-[var(--muted)]">{t("Bedrooms, property type and ready or off-plan are not filterable on the map yet.")}</p>
            <button type="button" disabled={!cur} onClick={() => setFilter(null)} className="ms-2 shrink-0 text-xs underline disabled:opacity-40">{t("Clear")}</button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
