"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  addCollection, collectionHref, newCollectionId, readCollections, removeCollection, renameCollection, writeCollections, MAX_COLLECTIONS, NAME_MAX, type Collection,
} from "@/lib/collections";
import { favouritesHref, readFavourites } from "@/lib/favourites";

/** The visitor's collections: create, rename, delete, open, copy a share link. Stored in this browser only. */
export default function CollectionsManager() {
  const [ready, setReady] = useState(false);
  const [cols, setCols] = useState<Collection[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    const sync = () => { setCols(readCollections()); setSaved(readFavourites()); setReady(true); };
    sync();
    window.addEventListener("dpi-collections", sync);
    window.addEventListener("dpi-favourites", sync);
    return () => { window.removeEventListener("dpi-collections", sync); window.removeEventListener("dpi-favourites", sync); };
  }, []);

  const save = (next: Collection[], ok = "") => setNote(writeCollections(next) ? ok : "Your browser is blocking storage, so this could not be saved.");
  async function share(c: Collection) {
    const url = `${window.location.origin}${collectionHref(c)}`;
    try { await navigator.clipboard.writeText(url); setNote(`Link to “${c.name}” copied. Anyone with it sees the same list.`); } catch { setNote(url); }
  }
  if (!ready) return <p className="mt-6 text-sm text-[var(--muted)]">Reading your collections…</p>;
  return (
    <div className="mt-5">
      <p role="status" className="min-h-5 text-sm text-[var(--muted)]">{note}</p>
      <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--panel)]">
        <li className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3">
          <span className="font-medium">Saved</span><span className="text-sm text-[var(--muted)]">{saved.length} building{saved.length === 1 ? "" : "s"}</span>
          <Link className="link ms-auto text-sm" href={favouritesHref(saved)}>Open</Link>
        </li>
        {cols.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3">
            {editing === c.id ? (
              <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); const next = renameCollection(cols, c.id, text); if (next === cols) setNote("Give it a name that is not already used."); else { save(next); setEditing(null); } }}>
                <input autoFocus value={text} maxLength={NAME_MAX} onChange={(e) => setText(e.target.value)} aria-label="Collection name" className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-base sm:text-sm" />
                <button className="rounded-md bg-[var(--accent)] px-3 text-sm font-medium text-white" type="submit">Save</button>
                <button className="text-sm underline" type="button" onClick={() => setEditing(null)}>Cancel</button>
              </form>
            ) : (
              <>
                <span className="font-medium">{c.name}</span><span className="text-sm text-[var(--muted)]">{c.slugs.length} building{c.slugs.length === 1 ? "" : "s"}</span>
                <span className="ms-auto flex flex-wrap gap-x-3 text-sm">
                  <Link className="link" href={collectionHref(c)}>Open</Link>
                  <button type="button" className="link" onClick={() => share(c)}>Copy link</button>
                  <button type="button" className="link" onClick={() => { setEditing(c.id); setText(c.name); }}>Rename</button>
                  <button type="button" className="link" aria-label={`Delete ${c.name}`} onClick={() => save(removeCollection(cols, c.id), `Deleted “${c.name}”.`)}>Delete</button>
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
      <form className="mt-4 flex max-w-md gap-2" onSubmit={(e) => { e.preventDefault(); const next = addCollection(cols, draft, newCollectionId()); if (next === cols) setNote(cols.length >= MAX_COLLECTIONS ? `You can have up to ${MAX_COLLECTIONS} collections.` : "Give it a name that is not already used."); else { save(next); setDraft(""); } }}>
        <input value={draft} maxLength={NAME_MAX} onChange={(e) => setDraft(e.target.value)} placeholder="New collection, e.g. Near metro" aria-label="New collection name" className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-base sm:text-sm" />
        <button type="submit" className="rounded-md bg-[var(--accent)] px-4 text-sm font-medium text-white">Create</button>
      </form>
      <p className="mt-3 text-xs text-[var(--muted)]">Collections are kept in this browser only. There is no account, so they do not follow you to another device. Use “Copy link” to share a list: the link holds only the name and the building names, nothing else.</p>
    </div>
  );
}
