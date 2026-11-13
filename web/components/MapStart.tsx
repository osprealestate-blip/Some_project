"use client";

/** "What do you want to do?" on a fresh map: four plain choices that set the map up, so a first visit starts with a purpose.
 *  Each choice only uses what the map already does: the colour layer, or a search for buildings near a metro station. */
const CHOICES: { label: string; hint: string; set: Record<string, string> }[] = [
  { label: "Live near the metro", hint: "Buildings within 0.8 km of a station", set: { f: "near:metro" } },
  { label: "Find higher rent returns", hint: "Colour by rental yield", set: { m: "yield" } },
  { label: "See where sales are busy", hint: "Colour by sales in 12 months", set: { m: "sales" } },
  { label: "Compare prices", hint: "Colour by price per sq ft", set: { m: "psf" } },
];

function start(set: Record<string, string>) {
  const sp = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(set)) { if (k === "m" && v === "psf") sp.delete("m"); else sp.set(k, v); }
  window.history.pushState(null, "", `/map${sp.toString() ? `?${sp}` : ""}`);
  document.documentElement.setAttribute("data-map-started", "");
}

export default function MapStart() {
  return (
    <div className="mt-3 border-t border-[var(--border)] pt-3">
      <p className="text-sm font-medium">What do you want to do?</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {CHOICES.map((c) => (
          <button key={c.label} type="button" onClick={() => start(c.set)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2.5 py-2 text-start hover:border-[var(--accent)]">
            <span className="block text-[13px] font-semibold leading-tight">{c.label}</span>
            <span className="mt-0.5 block text-[11px] leading-tight text-[var(--muted)]">{c.hint}</span>
          </button>
        ))}
      </div>
      <button type="button" onClick={() => document.documentElement.setAttribute("data-map-started", "")}
        className="mt-2 text-xs text-[var(--muted)] underline hover:text-[var(--fg)]">Skip, I will look around</button>
    </div>
  );
}
