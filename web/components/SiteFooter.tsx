import Link from "next/link";
import { getT } from "@/lib/lang";
import { DISCLAIMER } from "@/lib/sources";

export default async function SiteFooter() {
  const { t } = await getT();
  return (
    <footer className="mt-12 border-t border-[var(--border)] px-4 py-6 text-xs text-[var(--muted)]">
      <div className="mx-auto max-w-6xl space-y-1">
        <p>{t(DISCLAIMER)}</p>
        <p>
          {t("Sales and rents: Dubai Land Department open data (Dubai Pulse). Places: KHDA, DHA and © OpenStreetMap contributors. Community boundaries: Dubai Municipality.")}{" "}
          <Link className="underline" href="/how-it-works">{t("How the figures are made")}</Link> · <Link className="underline" href="/favourites">{t("Saved buildings")}</Link>
        </p>
      </div>
    </footer>
  );
}
