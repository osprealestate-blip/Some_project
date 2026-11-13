"use client";
import { useEffect, useState } from "react";
import { useT } from "./LangProvider";

const KEY = "dpi.tour.done";
const STEPS = [
  { title: "Tap any building", body: "A card shows its price, rent return and the nearest metro, hospital, school, mall and park. Colours follow the layer chosen at the bottom." },
  { title: "Show it on the map", body: "On the card, press Show on map to draw lines to those places. Distances are straight-line km. Walk and Drive times appear only where routing is switched on." },
  { title: "Compare and save", body: "Add up to 3 buildings to Compare, and tap the heart to keep buildings in a list you can share. Search \"near a metro\" to filter the map." },
];

function read(): boolean {
  try { return window.localStorage.getItem(KEY) === "1" || window.sessionStorage.getItem(KEY) === "1"; } catch { return false; }
}
function write(store: "local" | "session") {
  try { (store === "local" ? window.localStorage : window.sessionStorage).setItem(KEY, "1"); } catch { /* private mode */ }
}

/** A first-visit tour of three steps. Skip hides it for this visit, Don't show again for good. Never blocks the map. */
export default function MapTour() {
  const t = useT();
  const [step, setStep] = useState(0);
  const [show, setShow] = useState(false);
  useEffect(() => { setShow(!read()); }, []);
  if (!show) return null;
  const last = step === STEPS.length - 1;
  const s = STEPS[step];
  return (
    <section role="region" aria-label={t("Quick tour")} className="dpi-tour dpi-enter absolute inset-x-3 bottom-[5.5rem] z-20 mx-auto max-w-sm rounded-xl border border-cyan-300/50 bg-slate-900/95 p-3.5 text-white shadow-2xl backdrop-blur md:bottom-[5.5rem] md:start-1/2 md:end-auto md:w-[22rem] md:-translate-x-1/2 md:rtl:translate-x-1/2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{t(s.title)}</h2>
        <span className="text-[11px] text-slate-300" aria-live="polite">{t("Step {n} of {total}", { n: step + 1, total: STEPS.length })}</span>
      </div>
      <p className="mt-1 text-[13px] leading-snug text-slate-200">{t(s.body)}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <button type="button" onClick={() => (last ? (write("local"), setShow(false)) : setStep(step + 1))} className="rounded-full bg-cyan-300 px-3.5 py-1.5 font-semibold text-slate-900 hover:bg-cyan-200">{last ? t("Done") : t("Next")}</button>
        <button type="button" onClick={() => { write("session"); setShow(false); }} className="rounded-full px-3 py-1.5 font-medium text-slate-200 hover:bg-white/10">{t("Skip")}</button>
        <button type="button" onClick={() => { write("local"); setShow(false); }} className="ms-auto rounded-full px-2 py-1.5 text-slate-300 underline hover:text-white">{t("Don't show again")}</button>
      </div>
    </section>
  );
}
