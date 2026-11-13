"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import SearchBox from "./SearchBox";
import { useT } from "./LangProvider";
import { LAUNCH_COMMUNITIES } from "@/lib/communities";
import { FACILITIES, ICON_PATHS } from "@/lib/facilities";
import { NEAR_RADIUS_M } from "@/lib/mapFilter";
import { METRICS, type MetricId } from "@/lib/mapMetrics";

type Section = "search" | "discover" | "trends" | "nearby" | "compare";
const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: "search", label: "Search", icon: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-4-4" },
  { id: "discover", label: "Discover", icon: "M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z" },
  { id: "trends", label: "Market trends", icon: "M4 19V9m6 10V5m6 14v-7m6 7H2" },
  { id: "nearby", label: "Nearby", icon: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" },
  { id: "compare", label: "Compare", icon: "M4 6h7M4 12h7M4 18h7m5-12v12m0 0-3-3m3 3 3-3" },
];

/** Ready-made questions. Each one is a real map setting (a colour layer or a filter), never free text sent to a chatbot. */
const QUESTIONS: { label: string; set: Record<string, string>; clear?: string[] }[] = [
  { label: "Buildings under AED 1.5 million", set: { f: "under:1500000" } },
  { label: "Which buildings have higher rental yields?", set: { m: "yield" }, clear: ["f"] },
  { label: "Show buildings near metro stations", set: { f: "near:metro" } },
  { label: "Where are sales busiest?", set: { m: "sales" }, clear: ["f"] },
  { label: "Where have prices risen?", set: { m: "change" }, clear: ["f"] },
];

const MAX_COMPARE_LABEL = 3;

function go(set: Record<string, string>, clear: string[] = []) {
  const sp = new URLSearchParams(window.location.search);
  for (const k of clear) sp.delete(k);
  for (const [k, v] of Object.entries(set)) { if (k === "m" && v === "psf") sp.delete("m"); else sp.set(k, v); }
  window.history.pushState(null, "", `/map${sp.toString() ? `?${sp}` : ""}`);
}

/** The left discovery sidebar. Collapsed it is a slim rail of five icons; one section opens at a time. It only sets the map
 *  through the URL (layer, filter), so every state it creates is shareable and works with Back. */
export default function MapSidebar({ compareCount }: { compareCount: number }) {
  const t = useT();
  const params = useSearchParams();
  const [open, setOpen] = useState<Section | null>(null);
  const metric = (params.get("m") ?? "psf") as MetricId;
  const f = params.get("f");

  useEffect(() => {
    document.documentElement.toggleAttribute("data-sidebar-open", !!open);
    return () => document.documentElement.removeAttribute("data-sidebar-open");
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);
  // Opening a building or the welcome hands the screen to them.
  useEffect(() => { if (params.get("building")) setOpen(null); }, [params]);

  const row = "flex w-full items-start gap-2 rounded-lg border border-[#0f2742]/10 bg-white px-2.5 py-2 text-start text-[13px] hover:border-cyan-500 aria-pressed:border-cyan-500 aria-pressed:bg-cyan-50";
  return (
    <nav aria-label={t("Map tools")} className="absolute start-3 top-14 z-20 flex items-start gap-2 md:top-16 [html[data-building-selected]_&]:max-md:hidden [html[data-welcome-open]_&]:hidden">
      <ul className="flex flex-col gap-1 rounded-2xl border border-white/70 bg-white/85 p-1 shadow-lg backdrop-blur-md">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <button type="button" onClick={() => setOpen(open === s.id ? null : s.id)} aria-expanded={open === s.id} aria-label={t(s.label)} title={t(s.label)}
              className={`relative grid h-10 w-10 place-items-center rounded-xl text-[#0f2742] hover:bg-cyan-50 ${open === s.id ? "bg-cyan-100" : ""}`}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={s.icon} /></svg>
              {s.id === "compare" && compareCount > 0 && <span className="absolute -end-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-cyan-500 px-1 text-[10px] font-bold text-white">{compareCount}</span>}
            </button>
          </li>
        ))}
      </ul>
      {open && (
        <section aria-label={t(SECTIONS.find((s) => s.id === open)!.label)} className="dpi-enter max-h-[calc(100dvh-11rem)] w-[min(19rem,calc(100vw-5rem))] overflow-y-auto rounded-2xl border border-white/70 bg-white/90 p-3.5 text-[#0f2742] shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold">{t(SECTIONS.find((s) => s.id === open)!.label)}</h2>
            <button type="button" onClick={() => setOpen(null)} aria-label={t("Close")} className="grid h-7 w-7 place-items-center rounded-full hover:bg-black/5">✕</button>
          </div>

          {open === "search" && (
            <div className="mt-2.5 space-y-2.5">
              <SearchBox mapMode placeholder={t("Building, area or developer")} />
              <p className="text-xs leading-snug text-[#0f2742]/70">{t("Some towers have no verified map position. You can still find every building in the list.")}</p>
              <Link href="/buildings" className="block rounded-lg bg-[#0f2742] px-3 py-2 text-center text-[13px] font-semibold text-white hover:bg-[#16365a]">{t("Browse all buildings")}</Link>
            </div>
          )}

          {open === "discover" && (
            <div className="mt-2.5 space-y-3">
              <div>
                <p className="text-xs font-medium text-[#0f2742]/70">{t("Start with a question")}</p>
                <ul className="mt-1.5 space-y-1.5">
                  {QUESTIONS.map((q) => (
                    <li key={q.label}><button type="button" className={row} onClick={() => { go(q.set, q.clear); setOpen(null); }}>{t(q.label)}</button></li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium text-[#0f2742]/70">{t("Explore an area")}</p>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {LAUNCH_COMMUNITIES.map((c) => (
                    <li key={c.code}><button type="button" aria-pressed={f === `area:${c.code}`} onClick={() => { go({ f: `area:${c.code}` }); setOpen(null); }}
                      className="rounded-full border border-[#0f2742]/15 bg-white px-3 py-1 text-[13px] font-medium hover:border-cyan-500 aria-pressed:border-cyan-500 aria-pressed:bg-cyan-50">{c.label}</button></li>
                  ))}
                </ul>
                <Link href="/communities" className="mt-2 inline-block text-xs underline">{t("All communities")}</Link>
              </div>
            </div>
          )}

          {open === "trends" && (
            <ul className="mt-2.5 space-y-1.5">
              {(["psf", "yield", "sales", "change"] as const).map((id) => (
                <li key={id}>
                  <button type="button" className={row} aria-pressed={metric === id} onClick={() => { go({ m: id }); }}>
                    <span><span className="block font-semibold">{t(METRICS[id].label)}</span><span className="mt-0.5 block text-xs font-normal text-[#0f2742]/70">{t(METRICS[id].title)}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {open === "nearby" && (
            <div className="mt-2.5">
              <p className="text-xs leading-snug text-[#0f2742]/70">{t("Show only buildings close to a place. Distances are straight-line, not walking or driving time.")}</p>
              <ul className="mt-2 space-y-1.5">
                {FACILITIES.map((fa) => (
                  <li key={fa.id}>
                    <button type="button" className={row} aria-pressed={f === `near:${fa.id}`} onClick={() => { go({ f: `near:${fa.id}` }); setOpen(null); }}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0" dangerouslySetInnerHTML={{ __html: ICON_PATHS[fa.id] }} />
                      <span><span className="block font-semibold">{t(fa.label)}</span><span className="block text-xs font-normal text-[#0f2742]/70">{t("Within {km} km", { km: NEAR_RADIUS_M[fa.id] / 1000 })}</span></span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-[#0f2742]/70">{t("Open a building and press Show on map to draw lines to its nearest places.")}</p>
            </div>
          )}

          {open === "compare" && (
            <div className="mt-2.5 space-y-2.5 text-[13px]">
              <p>{compareCount ? t("{n} of {max} buildings picked.", { n: compareCount, max: MAX_COMPARE_LABEL }) : t("Open a building and press + Compare to line it up against others.")}</p>
              {compareCount > 0 && <p className="text-xs text-[#0f2742]/70">{t("Your picks are in the tray at the bottom of the map.")}</p>}
              <div className="flex gap-2 border-t border-[#0f2742]/10 pt-2.5">
                <Link href="/collections" className="rounded-lg border border-[#0f2742]/15 px-3 py-1.5 text-xs font-medium hover:border-cyan-500">{t("Saved lists")}</Link>
                <Link href="/favourites" className="rounded-lg border border-[#0f2742]/15 px-3 py-1.5 text-xs font-medium hover:border-cyan-500">{t("Favourites")}</Link>
              </div>
            </div>
          )}
        </section>
      )}
    </nav>
  );
}
