"use client";

import { useState } from "react";
import { addCollection, newCollectionId, readCollections, toggleInCollection, writeCollections } from "@/lib/collections";

/** Copies a shared list into the visitor's own collections (this browser only). */
export default function ImportCollection({ name, slugs }: { name: string; slugs: string[] }) {
  const [msg, setMsg] = useState("");
  function go() {
    const cur = readCollections();
    let n = name, i = 2;
    while (cur.some((c) => c.name.toLowerCase() === n.toLowerCase())) n = `${name.slice(0, 36)} ${i++}`;
    const id = newCollectionId();
    let next = addCollection(cur, n, id);
    if (next === cur) return setMsg("You already have the most collections allowed. Delete one first.");
    for (const s of slugs) next = toggleInCollection(next, id, s);
    setMsg(writeCollections(next) ? `Saved as “${n}”.` : "Your browser is blocking storage, so this could not be saved.");
  }
  return (
    <p className="mt-4 flex flex-wrap items-center gap-3 text-sm">
      <button type="button" onClick={go} className="rounded-lg bg-[var(--accent)] px-4 py-2 font-medium text-white">Save to my collections</button>
      <a className="link" href="/collections">Your collections</a>
      <span role="status" className="text-[var(--muted)]">{msg}</span>
    </p>
  );
}
