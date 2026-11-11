"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MAX_FAVOURITES, readFavourites, toggle, writeFavourites } from "@/lib/favourites";

/** Heart button that saves a building to this browser's favourites list. Nothing is sent to a server. */
export default function FavouriteButton({ slug, name }: { slug: string; name: string }) {
  const [list, setList] = useState<string[] | null>(null); // null until the browser has been read
  const [note, setNote] = useState("");

  useEffect(() => {
    const sync = () => setList(readFavourites());
    sync();
    window.addEventListener("dpi-favourites", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("dpi-favourites", sync); window.removeEventListener("storage", sync); };
  }, []);

  const saved = !!list?.includes(slug);

  function click() {
    const current = readFavourites();
    const next = toggle(current, slug);
    if (next.length === current.length && !current.includes(slug)) {
      setNote(`You can save up to ${MAX_FAVOURITES} buildings. Remove one to add this one.`);
      return;
    }
    if (!writeFavourites(next)) {
      setNote("Your browser is blocking storage, so this building could not be saved.");
      return;
    }
    setNote("");
    setList(next);
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
      <button
        type="button"
        onClick={click}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${name} from saved buildings` : `Save ${name}`}
        className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 text-sm font-medium ${saved ? "text-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--fg)]"}`}
      >
        <svg aria-hidden viewBox="0 0 24 24" width="18" height="18" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.4 5 6.6 5c2 0 3.6 1.1 5.4 3.2C13.8 6.1 15.4 5 17.4 5c3.2 0 5.1 3 3.9 6.3-1.8 4.6-9.3 9.2-9.3 9.2z" />
        </svg>
        {saved ? "Saved" : "Save"}
      </button>
      {list && list.length > 0 && <Link className="link text-sm" href="/favourites">Saved buildings ({list.length})</Link>}
      <span role="status" className="text-xs text-[var(--muted)]">{note}</span>
    </div>
  );
}
