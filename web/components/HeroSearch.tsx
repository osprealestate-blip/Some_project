"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useT } from "./LangProvider";
import { heroHref, PRICE_STEPS, type HeroMode, type HeroType } from "@/lib/heroSearch";
import { LAUNCH_COMMUNITIES } from "@/lib/communities";

const field = "mt-1 block min-h-12 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 text-base text-[var(--fg)] disabled:opacity-60";

/** Search card for the homepage: Buy / Rent, area, type, price. Sends to the Buildings page with only filters that exist there. */
export default function HeroSearch() {
  const t = useT();
  const router = useRouter();
  const id = useId();
  const [mode, setMode] = useState<HeroMode>("buy");
  const [community, setCommunity] = useState(LAUNCH_COMMUNITIES[0].code);
  const [type, setType] = useState<HeroType>("residential");
  const [rooms, setRooms] = useState(-1);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); router.push(heroHref({ mode, community, rooms, maxPrice })); }}
      className="rounded-2xl bg-[var(--panel)] p-3 text-[var(--fg)] shadow-xl sm:p-4"
      aria-label={t("Search homes")}
    >
      <div role="tablist" aria-label={t("Buy or rent")} className="mb-3 inline-flex rounded-lg bg-[var(--grid)] p-1">
        {(["buy", "rent"] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
            className={`min-h-11 min-w-20 rounded-md px-5 text-sm font-semibold ${mode === m ? "bg-[var(--fg)] text-[var(--bg)]" : "text-[var(--muted)]"}`}>
            {m === "buy" ? t("Buy") : t("Rent")}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:items-end">
        <label className="block text-sm font-medium" htmlFor={`${id}-area`}>{t("Area")}
          <select id={`${id}-area`} className={field} value={community} onChange={(e) => setCommunity(e.target.value)}>
            {LAUNCH_COMMUNITIES.map((c) => <option key={c.code} value={c.code}>{t(c.label)}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium" htmlFor={`${id}-type`}>{t("Type")}
          <select id={`${id}-type`} className={field} value={type} onChange={(e) => setType(e.target.value as HeroType)}>
            <option value="residential">{t("Residential (apartments)")}</option>
            <option value="commercial" disabled>{t("Commercial (coming soon)")}</option>
          </select>
        </label>
        <label className="block text-sm font-medium" htmlFor={`${id}-beds`}>{t("Bedrooms")}
          <select id={`${id}-beds`} className={field} value={rooms} onChange={(e) => setRooms(Number(e.target.value))}>
            <option value={-1}>{t("Any")}</option>
            <option value={0}>{t("Studio")}</option>
            {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n === 4 ? "4+" : n}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium" htmlFor={`${id}-price`}>{t("Max price (AED)")}
          <select id={`${id}-price`} className={field} disabled={mode === "rent"} value={maxPrice ?? ""} onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : null)}>
            <option value="">{mode === "rent" ? t("Not available for rent yet") : t("Any")}</option>
            {PRICE_STEPS.map((p) => <option key={p} value={p}>{t("Up to {n}", { n: `${p / 1_000_000}M` })}</option>)}
          </select>
        </label>
        <button type="submit" className="min-h-12 rounded-lg bg-[var(--fg)] px-6 text-base font-semibold text-[var(--bg)] hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 sm:col-span-2 lg:col-span-1">
          {t("Search")}
        </button>
      </div>
    </form>
  );
}
