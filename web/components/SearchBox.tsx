"use client";

import { usePathname, useRouter } from "next/navigation";
import { useT } from "./LangProvider";
import { FACILITIES } from "@/lib/facilities";
import { A_PLACE, facilityIntent, NEAR_RADIUS_M } from "@/lib/mapFilter";
import { useEffect, useId, useRef, useState } from "react";

type Hit = { kind: "building" | "community" | "developer" | "facility"; slug: string; name: string; community: string | null };
const KIND_LABEL: Record<Hit["kind"], string> = { building: "", community: "Area", developer: "Developer", facility: "Map search" };

/** `mapMode`: on the map page a building result opens its card on the map instead of leaving for its page. */
export default function SearchBox({ autoFocus = false, placeholder = "Search a building or area", mapMode: mapModeProp = false }: { autoFocus?: boolean; placeholder?: string; mapMode?: boolean }) {
  const router = useRouter();
  const t = useT();
  const pathname = usePathname();
  const mapMode = mapModeProp || pathname === "/map"; // on the map, results act on the map and never leave it
  const [q, setQ] = useState("");
  const [found, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  // "near a metro" style searches: suggestions made here, no request needed.
  const intents: Hit[] = facilityIntent(q).map((id) => ({
    kind: "facility", slug: id, name: t("Buildings within {km} km of {place}", { km: NEAR_RADIUS_M[id] / 1000, place: t(A_PLACE[id]) }), community: t(FACILITIES.find((f) => f.id === id)!.label),
  }));
  const hits = [...intents, ...found];
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    const ctrl = new AbortController();
    timer.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((d: { results: Hit[] }) => {
          setHits(d.results ?? []);
          setActive(-1);
          setOpen(true);
        })
        .catch(() => {});
    }, 180);
    return () => ctrl.abort();
  }, [q]);

  // On the map, keep the colour layer and compare list while the search changes what is shown.
  const mapHref = (set: Record<string, string>) => {
    const sp = new URLSearchParams();
    if (pathname === "/map") {
      const cur = new URLSearchParams(window.location.search);
      for (const k of ["m", "compare", "f"]) if (cur.get(k)) sp.set(k, cur.get(k)!);
    }
    for (const [k, v] of Object.entries(set)) sp.set(k, v);
    return `/map?${sp}`;
  };
  const href = (h: Hit) =>
    h.kind === "building" ? (mapMode ? mapHref({ building: h.slug }) : `/building/${h.slug}`)
    : h.kind === "facility" ? mapHref({ f: `near:${h.slug}` })
    : h.kind === "developer" ? mapHref({ f: `dev:${h.slug}` })
    : mapMode ? mapHref({ f: `area:${h.slug}` }) : `/community/${h.slug}`;
  const go = (h: Hit) => {
    setOpen(false);
    setQ("");
    router.push(href(h));
  };

  return (
    <div className="relative">
      <input
        type="search"
        role="combobox"
        aria-expanded={open && hits.length > 0}
        aria-controls={listId}
        aria-label={t("Search buildings and areas")}
        autoFocus={autoFocus}
        value={q}
        placeholder={placeholder}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => hits.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === "Enter") {
            const h = hits[active] ?? hits[0];
            if (h) { e.preventDefault(); go(h); }
            else if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
          } else if (e.key === "Escape") setOpen(false);
        }}
        className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-base outline-none sm:text-sm focus:border-[var(--accent)]"
      />
      {open && hits.length > 0 && (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 max-h-80 overflow-auto rounded-md border border-[var(--border)] bg-[var(--panel)] py-1 text-sm shadow-lg">
          {hits.map((h, i) => (
            <li key={`${h.kind}-${h.slug}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(h)}
                className={`flex w-full items-baseline justify-between gap-2 px-3 py-1.5 text-start ${i === active ? "bg-[var(--bg)]" : ""} hover:bg-[var(--bg)]`}
              >
                <span className="min-w-0 break-words">{h.name}</span>
                <span className="shrink-0 text-xs text-[var(--muted)]">{h.kind === "building" ? h.community : t(KIND_LABEL[h.kind])}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
