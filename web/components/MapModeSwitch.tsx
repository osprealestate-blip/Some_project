"use client";

import { useT } from "./LangProvider";

export type MapMode = "buildings" | "communities";

/** Buildings | Communities: the map read building by building (default) or community by community. A switch, not a filter:
 *  the same map, a different thing to pick. */
export default function MapModeSwitch({ mode, onChange }: { mode: MapMode; onChange: (m: MapMode) => void }) {
  const t = useT();
  const btn = (m: MapMode, label: string) => (
    <button type="button" aria-pressed={mode === m} onClick={() => mode !== m && onChange(m)}
      className={`min-h-9 rounded-full px-3.5 text-[13px] font-semibold transition-colors ${mode === m ? "bg-[#0f2742] text-white" : "text-[#0f2742] hover:bg-[#0f2742]/10"}`}>
      {label}
    </button>
  );
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center md:top-4 [html[data-building-selected]_&]:max-md:hidden [html[data-welcome-open]_&]:hidden">
      <div role="group" aria-label={t("Map view")} className="pointer-events-auto flex gap-0.5 rounded-full border border-white/70 bg-white/90 p-0.5 shadow-lg backdrop-blur-md">
        {btn("buildings", t("Buildings"))}
        {btn("communities", t("Communities"))}
      </div>
    </div>
  );
}
