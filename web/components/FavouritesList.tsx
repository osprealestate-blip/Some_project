"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Currency } from "@/config/currency";
import { MAX_COMPARE, type CompareFigures, compareHref, rentBasis } from "@/lib/compare";
import { favouritesCsv, favouritesHref, readFavourites, writeFavourites } from "@/lib/favourites";
import { count, formatPsf, formatShortPrice, pct } from "@/lib/format";

/**
 * The saved list, kept in step with this browser's storage. The server renders the buildings named in ?ids=; this
 * component makes ?ids= match what is saved, so the saved list is the single source of truth and is never sent anywhere.
 */
export default function FavouritesList({ figures, urlSlugs, missing, currency }: { figures: CompareFigures[]; urlSlugs: string[]; missing: string[]; currency: Currency }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    const stored = readFavourites();
    setSaved(stored);
    setReady(true);
    if (stored.join(",") !== urlSlugs.join(",")) router.replace(favouritesHref(stored));
  }, [urlSlugs, router]);

  function remove(slug: string) {
    const next = saved.filter((s) => s !== slug);
    writeFavourites(next);
    setSaved(next);
    router.replace(favouritesHref(next));
  }

  function download() {
    const csv = favouritesCsv(figures, rentBasis, window.location.origin);
    const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "saved-buildings.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (!ready) return <p className="mt-6 text-sm text-[var(--muted)]">Reading your saved buildings…</p>;

  if (saved.length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-dashed border-[var(--border)] p-6 text-sm text-[var(--muted)]">
        <p className="font-medium text-[var(--fg)]">You have not saved any buildings yet</p>
        <p className="mt-1">Open a building page and press <strong className="font-medium">Save</strong>. Saved buildings appear here. <Link className="link" href="/buildings">Browse buildings</Link></p>
      </div>
    );
  }

  const shown = figures.filter((f) => saved.includes(f.slug));
  const gone = missing.filter((s) => saved.includes(s));
  if (shown.length !== urlSlugs.length - missing.length || shown.length === 0) {
    // The page is catching up with the saved list (redirect in progress).
    if (gone.length === 0) return <p className="mt-6 text-sm text-[var(--muted)]">Loading your saved buildings…</p>;
  }

  return (
    <>
      {gone.length > 0 && (
        <p role="status" className="mt-4 rounded-md border border-[var(--border)] bg-[var(--panel)] p-3 text-sm">
          {gone.length === 1 ? "A saved building" : `${gone.length} saved buildings`} no longer has a page ({gone.join(", ")}).{" "}
          <button type="button" className="link" onClick={() => { const next = saved.filter((s) => !gone.includes(s)); writeFavourites(next); setSaved(next); router.replace(favouritesHref(next)); }}>Remove {gone.length === 1 ? "it" : "them"} from the list</button>
        </p>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={download} disabled={shown.length === 0} className="min-h-9 rounded-lg border border-[var(--border)] px-3 text-sm font-medium hover:bg-[var(--panel)] disabled:opacity-50">Download CSV</button>
        {shown.length >= 2 && <Link className="link text-sm" href={compareHref(shown.slice(0, MAX_COMPARE).map((f) => f.slug))}>Compare {Math.min(shown.length, MAX_COMPARE)} of these side by side</Link>}
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <caption className="sr-only">Saved buildings</caption>
          <thead className="text-xs text-[var(--muted)]">
            <tr className="border-b border-[var(--border)] text-start">
              <th scope="col" className="py-2 pe-3 text-start font-medium">Building</th>
              <th scope="col" className="py-2 pe-3 text-start font-medium">Median sale price</th>
              <th scope="col" className="py-2 pe-3 text-start font-medium">Per sq ft</th>
              <th scope="col" className="py-2 pe-3 text-start font-medium">Median annual rent</th>
              <th scope="col" className="py-2 pe-3 text-start font-medium">Gross yield</th>
              <th scope="col" className="py-2 pe-3 text-start font-medium">Data up to</th>
              <th scope="col" className="py-2 text-start font-medium"><span className="sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((f) => (
              <tr key={f.slug} className="border-b border-[var(--border)] align-top">
                <th scope="row" className="py-2 pe-3 text-start font-normal">
                  <Link className="link font-medium" href={`/building/${f.slug}`}>{f.name}</Link>
                  <div className="text-xs text-[var(--muted)]">{f.community}</div>
                </th>
                <td className="py-2 pe-3 tabular-nums">{formatShortPrice(f.medianPrice, currency)}<div className="text-xs text-[var(--muted)]">{f.sales12m == null ? "" : `${count(f.sales12m)} sales`}</div></td>
                <td className="py-2 pe-3 tabular-nums">{formatPsf(f.psf, currency)}<div className="text-xs text-[var(--muted)]">{pct(f.psfChange, 1, true)} on a year earlier</div></td>
                <td className="py-2 pe-3 tabular-nums">{formatShortPrice(f.rent, currency)}<div className="text-xs text-[var(--muted)]">{rentBasis(f)}</div></td>
                <td className="py-2 pe-3 tabular-nums">{pct(f.grossYield)}</td>
                <td className="py-2 pe-3 tabular-nums">{f.periodEnd ?? "–"}</td>
                <td className="py-2"><button type="button" onClick={() => remove(f.slug)} aria-label={`Remove ${f.name} from saved buildings`} className="text-xs text-[var(--muted)] underline">Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
