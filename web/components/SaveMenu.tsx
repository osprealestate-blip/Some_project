"use client";

import { useT } from "./LangProvider";
import { useEffect, useRef, useState } from "react";
import {
  addCollection, newCollectionId, readCollections, toggleInCollection, writeCollections, MAX_COLLECTIONS, type Collection,
} from "@/lib/collections";
import { MAX_FAVOURITES, readFavourites, toggle, writeFavourites } from "@/lib/favourites";

/** Heart button with a small menu: the Saved list and the visitor's own collections. Everything stays in this browser. */
export default function SaveMenu({ slug, name, down = false }: { slug: string; name: string; down?: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [cols, setCols] = useState<Collection[]>([]);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => { setSaved(readFavourites()); setCols(readCollections()); };
    sync();
    window.addEventListener("dpi-favourites", sync);
    window.addEventListener("dpi-collections", sync);
    return () => { window.removeEventListener("dpi-favourites", sync); window.removeEventListener("dpi-collections", sync); };
  }, []);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
    document.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc, true);
    return () => { document.removeEventListener("pointerdown", away); window.removeEventListener("keydown", esc, true); };
  }, [open]);

  const inAny = saved.includes(slug) || cols.some((c) => c.slugs.includes(slug));
  const failed = () => setNote(t("Your browser is blocking storage, so this could not be saved."));

  function toggleSaved() {
    const cur = readFavourites();
    const next = toggle(cur, slug);
    if (next.length === cur.length && !cur.includes(slug)) return setNote(t("You can save up to {n} buildings.", { n: MAX_FAVOURITES }));
    setNote(writeFavourites(next) ? "" : t("Your browser is blocking storage, so this could not be saved."));
  }
  function toggleCol(id: string) {
    const cur = readCollections();
    const next = toggleInCollection(cur, id, slug);
    if (JSON.stringify(next) === JSON.stringify(cur)) return setNote(t("A collection holds up to {n} buildings.", { n: MAX_FAVOURITES }));
    if (!writeCollections(next)) failed(); else setNote("");
  }
  function create(e: React.FormEvent) {
    e.preventDefault();
    const cur = readCollections();
    const id = newCollectionId();
    const next = addCollection(cur, draft, id);
    if (next === cur) return setNote(cur.length >= MAX_COLLECTIONS ? t("You can have up to {n} collections.", { n: MAX_COLLECTIONS }) : t("Give it a name that is not already used."));
    if (!writeCollections(toggleInCollection(next, id, slug))) return failed();
    setDraft("");
    setNote("");
  }

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="true" aria-label={inAny ? t("{name} is saved. Change where it is saved", { name }) : t("Save {name}", { name })}
        className={`grid h-10 w-10 place-items-center rounded-xl hover:bg-white/20 ${inAny ? "bg-cyan-300/20 text-cyan-200" : "bg-white/10"}`}>
        <svg aria-hidden viewBox="0 0 24 24" width="18" height="18" fill={inAny ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.4 5 6.6 5c2 0 3.6 1.1 5.4 3.2C13.8 6.1 15.4 5 17.4 5c3.2 0 5.1 3 3.9 6.3-1.8 4.6-9.3 9.2-9.3 9.2z" />
        </svg>
      </button>
      {open && (
        <div role="group" aria-label={t("Save to")} className={`dpi-glass !bg-[rgb(12_18_32/0.97)] absolute end-0 z-50 ${down ? "top-11" : "bottom-12"} w-64 rounded-xl p-3 text-sm`}>
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">{t("Save to")}</div>
          <label className="flex min-h-9 cursor-pointer items-center gap-2"><input type="checkbox" checked={saved.includes(slug)} onChange={toggleSaved} /> {t("Saved")}</label>
          {cols.map((c) => (
            <label key={c.id} className="flex min-h-9 cursor-pointer items-center gap-2"><input type="checkbox" checked={c.slugs.includes(slug)} onChange={() => toggleCol(c.id)} /> <span className="truncate">{c.name}</span></label>
          ))}
          <form onSubmit={create} className="mt-2 flex gap-1.5">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={40} placeholder={t("New collection")} aria-label={t("New collection name")}
              className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-base outline-none focus:border-cyan-300 md:text-sm" />
            <button type="submit" className="rounded-lg bg-cyan-300 px-2.5 py-1.5 text-xs font-semibold text-slate-900">{t("Add")}</button>
          </form>
          <p role="status" className="mt-1.5 min-h-4 text-xs text-[var(--warn)]">{note}</p>
          <a className="link text-xs" href="/collections">{t("Manage collections")}</a>
          <p className="mt-1 text-[11px] text-[var(--muted)]">{t("Kept in this browser only.")}</p>
        </div>
      )}
    </div>
  );
}
