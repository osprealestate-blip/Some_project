"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Currency } from "@/config/currency";
import { CLUSTER_KIND_LABEL, type ClusterKind } from "@/lib/villaCluster";
import type { VillaCardData } from "@/lib/villaCardData";
import { useT } from "./LangProvider";
import VillaFigures from "./VillaFigures";

/** The map card for a villa or townhouse cluster: the same glass sheet as the building card, but with cluster figures
 *  only (sales, price, bedroom mix, plot count) and a plain note that the dot is the middle of the project. */
export default function VillaClusterCard({ slug, name, kind, currency, onClose }: { slug: string; name: string; kind: ClusterKind; currency: Currency; onClose: () => void }) {
  const t = useT();
  const [data, setData] = useState<VillaCardData | null | undefined>(undefined);
  useEffect(() => {
    const ctl = new AbortController();
    setData(undefined);
    fetch(`/api/villa-card/${encodeURIComponent(slug)}`, { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setData(j))
      .catch(() => { if (!ctl.signal.aborted) setData(null); });
    return () => ctl.abort();
  }, [slug]);

  return (
    <div role="dialog" aria-label={name} className="dpi-glass dpi-enter fixed inset-x-3 bottom-[5.5rem] z-40 mx-auto max-h-[48vh] max-w-md overflow-y-auto rounded-2xl p-4 md:inset-x-auto md:bottom-28 md:end-4 md:mx-0 md:max-h-[70vh] md:w-96">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">{t(CLUSTER_KIND_LABEL[kind])}</p>
          <h2 className="text-base font-semibold">{name}</h2>
          <p className="text-sm text-[var(--muted)]">{data === undefined ? "…" : data?.community ?? t("Dubai")}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={t("Close")} className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20">{t("Close")}</button>
      </div>
      <div className="mt-3">
        {data === undefined ? <p className="text-sm text-[var(--muted)]">{t("Loading…")}</p>
          : data === null ? <p className="text-sm text-[var(--muted)]">{t("Could not load the figures for this cluster.")}</p>
          : <VillaFigures data={data} currency={currency} t={t} />}
      </div>
      <Link href={`/villas/${encodeURIComponent(slug)}`} className="mt-3 inline-block text-xs font-semibold text-[var(--accent)] underline">{t("Open the full page")}</Link>
    </div>
  );
}
