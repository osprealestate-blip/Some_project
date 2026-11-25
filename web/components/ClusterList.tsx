import Link from "next/link";
import type { Currency } from "@/config/currency";
import { count, formatPsf } from "@/lib/format";
import type { T } from "@/lib/i18n";
import { SOURCES } from "@/lib/sources";
import { CLUSTER_KIND_LABEL } from "@/lib/villaCluster";
import type { ClusterListItem } from "@/lib/villaClusterQueries";
import SourceNote from "./SourceNote";

const FIRST = 40;

/** The villa and townhouse clusters of a community page. Long lists show the busiest first and fold away the rest. */
export default function ClusterList({ clusters, currency, periodEnd, t }: { clusters: ClusterListItem[]; currency: Currency; periodEnd: string | null | undefined; t: T }) {
  if (!clusters.length) return null;
  const unplaced = clusters.filter((c) => !c.placed).length;
  const row = (v: ClusterListItem) => (
    <li key={v.slug} className="flex justify-between gap-3">
      <span className="min-w-0"><Link className="link" href={`/villas/${v.slug}`}>{v.name}</Link> <span className="text-xs text-[var(--muted)]">{t(CLUSTER_KIND_LABEL[v.kind])}</span></span>
      <span className="shrink-0 tabular-nums text-[var(--muted)]">{v.sales ? `${t("{n} sales", { n: count(v.sales) })}${v.psf ? ` · ${formatPsf(v.psf, currency)}` : ""}` : "–"}</span>
    </li>
  );
  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold">{t("Villa and townhouse clusters")} ({count(clusters.length)})</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {t("One entry per project. Sales are counted for the whole project, never for a single villa.")}
        {unplaced > 0 && ` ${t("{n} have no map position yet.", { n: count(unplaced) })}`}
      </p>
      <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">{clusters.slice(0, FIRST).map(row)}</ul>
      {clusters.length > FIRST && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm font-medium">{t("Show {n} more", { n: count(clusters.length - FIRST) })}</summary>
          <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">{clusters.slice(FIRST).map(row)}</ul>
        </details>
      )}
      <SourceNote t={t} source={SOURCES.dldSales} date={periodEnd}>{t("Last 12 months, matched to each project by its Dubai Land Department project name.")}</SourceNote>
    </section>
  );
}
