import Link from "next/link";
import CommunityIndex from "@/components/CommunityIndex";
import NoData from "@/components/NoData";
import { getServerCurrency } from "@/lib/currency";
import { hasDatabase } from "@/lib/db";
import { day } from "@/lib/format";
import { getT } from "@/lib/lang";
import { masterIndex } from "@/lib/masterQueries";
import { pageMetadata } from "@/lib/seo";
import { SOURCES } from "@/lib/sources";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata({
  title: "Dubai communities: apartment prices, rents and yields",
  description: "Every Dubai community with building pages, from Dubai Marina to Dubai South: apartment sale prices, rents and gross yields from Dubai Land Department data.",
  path: "/communities",
});

async function load() {
  if (!hasDatabase()) return null;
  try { return await masterIndex(); } catch { return null; }
}

export default async function Page() {
  const { t } = await getT();
  const currency = await getServerCurrency();
  const data = await load();
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold">{t("Communities")}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
        {t("Every community with building pages. Dubai Marina, JVC and Business Bay were checked by hand; the others are matched automatically from DLD names and are labelled so.")}
      </p>
      {data && data.rows.length > 0 ? (
        <div className="mt-5">
          <CommunityIndex rows={data.rows} currency={currency} figures={data.figures} />
          <p className="mt-4 text-xs text-[var(--muted)]">
            {t("Source")}: {t(SOURCES.dldSales)}; {t(SOURCES.dldRents)}{data.periodEnd ? `, ${t("data to {date}", { date: day(data.periodEnd) })}` : ""}. {t("Median figures for apartments, last 12 months. Rents are contracts tied to a community's buildings or projects.")}
          </p>
        </div>
      ) : (
        <div className="mt-6"><NoData /></div>
      )}
      <p className="mt-6 text-sm">
        <Link className="link" href="/communities/compare">{t("Compare areas side by side")}</Link>
      </p>
    </main>
  );
}
