"use client";

import { useEffect, useState } from "react";

const KEY = "dpi-view";
type View = "homeowner" | "investor" | "advanced";
const VIEWS: View[] = ["investor", "advanced"];

function current(): View {
  const v = document.documentElement.dataset.view as View | undefined;
  return v && VIEWS.includes(v) ? v : "homeowner";
}

/**
 * Homeowner / Investor / Full detail switch for building and community pages. Homeowner is the default. It only hides
 * or shows blocks marked `owner-only`, `inv-only` or `adv-only` (see globals.css); no figure is removed from the page,
 * and none is recalculated. The choice is remembered in this browser only. ("advanced" is the stored name for Full detail.)
 */
export default function ViewToggle() {
  const [view, setView] = useState<View>("homeowner");

  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(KEY); } catch { /* storage can be blocked */ }
    if (saved === "investor" || saved === "advanced") document.documentElement.dataset.view = saved;
    setView(current());
  }, []);

  function choose(next: View) {
    document.documentElement.dataset.view = next;
    try { localStorage.setItem(KEY, next === "homeowner" ? "" : next); } catch { /* storage can be blocked */ }
    setView(next);
  }

  const btn = (v: View, label: string) => (
    <button
      type="button"
      aria-pressed={view === v}
      onClick={() => choose(v)}
      className={`min-h-11 px-3 text-sm font-medium sm:px-4 ${view === v ? "bg-[var(--accent)] text-white" : "text-[var(--muted)] hover:text-[var(--fg)]"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
      <div role="group" aria-label="Who is this for" className="inline-flex overflow-hidden rounded-lg border border-[var(--border)]">
        {btn("homeowner", "Homeowner")}
        {btn("investor", "Investor")}
        {btn("advanced", "Full detail")}
      </div>
      <p className="text-xs text-[var(--muted)]">
        {view === "homeowner"
          ? "Price, is it fair, and running costs. Investor adds yield and rent trends."
          : view === "investor"
            ? "Yield, rent, growth, bedroom types and quarterly charts."
            : "Every figure, recent sales and data notes."}
      </p>
    </div>
  );
}
