"use client";

import { useEffect, useId, useState } from "react";

export type Picked = { slug: string; name: string; community: string | null };
type Hit = Picked & { kind: "building" | "community" };

/** Type-ahead for one building. Areas are not offered here: tools work per building. */
export default function BuildingPicker({ value, onChange }: { value: Picked | null; onChange: (b: Picked | null) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const id = useId();

  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((d: { results: Hit[] }) => setHits((d.results ?? []).filter((h) => h.kind === "building")))
        .catch(() => {});
    }, 180);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm">
        <span><span className="font-medium">{value.name}</span>{value.community ? <span className="text-[var(--muted)]"> · {value.community}</span> : null}</span>
        <button type="button" className="link text-xs" onClick={() => onChange(null)}>Change</button>
      </div>
    );
  }
  return (
    <div className="relative">
      <input
        id={id}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Start typing a building name"
        aria-label="Building"
        className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
      />
      {hits.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-10 mt-1 max-h-64 overflow-auto rounded-md border border-[var(--border)] bg-[var(--panel)] py-1 text-sm shadow-lg">
          {hits.map((h) => (
            <li key={h.slug}>
              <button type="button" className="flex w-full justify-between gap-2 px-3 py-1.5 text-start hover:bg-[var(--bg)]" onClick={() => { onChange(h); setQ(""); setHits([]); }}>
                <span>{h.name}</span><span className="text-xs text-[var(--muted)]">{h.community}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
