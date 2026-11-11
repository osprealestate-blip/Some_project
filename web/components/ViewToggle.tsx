"use client";

import { useEffect, useState } from "react";

const KEY = "dpi-view";
type View = "simple" | "advanced";

function current(): View {
  return document.documentElement.dataset.view === "advanced" ? "advanced" : "simple";
}

/**
 * Simple / Advanced switch for building and community pages. Simple is the default. It only hides or shows blocks
 * marked with the `adv-only` class (see globals.css); no figure is removed from the page, and none is recalculated.
 * The choice is remembered in this browser only.
 */
export default function ViewToggle() {
  const [view, setView] = useState<View>("simple");

  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(KEY); } catch { /* storage can be blocked */ }
    if (saved === "advanced") document.documentElement.dataset.view = "advanced";
    setView(current());
  }, []);

  function choose(next: View) {
    document.documentElement.dataset.view = next;
    try { localStorage.setItem(KEY, next); } catch { /* storage can be blocked */ }
    setView(next);
  }

  const btn = (v: View, label: string) => (
    <button
      type="button"
      aria-pressed={view === v}
      onClick={() => choose(v)}
      className={`min-h-9 px-3 text-sm font-medium ${view === v ? "bg-[var(--accent)] text-white" : "text-[var(--muted)] hover:text-[var(--fg)]"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
      <div role="group" aria-label="How much detail to show" className="inline-flex overflow-hidden rounded-lg border border-[var(--border)]">
        {btn("simple", "Simple")}
        {btn("advanced", "Advanced")}
      </div>
      <p className="text-xs text-[var(--muted)]">
        {view === "simple" ? "Advanced adds bedroom types, quarterly charts, recent sales and data notes." : "Showing every figure and the data notes."}
      </p>
    </div>
  );
}
