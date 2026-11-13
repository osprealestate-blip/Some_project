"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import SearchBox from "./SearchBox";
import { useT } from "./LangProvider";
import { LAUNCH_COMMUNITIES } from "@/lib/communities";

const KEY = "dpi.welcome.done";
type View = "home" | "property" | "area";

const read = (): { forever: boolean; session: boolean } => {
  try { return { forever: window.localStorage.getItem(KEY) === "1", session: window.sessionStorage.getItem(KEY) === "1" }; } catch { return { forever: false, session: false }; }
};
const write = (store: "local" | "session") => {
  try { (store === "local" ? window.localStorage : window.sessionStorage).setItem(KEY, "1"); } catch { /* private mode: it just shows again */ }
};

/** Change the map through the URL, the same way search and the layer pills do, so the view stays shareable. */
function apply(set: Record<string, string>) {
  const sp = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(set)) { if (k === "m" && v === "psf") sp.delete("m"); else sp.set(k, v); }
  window.history.pushState(null, "", `/map${sp.toString() ? `?${sp}` : ""}`);
}

/** The first thing on the map: a centred welcome with four real starting points. Every choice changes the map and explains
 *  what it now shows. It never blocks a shared link, remembers "don't show again", and a Guide button reopens it. */
export default function MapWelcome() {
  const t = useT();
  const params = useSearchParams();
  const shared = !!(params.get("building") || params.get("f") || params.get("compare"));
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("home");
  const [note, setNote] = useState<string | null>(null);
  const [never, setNever] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = read();
    setOpen(!shared && !s.forever && !s.session);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Opening a building, a search result or a shared link means the visitor already has a purpose.
  useEffect(() => { if (shared) setOpen(false); }, [shared]);
  useEffect(() => { document.documentElement.toggleAttribute("data-welcome-open", open); return () => document.documentElement.removeAttribute("data-welcome-open"); }, [open]);
  useEffect(() => { if (open) box.current?.focus(); }, [open, view]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, never]);

  function close() { write(never ? "local" : "session"); setOpen(false); }
  function choose(set: Record<string, string>, message: string) {
    apply(set);
    setNote(message);
    close();
  }

  const GOALS = [
    { title: "Buy a property", hint: "Check prices and recent sales", run: () => choose({ m: "psf" }, t("Buildings are coloured by price per sq ft. Click a building for its real prices and recent sales.")) },
    { title: "Invest in Dubai", hint: "Explore yields and returns", run: () => choose({ m: "yield" }, t("Higher estimated rental yields are highlighted. Yield is registered rent against sale prices, before expenses.")) },
    { title: "Check my property", hint: "See what buildings like yours sold for", run: () => setView("property") },
    { title: "Explore an area", hint: "Discover communities", run: () => setView("area") },
  ];

  return (
    <>
      {note && !open && (
        <div role="status" className="dpi-enter absolute inset-x-3 top-3 z-20 mx-auto flex max-w-md items-start gap-2 rounded-xl border border-[#0f2742]/10 bg-white/90 px-3.5 py-2.5 text-[13px] leading-snug text-[#0f2742] shadow-lg backdrop-blur md:top-4">
          <span className="min-w-0 flex-1">{note}</span>
          <button type="button" onClick={() => setNote(null)} aria-label={t("Close")} className="grid h-6 w-6 shrink-0 place-items-center rounded-full hover:bg-black/5">✕</button>
        </div>
      )}
      {!open && (
        <button type="button" onClick={() => { setView("home"); setNote(null); setOpen(true); }} aria-label={t("Open the guide")}
          className="absolute start-3 top-3 z-20 flex h-9 items-center gap-1.5 rounded-full border border-[#0f2742]/10 bg-white/90 px-3 text-[13px] font-semibold text-[#0f2742] shadow backdrop-blur hover:bg-white md:top-4 [html[data-building-selected]_&]:hidden">
          <span aria-hidden className="grid h-5 w-5 place-items-center rounded-full bg-cyan-400 text-xs font-bold text-white">?</span>{t("Guide")}
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-[44] grid place-items-center p-3" style={{ background: "rgb(15 39 66 / 0.28)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }} onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div ref={box} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="welcome-title"
            className="dpi-enter max-h-[calc(100dvh-1.5rem)] w-full max-w-[34rem] overflow-y-auto rounded-2xl border border-white/70 bg-white/85 p-5 text-[#0f2742] shadow-2xl outline-none focus:outline-none focus-visible:outline-none backdrop-blur-xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <h1 id="welcome-title" className="text-[22px] font-semibold leading-tight sm:text-2xl">{t("Discover Dubai property beyond the asking price.")}</h1>
              <button type="button" onClick={close} aria-label={t("Close")} className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-black/5">✕</button>
            </div>
            <p className="mt-2 text-sm leading-snug text-[#0f2742]/75">{t("Explore actual property transactions, rental trends and building intelligence using Dubai Land Department data.")}</p>

            {view === "home" && (
              <>
                <p className="mt-4 text-sm font-medium">{t("What are you looking for?")}</p>
                <div className="mt-2 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                  {GOALS.map((g) => (
                    <button key={g.title} type="button" onClick={g.run}
                      className="rounded-xl border border-[#0f2742]/12 bg-white px-3 py-2.5 text-start transition hover:border-cyan-500 hover:shadow focus-visible:outline-2 focus-visible:outline-cyan-500">
                      <span className="block text-[14px] font-semibold">{t(g.title)}</span>
                      <span className="mt-0.5 block text-xs text-[#0f2742]/65">{t(g.hint)}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-3 border-t border-[#0f2742]/10 pt-3">
                  <SearchBox mapMode placeholder={t("Building, area or developer")} />
                </div>
              </>
            )}

            {view === "property" && (
              <div className="mt-4">
                <p className="text-sm font-medium">{t("Type your building's name")}</p>
                <p className="mt-0.5 text-xs text-[#0f2742]/65">{t("Its card shows the median price, rent and recent sales in your building, and similar buildings.")}</p>
                <div className="mt-2"><SearchBox mapMode autoFocus placeholder={t("Building, area or developer")} /></div>
                <button type="button" onClick={() => setView("home")} className="mt-3 text-xs underline">{t("Back")}</button>
              </div>
            )}

            {view === "area" && (
              <div className="mt-4">
                <p className="text-sm font-medium">{t("Pick an area")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {LAUNCH_COMMUNITIES.map((c) => (
                    <button key={c.code} type="button" onClick={() => choose({ f: `area:${c.code}` }, t("Showing buildings in {area}. Click one for its prices, or clear the filter to see all of Dubai.", { area: c.label }))}
                      className="rounded-full border border-[#0f2742]/15 bg-white px-3.5 py-1.5 text-sm font-medium hover:border-cyan-500">{c.label}</button>
                  ))}
                </div>
                <p className="mt-3 text-xs text-[#0f2742]/65">{t("Another area? Search for it:")}</p>
                <div className="mt-1.5"><SearchBox mapMode placeholder={t("Building, area or developer")} /></div>
                <button type="button" onClick={() => setView("home")} className="mt-3 text-xs underline">{t("Back")}</button>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#0f2742]/70">
              <span>{t("No account required")}</span>
              <label className="flex cursor-pointer items-center gap-1.5"><input type="checkbox" checked={never} onChange={(e) => setNever(e.target.checked)} />{t("Don't show again")}</label>
              <button type="button" onClick={close} className="ms-auto rounded-full bg-[#0f2742] px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-[#16365a]">{t("Explore the map")} →</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
