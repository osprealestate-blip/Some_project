"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "./LangProvider";

export type Place = { lng: number; lat: number; height: number | null };

/** The card for a building that is on the map but not in our database: the grey OpenStreetMap buildings.
 *  It says what is known (where it is) and what is not, and shows no figures. */
export default function PlaceCard({ place, onClose }: { place: Place; onClose: () => void }) {
  const t = useT();
  const [community, setCommunity] = useState<{ code: string; name: string } | null | undefined>(undefined);
  useEffect(() => {
    const ctl = new AbortController();
    setCommunity(undefined);
    fetch(`/api/place?lng=${place.lng.toFixed(5)}&lat=${place.lat.toFixed(5)}`, { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setCommunity(j?.community ?? null))
      .catch(() => { if (!ctl.signal.aborted) setCommunity(null); });
    return () => ctl.abort();
  }, [place.lng, place.lat]);

  return (
    <div role="dialog" aria-label={t("Building with no data yet")} className="dpi-glass dpi-enter fixed inset-x-3 bottom-[5.5rem] z-40 mx-auto max-w-md rounded-2xl p-4 md:inset-x-auto md:bottom-28 md:end-4 md:mx-0 md:w-80">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{t("Building")}</h2>
          <p className="text-sm text-[var(--muted)]">{community === undefined ? "…" : community ? community.name : t("Dubai")}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={t("Close")} className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20">{t("Close")}</button>
      </div>
      <p className="mt-3 text-sm font-semibold">{t("No data yet")}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {t("We have no sales or rent records linked to this building yet, so we show no prices, yields or rents for it.")}
      </p>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-[var(--muted)]">{t("Position")}</dt>
        <dd className="text-end">{place.lat.toFixed(5)}, {place.lng.toFixed(5)}</dd>
        {place.height != null && (<>
          <dt className="text-[var(--muted)]">{t("Height (approx.)")}</dt>
          <dd className="text-end">{place.height} m</dd>
        </>)}
      </dl>
      <p className="mt-2 text-[11px] text-[var(--muted)]">{t("Outline: OpenStreetMap contributors via OpenFreeMap. Community: Dubai Municipality.")}</p>
      {community && (
        <Link href={`/community/${community.code}`} className="mt-3 inline-block rounded-full bg-cyan-300 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-cyan-200">
          {t("See buildings in {area}", { area: community.name })}
        </Link>
      )}
    </div>
  );
}
