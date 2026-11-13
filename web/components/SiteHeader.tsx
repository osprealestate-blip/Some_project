import Link from "next/link";
import SearchBox from "./SearchBox";
import CurrencySwitcher from "./CurrencySwitcher";
import MobileNav from "./MobileNav";
import NavLinks from "./NavLinks";
import { getServerCurrency } from "@/lib/currency";
import { getT } from "@/lib/lang";
import { LangSwitch } from "./LangProvider";
import { MAIN_NAV } from "@/lib/nav";

export default async function SiteHeader() {
  const currency = await getServerCurrency();
  const { t } = await getT();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--panel)] [--header-h:3.5rem] md:[--header-h:4rem]">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-x-4 px-4 md:h-16">
        <Link href="/" className="whitespace-nowrap font-semibold">
          <span className="md:hidden">{t("Dubai building intel")}</span>
          <span className="hidden md:inline">{t("Dubai building intelligence")}</span>
        </Link>
        <nav aria-label={t("Main")} className="ms-4 hidden md:block">
          <NavLinks items={MAIN_NAV} className="flex items-center gap-5 text-sm" linkClassName="whitespace-nowrap py-2" />
        </nav>
        <div className="ms-auto hidden items-center gap-2 md:flex">
          <CurrencySwitcher initialCurrency={currency} />
          <LangSwitch />
          <div className="w-56 lg:w-72"><SearchBox placeholder={t("Search a building or area")} /></div>
        </div>
        <div className="ms-auto md:hidden">
          <MobileNav>
            <SearchBox placeholder={t("Search a building or area")} />
            <div className="flex items-center gap-2 text-sm text-[var(--muted)]"><span>{t("Currency")}</span><CurrencySwitcher initialCurrency={currency} /><LangSwitch /></div>
          </MobileNav>
        </div>
      </div>
    </header>
  );
}
